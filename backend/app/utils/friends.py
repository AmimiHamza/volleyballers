from sqlalchemy import or_, and_
from app.models.friendship import Friendship


def get_friendship(user_a, user_b):
    """Get friendship record between two users, checking both directions."""
    return Friendship.query.filter(
        or_(
            and_(Friendship.requester_id == user_a, Friendship.addressee_id == user_b),
            and_(Friendship.requester_id == user_b, Friendship.addressee_id == user_a),
        )
    ).first()


def are_friends(user_a, user_b):
    """Check if two users are accepted friends."""
    f = get_friendship(user_a, user_b)
    return f is not None and f.status == "accepted"
