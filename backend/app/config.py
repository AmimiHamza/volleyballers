import json
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# Shared config is optional in production
shared = {"server": {"host": "0.0.0.0", "port": 5000, "protocol": "http"}}
shared_path = os.path.join(BASE_DIR, "shared", "config.json")
if os.path.exists(shared_path):
    with open(shared_path) as f:
        shared = json.load(f)


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "sqlite:///volleyup.db",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET", "jwt-dev-secret")
    JWT_ACCESS_TOKEN_EXPIRES = 900  # 15 min
    JWT_REFRESH_TOKEN_EXPIRES = 2592000  # 30 days
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "backend", "uploads")
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB
    SERVER_HOST = shared["server"]["host"]
    SERVER_PORT = shared["server"]["port"]
