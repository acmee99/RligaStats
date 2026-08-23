import os
from datetime import datetime

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Get the directory where config.py is located (backend directory)
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    INSTANCE_DIR = os.path.join(BASE_DIR, 'instance')
    
    # Ensure instance directory exists
    os.makedirs(INSTANCE_DIR, exist_ok=True)
    
    # Use absolute path for database - convert Windows path to forward slashes for SQLite URI
    DATABASE_PATH = os.path.join(INSTANCE_DIR, 'database.db')
    # Convert backslashes to forward slashes for SQLite URI on Windows
    DATABASE_PATH_URI = DATABASE_PATH.replace('\\', '/')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///' + DATABASE_PATH_URI
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}