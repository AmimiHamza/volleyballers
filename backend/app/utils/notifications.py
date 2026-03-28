from app import db
from app.models.notification import Notification


def create_notification(user_id, type_code, title, message, reference_type=None, reference_id=None, actor_id=None):
    """Create a notification record. Call within an existing db session/transaction."""
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
    return notif
