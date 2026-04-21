use dashmap::DashMap;
use tokio::sync::mpsc::Sender;

use crate::models::{JobResult, JobStatus, StatusResponse, StoredFile};
use crate::worker::WorkerJob;

pub struct AppState {
    pub sender: Sender<WorkerJob>,
    jobs: DashMap<String, StatusResponse>,
    files: DashMap<String, StoredFile>,
}

impl AppState {
    pub fn new(sender: Sender<WorkerJob>) -> Self {
        Self {
            sender,
            jobs: DashMap::new(),
            files: DashMap::new(),
        }
    }

    pub fn store_file(&self, file_id: String, file: StoredFile) {
        self.files.insert(file_id, file);
    }

    /// Takes (removes) a stored file by ID. Returns None if not found.
    pub fn take_file(&self, file_id: &str) -> Option<StoredFile> {
        self.files.remove(file_id).map(|(_, v)| v)
    }

    pub fn insert_job(&self, job_id: &str) {
        self.jobs.insert(
            job_id.to_string(),
            StatusResponse {
                job_id: job_id.to_string(),
                status: JobStatus::Queued,
                result: None,
                error: None,
            },
        );
    }

    pub fn update_job(
        &self,
        job_id: &str,
        status: JobStatus,
        result: Option<JobResult>,
        error: Option<String>,
    ) {
        if let Some(mut entry) = self.jobs.get_mut(job_id) {
            entry.status = status;
            entry.result = result;
            entry.error = error;
        }
    }

    pub fn get_job(&self, job_id: &str) -> Option<StatusResponse> {
        self.jobs.get(job_id).map(|e| e.clone())
    }
}
