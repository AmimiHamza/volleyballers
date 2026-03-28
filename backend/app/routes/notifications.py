from flask import Blueprint, request, jsonify, g

from app import db
from app.models.notification import Notification
from app.middleware.auth import token_required

bp = Blueprint("notifications", __name__)


# ── GET /api/notifications ────────────────────────────────────────────────────

@bp.route("", methods=["GET"])
@token_required
def list_notifications():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 30, type=int)
    per_page = min(per_page, 50)
    unread_only = request.args.get("unread_only", "").lower() == "true"

    query = Notification.query.filter_by(user_id=g.user_id)
    if unread_only:
        query = query.filter_by(is_read=False)

    query = query.order_by(Notification.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    unread_count = Notification.query.filter_by(user_id=g.user_id, is_read=False).count()

    return jsonify({
        "data": {
            "notifications": [n.to_dict() for n in pagination.items],
            "unread_count": unread_count,
            "total": pagination.total,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "pages": pagination.pages,
        }
    }), 200


# ── PUT /api/notifications/<id>/read ──────────────────────────────────────────

@bp.route("/<int:notif_id>/read", methods=["PUT"])
@token_required
def mark_read(notif_id):
    notif = db.session.get(Notification, notif_id)
    if not notif or notif.user_id != g.user_id:
        return jsonify({"error": "not_found", "message": "Notification not found", "status": 404}), 404

    notif.is_read = True
    db.session.commit()

    return jsonify({"message": "Notification marked as read"}), 200


# ── PUT /api/notifications/read-all ───────────────────────────────────────────

@bp.route("/read-all", methods=["PUT"])
@token_required
def mark_all_read():
    Notification.query.filter_by(user_id=g.user_id, is_read=False).update({"is_read": True})
    db.session.commit()

    return jsonify({"message": "All notifications marked as read"}), 200
