mod error;
mod models;
mod parsers;
mod state;
mod worker;

use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use tokio::sync::mpsc;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

use models::{JobRequest, JobResponse};
use state::AppState;
use worker::WorkerJob;

async fn submit_job(
    State(state): State<Arc<AppState>>,
    Json(req): Json<JobRequest>,
) -> impl IntoResponse {
    let job_id = Uuid::new_v4().to_string();
    state.insert_job(&job_id);

    let job = WorkerJob {
        job_id: job_id.clone(),
        parser_type: req.parser_type,
        pdfs: req.pdfs,
    };

    if state.sender.send(job).await.is_err() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({ "error": "worker queue is full or unavailable" })),
        )
            .into_response();
    }

    (StatusCode::ACCEPTED, Json(JobResponse { job_id })).into_response()
}

async fn get_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> impl IntoResponse {
    match state.get_job(&job_id) {
        Some(status) => (StatusCode::OK, Json(status)).into_response(),
        None => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "job not found" })),
        )
            .into_response(),
    }
}

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok" }))
}

#[tokio::main]
async fn main() {
    // Non-blocking writer offloads stdout I/O to a background thread so async
    // tasks are never stalled waiting for the terminal/log sink to flush.
    // The _guard must be held for the lifetime of main — dropping it flushes
    // any buffered log lines before the process exits.
    let (non_blocking, _guard) = tracing_appender::non_blocking(std::io::stdout());

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "pdf_parsing=debug,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer().with_writer(non_blocking))
        .init();

    // Channel capacity of 100 — jobs queue up here if the worker is busy.
    let (tx, rx) = mpsc::channel::<WorkerJob>(100);

    let state = Arc::new(AppState::new(tx));

    tokio::spawn(worker::run(rx, Arc::clone(&state)));

    let app = Router::new()
        .route("/health", get(health))
        .route("/jobs", post(submit_job))
        .route("/jobs/:job_id", get(get_job))
        .layer(TraceLayer::new_for_http()) // logs every request + response + latency
        .layer(CorsLayer::permissive())
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{port}");
    tracing::info!("pdf-parsing service listening on {addr}");

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
