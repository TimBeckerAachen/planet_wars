---
description: How to implement a new feature in Planet Wars (backend + frontend)
---
# Implementing a New Feature

## 1. Planning
- Define models needed in `backend/models.py`
- Define schemas in `backend/schemas.py`
- Identify API endpoints to add in `backend/main.py`
- Identify frontend components/pages needed

## 2. Backend Implementation
// turbo
```bash
cd /workspaces/planet_wars/backend
```

### 2.1 Add Models
Edit `backend/models.py` with new SQLAlchemy models.

### 2.2 Add Schemas
Edit `backend/schemas.py` with Pydantic request/response models.

### 2.3 Add Game Logic (if needed)
Edit `backend/game_logic.py` for complex business logic.

### 2.4 Add API Endpoints
Edit `backend/main.py` with new FastAPI routes.

### 2.5 Run Backend Tests
// turbo
```bash
cd /workspaces/planet_wars/backend && PYTHONPATH=/workspaces/planet_wars/backend uv run pytest tests/ -v
```

## 3. Frontend Implementation
// turbo
```bash
cd /workspaces/planet_wars/frontend
```

### 3.1 Add Types
Edit `frontend/src/types.ts` with TypeScript interfaces.

### 3.2 Add API Functions
Edit `frontend/src/api.ts` with API calls.

### 3.3 Add Components/Pages
Create new files in `frontend/src/pages/` or `frontend/src/components/`.

### 3.4 Update Navigation
Edit `frontend/src/App.tsx` and `frontend/src/components/GameLayout.tsx` if needed.

### 3.5 Run Frontend Tests + Build
// turbo
```bash
cd /workspaces/planet_wars/frontend && npm test -- --run && npm run build
```

## 4. Update OpenAPI Spec
// turbo
```bash
cd /workspaces/planet_wars/backend && PYTHONPATH=/workspaces/planet_wars/backend uv run python dump_openapi.py
```

## 5. Final Verification
// turbo
```bash
cd /workspaces/planet_wars/backend && uv run ruff check --fix . && uv run ruff format .
```
