
PBMS uses Jest as the shared test runner across the frontend and backend.

## Folder conventions

- `tests/unit/frontend/`: fast React and UI utility tests
- `tests/unit/backend/`: fast Node and route-helper tests
- `tests/integration/backend/`: Express route tests with injected Supabase doubles
- `tests/e2e/frontend/`: end-to-end style UI flow tests in `jsdom`
- `tests/setup/`: shared Jest setup files
- `tests/utils/`: reusable render helpers and Supabase mocks

## Naming conventions

Use `*.test.js`, `*.test.jsx`, `*.spec.js`, or `*.spec.jsx`.

## Supabase convention

Do not hit live Supabase from Jest by default. Unit, integration, and e2e tests should mock or inject the database layer unless a future dedicated integration environment is explicitly being used such as deno.
