use std::sync::Arc;
use tokio::sync::mpsc::Receiver;
use tracing::{error, info};

use crate::models::{JobStatus, ParserType, ResolvedPdf};
use crate::parsers;
use crate::state::AppState;

pub struct WorkerJob {
    pub job_id: String,
    pub parser_type: ParserType,
    pub pdfs: Vec<ResolvedPdf>,
}

/// Runs forever, consuming jobs from the channel one at a time.
/// PDF parsing is CPU-bound, so each job runs inside `spawn_blocking`
/// to avoid stalling the async runtime while other HTTP requests are served.
pub async fn run(mut rx: Receiver<WorkerJob>, state: Arc<AppState>) {
    info!("worker started — waiting for jobs");

    while let Some(job) = rx.recv().await {
        info!(job_id = %job.job_id, "starting job");
        state.update_job(&job.job_id, JobStatus::Processing, None, None);

        let job_id = job.job_id.clone();
        let parser_type = job.parser_type;
        let pdfs = job.pdfs;

        let outcome = tokio::task::spawn_blocking(move || parsers::run(parser_type, pdfs)).await;

        match outcome {
            Ok(Ok(result)) => {
                info!(job_id = %job_id, "job done");
                state.update_job(&job_id, JobStatus::Done, Some(result), None);
            }
            Ok(Err(e)) => {
                error!(job_id = %job_id, error = %e, "job failed");
                state.update_job(&job_id, JobStatus::Failed, None, Some(e.to_string()));
            }
            Err(e) => {
                error!(job_id = %job_id, error = %e, "worker thread panicked");
                state.update_job(
                    &job_id,
                    JobStatus::Failed,
                    None,
                    Some("internal worker error".to_string()),
                );
            }
        }
    }

    info!("worker channel closed — shutting down");
}
