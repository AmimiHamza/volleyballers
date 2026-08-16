import json

from flask import Blueprint, current_app, jsonify, request

bp = Blueprint("client_errors", __name__)


@bp.route("", methods=["POST"])
def report_client_error():
    """Unauthenticated crash sink for the mobile app.

    The app cannot reach a debugger in a release build, so fatal JS errors are
    POSTed here and land in journalctl. Diagnostic only.
    """
    data = request.get_json(silent=True) or {}
    current_app.logger.error("CLIENT_CRASH %s", json.dumps(data, default=str)[:6000])
    return jsonify({"data": {"received": True}}), 200
