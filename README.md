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
