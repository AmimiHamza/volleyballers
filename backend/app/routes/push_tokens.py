from flask import Blueprint, request, jsonify, g

from app import db
from app.models.device_push_token import DevicePushToken
from app.middleware.auth import token_required

bp = Blueprint("push_tokens", __name__)


@bp.route("", methods=["POST"])
@token_required
def register_push_token():
    data = request.get_json() or {}
    token = data.get("expo_push_token", "").strip()
    if not token or not token.startswith("ExponentPushToken["):
        return jsonify({"error": "invalid_token", "message": "Valid Expo push token required", "status": 400}), 400

    existing = DevicePushToken.query.filter_by(
        user_id=g.user_id, expo_push_token=token
    ).first()

    if existing:
        existing.is_active = True
        db.session.commit()
        return jsonify({"message": "Push token already registered"}), 200

    device = DevicePushToken(user_id=g.user_id, expo_push_token=token)
    db.session.add(device)
    db.session.commit()
    return jsonify({"message": "Push token registered"}), 201


@bp.route("", methods=["DELETE"])
@token_required
def unregister_push_token():
    data = request.get_json() or {}
    token = data.get("expo_push_token", "").strip()
    if not token:
        return jsonify({"error": "missing_token", "message": "Push token required", "status": 400}), 400

    device = DevicePushToken.query.filter_by(
        user_id=g.user_id, expo_push_token=token
    ).first()

    if device:
        device.is_active = False
        db.session.commit()

    return jsonify({"message": "Push token unregistered"}), 200
