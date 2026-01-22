---
description: Run quality checks and tests for Backend (Python/uv) and Frontend (Reac/Vite).
---
# Quality Checks

## 1. Backend (Python)
Always ensure you are in the `backend` directory.

### Setup
Ensure dependencies are synced:
```bash
cd backend
uv sync
```

### Linting & Formatting
Use `ruff` via `uv` or directly if the venv is active.
```bash
cd backend
uv run ruff check --fix .
uv run ruff format .
```

### Testing
Run `pytest` with coverage.
```bash
cd backend
# Database URL is usually not needed for unit tests if using sqlite memory/file fallback,
# but for integration tests ensure DB is available.
uv run pytest
```

## 2. Frontend (React)
Always ensure you are in the `frontend` directory.

### Setup
```bash
cd frontend
npm ci
```

### Linting
```bash
cd frontend
npm run lint
```
*Note: If `lint` script is missing in package.json, check `eslint` directly.*

### Testing
```bash
cd frontend
npm test -- --watchAll=false
```

### Build Check
Verify the app builds without error.
```bash
cd frontend
npm run build
```

## 3. Global / Sonar
If running a manual Sonar scan (usually handled by CI or IDE extension):
```bash
sonar-scanner \
  -Dsonar.projectKey=planet_wars_combined \
  -Dsonar.sources=backend,frontend/src \
  -Dsonar.tests=backend/tests
```
