mod error;
mod models;
mod parsers;
mod state;
mod worker;

use std::sync::Arc;

use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use tokio::sync::mpsc;
use tower_http::cors::CorsLayer;
use uuid::Uuid;

use models::{JobRequest, JobResponse, ResolvedPdf, StoredFile};
use state::AppState;
use worker::WorkerJob;

async fn upload_file(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut passwords: Vec<String> = Vec::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "file" => match field.bytes().await {
                Ok(bytes) => file_bytes = Some(bytes.to_vec()),
                Err(e) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(serde_json::json!({ "error": format!("failed to read file: {e}") })),
                    )
                        .into_response();
                }
            },
            "passwords" => {
                if let Ok(text) = field.text().await {
                    passwords = serde_json::from_str(&text).unwrap_or_default();
                }
            }
            _ => {}
        }
    }

    let bytes = match file_bytes {
        Some(b) => b,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "no 'file' field in multipart body" })),
            )
                .into_response();
        }
    };

    let file_id = Uuid::new_v4().to_string();
    let size_kb = bytes.len() / 1024;
    state.store_file(file_id.clone(), StoredFile { bytes, passwords });

    log::info!("file uploaded: {} ({} KB)", file_id, size_kb);

    (
        StatusCode::OK,
        Json(serde_json::json!({ "file_id": file_id })),
    )
        .into_response()
}

async fn submit_job(
    State(state): State<Arc<AppState>>,
    Json(req): Json<JobRequest>,
) -> impl IntoResponse {
    let job_id = Uuid::new_v4().to_string();

    let mut resolved: Vec<ResolvedPdf> = Vec::new();

    // Resolve inline base64 PDFs (legacy / small payload path)
    for pdf in req.pdfs {
        match BASE64.decode(&pdf.data) {
            Ok(bytes) => resolved.push(ResolvedPdf {
                bytes,
                passwords: pdf.passwords,
            }),
            Err(e) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({ "error": format!("invalid base64: {e}") })),
                )
                    .into_response();
            }
        }
    }

    // Resolve pre-uploaded file IDs (upload-then-parse path)
    for file_id in req.file_ids {
        match state.take_file(&file_id) {
            Some(stored) => resolved.push(ResolvedPdf {
                bytes: stored.bytes,
                passwords: stored.passwords,
            }),
            None => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({ "error": format!("file_id not found: {file_id}") })),
                )
                    .into_response();
            }
        }
    }

    if resolved.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "no PDFs provided — use 'pdfs' or 'file_ids'" })),
        )
            .into_response();
    }

    state.insert_job(&job_id);

    let job = WorkerJob {
        job_id: job_id.clone(),
        parser_type: req.parser_type,
        pdfs: resolved,
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
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("pdf_parsing=debug,info"),
    )
    .init();

    // Channel capacity of 100 — jobs queue up here if the worker is busy.
    let (tx, rx) = mpsc::channel::<WorkerJob>(100);

    let state = Arc::new(AppState::new(tx));

    tokio::spawn(worker::run(rx, Arc::clone(&state)));

    let app = Router::new()
        .route("/health", get(health))
        .route("/jobs/warmup", get(health)) // alias used by Node.js warmupPdfService()
        .route("/files", post(upload_file))
        .route("/jobs", post(submit_job))
        .route("/jobs/:job_id", get(get_job))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{port}");
    log::info!("pdf-parsing service listening on {addr}");

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
