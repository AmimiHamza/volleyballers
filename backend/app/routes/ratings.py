from flask import Blueprint, request, jsonify, g

from app import db
from app.models.rating import Rating
from app.models.match import Match, MatchPlayer
from app.models.user import User
from app.middleware.auth import token_required
from app.utils.notifications import create_notification

bp = Blueprint("ratings", __name__)


# ── POST /api/ratings ─────────────────────────────────────────────────────────

@bp.route("", methods=["POST"])
@token_required
def rate_player():
    data = request.get_json(silent=True) or {}
    match_id = data.get("match_id")
    ratee_id = data.get("ratee_id")
    score = data.get("score")
    comment = data.get("comment", "").strip() or None

    if not match_id or not ratee_id or score is None:
        return jsonify({"error": "missing_fields", "message": "match_id, ratee_id, and score are required", "status": 400}), 400

    if not isinstance(score, int) or score < 1 or score > 5:
        return jsonify({"error": "invalid_score", "message": "Score must be an integer from 1 to 5", "status": 400}), 400

    if ratee_id == g.user_id:
        return jsonify({"error": "self_rating", "message": "You cannot rate yourself", "status": 400}), 400

    match = db.session.get(Match, match_id)
    if not match:
        return jsonify({"error": "not_found", "message": "Match not found", "status": 404}), 404

    if match.status != "completed":
        return jsonify({"error": "not_completed", "message": "Match is not completed yet", "status": 400}), 400

    # Verify both rater and ratee were in the match (as player or organizer)
    rater_in = (
        MatchPlayer.query.filter_by(match_id=match_id, user_id=g.user_id).first()
        or match.organizer_id == g.user_id
    )
    ratee_in = (
        MatchPlayer.query.filter_by(match_id=match_id, user_id=ratee_id).first()
        or match.organizer_id == ratee_id
    )

    if not rater_in:
        return jsonify({"error": "not_in_match", "message": "You were not in this match", "status": 403}), 403
    if not ratee_in:
        return jsonify({"error": "ratee_not_in_match", "message": "That player was not in this match", "status": 400}), 400

    # Check duplicate
    existing = Rating.query.filter_by(match_id=match_id, rater_id=g.user_id, ratee_id=ratee_id).first()
    if existing:
        return jsonify({"error": "already_rated", "message": "You have already rated this player for this match", "status": 400}), 400

    ratee = db.session.get(User, ratee_id)
    if not ratee:
        return jsonify({"error": "not_found", "message": "User not found", "status": 404}), 404

    # Create rating and recalculate average in a transaction
    rating = Rating(match_id=match_id, rater_id=g.user_id, ratee_id=ratee_id, score=score, comment=comment)
    db.session.add(rating)

    # Recalculate: avg = (old_avg * old_count + new_score) / (old_count + 1)
    old_avg = ratee.average_rating or 0.0
    old_count = ratee.total_ratings or 0
    ratee.average_rating = (old_avg * old_count + score) / (old_count + 1)
    ratee.total_ratings = old_count + 1

    # Notification
    rater = db.session.get(User, g.user_id)
    create_notification(
        ratee_id, "new_rating", "New Rating",
        f"You received a new rating for '{match.title}'",
        reference_type="match", reference_id=match_id, actor_id=g.user_id,
    )

    db.session.commit()

    return jsonify({
        "data": {
            "id": rating.id,
            "score": score,
            "comment": comment,
            "ratee_new_average": round(ratee.average_rating, 2),
        },
        "message": "Rating submitted",
    }), 201


# ── GET /api/ratings/match/<match_id> ─────────────────────────────────────────

@bp.route("/match/<int:match_id>", methods=["GET"])
@token_required
def get_match_ratings(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return jsonify({"error": "not_found", "message": "Match not found", "status": 404}), 404

    # Ratings given by current user
    given = Rating.query.filter_by(match_id=match_id, rater_id=g.user_id).all()
    given_list = [
        {
            "ratee": db.session.get(User, r.ratee_id).to_public_dict(),
            "score": r.score,
            "comment": r.comment,
        }
        for r in given
    ]

    # Ratings received by current user
    received = Rating.query.filter_by(match_id=match_id, ratee_id=g.user_id).all()
    received_list = [
        {
            "rater": db.session.get(User, r.rater_id).to_public_dict(),
            "score": r.score,
            "comment": r.comment,
        }
        for r in received
    ]

    # Unrated players: players in match that current user hasn't rated yet
    rated_ids = {r.ratee_id for r in given}
    rated_ids.add(g.user_id)  # exclude self

    # All participants = match_players + organizer
    participant_ids = set()
    for mp in MatchPlayer.query.filter_by(match_id=match_id).all():
        participant_ids.add(mp.user_id)
    participant_ids.add(match.organizer_id)

    unrated = []
    for pid in participant_ids:
        if pid not in rated_ids:
            user = db.session.get(User, pid)
            if user:
                unrated.append(user.to_public_dict())

    return jsonify({
        "data": {
            "given": given_list,
            "received": received_list,
            "unrated_players": unrated,
        }
    }), 200
