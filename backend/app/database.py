"""SQLite Database Connection and Schema Management for ExamIQ"""
import aiosqlite
import sqlite3
from typing import AsyncGenerator
from backend.app.config import DB_PATH

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    exam_date TEXT,
    semester TEXT,
    academic_year TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_demo INTEGER DEFAULT 0,
    settings_json TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    doc_type TEXT NOT NULL, -- 'question_paper', 'syllabus', 'course_material'
    exam_year INTEGER,
    semester TEXT,
    exam_type TEXT, -- 'MST', 'Mid-Sem', 'End-Sem', 'Quiz'
    file_path TEXT,
    file_size INTEGER,
    status TEXT NOT NULL, -- 'processing', 'completed', 'failed'
    extracted_text TEXT,
    page_count INTEGER DEFAULT 1,
    warnings_json TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS syllabus_units (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    unit_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS syllabus_topics (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    title TEXT NOT NULL,
    subtopics_json TEXT DEFAULT '[]',
    keywords_json TEXT DEFAULT '[]',
    student_mastery INTEGER DEFAULT 3, -- 1 (Low) to 5 (Mastered)
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES syllabus_units (id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    q_number TEXT,
    sub_q TEXT,
    text TEXT NOT NULL,
    marks REAL DEFAULT 5.0,
    question_type TEXT DEFAULT 'Theory', -- 'Theory', 'Numerical', 'Derivation', 'Programming', 'Diagram', 'Other'
    difficulty TEXT DEFAULT 'Medium', -- 'Easy', 'Medium', 'Hard'
    difficulty_reason TEXT,
    matched_topic_id TEXT,
    confidence_score REAL DEFAULT 0.0,
    mapping_status TEXT DEFAULT 'auto', -- 'auto', 'reviewed', 'uncertain'
    mapping_explanation TEXT,
    page_number INTEGER DEFAULT 1,
    is_repeated INTEGER DEFAULT 0,
    repeat_cluster_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
    FOREIGN KEY (matched_topic_id) REFERENCES syllabus_topics (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS revision_plans (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    exam_date TEXT NOT NULL,
    daily_hours REAL DEFAULT 3.0,
    available_days_json TEXT DEFAULT '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]',
    session_duration_mins INTEGER DEFAULT 60,
    total_planned_hours REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS revision_sessions (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    date TEXT NOT NULL,
    topic_id TEXT,
    unit_id TEXT,
    duration_mins INTEGER NOT NULL,
    activity_type TEXT NOT NULL, -- 'revising_concepts', 'solving_numericals', 'practicing_derivations', 'reviewing_mistakes', 'timed_practice'
    completed INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES revision_plans (id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES syllabus_topics (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_course ON questions(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(matched_topic_id);
CREATE INDEX IF NOT EXISTS idx_topics_course ON syllabus_topics(course_id);
CREATE INDEX IF NOT EXISTS idx_documents_course ON documents(course_id);
"""

async def init_db():
    """Initialize database tables and foreign keys."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON;")
        await db.executescript(SCHEMA_SQL)
        await db.commit()

async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Dependency for obtaining async database connection."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON;")
        yield db

def get_sync_db():
    """Helper for synchronous background operations."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn
