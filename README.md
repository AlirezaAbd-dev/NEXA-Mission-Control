# NEXA Mission Control (Tasks)

High-performance project management and task tracking system built for the NEXA platform.

## Architecture

- **`client/`**: Modern React 19 single-page application built with Vite, TypeScript, Tailwind CSS, Zustand, and TanStack React Query.
- **`server/`**: High-performance Rust backend built with Axum, SQLx (PostgreSQL), Tokio, and Argon2/JWT authentication.
- **`.rules/`**: Architectural principles, Rust conventions, and React guidelines.

## Getting Started

### Backend (`server`)

Requirements: Rust (cargo), PostgreSQL

```bash
cd server
cp .env.example .env # configure database URL & secrets
cargo run
```

### Frontend (`client`)

Requirements: Node.js, pnpm

```bash
cd client
pnpm install
pnpm dev
```
