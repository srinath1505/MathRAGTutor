# backend/config.py
import os
import dotenv
from pathlib import Path

# Load environment variables
dotenv.load_dotenv()

# Project root
ROOT_DIR = Path(__file__).parent.parent

# Data directory
DATA_DIR = ROOT_DIR / "backend" / "data"
DATA_DIR.mkdir(exist_ok=True)

# Vector DB
VECTOR_DB_DIR = ROOT_DIR / "vector_db"
VECTOR_DB_DIR.mkdir(exist_ok=True)

# Model settings
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
USE_GEMINI = True  # Set to False to fall back to local model

# API settings
API_HOST = "0.0.0.0"
API_PORT = 8000