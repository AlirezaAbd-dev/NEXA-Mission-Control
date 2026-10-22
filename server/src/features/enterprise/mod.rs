pub mod automation;
pub mod dto;
pub mod dashboard;
pub mod handler;
pub mod import;
pub mod repository;
pub mod routes;
pub mod service;
pub use routes::router;
pub mod operations;

pub mod access;
pub mod access_repository;
pub mod automation_repository;
pub mod import_repository;
pub mod internal_comments_repository;
#[cfg(test)]
mod tests;
pub mod xlsx;

pub mod collaboration;
pub mod collaboration_repository;

pub mod attachment_dto;
pub mod attachment_handler;
pub mod attachment_repository;
pub mod attachment_service;
