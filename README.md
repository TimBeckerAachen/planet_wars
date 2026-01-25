# Planet Wars

**Planet Wars** is a persistent browser-based strategy game where players manage resources, constructs buildings, and command fleets to compete for dominance in a galaxy.

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

## Deployment

The project is configured for deployment on **Render** via **GitHub Actions**.
- **CI**: Runs tests on every push/PR.
- **CD**: Deploys to Render only after tests pass on the `main` branch.

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
