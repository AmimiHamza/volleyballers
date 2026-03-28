from datetime import datetime, date, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import or_

from app import db
from app.models.match import Match, MatchPlayer, JoinRequest
from app.models.friendship import MatchInvite
from app.models.user import User
from app.middleware.auth import token_required
from app.utils.friends import are_friends
from app.utils.notifications import create_notification

bp = Blueprint("matches", __name__)


# ── POST /api/matches ─────────────────────────────────────────────────────────

@bp.route("", methods=["POST"])
@token_required
def create_match():
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    description = data.get("description", "").strip() if data.get("description") else None
    match_date = data.get("date", "").strip()
    match_time = data.get("time", "").strip()
    location = data.get("location", "").strip()

    max_players = data.get("max_players", 12)
    try:
        max_players = int(max_players)
    except (TypeError, ValueError):
        max_players = 12
    if max_players < 6:
        return jsonify({"error": "invalid_max_players", "message": "Maximum players must be at least 6", "status": 400}), 400
    if max_players > 30:
        max_players = 30

    if not title or not match_date or not match_time or not location:
        return jsonify({"error": "missing_fields", "message": "Title, date, time, and location are required", "status": 400}), 400

    try:
        parsed_date = date.fromisoformat(match_date)
    except ValueError:
        return jsonify({"error": "invalid_date", "message": "Invalid date format. Use YYYY-MM-DD", "status": 422}), 422

    if parsed_date < date.today():
        return jsonify({"error": "past_date", "message": "Date must be in the future", "status": 422}), 422

    try:
        parts = match_time.split(":")
        parsed_time = datetime.strptime(match_time, "%H:%M").time()
    except ValueError:
        return jsonify({"error": "invalid_time", "message": "Invalid time format. Use HH:MM", "status": 422}), 422

    match = Match(
        organizer_id=g.user_id,
        title=title,
        description=description,
        date=parsed_date,
        time=parsed_time,
        location=location,
        max_players=max_players,
    )
    db.session.add(match)
    db.session.flush()  # get match.id

    # Auto-add organizer as a player
    mp = MatchPlayer(match_id=match.id, user_id=g.user_id)
    db.session.add(mp)
    match.current_players = 1

    db.session.commit()

    result = match.to_dict()
    result["organizer"] = db.session.get(User, g.user_id).to_public_dict()
    return jsonify({"data": result, "message": "Match created"}), 201


# ── GET /api/matches ──────────────────────────────────────────────────────────

