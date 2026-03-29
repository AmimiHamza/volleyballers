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
    from .models import user, match, friendship, rating, notification, device_push_token  # noqa: F401

    from .routes import auth, matches, friends, ratings, notifications, push_tokens
    app.register_blueprint(auth.bp, url_prefix="/api/auth")
    app.register_blueprint(matches.bp, url_prefix="/api/matches")
    app.register_blueprint(friends.bp, url_prefix="/api/friends")
    app.register_blueprint(ratings.bp, url_prefix="/api/ratings")
    app.register_blueprint(notifications.bp, url_prefix="/api/notifications")
    app.register_blueprint(push_tokens.bp, url_prefix="/api/push-tokens")

    # Serve uploaded files at /uploads/<path>
    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # Start match reminder scheduler (only in main process, not migrations)
    if os.environ.get("FLASK_SKIP_SCHEDULER") != "1":
        from .scheduler import start_scheduler
        start_scheduler(app)

    return app
