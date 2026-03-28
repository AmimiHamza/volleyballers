import os
import time
from flask import Blueprint, request, jsonify, g, current_app, send_from_directory
import bcrypt
import jwt

from sqlalchemy import or_

from app import db
from app.models.user import User
from app.models.match import Match, MatchPlayer
from app.models.rating import Rating
from app.middleware.auth import token_required
from app.utils.tokens import generate_access_token, generate_refresh_token

bp = Blueprint("auth", __name__)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}


def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ── POST /api/auth/register ──────────────────────────────────────────────────

@bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    phone_number = data.get("phone_number")

    if not username or not password:
        return jsonify({"error": "missing_fields", "message": "Username and password are required", "status": 400}), 400

    if len(password) < 8:
        return jsonify({"error": "password_too_short", "message": "Password must be at least 8 characters", "status": 422}), 422

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "username_exists", "message": "Username already exists", "status": 409}), 409

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

    user = User(username=username, password_hash=password_hash, phone_number=phone_number)
    db.session.add(user)
    db.session.commit()

    access_token = generate_access_token(user.id)
    refresh_token = generate_refresh_token(user.id)

    return jsonify({
        "data": {
            "user_id": user.id,
            "username": user.username,
            "access_token": access_token,
            "refresh_token": refresh_token,
        },
        "message": "Registration successful",
    }), 201


# ── POST /api/auth/login ─────────────────────────────────────────────────────

@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "missing_credentials", "message": "Username and password are required", "status": 400}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8")):
        return jsonify({"error": "invalid_credentials", "message": "Invalid username or password", "status": 401}), 401

    access_token = generate_access_token(user.id)
    refresh_token = generate_refresh_token(user.id)

    return jsonify({
        "data": {
            "user_id": user.id,
            "username": user.username,
            "access_token": access_token,
            "refresh_token": refresh_token,
        },
        "message": "Login successful",
    }), 200


# ── POST /api/auth/refresh ───────────────────────────────────────────────────

@bp.route("/refresh", methods=["POST"])
def refresh():
    data = request.get_json(silent=True) or {}
    refresh_token = data.get("refresh_token", "")

    if not refresh_token:
        return jsonify({"error": "missing_token", "message": "Refresh token is required", "status": 400}), 400

    try:
        payload = jwt.decode(refresh_token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise jwt.InvalidTokenError("Not a refresh token")
        access_token = generate_access_token(payload["user_id"])
        return jsonify({"data": {"access_token": access_token}, "message": "Token refreshed"}), 200
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "token_expired", "message": "Refresh token has expired", "status": 401}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "invalid_token", "message": "Invalid or expired refresh token", "status": 401}), 401


# ── GET /api/auth/profile ────────────────────────────────────────────────────

@bp.route("/profile", methods=["GET"])
@token_required
def get_profile():
    user = db.session.get(User, g.user_id)
    if not user:
        return jsonify({"error": "not_found", "message": "User not found", "status": 404}), 404

    return jsonify({"data": user.to_dict()}), 200


# ── PUT /api/auth/profile ────────────────────────────────────────────────────

@bp.route("/profile", methods=["PUT"])
@token_required
def update_profile():
    user = db.session.get(User, g.user_id)
    if not user:
        return jsonify({"error": "not_found", "message": "User not found", "status": 404}), 404

    # Handle multipart form data (for file upload) or JSON
    if request.content_type and "multipart/form-data" in request.content_type:
        phone_number = request.form.get("phone_number")
        bio = request.form.get("bio")
        file = request.files.get("profile_picture")
    else:
        data = request.get_json(silent=True) or {}
        phone_number = data.get("phone_number")
        bio = data.get("bio")
        file = None

    if phone_number is not None:
        user.phone_number = phone_number
    if bio is not None:
        user.bio = bio

    if file:
        if not _allowed_file(file.filename):
            return jsonify({"error": "invalid_file_type", "message": "Only JPEG and PNG files are allowed", "status": 400}), 400

        profiles_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "profiles")
        os.makedirs(profiles_dir, exist_ok=True)

        ext = file.filename.rsplit(".", 1)[1].lower()
        filename = f"{user.id}_{int(time.time())}.{ext}"
        filepath = os.path.join(profiles_dir, filename)
        file.save(filepath)

        # Remove old profile picture if it exists
        if user.profile_picture:
            old_path = os.path.join(current_app.config["UPLOAD_FOLDER"], user.profile_picture.lstrip("/uploads/"))
            if os.path.exists(old_path):
                os.remove(old_path)

        user.profile_picture = f"/uploads/profiles/{filename}"

    db.session.commit()

    return jsonify({"data": user.to_dict(), "message": "Profile updated"}), 200


# ── GET /api/auth/users/<id> ──────────────────────────────────────────────────

@bp.route("/users/<int:user_id>", methods=["GET"])
@token_required
def get_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "not_found", "message": "User not found", "status": 404}), 404

    return jsonify({"data": user.to_public_dict()}), 200


# ── GET /api/auth/search?q=term ──────────────────────────────────────────────

@bp.route("/search", methods=["GET"])
@token_required
def search_users():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"data": []}), 200

    users = User.query.filter(
        User.username.ilike(f"%{query}%"),
        User.id != g.user_id,
    ).limit(20).all()

    return jsonify({"data": [u.to_public_dict() for u in users]}), 200


# ── GET /api/auth/profile/history ──────────────────────────────────────────────

@bp.route("/profile/history", methods=["GET"])
@token_required
def match_history():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 50)
    role_filter = request.args.get("role", "all")

    # Matches where user is organizer OR a player
    player_match_ids = db.session.query(MatchPlayer.match_id).filter_by(user_id=g.user_id).subquery()

    if role_filter == "organizer":
        query = Match.query.filter(Match.organizer_id == g.user_id)
    elif role_filter == "player":
        query = Match.query.filter(Match.id.in_(player_match_ids), Match.organizer_id != g.user_id)
    else:
        query = Match.query.filter(
            or_(Match.organizer_id == g.user_id, Match.id.in_(player_match_ids))
        )

    query = query.order_by(Match.date.desc(), Match.time.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    matches = []
    for m in pagination.items:
        role = "organizer" if m.organizer_id == g.user_id else "player"
        given_count = Rating.query.filter_by(match_id=m.id, rater_id=g.user_id).count()
        received_count = Rating.query.filter_by(match_id=m.id, ratee_id=g.user_id).count()
        matches.append({
            "id": m.id,
            "title": m.title,
            "date": m.date.isoformat() if m.date else None,
            "location": m.location,
            "status": m.status,
            "role": role,
            "player_count": m.current_players,
            "my_ratings_given": given_count,
            "my_ratings_received": received_count,
        })

    # Stats
    user = db.session.get(User, g.user_id)
    total_as_organizer = Match.query.filter_by(organizer_id=g.user_id).count()
    total_as_player = db.session.query(MatchPlayer).filter_by(user_id=g.user_id).count()

    return jsonify({
        "data": {
            "matches": matches,
            "total": pagination.total,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "pages": pagination.pages,
            "stats": {
                "total_matches": user.total_matches,
                "as_organizer": total_as_organizer,
                "as_player": total_as_player,
                "average_rating": round(user.average_rating, 2) if user.average_rating else 0,
            },
        }
    }), 200


# ── Serve uploaded files ─────────────────────────────────────────────────────

@bp.route("/uploads/<path:filename>", methods=["GET"])
def uploaded_file(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)
