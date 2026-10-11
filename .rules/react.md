# React 19 & Tailwind v4 Frontend Rules

1. **Single Responsibility Principle (Component Level)**:
   - One component does strictly one thing.
   - If a component has multiple distinct UI sections or mixed state/logic, extract into focused child components.
   - Separate container/page components from presentational/view components.

2. **Server State Management (TanStack Query v5)**:
   - Server state belongs ONLY in TanStack Query. Never copy server state into local `useState` or `zustand`.
   - Each query or mutation MUST be encapsulated in a single custom hook (e.g., `useCreateCard`, `useCards`).
   - Query keys must NEVER be hardcoded strings. Use the centralized `QUERY_KEYS` constants object from `src/constants/queryKeys.ts`.
   - Mutations must handle cache invalidation, optimistic updates, and error rollbacks where appropriate.

3. **Client / UI State Management (Zustand v5)**:
   - Use Zustand strictly for client-only UI state (sidebar collapse, active modal IDs, board view filters, theme).
   - Use named exports for stores.
   - Keep stores atomic and modular (e.g., `useUiStore`, `useBoardFilterStore`).

4. **Styling & Design System (Tailwind CSS v4 & Styled UI Primitives)**:
   - Tailwind v4 CSS-first config using `@import "tailwindcss";` and `@theme {}` in `src/styles/globals.css`.
   - Never use ad-hoc inline styles or raw unstyled primitive elements (`<button>`, `<input>`, `<select>`) directly in feature code.
   - Always reuse the centralized UI primitives located in `src/components/ui/` (Button, Input, Dialog, Dropdown, Popover, Badge, Card, Avatar, etc.).
   - Support dark mode using standard Tailwind variants and CSS tokens.
   - Mobile-first responsive design (`sm:`, `md:`, `lg:`, `xl:`). Standard spacing and alignments.

5. **Modern React 19 Patterns**:
   - `ref` is passed directly as a standard prop (no `forwardRef` needed).
   - Leverage React Compiler optimizations without cluttering code with manual `useCallback`/`useMemo` unless specifically required.
   - Clean TypeScript typings: strict mode, no `any`, explicit interfaces/types.

6. **Custom Form & Field Error Handling**:
   - Every form must display clear validation and API error feedback.
   - Inputs and fields must support explicit error states, visual error highlights, and descriptive error messages rendered beneath the field.
   - Server validation errors must be gracefully extracted and mapped to relevant form fields or visible alert banners.

7. **Modal-Based Action Confirmations**:
   - NEVER use native browser `confirm()`, `alert()`, or `prompt()` dialogs.
   - Always use the custom `ConfirmModal` component (or customized UI Modal primitive) for any destructive, state-altering, or user-confirmed action.
