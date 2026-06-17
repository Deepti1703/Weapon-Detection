import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL/MySQL via DATABASE_URL in production; SQLite default for local development.
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_SQLITE = f"sqlite:///{os.path.join(_BASE_DIR, 'forensic_app.db').replace(chr(92), '/')}"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_SQLITE)

_connect_args = {}
# Check if it is sqlite instead of postgresql for development reasons
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
