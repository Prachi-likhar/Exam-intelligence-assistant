"""ExamIQ Backend Application Configuration"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "examiq.db"

# Ensure data directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Default Scoring Weights
DEFAULT_WEIGHTS = {
    "frequency": 0.30,
    "weightage": 0.30,
    "trend": 0.15,
    "difficulty": 0.15,
    "weakness": 0.10
}
