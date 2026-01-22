from sqlalchemy import text, inspect
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
    
    # Note: verify table exists first (Base.metadata.create_all runs first usually, but check anyway)
    if not inspector.has_table("users"):
        return # create_all will handle it
        
    columns = [c["name"] for c in inspector.get_columns("users")]
    
    with engine.connect() as conn:
        # Add 'gold' column
        if "gold" not in columns:
            print("Migrating: Adding 'gold' column to users table...")
            # Default to 100 for existing users
            conn.execute(text("ALTER TABLE users ADD COLUMN gold INTEGER DEFAULT 100 NOT NULL"))
            
        # Add 'last_resource_update' column
        if "last_resource_update" not in columns:
            print("Migrating: Adding 'last_resource_update' column to users table...")
            # Postgres: timestamp with time zone. SQLite: keys off string/datetime.
            # SQLAlchemy DateTime(timezone=True) maps to TIMESTAMPTZ in Postgres.
            # We can use a generic type or dialect specific.
            # Using 'TIMESTAMP WITH TIME ZONE' is safe for Postgres. 
            # SQLite ignores 'WITH TIME ZONE' but accepts it or we can just use DATETIME.
            
            dialect = engine.dialect.name
            if dialect == 'postgresql':
                type_str = "TIMESTAMP WITH TIME ZONE"
            else:
                type_str = "DATETIME"
                
            conn.execute(text(f"ALTER TABLE users ADD COLUMN last_resource_update {type_str} DEFAULT CURRENT_TIMESTAMP"))
            
        conn.commit()
    print("Auto-migration check complete.")
