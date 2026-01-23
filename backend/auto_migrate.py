from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from database import engine


def run_auto_migrations():
    """
    Check for missing columns and add them.
    This is a simple auto-migration for development/prototype speed.
    """
    inspector = inspect(engine)

    # Get columns for 'users' table
    # inspector.get_columns('users') returns a list of dicts: {'name': 'username', ...}

    # We might be running against SQLite (local tests) or Postgres (Render)
    # The SQL syntax for ADD COLUMN is standard enough for this.

    if not inspector.has_table("users"):
        print(
            "Migrating: Table 'users' not found. Skipping auto-migration (create_all will handle it)."
        )
        return

    columns = [c["name"] for c in inspector.get_columns("users")]
    print(f"Migrating: Check. Found columns in 'users': {columns}")

    with engine.begin() as conn:  # use begin() for auto-commit transaction
        # Add 'gold' column
        if "gold" not in columns:
            print("Migrating: Adding 'gold' column to users table...")
            conn.execute(
                text("ALTER TABLE users ADD COLUMN gold INTEGER DEFAULT 100 NOT NULL")
            )

        # Add 'last_resource_update' column
        if "last_resource_update" not in columns:
            print("Migrating: Adding 'last_resource_update' column to users table...")
            dialect = engine.dialect.name
            if dialect == "postgresql":
                type_str = "TIMESTAMP WITH TIME ZONE"
            else:
                type_str = "DATETIME"
            conn.execute(
                text(
                    f"ALTER TABLE users ADD COLUMN last_resource_update {type_str} DEFAULT CURRENT_TIMESTAMP"
                )
            )

    # START: Migration for Buildings
    if inspector.has_table("buildings"):
        columns = [c["name"] for c in inspector.get_columns("buildings")]
        print(f"Migrating: Check. Found columns in 'buildings': {columns}")

        with engine.begin() as conn:
            # Add 'production_type'
            if "production_type" not in columns:
                print(
                    "Migrating: Adding 'production_type' column to buildings table..."
                )
                conn.execute(
                    text("ALTER TABLE buildings ADD COLUMN production_type VARCHAR")
                )

            # Add 'production_finish_time'
            if "production_finish_time" not in columns:
                print(
                    "Migrating: Adding 'production_finish_time' column to buildings table..."
                )
                dialect = engine.dialect.name
                if dialect == "postgresql":
                    type_str = "TIMESTAMP WITH TIME ZONE"
                else:
                    type_str = "DATETIME"
                conn.execute(
                    text(
                        f"ALTER TABLE buildings ADD COLUMN production_finish_time {type_str}"
                    )
                )

                conn.execute(
                    text(
                        f"ALTER TABLE buildings ADD COLUMN production_finish_time {type_str}"
                    )
                )

    # START: Migration for Planets (Unique Name)
    if inspector.has_table("planets"):
        # We cannot easily check for constraints via Inspector in a cross-DB way that is simple.
        # But we can try to create a UNIQUE INDEX if it doesn't exist.
        # This enforces the uniqueness constraint.
        print("Migrating: Ensuring unique index on planet name...")
        try:
            # SQLite and Postgres support CREATE UNIQUE INDEX IF NOT EXISTS
            conn = engine.connect()
            with conn.begin():
                conn.execute(
                    text(
                        "CREATE UNIQUE INDEX IF NOT EXISTS idx_planets_name_unique ON planets (name)"
                    )
                )
            conn.close()
        except Exception as e:
            print(f"Migrating warning: Could not create unique index: {e}")

    print("Auto-migration check complete.")
