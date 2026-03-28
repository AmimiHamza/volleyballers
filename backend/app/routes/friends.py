from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import or_, and_

from app import db
from app.models.user import User
from app.models.friendship import Friendship
from app.middleware.auth import token_required
from app.utils.friends import get_friendship
from app.utils.notifications import create_notification

bp = Blueprint("friends", __name__)


# ── POST /api/friends/request ─────────────────────────────────────────────────

@bp.route("/request", methods=["POST"])
@token_required
def send_friend_request():
    data = request.get_json(silent=True) or {}
    target_id = data.get("user_id")

    if not target_id:
        return jsonify({"error": "missing_fields", "message": "user_id is required", "status": 400}), 400

    if target_id == g.user_id:
        return jsonify({"error": "self_request", "message": "Cannot send a friend request to yourself", "status": 400}), 400

    target = db.session.get(User, target_id)
    if not target:
        return jsonify({"error": "not_found", "message": "User not found", "status": 404}), 404

    existing = get_friendship(g.user_id, target_id)
    if existing:
        return jsonify({"error": "already_exists", "message": "A friendship or request already exists with this user", "status": 409}), 409

    friendship = Friendship(requester_id=g.user_id, addressee_id=target_id)
    db.session.add(friendship)

    requester = db.session.get(User, g.user_id)
    create_notification(
        target_id, "friend_request", "Friend Request",
        f"'{requester.username}' sent you a friend request",
        reference_type="friend_request", reference_id=friendship.id, actor_id=g.user_id,
    )
    db.session.commit()

    return jsonify({
        "data": {"id": friendship.id, "status": "pending"},
        "message": "Friend request sent",
    }), 201


# ── GET /api/friends ──────────────────────────────────────────────────────────

@bp.route("", methods=["GET"])
@token_required
def list_friends():
    friendships = Friendship.query.filter(
        Friendship.status == "accepted",
        or_(
            Friendship.requester_id == g.user_id,
            Friendship.addressee_id == g.user_id,
        ),
    ).all()

    friends = []
    for f in friendships:
        friend_id = f.addressee_id if f.requester_id == g.user_id else f.requester_id
        friend = db.session.get(User, friend_id)
        if friend:
            d = friend.to_public_dict()
            d["since"] = f.accepted_at.isoformat() + "Z" if f.accepted_at else None
            friends.append(d)

    return jsonify({"data": friends}), 200


# ── GET /api/friends/requests ─────────────────────────────────────────────────

@bp.route("/requests", methods=["GET"])
@token_required
def list_friend_requests():
    incoming = Friendship.query.filter_by(
        addressee_id=g.user_id, status="pending"
    ).all()
    outgoing = Friendship.query.filter_by(
        requester_id=g.user_id, status="pending"
    ).all()

    return jsonify({
        "data": {
            "incoming": [
                {
                    "id": f.id,
                    "user": db.session.get(User, f.requester_id).to_public_dict(),
                    "created_at": f.created_at.isoformat() + "Z" if f.created_at else None,
                }
                for f in incoming
            ],
            "outgoing": [
                {
                    "id": f.id,
                    "user": db.session.get(User, f.addressee_id).to_public_dict(),
                    "created_at": f.created_at.isoformat() + "Z" if f.created_at else None,
                }
                for f in outgoing
            ],
        }
    }), 200


# ── PUT /api/friends/requests/<id> ────────────────────────────────────────────

@bp.route("/requests/<int:request_id>", methods=["PUT"])
@token_required
def handle_friend_request(request_id):
    friendship = db.session.get(Friendship, request_id)
    if not friendship:
        return jsonify({"error": "not_found", "message": "Friend request not found", "status": 404}), 404

    # Addressee can accept/decline; requester can cancel (decline their own)
    is_addressee = friendship.addressee_id == g.user_id
    is_requester = friendship.requester_id == g.user_id
    if not is_addressee and not is_requester:
        return jsonify({"error": "forbidden", "message": "You cannot respond to this request", "status": 403}), 403

    if friendship.status != "pending":
        return jsonify({"error": "already_resolved", "message": "This request has already been resolved", "status": 400}), 400

    data = request.get_json(silent=True) or {}
    action = data.get("action", "").lower()

    if action not in ("accept", "decline"):
        return jsonify({"error": "invalid_action", "message": "Action must be 'accept' or 'decline'", "status": 400}), 400

    # Requester can only cancel (decline), not accept their own request
    if is_requester and not is_addressee and action == "accept":
        return jsonify({"error": "forbidden", "message": "You cannot accept your own request", "status": 403}), 403

    if action == "accept":
        friendship.status = "accepted"
        friendship.accepted_at = datetime.now(timezone.utc)
        accepter = db.session.get(User, g.user_id)
        create_notification(
            friendship.requester_id, "friend_accepted", "Friend Request Accepted",
            f"'{accepter.username}' accepted your friend request",
            reference_type="user", reference_id=g.user_id, actor_id=g.user_id,
        )
        db.session.commit()
        return jsonify({"data": {"id": friendship.id, "status": "accepted"}, "message": "Friend request accepted"}), 200
    else:
        # Decline or cancel — delete the record so they can re-request later
        db.session.delete(friendship)
        db.session.commit()
        return jsonify({"data": {"id": request_id, "status": "declined"}, "message": "Friend request declined"}), 200


# ── DELETE /api/friends/<user_id> ─────────────────────────────────────────────

@bp.route("/<int:user_id>", methods=["DELETE"])
@token_required
def unfriend(user_id):
    friendship = get_friendship(g.user_id, user_id)
    if not friendship or friendship.status != "accepted":
        return jsonify({"error": "not_found", "message": "Friendship not found", "status": 404}), 404

    db.session.delete(friendship)
    db.session.commit()

    return jsonify({"message": "Friend removed"}), 200
