---
trigger: always_on
---

# Project Context: Planet Wars

**Planet Wars** is a browser-based strategy game where users manage resources and buildings to compete or progress. Act as en experienced full stack developer that likes clean, redable code and test driven development to implement it.

## Monorepo Structure
- **Root**: Contains orchestration (`render.yaml`, `docker-compose.yml`) and global configs (`sonar-project.properties`).
- **backend/**: Python/FastAPI application using `uv` for dependency management.
- **frontend/**: React/Vite application using `npm`.

## Technology Stack

### Backend
- **Language**: Python 3.11+
- **Framework**: FastAPI
- **Package Manager**: `uv` (creates `.venv` in `backend/`)
- **Database**: 
  - **Production/CI**: PostgreSQL (via `psycopg2-binary`)
  - **Local Dev**: SQLite (`test.db`)
- **ORM**: SQLAlchemy
- **Migration**: Custom `auto_migrate.py` script (inspects and updates schema).
- **Tools**: `ruff` (lint/format), `pytest` (testing).

### Frontend
- **Framework**: React (Vite)
- **Language**: TypeScript
- **Styling**: [Check if CSS/Tailwind]
- **Tools**: `npm`, `prettier` (via VS Code), `eslint` (implied).

## Deployment Pipeline (CI/CD)
The project uses **GitHub Actions** for CI and **Render** for CD.

### 1. GitHub Actions (`.github/workflows/deploy.yml`)
- **Triggers**: Push/Pull Request to `main`.
- **Jobs**:
    - **test-backend**:
        - Services: Postgres 15 sidecar.
        - Steps: Install `uv`, sync dependencies, run `pytest`, build Docker image.
    - **test-frontend**:
        - Steps: Install Node, `npm ci`, `npm test`, `npm run build`, build Docker image.
    - **deploy**:
        - Dependency: Runs only if tests pass.
        - Action: Triggers Render deployment via Deploy Hooks (curls `RENDER_DEPLOY_HOOK_URL_*`).

### 2. Render (`render.yaml`)
- **Blueprints**: Defines the infrastructure as code.
- **Services**:
    - **Backend**: Docker runtime. Built from `backend/` dir.
    - **Frontend**: Docker runtime. Built from `frontend/` dir. Uses Nginx to serve static files (Multi-stage build).
    - **Database**: Managed PostgreSQL (`planetwars-db`).

### Docker Strategies
- **Backend**: Uses `ghcr.io/astral-sh/uv:python3.12-bookworm-slim`. Optimizes build time by mounting `uv` caches and installing dependencies before copying code.
- **Frontend**: Multi-stage build.
    1.  `builder` (Node 20): Installs deps and runs `npm run build`.
    2.  `production` (Nginx): Copies `dist/` from builder to `/usr/share/nginx/html`.

## Best Practices & Code Quality
- **Clean Code**: Follow PEP 8 (Python) and standard Clean Code principles. Keep functions small and focused.
- **Readability**: Use meaningful variable names. Document complex logic.
- **Testing**: maintain high coverage. Run tests locally before pushing.
- **Security**: Never commit secrets (use env vars).

## API Documentation
The backend automatically generates OpenAPI documentation.
- **Local URL**: `http://localhost:8000/docs` (Swagger UI) or `/redoc`.
- **Standards**:
    - Use Pydantic models (`schemas.py`) for all Request/Response bodies.
    - Add `summary` and `description` to FastAPI route decorators.
    - Keep the `openapi.yaml` (if manually maintained) or generator script up to date.
