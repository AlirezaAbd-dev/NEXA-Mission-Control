# TaskFlow System Architecture & SOLID Principles

## 1. Global Architectural Principles

- **Feature-Based Modular Structure**:
  Both the backend (`server/src/features/<feature>/`) and the frontend (`client/src/features/<feature>/`) follow domain-driven feature folder packaging.
  Features include: `auth`, `workspace`, `project`, `board`, `card`, `comment`, `checklist`, `label`, `member`, `sprint`, `time_log`, `activity`, `notification`, `search`, and `upload`.

- **Decoupled Architecture**:
  - Backend is a stateless REST API with JSON payloads and Bearer token JWT authentication.
  - Frontend is an autonomous Single Page Application built on React 19 + Vite 6 + React Router v7.
  - All communication is versioned under `/api/v1/*`.

## 2. SOLID Principles Enforcement

- **S (Single Responsibility Principle)**:
  - Backend: Each handler handles exactly one HTTP route. Each repository handles one domain's DB operations.
  - Frontend: Each React component handles exactly one piece of UI or interaction. Mixed concerns must be split.
  - Hooks: Each hook performs one query or mutation.

- **O (Open/Closed Principle)**:
  - Extensible service abstractions and modular feature routers.
  - Pluggable notification providers and storage handlers.
  - UI components accept customizable slot props and render props rather than hardcoded conditionals.

- **L (Liskov Substitution Principle)**:
  - Services and storage backends conform to uniform trait contracts.
  - UI primitives implement standard HTML element attributes consistently.

- **I (Interface Segregation Principle)**:
  - Small, targeted traits and DTOs.
  - React components accept only the specific props required for their render target.

- **D (Dependency Inversion Principle)**:
  - Handlers depend on service abstractions via state injection.
  - React components depend on customized hooks and API abstractions rather than direct fetch/axios calls.
