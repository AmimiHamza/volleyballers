import os
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_socketio import SocketIO
from .config import Config

db = SQLAlchemy()
migrate = Migrate()
socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)

    from .models import user, match, friendship, rating, notification, device_push_token, message  # noqa: F401

    from .routes import auth, matches, friends, ratings, notifications, push_tokens, users, messages, client_errors
    app.register_blueprint(auth.bp, url_prefix="/api/auth")
    app.register_blueprint(matches.bp, url_prefix="/api/matches")
    app.register_blueprint(friends.bp, url_prefix="/api/friends")
    app.register_blueprint(ratings.bp, url_prefix="/api/ratings")
    app.register_blueprint(notifications.bp, url_prefix="/api/notifications")
    app.register_blueprint(push_tokens.bp, url_prefix="/api/push-tokens")
    app.register_blueprint(users.bp, url_prefix="/api/users")
    app.register_blueprint(messages.bp, url_prefix="/api/messages")
    app.register_blueprint(client_errors.bp, url_prefix="/api/client-errors")

    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    if os.environ.get("FLASK_SKIP_SCHEDULER") != "1":
        from .scheduler import start_scheduler
        start_scheduler(app)

    # Register SocketIO event handlers
    from . import socket_handlers  # noqa: F401
    socketio.init_app(app)

    return app
