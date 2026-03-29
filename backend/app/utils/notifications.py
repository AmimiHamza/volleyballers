from app import db
from app.models.notification import Notification
from app.utils.push import send_push_notification


def create_notification(user_id, type_code, title, message, reference_type=None, reference_id=None, actor_id=None):
    """Create a notification record and send a push notification.

    Call within an existing db session/transaction.
    The push is sent in a background thread and won't block or affect the transaction.
    """
    notif = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=type_code,
        title=title,
        message=message,
        reference_type=reference_type,
        reference_id=reference_id,
    )
    db.session.add(notif)

    # Fire push notification in background
    send_push_notification(
        user_id=user_id,
        title=title,
        message=message,
        data={
            "type": type_code,
            "reference_type": reference_type,
            "reference_id": reference_id,
        },
    )

    return notif