@bp.route("", methods=["GET"])
@token_required
def list_matches():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 50)

    query = Match.query

    # Filters
    status = request.args.get("status")
    if status:
        query = query.filter(Match.status == status)
    else:
        # Default: show open matches
        query = query.filter(Match.status == "open")

    filter_date = request.args.get("date")
    if filter_date:
        try:
            query = query.filter(Match.date == date.fromisoformat(filter_date))
        except ValueError:
            pass

    date_from = request.args.get("date_from")
    if date_from:
        try:
            query = query.filter(Match.date >= date.fromisoformat(date_from))
        except ValueError:
            pass

    date_to = request.args.get("date_to")
    if date_to:
        try:
            query = query.filter(Match.date <= date.fromisoformat(date_to))
        except ValueError:
            pass

    location = request.args.get("location")
    if location:
        query = query.filter(Match.location.ilike(f"%{location}%"))

    organizer_id = request.args.get("organizer_id", type=int)
    if organizer_id:
        query = query.filter(Match.organizer_id == organizer_id)

    query = query.order_by(Match.date.asc(), Match.time.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    matches = []
    for m in pagination.items:
        d = m.to_dict()
        d["organizer"] = db.session.get(User, m.organizer_id).to_public_dict()
        matches.append(d)

    return jsonify({
        "data": {
            "matches": matches,
            "total": pagination.total,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "pages": pagination.pages,
        }
    }), 200


# ── GET /api/matches/<id> ────────────────────────────────────────────────────

@bp.route("/<int:match_id>", methods=["GET"])
@token_required
def get_match(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return jsonify({"error": "not_found", "message": "Match not found", "status": 404}), 404

    result = match.to_dict()
    result["organizer"] = db.session.get(User, match.organizer_id).to_public_dict()

    # Player list
    result["players"] = []
    for mp in MatchPlayer.query.filter_by(match_id=match_id).all():
        player = db.session.get(User, mp.user_id)
        result["players"].append({
            "id": player.id,
            "username": player.username,
            "profile_picture": player.profile_picture,
            "joined_at": mp.joined_at.isoformat() + "Z" if mp.joined_at else None,
        })

    # Pending requests — only visible to organizer
    if match.organizer_id == g.user_id:
        result["pending_requests"] = []
        for jr in JoinRequest.query.filter_by(match_id=match_id, status="pending").all():
            req_user = db.session.get(User, jr.user_id)
            result["pending_requests"].append({
                "id": jr.id,
                "user": req_user.to_public_dict(),
                "created_at": jr.created_at.isoformat() + "Z" if jr.created_at else None,
            })
    else:
        result["pending_requests"] = []

    # User status relative to this match
    if match.organizer_id == g.user_id:
        result["user_status"] = "organizer"
    elif MatchPlayer.query.filter_by(match_id=match_id, user_id=g.user_id).first():
        result["user_status"] = "player"
    elif JoinRequest.query.filter_by(match_id=match_id, user_id=g.user_id, status="pending").first():
        result["user_status"] = "pending"
    else:
        result["user_status"] = "none"

    return jsonify({"data": result}), 200


# ── POST /api/matches/<id>/join ───────────────────────────────────────────────

@bp.route("/<int:match_id>/join", methods=["POST"])
@token_required
def join_match(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return jsonify({"error": "not_found", "message": "Match not found", "status": 404}), 404

    if match.status != "open":
        return jsonify({"error": "match_not_open", "message": "Match is not open for joining", "status": 403}), 403

    if match.organizer_id == g.user_id:
        return jsonify({"error": "is_organizer", "message": "Organizer cannot send a join request to their own match", "status": 400}), 400

    # Already a player?
    if MatchPlayer.query.filter_by(match_id=match_id, user_id=g.user_id).first():
        return jsonify({"error": "already_player", "message": "You are already a player in this match", "status": 400}), 400

    # Already requested?
    existing = JoinRequest.query.filter_by(match_id=match_id, user_id=g.user_id, status="pending").first()
    if existing:
        return jsonify({"error": "already_requested", "message": "You already have a pending request for this match", "status": 400}), 400

    jr = JoinRequest(match_id=match_id, user_id=g.user_id)
    db.session.add(jr)

    requester = db.session.get(User, g.user_id)
    create_notification(
        match.organizer_id, "join_request", "Join Request",
        f"'{requester.username}' wants to join '{match.title}'",
        reference_type="match", reference_id=match_id, actor_id=g.user_id,
    )
    db.session.commit()

    return jsonify({"data": {"request_id": jr.id, "status": "pending"}, "message": "Join request sent"}), 201


# ── DELETE /api/matches/<id>/join ────────────────────────────────────────────

@bp.route("/<int:match_id>/join", methods=["DELETE"])
@token_required
def cancel_join_request(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return jsonify({"error": "not_found", "message": "Match not found", "status": 404}), 404

    jr = JoinRequest.query.filter_by(match_id=match_id, user_id=g.user_id, status="pending").first()
    if not jr:
        return jsonify({"error": "not_found", "message": "No pending join request found", "status": 404}), 404

    db.session.delete(jr)
    db.session.commit()

    return jsonify({"message": "Join request cancelled"}), 200


# ── PUT /api/matches/<id>/requests/<request_id> ──────────────────────────────

@bp.route("/<int:match_id>/requests/<int:request_id>", methods=["PUT"])
@token_required
def handle_join_request(match_id, request_id):
    match = db.session.get(Match, match_id)
    if not match:
        return jsonify({"error": "not_found", "message": "Match not found", "status": 404}), 404

    if match.organizer_id != g.user_id:
        return jsonify({"error": "forbidden", "message": "Only the organizer can manage requests", "status": 403}), 403

    jr = db.session.get(JoinRequest, request_id)
    if not jr or jr.match_id != match_id:
        return jsonify({"error": "not_found", "message": "Join request not found", "status": 404}), 404

    if jr.status != "pending":
        return jsonify({"error": "already_resolved", "message": "This request has already been resolved", "status": 400}), 400

    data = request.get_json(silent=True) or {}
    action = data.get("action", "").lower()

    if action not in ("approve", "reject"):
        return jsonify({"error": "invalid_action", "message": "Action must be 'approve' or 'reject'", "status": 400}), 400

    jr.resolved_at = datetime.now(timezone.utc)

    if action == "reject":
        jr.status = "rejected"
        create_notification(
            jr.user_id, "join_rejected", "Request Rejected",
            f"Your request to join '{match.title}' was rejected",
            reference_type="match", reference_id=match_id, actor_id=g.user_id,
        )
        db.session.commit()
        return jsonify({"data": {"request_id": jr.id, "status": "rejected"}, "message": "Request rejected"}), 200

    # Approve
    if match.current_players >= match.max_players:
        return jsonify({"error": "match_full", "message": "Match is already full (12 players)", "status": 400}), 400

    jr.status = "approved"
    mp = MatchPlayer(match_id=match_id, user_id=jr.user_id)
    db.session.add(mp)
    match.current_players += 1

    create_notification(
        jr.user_id, "join_approved", "Request Approved",
        f"You've been added to '{match.title}'",
        reference_type="match", reference_id=match_id, actor_id=g.user_id,
    )

    # Auto-close if max reached
    if match.current_players >= match.max_players:
        match.status = "closed"
        # Reject remaining pending requests
        pending = JoinRequest.query.filter_by(match_id=match_id, status="pending").all()
        for p in pending:
            p.status = "rejected"
            p.resolved_at = datetime.now(timezone.utc)
            create_notification(
                p.user_id, "match_closed", "Match Full",
                f"'{match.title}' is now full — your pending request was rejected",
                reference_type="match", reference_id=match_id, actor_id=g.user_id,
            )

    db.session.commit()

    return jsonify({
        "data": {"request_id": jr.id, "status": "approved", "current_players": match.current_players},
        "message": "Request approved",
    }), 200


# ── POST /api/matches/<id>/close ─────────────────────────────────────────────

@bp.route("/<int:match_id>/close", methods=["POST"])
@token_required
def close_match(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return jsonify({"error": "not_found", "message": "Match not found", "status": 404}), 404

    if match.organizer_id != g.user_id:
        return jsonify({"error": "forbidden", "message": "Only the organizer can close the match", "status": 403}), 403

    if match.status not in ("open", "closed"):
        return jsonify({"error": "invalid_status", "message": "Match cannot be cancelled from its current status", "status": 400}), 400

    match.status = "cancelled"
    # Reject remaining pending requests and notify
    pending = JoinRequest.query.filter_by(match_id=match_id, status="pending").all()
    for p in pending:
        p.status = "rejected"
        p.resolved_at = datetime.now(timezone.utc)
        create_notification(
            p.user_id, "match_cancelled", "Match Cancelled",
            f"'{match.title}' has been cancelled by the organizer",
            reference_type="match", reference_id=match_id, actor_id=g.user_id,
        )

    # Notify all current players (except organizer)
    for mp in MatchPlayer.query.filter_by(match_id=match_id).all():
        if mp.user_id != g.user_id:
            create_notification(
                mp.user_id, "match_cancelled", "Match Cancelled",
                f"'{match.title}' has been cancelled by the organizer",
                reference_type="match", reference_id=match_id, actor_id=g.user_id,
            )

    db.session.commit()

    return jsonify({"data": match.to_dict(), "message": "Match cancelled"}), 200


# ── DELETE /api/matches/<id>/players/<user_id> ────────────────────────────────

@bp.route("/<int:match_id>/players/<int:user_id>", methods=["DELETE"])
@token_required
def remove_player(match_id, user_id):
    match = db.session.get(Match, match_id)
    if not match:
        return jsonify({"error": "not_found", "message": "Match not found", "status": 404}), 404

    if match.organizer_id != g.user_id:
        return jsonify({"error": "forbidden", "message": "Only the organizer can remove players", "status": 403}), 403

    mp = MatchPlayer.query.filter_by(match_id=match_id, user_id=user_id).first()
    if not mp:
        return jsonify({"error": "not_found", "message": "Player not found in this match", "status": 404}), 404

    db.session.delete(mp)
    match.current_players -= 1

    create_notification(
        user_id, "player_removed", "Removed from Match",
        f"You've been removed from '{match.title}'",
        reference_type="match", reference_id=match_id, actor_id=g.user_id,
    )

    # Reopen if was closed and now below max
    if match.status == "closed" and match.current_players < match.max_players:
        match.status = "open"

    db.session.commit()

    return jsonify({"data": match.to_dict(), "message": "Player removed"}), 200


# ── POST /api/matches/<id>/leave ─────────────────────────────────────────────

@bp.route("/<int:match_id>/leave", methods=["POST"])
@token_required
def leave_match(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return jsonify({"error": "not_found", "message": "Match not found", "status": 404}), 404

    if match.organizer_id == g.user_id:
        return jsonify({"error": "is_organizer", "message": "Organizer cannot leave their own match — cancel it instead", "status": 400}), 400

    if match.status not in ("open", "closed"):
        return jsonify({"error": "invalid_status", "message": "Cannot leave a match that is not open or closed", "status": 400}), 400

    mp = MatchPlayer.query.filter_by(match_id=match_id, user_id=g.user_id).first()
    if not mp:
        return jsonify({"error": "not_player", "message": "You are not a player in this match", "status": 400}), 400

    db.session.delete(mp)
    match.current_players -= 1

    # Reopen if was closed and now below max
    if match.status == "closed" and match.current_players < match.max_players:
        match.status = "open"

    # Notify organizer
    leaver = db.session.get(User, g.user_id)
    create_notification(
        match.organizer_id, "player_left", "Player Left",
        f"'{leaver.username}' left '{match.title}'",
        reference_type="match", reference_id=match_id, actor_id=g.user_id,
    )

    db.session.commit()

    return jsonify({"data": match.to_dict(), "message": "You left the match"}), 200


# ── POST /api/matches/<id>/complete ───────────────────────────────────────────

@bp.route("/<int:match_id>/complete", methods=["POST"])
@token_required
def complete_match(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return jsonify({"error": "not_found", "message": "Match not found", "status": 404}), 404

    if match.organizer_id != g.user_id:
        return jsonify({"error": "forbidden", "message": "Only the organizer can complete the match", "status": 403}), 403

    if match.status not in ("open", "closed"):
        return jsonify({"error": "invalid_status", "message": "Match cannot be completed from its current status", "status": 400}), 400

    if match.current_players < match.min_players:
        return jsonify({"error": "not_enough_players", "message": f"Need at least {match.min_players} players to complete (currently {match.current_players})", "status": 400}), 400

    match.status = "completed"

    # Increment total_matches for all players (organizer included) and notify
    for mp in MatchPlayer.query.filter_by(match_id=match_id).all():
        player = db.session.get(User, mp.user_id)
        if player:
            player.total_matches += 1
            create_notification(
                mp.user_id, "match_completed", "Match Completed",
                f"'{match.title}' has been marked as completed — you can now rate players",
                reference_type="match", reference_id=match_id, actor_id=g.user_id,
            )

    db.session.commit()

    return jsonify({"data": match.to_dict(), "message": "Match completed"}), 200


# ── POST /api/matches/<id>/invite ─────────────────────────────────────────────

@bp.route("/<int:match_id>/invite", methods=["POST"])
@token_required
def invite_to_match(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return jsonify({"error": "not_found", "message": "Match not found", "status": 404}), 404

    if match.status != "open":
        return jsonify({"error": "match_not_open", "message": "Match is not open", "status": 403}), 403

    data = request.get_json(silent=True) or {}
    invitee_id = data.get("user_id")
    if not invitee_id:
        return jsonify({"error": "missing_fields", "message": "user_id is required", "status": 400}), 400

    if not are_friends(g.user_id, invitee_id):
        return jsonify({"error": "not_friends", "message": "You can only invite friends", "status": 403}), 403

    # Already a player?
    if MatchPlayer.query.filter_by(match_id=match_id, user_id=invitee_id).first():
        return jsonify({"error": "already_player", "message": "User is already a player in this match", "status": 400}), 400

    # Already invited?
    if MatchInvite.query.filter_by(match_id=match_id, invitee_id=invitee_id, status="pending").first():
        return jsonify({"error": "already_invited", "message": "User has already been invited", "status": 400}), 400

    invite = MatchInvite(match_id=match_id, inviter_id=g.user_id, invitee_id=invitee_id)
    db.session.add(invite)

    inviter = db.session.get(User, g.user_id)
    create_notification(
        invitee_id, "match_invite", "Match Invitation",
        f"'{inviter.username}' invited you to join '{match.title}'",
        reference_type="match", reference_id=match_id, actor_id=g.user_id,
    )
    db.session.commit()

    return jsonify({"data": {"invite_id": invite.id, "status": "pending"}, "message": "Invitation sent"}), 201


# ── PUT /api/matches/<id>/invite/<invite_id> ──────────────────────────────────

@bp.route("/<int:match_id>/invite/<int:invite_id>", methods=["PUT"])
@token_required
def handle_match_invite(match_id, invite_id):
    invite = db.session.get(MatchInvite, invite_id)
    if not invite or invite.match_id != match_id:
        return jsonify({"error": "not_found", "message": "Invitation not found", "status": 404}), 404

    if invite.invitee_id != g.user_id:
        return jsonify({"error": "forbidden", "message": "This invitation is not for you", "status": 403}), 403

    if invite.status != "pending":
        return jsonify({"error": "already_resolved", "message": "This invitation has already been resolved", "status": 400}), 400

    data = request.get_json(silent=True) or {}
    action = data.get("action", "").lower()

    if action not in ("accept", "decline"):
        return jsonify({"error": "invalid_action", "message": "Action must be 'accept' or 'decline'", "status": 400}), 400

    if action == "decline":
        invite.status = "declined"
        db.session.commit()
        return jsonify({"data": {"invite_id": invite.id, "status": "declined"}, "message": "Invitation declined"}), 200

    # Accept
    match = db.session.get(Match, match_id)
    if not match or match.status != "open":
        return jsonify({"error": "match_not_open", "message": "Match is no longer open", "status": 400}), 400

    if match.current_players >= match.max_players:
        return jsonify({"error": "match_full", "message": "Match is already full", "status": 400}), 400

    if MatchPlayer.query.filter_by(match_id=match_id, user_id=g.user_id).first():
        invite.status = "accepted"
        db.session.commit()
        return jsonify({"data": {"invite_id": invite.id, "status": "accepted"}, "message": "Already a player"}), 200

    invite.status = "accepted"

    # If the inviter is the organizer, skip join request and add directly
    if invite.inviter_id == match.organizer_id:
        mp = MatchPlayer(match_id=match_id, user_id=g.user_id)
        db.session.add(mp)
        match.current_players += 1

        if match.current_players >= match.max_players:
            match.status = "closed"

        db.session.commit()
        return jsonify({
            "data": {"invite_id": invite.id, "status": "accepted", "added_to_match": True},
            "message": "Invitation accepted — you've been added to the match",
        }), 200
    else:
        # Non-organizer invite: create a join request for organizer approval
        jr = JoinRequest(match_id=match_id, user_id=g.user_id)
        db.session.add(jr)
        db.session.commit()
        return jsonify({
            "data": {"invite_id": invite.id, "status": "accepted", "added_to_match": False, "join_request_id": jr.id},
            "message": "Invitation accepted — join request sent to organizer",
        }), 200


# ── GET /api/matches/<id>/invites ─────────────────────────────────────────────

@bp.route("/<int:match_id>/invites", methods=["GET"])
@token_required
def list_match_invites(match_id):
    """List invites for a match (used by InviteFriendsModal to know who's already invited)."""
    invites = MatchInvite.query.filter_by(match_id=match_id).all()
    return jsonify({
        "data": [
            {
                "id": inv.id,
                "invitee_id": inv.invitee_id,
                "inviter_id": inv.inviter_id,
                "status": inv.status,
            }
            for inv in invites
        ]
    }), 200
