import os
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from .config import Config

db = SQLAlchemy()
migrate = Migrate()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)

    # Import models so Migrate can detect them
    from .models import user, match, friendship, rating, notification  # noqa: F401

    from .routes import auth, matches, friends, ratings, notifications
    app.register_blueprint(auth.bp, url_prefix="/api/auth")
    app.register_blueprint(matches.bp, url_prefix="/api/matches")
    app.register_blueprint(friends.bp, url_prefix="/api/friends")
    app.register_blueprint(ratings.bp, url_prefix="/api/ratings")
    app.register_blueprint(notifications.bp, url_prefix="/api/notifications")

    # Serve uploaded files at /uploads/<path>
    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    return app
