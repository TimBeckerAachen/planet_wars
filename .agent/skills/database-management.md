---
description: Manage the application database (PostgreSQL/SQLite) and migrations.
---
# Database Management

## 1. Local Development (SQLite)
The local backend uses a file-based SQLite database (`backend/test.db`).

### Auto-Migration
The project uses a custom `auto_migrate.py` script to detect missing columns/tables and add them. This runs automatically on app startup, but you can trigger it manually or check its logic.

**Location**: `backend/auto_migrate.py`

### Viewing Data
You can use the **SQLite Viewer** extension in VS Code or running:
```bash
cd backend
sqlite3 test.db
```

### Resetting the Database
To wipe the database and start fresh (useful for testing):
```bash
cd backend
rm test.db
# Restarting the FastAPI server will recreate the file and tables via SQLAlchemy models.
```

## 2. Production (PostgreSQL)
In production (Render), the app connects to a PostgreSQL instance.

### Migrations
The same `auto_migrate.py` logic runs against Postgres.
*Caution: The auto-migration script is basic. For complex schema changes (renaming columns, constraints), check `backend/auto_migrate.py` logic carefully to ensure Postgres compatibility.*

## 3. Creating New Models
1.  Define the model in `backend/models.py`.
2.  Ensure it is imported in `backend/main.py` or `backend/database.py` so SQLAlchemy `Base.metadata.create_all(bind=engine)` sees it.
3.  If adding columns to existing tables, update `backend/auto_migrate.py` to handle the `ALTER TABLE` logic.
