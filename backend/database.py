"""Database setup and migration for AssentIQ."""

import os
import sqlite3
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "assentiq.db")


def get_connection():
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _add_column_if_missing(conn, table, column, definition):
    """Add a column to a table if it doesn't already exist."""
    cursor = conn.execute(f"PRAGMA table_info({table})")
    columns = [row["name"] for row in cursor.fetchall()]
    if column not in columns:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_db():
    """Initialize the database and create/migrate tables."""
    conn = get_connection()

    # Create tables if they don't exist
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            clinic_name TEXT,
            role TEXT NOT NULL DEFAULT 'patient',
            created_at TEXT NOT NULL,
            last_login TEXT
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            patient_name TEXT NOT NULL,
            procedure_id TEXT NOT NULL,
            tooth TEXT,
            clinic_name TEXT,
            doctor_name TEXT,
            created_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'in_progress',
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS qa_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );

        CREATE TABLE IF NOT EXISTS consents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL UNIQUE,
            user_id TEXT,
            signature_path TEXT NOT NULL,
            watched_video BOOLEAN NOT NULL DEFAULT 0,
            declaration_checked BOOLEAN NOT NULL DEFAULT 0,
            qa_summary TEXT,
            pdf_path TEXT,
            signed_at TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)

    # Migrate sessions table: add missing columns
    _add_column_if_missing(conn, "sessions", "user_id", "TEXT")
    _add_column_if_missing(conn, "sessions", "clinic_address", "TEXT")
    _add_column_if_missing(conn, "sessions", "clinic_phone", "TEXT")
    _add_column_if_missing(conn, "sessions", "clinic_email", "TEXT")
    _add_column_if_missing(conn, "sessions", "clinic_website", "TEXT")

    # Migrate consents table: add user_id if missing
    _add_column_if_missing(conn, "consents", "user_id", "TEXT")

    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")


def get_db():
    """Yield a database connection (for context management)."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()