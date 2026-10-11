# Rust & Axum Backend Rules

1. **No unwrap() or expect()** in production code:
   - Always use the `?` operator.
   - Map errors to domain `AppError` variants with context.
   - Use `thiserror` for library/domain errors and Axum response conversion.

2. **Strict Layering & Single Responsibility**:
   - `Handler`: Deserializes/validates requests, extracts auth/claims, calls service, serializes response. Zero DB queries, zero business logic.
   - `Service`: Contains business logic, authorization rules, transaction orchestration, domain validation.
   - `Repository`: Pure SQL queries via `sqlx`. No business logic.
   - `Models`: Internal domain structs.
   - `DTOs`: Explicit request and response payloads with `#[derive(Deserialize, Serialize, Validate)]`.

3. **Performance & Database Practices**:
   - Use SQLite WAL mode (`PRAGMA journal_mode = WAL;`) and `PRAGMA synchronous = NORMAL;`.
   - Use UUIDv7 (time-ordered, index-friendly) for primary keys.
   - Floating-point `position REAL` for O(1) order insertion without rewriting row positions.
   - Use SQLite FTS5 for full-text search.
   - All foreign keys must have index and explicit `ON DELETE` rules (e.g. `CASCADE` or `SET NULL`).

4. **Async & Memory Efficiency**:
   - No unnecessary `.clone()` where borrowed references or lightweight types suffice.
   - Use `Arc<AppState>` for shared dependencies.
   - Handlers and async functions must be `Send + Sync`.

5. **Security & Validation**:
   - Hash passwords with Argon2id.
   - Sign and verify JWTs with proper expiration and claims validation.
   - Protect routes using Axum extractors (`AuthUser`).
   - Validate all DTOs using `validator::Validate` before processing.
