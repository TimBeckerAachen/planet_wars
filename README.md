# Full-Stack Web Application

## Overview
This is a full-stack web application built with:
- **Backend**: FastAPI + PostgreSQL (managed via uv)
- **Frontend**: React + TypeScript + Vite
- **CI/CD**: GitHub Actions

## Project Structure
- `backend/`: FastAPI application
- `frontend/`: React application

## Setup

### Backend
1. Install uv: `pip install uv`
2. Navigate to backend: `cd backend`
3. Install dependencies: `uv sync`
4. Run server: `uv run uvicorn main:app --reload`

### Frontend
1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`

## Tests
- Backend: `cd backend && uv run pytest`
- Frontend: `cd frontend && npm test`


Full-Stack Application Setup Walkthrough
I have successfully set up the initial structure for your full-stack web application with FastAPI, React, PostgreSQL, and GitHub Actions.

Project Overview
The project is organized as a monorepo with separate directories for backend and frontend:

planet_wars/
├── backend/                # FastAPI application
│   ├── main.py            # API entry point
│   ├── database.py        # Database connection
│   ├── models.py          # SQLAlchemy models
│   ├── pyproject.toml     # Python dependencies (uv)
│   └── tests/             # Backend tests
├── frontend/              # React application
│   ├── src/               # Source code
│   ├── vite.config.ts     # Vite configuration
│   ├── package.json       # Node dependencies
│   └── index.html         # Entry point
└── .github/
    └── workflows/         # CI/CD pipelines
Backend Configuration
Framework: FastAPI
Dependency Management: uv (configured in 
pyproject.toml
)
Database: SQLAlchemy with PostgreSQL
Testing: pytest (configured in 
pyproject.toml
 and tests/)
Frontend Configuration
Framework: React with TypeScript
Build Tool: Vite
Testing: Vitest + React Testing Library
Linting: ESLint + TypeScript configs
CI/CD Pipelines
I've created two GitHub Actions workflows:

Backend CI (
.github/workflows/backend.yml
):

Sets up Python and PostgreSQL
Installs dependencies with uv
Runs tests with pytest
Frontend CI (
.github/workflows/frontend.yml
):

Sets up Node.js
Installs dependencies
Runs tests and build
Next Steps
Install Backend Dependencies:

cd backend
pip install uv
uv sync
Start Backend Server:

uv run uvicorn main:app --reload
Install Frontend Dependencies:

cd frontend
npm install
Start Frontend Server:

npm run dev
You can now visit http://localhost:5173 to see your application running.


first prompt:

I want to build a web application. My preffered language is python with fastAPI for the backend + postgreSQL. 

For the frontend I want to use React/Typescript + vite. For python I want to use uv for managing my dependencies.

for ci/cd I want to use github actions. the code for frontend and backend should be in the same repository, but in different directories. I want tests for both frontend and backend that should run on github actions.

Please setup the inital structure of the project with some dummy code for frontend and backend and tests and setup the ci/cd pipeline.