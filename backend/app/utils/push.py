import threading
import urllib.request
import urllib.error
import json
import logging

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push_notification(user_id, title, message, data=None):
    """Send push notification to all active devices for a user.

    Runs in a background thread so it doesn't slow down API responses.
    Must be called within a Flask app context.
    """
    from flask import current_app

    app = current_app._get_current_object()

    def _send():
        with app.app_context():
            from app.models.device_push_token import DevicePushToken
            from app import db

            tokens = DevicePushToken.query.filter_by(
                user_id=user_id, is_active=True
            ).all()

            if not tokens:
                return

            messages = []
            for t in tokens:
                msg = {
                    "to": t.expo_push_token,
                    "title": title,
                    "body": message,
                    "sound": "default",
                    "priority": "high",
                }
                if data:
                    msg["data"] = data
                messages.append(msg)

            try:
                req = urllib.request.Request(
                    EXPO_PUSH_URL,
                    data=json.dumps(messages).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    result = json.loads(resp.read().decode("utf-8"))

                # Deactivate tokens that are no longer registered
                if "data" in result:
                    for i, ticket in enumerate(result["data"]):
                        if ticket.get("status") == "error":
                            detail = ticket.get("details", {})
                            if detail.get("error") == "DeviceNotRegistered":
                                tokens[i].is_active = False
                    db.session.commit()

            except Exception as e:
                logger.warning("Push notification failed: %s", e)

    thread = threading.Thread(target=_send, daemon=True)
    thread.start()
