from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import or_, and_, desc, func

from app import db, socketio
from app.models.user import User
from app.models.message import Message
from app.models.match import Match, MatchPlayer
from app.middleware.auth import token_required

bp = Blueprint("messages", __name__)


# ── GET /api/messages/conversations ──────────────────────────────────────────

@bp.route("/conversations", methods=["GET"])
@token_required
def list_conversations():
    """List of users this user has chatted with, with last message + unread count."""
    me = g.user_id

    # Find all distinct partner_ids
    sent_partners = db.session.query(Message.receiver_id).filter(Message.sender_id == me).distinct()
    received_partners = db.session.query(Message.sender_id).filter(Message.receiver_id == me).distinct()
    partner_ids = {pid for (pid,) in sent_partners.all()} | {pid for (pid,) in received_partners.all()}

    conversations = []
    for pid in partner_ids:
        partner = db.session.get(User, pid)
        if not partner:
            continue
        # Last message in this conversation
        last_msg = (
            Message.query.filter(
                or_(
                    and_(Message.sender_id == me, Message.receiver_id == pid),
                    and_(Message.sender_id == pid, Message.receiver_id == me),
                )
            )
            .order_by(desc(Message.created_at))
            .first()
        )
        # Unread count (messages from partner to me that are not read)
        unread = Message.query.filter_by(sender_id=pid, receiver_id=me, is_read=False).count()
        conversations.append({
            "user": partner.to_public_dict(),
            "last_message": last_msg.to_dict() if last_msg else None,
            "unread_count": unread,
        })

    # Sort by last message time, descending
    conversations.sort(
        key=lambda c: c["last_message"]["created_at"] if c["last_message"] else "",
        reverse=True,
    )

    return jsonify({"data": conversations}), 200


# ── GET /api/messages/<user_id> ──────────────────────────────────────────────

@bp.route("/<int:user_id>", methods=["GET"])
@token_required
def get_messages(user_id):
    """Get conversation history with another user. Marks incoming as read."""
    me = g.user_id
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)

    other = db.session.get(User, user_id)
    if not other:
        return jsonify({"error": "not_found", "message": "User not found", "status": 404}), 404

    query = (
        Message.query.filter(
            or_(
                and_(Message.sender_id == me, Message.receiver_id == user_id),
                and_(Message.sender_id == user_id, Message.receiver_id == me),
            )
        )
        .order_by(desc(Message.created_at))
    )
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    messages = [m.to_dict() for m in reversed(pagination.items)]

    # Mark incoming as read
    Message.query.filter_by(sender_id=user_id, receiver_id=me, is_read=False).update({"is_read": True})
    db.session.commit()

    return jsonify({
        "data": {
            "messages": messages,
            "user": other.to_public_dict(),
            "page": pagination.page,
            "pages": pagination.pages,
        }
    }), 200


# ── POST /api/messages ────────────────────────────────────────────────────────

@bp.route("", methods=["POST"])
@token_required
def send_message():
    data = request.get_json(silent=True) or {}
    receiver_id = data.get("receiver_id")
    match_id = data.get("match_id")
    content = (data.get("content") or "").strip()

    if not content:
        return jsonify({"error": "missing_fields", "message": "content required", "status": 400}), 400
    if len(content) > 2000:
        return jsonify({"error": "too_long", "message": "Message too long (max 2000 chars)", "status": 400}), 400

    sender = db.session.get(User, g.user_id)

    # Match group message
    if match_id:
        match = db.session.get(Match, match_id)
        if not match:
            return jsonify({"error": "not_found", "message": "Match not found", "status": 404}), 404
        # Must be a player or organizer to participate in match chat
        is_player = MatchPlayer.query.filter_by(match_id=match_id, user_id=g.user_id).first() is not None
        if not is_player and match.organizer_id != g.user_id:
            return jsonify({"error": "forbidden", "message": "You must be in the match to chat", "status": 403}), 403

        msg = Message(sender_id=g.user_id, match_id=match_id, content=content)
        db.session.add(msg)
        db.session.commit()
        payload = msg.to_dict()
        payload["sender"] = sender.to_public_dict()

        socketio.emit("new_message", payload, room=f"match_{match_id}")
        return jsonify({"data": payload, "message": "Message sent"}), 201

    # 1:1 direct message
    if not receiver_id:
        return jsonify({"error": "missing_fields", "message": "receiver_id or match_id required", "status": 400}), 400
    if receiver_id == g.user_id:
        return jsonify({"error": "self_message", "message": "Cannot send a message to yourself", "status": 400}), 400
    receiver = db.session.get(User, receiver_id)
    if not receiver:
        return jsonify({"error": "not_found", "message": "Receiver not found", "status": 404}), 404

    msg = Message(sender_id=g.user_id, receiver_id=receiver_id, content=content)
    db.session.add(msg)
    db.session.commit()

    payload = msg.to_dict()
    payload["sender"] = sender.to_public_dict()

    socketio.emit("new_message", payload, room=f"user_{receiver_id}")
    socketio.emit("new_message", payload, room=f"user_{g.user_id}")

    return jsonify({"data": payload, "message": "Message sent"}), 201


# ── GET /api/messages/match/<match_id> ───────────────────────────────────────

@bp.route("/match/<int:match_id>", methods=["GET"])
@token_required
def get_match_messages(match_id):
    """Group chat history for a match — only participants can read."""
    match = db.session.get(Match, match_id)
    if not match:
        return jsonify({"error": "not_found", "message": "Match not found", "status": 404}), 404

    is_player = MatchPlayer.query.filter_by(match_id=match_id, user_id=g.user_id).first() is not None
    if not is_player and match.organizer_id != g.user_id:
        return jsonify({"error": "forbidden", "message": "You must be in the match to view chat", "status": 403}), 403

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)

    query = (
        Message.query.filter(Message.match_id == match_id)
        .order_by(Message.created_at.desc())
    )
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    messages = []
    for m in reversed(pagination.items):
        d = m.to_dict()
        s = db.session.get(User, m.sender_id)
        if s:
            d["sender"] = s.to_public_dict()
        messages.append(d)

    return jsonify({
        "data": {
            "messages": messages,
            "match": {"id": match.id, "title": match.title},
            "page": pagination.page,
            "pages": pagination.pages,
        }
    }), 200


# ── PUT /api/messages/read/<user_id> ─────────────────────────────────────────

@bp.route("/read/<int:user_id>", methods=["PUT"])
@token_required
def mark_read(user_id):
    """Mark all messages from user_id to me as read."""
    Message.query.filter_by(sender_id=user_id, receiver_id=g.user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "Marked as read"}), 200


# ── GET /api/messages/unread-count ───────────────────────────────────────────

@bp.route("/unread-count", methods=["GET"])
@token_required
def unread_count():
    count = Message.query.filter_by(receiver_id=g.user_id, is_read=False).count()
    return jsonify({"data": {"count": count}}), 200
