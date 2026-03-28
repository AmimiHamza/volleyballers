from functools import wraps
from flask import request, g, jsonify, current_app
import jwt


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "missing_token", "message": "Authorization token is required", "status": 401}), 401

        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
            g.user_id = payload["user_id"]
            g.token_type = payload.get("type", "access")
            if g.token_type != "access":
                return jsonify({"error": "invalid_token", "message": "Access token required", "status": 401}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "token_expired", "message": "Token has expired", "status": 401}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "invalid_token", "message": "Invalid token", "status": 401}), 401

        return f(*args, **kwargs)
    return decorated
