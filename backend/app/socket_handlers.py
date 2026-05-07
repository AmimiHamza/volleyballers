import jwt
from flask import current_app, request
from flask_socketio import join_room, leave_room, emit

from app import socketio, db
from app.models.match import Match, MatchPlayer


def _decode_user_id(token):
    if not token:
        return None
    try:
        payload = jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
        if payload.get("type") != "access":
            return None
        return payload.get("user_id")
    except jwt.PyJWTError:
        return None


def _user_id_from_data(data):
    if not isinstance(data, dict):
        return None
    return _decode_user_id(data.get("token"))


@socketio.on("connect")
def on_connect(auth):
    token = None
    if isinstance(auth, dict):
        token = auth.get("token")
    if not token:
        token = request.args.get("token")

    user_id = _decode_user_id(token)
    if not user_id:
        return False

    join_room(f"user_{user_id}")
    emit("connected", {"user_id": user_id})


@socketio.on("typing")
def on_typing(data):
    user_id = _user_id_from_data(data)
    if not user_id:
        return
    receiver_id = data.get("receiver_id")
    if receiver_id:
        emit(
            "typing",
            {"sender_id": user_id, "is_typing": bool(data.get("is_typing"))},
            room=f"user_{receiver_id}",
        )


@socketio.on("join_match_chat")
def on_join_match(data):
    user_id = _user_id_from_data(data)
    if not user_id:
        return
    match_id = data.get("match_id")
    if not match_id:
        return
    # Verify membership
    match = db.session.get(Match, match_id)
    if not match:
        return
    is_member = (
        match.organizer_id == user_id
        or MatchPlayer.query.filter_by(match_id=match_id, user_id=user_id).first() is not None
    )
    if not is_member:
        return
    join_room(f"match_{match_id}")
    emit("joined_match_chat", {"match_id": match_id})


@socketio.on("leave_match_chat")
def on_leave_match(data):
    match_id = data.get("match_id") if isinstance(data, dict) else None
    if match_id:
        leave_room(f"match_{match_id}")


@socketio.on("disconnect")
def on_disconnect():
    pass
