from datetime import datetime, timezone, timedelta
from app import db


def compute_level(total_matches):
    if total_matches >= 50:
        return {"key": "diamond", "min": 50, "next": None}
    if total_matches >= 21:
        return {"key": "gold", "min": 21, "next": 50}
    if total_matches >= 6:
        return {"key": "silver", "min": 6, "next": 21}
    return {"key": "bronze", "min": 0, "next": 6}


def compute_streak(user_id):
    """Consecutive ISO weeks (going back from current week) where the user played at least one completed match."""
    from app.models.match import Match, MatchPlayer
    rows = (
        db.session.query(Match.date)
        .join(MatchPlayer, MatchPlayer.match_id == Match.id)
        .filter(MatchPlayer.user_id == user_id, Match.status == "completed")
        .all()
    )
    if not rows:
        return 0
    weeks = set()
    for (d,) in rows:
        if d:
            iso = d.isocalendar()
            weeks.add((iso[0], iso[1]))
    today = datetime.now(timezone.utc).date()
    cur_iso = today.isocalendar()
    streak = 0
    year, week = cur_iso[0], cur_iso[1]
    while (year, week) in weeks:
        streak += 1
        # decrement one ISO week
        d_ref = datetime.fromisocalendar(year, week, 1) - timedelta(days=1)
        prev = d_ref.isocalendar()
        year, week = prev[0], prev[1]
    return streak


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone_number = db.Column(db.String(20), nullable=True)
    profile_picture = db.Column(db.String(255), nullable=True)
    bio = db.Column(db.String(500), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    favorite_position = db.Column(db.String(20), nullable=True)
    average_rating = db.Column(db.Float, default=0.0)
    total_ratings = db.Column(db.Integer, default=0)
    total_matches = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self, include_streak=False):
        d = {
            "id": self.id,
            "username": self.username,
            "phone_number": self.phone_number,
            "profile_picture": self.profile_picture,
            "bio": self.bio,
            "city": self.city,
            "favorite_position": self.favorite_position,
            "average_rating": self.average_rating,
            "total_ratings": self.total_ratings,
            "total_matches": self.total_matches,
            "level": compute_level(self.total_matches or 0),
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
        if include_streak:
            d["streak"] = compute_streak(self.id)
        return d

    def to_public_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "profile_picture": self.profile_picture,
            "bio": self.bio,
            "city": self.city,
            "favorite_position": self.favorite_position,
            "average_rating": self.average_rating,
            "total_matches": self.total_matches,
            "level": compute_level(self.total_matches or 0),
        }
