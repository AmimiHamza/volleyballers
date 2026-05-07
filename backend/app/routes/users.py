from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func, desc

from app import db
from app.models.user import User
from app.models.match import MatchPlayer, Match
from app.models.rating import Rating
from app.middleware.auth import token_required

bp = Blueprint("users", __name__)


# ── GET /api/users — browse all players ──────────────────────────────────────

@bp.route("", methods=["GET"])
@token_required
def list_users():
    """Paginated list of all players. Supports ?city=, ?q= (search), and ?sort= (top|new|recent)."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 24, type=int), 50)
    city = request.args.get("city")
    q = request.args.get("q", "").strip()
    sort = request.args.get("sort", "top")

    query = User.query.filter(User.id != g.user_id)
    if city:
        query = query.filter(User.city.ilike(f"%{city}%"))
    if q:
        query = query.filter(User.username.ilike(f"%{q}%"))

    if sort == "new":
        query = query.order_by(User.created_at.desc())
    elif sort == "recent":
        query = query.order_by(User.updated_at.desc())
    else:
        # Top: combination of avg rating and total matches
        query = query.order_by(
            (User.average_rating * 0.7 + User.total_matches * 0.3).desc(),
            User.total_matches.desc(),
        )

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    users = [u.to_public_dict() for u in pagination.items]

    return jsonify({
        "data": {
            "users": users,
            "total": pagination.total,
            "page": pagination.page,
            "pages": pagination.pages,
        }
    }), 200


# ── GET /api/users/player-of-month ───────────────────────────────────────────

@bp.route("/player-of-month", methods=["GET"])
@token_required
def player_of_month():
    """Top player based on (avg rating in last 30 days * 0.6 + matches played * 0.4)."""
    since = datetime.now(timezone.utc) - timedelta(days=30)

    # Get ratings received in the last 30 days, grouped by ratee
    rating_stats = (
        db.session.query(
            Rating.ratee_id.label("user_id"),
            func.avg(Rating.score).label("recent_avg"),
            func.count(Rating.id).label("rating_count"),
        )
        .filter(Rating.created_at >= since)
        .group_by(Rating.ratee_id)
        .subquery()
    )

    # Match participation in last 30 days, grouped by player
    match_stats = (
        db.session.query(
            MatchPlayer.user_id.label("user_id"),
            func.count(MatchPlayer.id).label("match_count"),
        )
        .join(Match, Match.id == MatchPlayer.match_id)
        .filter(Match.status == "completed")
        .filter(MatchPlayer.joined_at >= since)
        .group_by(MatchPlayer.user_id)
        .subquery()
    )

    # Combine: score = avg * 0.6 + match_count * 0.4 (need at least 1 rating + 1 match)
    score_expr = (
        func.coalesce(rating_stats.c.recent_avg, 0) * 0.6
        + func.coalesce(match_stats.c.match_count, 0) * 0.4
    )

    top = (
        db.session.query(
            User,
            score_expr.label("score"),
            func.coalesce(rating_stats.c.recent_avg, 0).label("recent_avg"),
            func.coalesce(match_stats.c.match_count, 0).label("match_count"),
            func.coalesce(rating_stats.c.rating_count, 0).label("rating_count"),
        )
        .outerjoin(rating_stats, rating_stats.c.user_id == User.id)
        .outerjoin(match_stats, match_stats.c.user_id == User.id)
        .filter(
            (rating_stats.c.rating_count >= 1) | (match_stats.c.match_count >= 1)
        )
        .order_by(desc("score"))
        .first()
    )

    if not top:
        return jsonify({"data": None}), 200

    user, score, recent_avg, match_count, rating_count = top
    result = user.to_public_dict()
    result["recent_avg"] = float(recent_avg) if recent_avg else 0.0
    result["match_count"] = int(match_count or 0)
    result["rating_count"] = int(rating_count or 0)
    result["score"] = round(float(score), 2)

    return jsonify({"data": result}), 200
