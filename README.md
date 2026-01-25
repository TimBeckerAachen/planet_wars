# Planet Wars


**Planet Wars** is a persistent browser-based strategy game where players manage resources, constructs buildings, and command fleets to compete for dominance in a galaxy.

## Live Deployment

- **Frontend Application**: [https://planetwars-frontend.onrender.com](https://planetwars-frontend.onrender.com)
- **Backend API Docs**: [https://planetwars-backend.onrender.com/docs](https://planetwars-backend.onrender.com/docs)


## The Problem
Players need a persistent, competitive environment to test strategic resource management and fleet command skills against others in real-time. The game solves this by providing a stateful world where actions (like building construction or fleet travel) take real time to complete, requiring long-term planning and coordination.

## System Functionality

The system provides a comprehensive set of features for a space strategy game:

### 1. Dashboard & Planet Management
- **Resource Management**: Players manage 'Gold' as the primary resource.
- **Real-time Updates**: Resources update dynamically based on building production rates.
- **Construction**:
    - **Gold Mine**: Generates gold over time. Upgrading increases production.
    - **Solar Plant** (Planned): Provides energy.
    - **University**: Allows training of specialized units (Pilots).
    - **Space Ship Factory**: Manufactures fleets.

### 2. Units & Production
- **Pilots**: Trained in the University. Required to pilot spaceships.
- **Space Ships**: Built in the Factory. Required for fleet missions.

### 3. Galaxy Map
- **Navigation**: View the galaxy grid to discover other planets (players).
- **Interaction**: Select target planets to launch missions.

### 4. Fleet Missions
- **Attack**: Send ships to attack opponents.
- **Transport**: Securely move resources (Gold) between planets.
- **Travel Time**: Missions take real time based on distance.

### 5. Communication
- **Messages**: In-game notification system for battle reports and status updates.

## System Architecture

The project is structured as a **monorepo** containing both the backend service and the frontend application.

### Architecture Diagram
```mermaid
graph TD
    User[User Browser] -->|HTTP/REST| Nginx[Frontend Server (Nginx)]
    User -->|HTTP/REST| API[Backend API (FastAPI)]
    
    subgraph "Docker Compose / Render"
        Nginx -->|Serves Static Files| React[React App]
        API -->|Reads/Writes| DB[(PostgreSQL)]
    end
```

### Components

#### 1. Frontend (UI Layer)
-   **Tech**: React, TypeScript, Vite, Tailwind CSS.
-   **Role**: A Single Page Application (SPA) that provides the interactive game interface.
-   **Communication**: Consumes the Backend REST API for all game actions and state retrieval.

#### 2. Backend (Service Layer)
-   **Tech**: Python, FastAPI, SQLAlchemy, Pydantic.
-   **Role**: The authoritative game server. Handles business logic (building upgrades, fleet travel calculations), user authentication (JWT), and data validation.
-   **Dependency Management**: Uses `uv` for fast, reliable package management.

#### 3. Database (Persistence Layer)
-   **Tech**: PostgreSQL 15.
-   **Role**: Stores persistent data including User accounts, Planet configurations, Buildings, Units, and active Fleet Missions.

#### 4. Infrastructure & DevOps
-   **Containerization**: Both services are containerized using **Docker**.
    -   *Backend*: Optimized python-slim image.
    -   *Frontend*: Multi-stage build (Node build -> Nginx runtime).
-   **CI/CD**: **GitHub Actions** automates the pipeline:
    -   *Test*: Runs `pytest` and `npm test` on every push.
    -   *Deploy*: Pushes new versions to **Render** upon successful tests on `main`.

## Quality Assurance & Standards

### API Contract (OpenAPI)
The **OpenAPI specification** serves as the strict contract between Frontend and Backend.
-   **Source of Truth**: The API spec is generated from the backend models but serves as the definitive guide for frontend integration.
-   **Alignment**: The specification fully reflects the frontend requirements, ensuring seamless data exchange.

### Frontend
-   **Functional & Structured**: The codebase is organized by feature (Pages, Components) and follows modern React/Vite best practices.
-   **Testing**: Tests cover core logic (unit tests) and are run via `npm test`. Instructions are provided in the [Testing](#testing) section.

### Backend
-   **Structured Implementation**: The backend is organized into clear modules (`models`, `schemas`, `api`, `game_logic`).
-   **OpenAPI Adherence**: The implementation strictly follows the defined Pydantic schemas and API routes.
-   **Testing**: Comprehensive `pytest` coverage ensures core functionality (Game Logic, Auth, State) is reliable.
## Project Expectations & Technical Goals

This project serves as a reference implementation for a modern, full-stack web application.

- **Monorepo Architecture**: Clean separation of Backend and Frontend in a single repository.
- **Clean Code**: Adherence to PEP 8 (Python) and strict TypeScript typing.
- **Test-Driven Development**: Comprehensive testing for both backend (`pytest`) and frontend (`vitest`).
- **CI/CD**: Automated pipelines via GitHub Actions for testing and deployment.
- **Containerization**: optimized Docker builds for production deployment.

## Technology Stack

### Backend
- **Language**: Python 3.11+
- **Framework**: FastAPI
- **Dependency Management**: `uv`
- **Database**: PostgreSQL (Production), SQLite (Local Dev)
- **ORM**: SQLAlchemy
- **Linting**: `ruff`

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Testing**: Vitest + React Testing Library

## Database Integration

The system includes a fully integrated database layer designed for flexibility and robustness.

- **Dual-Environment Support**:
    - **Development**: Defaults to **SQLite** (`test.db`) for zero-conf local development.
    - **Production**: Seamlessly switches to **PostgreSQL** via the `DATABASE_URL` environment variable.
- **Schema Management**:
    - Uses **SQLAlchemy** for ORM-based model definitions.
    - Includes a custom automatic migration script (`auto_migrate.py`) that handles schema updates on application startup.
- **Documentation**:
    - Database schemas are defined in `backend/models.py`.
    - Pydantic models for API validation are in `backend/schemas.py`.

## Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- `uv` (Python package manager): `pip install uv`

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   uv sync
   ```
3. Run the development server:
   ```bash
   uv run uvicorn main:app --reload
   ```
   The API will be available at `http://localhost:8000`. Documentation at `/docs`.

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

## Running with Docker

The entire system can be run using Docker, ensuring a consistent environment and easy deployment.

### Prerequisites
- Docker & Docker Compose

### Instructions

1. **Build and Start Services**:
   Run the following command from the root directory:
   ```bash
   docker-compose up --build
   ```

2. **Access the Application**:
   - **Frontend**: `http://localhost:80` (Served via Nginx)
   - **Backend API**: `http://localhost:8000`
   - **API Documentation**: `http://localhost:8000/docs`

3. **Stop Services**:
   ```bash
   docker-compose down
   ```
   *Note: This will preserve database data in the `postgres_data` volume.*

## Testing

### Running Backend Tests
```bash
cd backend
uv run pytest
```

### Running Frontend Tests
```bash
cd frontend
npm test
```

## Deployment & CI/CD

The project is configured for automated deployment on **Render** via **GitHub Actions**, ensuring a robust and reproducible delivery pipeline.

### CI/CD Pipeline
The pipeline (`.github/workflows/deploy.yml`) acts as a strict quality gate:

1.  **Automated Testing**: On every push or pull request to `main`, the system runs:
    -   **Backend**: `pytest` (with a sidecar PostgreSQL service).
    -   **Frontend**: `npm test` (Vitest).
2.  **Deployment**:
    -   Deployment to Render is **only** triggered if *all* tests pass.
    -   This prevents broken code from reaching the production environment.

### Reproducibility
The system is designed to be fully reproducible:
-   **Local Development**: `docker-compose up --build` brings up an identical stack to production (Nginx + API + Postgres).
-   **Infrastructure**: `render.yaml` defines the production infrastructure as code.
-   **Environment**: Dependencies are strictly pinned via `uv.lock` (Python) and `package-lock.json` (Node).


## AI-Assisted Development

This project was developed with the assistance of **Google Deepmind's Antigravity**, an advanced agentic AI coding assistant.

### Agentic Workflow
The development followed an agentic workflow where the AI:
1.  **Planned** tasks using `task.md` and `implementation_plan.md`.
2.  **Executed** changes autonomously.
3.  **Verified** results before requesting user review.

### Model Context Protocol (MCP)
Antigravity used the **Model Context Protocol (MCP)** to interact with the local development environment securely.
-   **Tools**: The agent utilized tools like `view_file`, `write_to_file`, `run_command`, and `grep_search` to understand and modify the codebase.
-   **Context**: The agent maintained context through the `.agent` directory configuration.

### Agent Configuration (`.agent/`)
The project contains specific configuration files for the AI agent:
-   **`rules/`**: Defined project-specific constraints (e.g., "Use `uv` for Python", "Monorepo structure").
-   **`skills/`**: Specialized capabilities available to the agent.
-   **`workflows/`**: Pre-defined procedures for common tasks (e.g., `/implement-feature`).

### Initial Prompt
The project was scaffolded based on the following initial request:

> I want to build a web application. My preffered language is python with fastAPI for the backend + postgreSQL.
>
> For the frontend I want to use React/Typescript + vite. For python I want to use uv for managing my dependencies.
>
> for ci/cd I want to use github actions. the code for frontend and backend should be in the same repository, but in different directories. I want tests for both frontend and backend that should run on github actions.
>
> Please setup the inital structure of the project with some dummy code for frontend and backend and tests and setup the ci/cd pipeline.
