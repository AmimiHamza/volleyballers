from datetime import datetime, timezone
from app import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone_number = db.Column(db.String(20), nullable=True)
    profile_picture = db.Column(db.String(255), nullable=True)
    bio = db.Column(db.String(500), nullable=True)
    average_rating = db.Column(db.Float, default=0.0)
    total_ratings = db.Column(db.Integer, default=0)
    total_matches = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "phone_number": self.phone_number,
            "profile_picture": self.profile_picture,
            "bio": self.bio,
            "average_rating": self.average_rating,
            "total_ratings": self.total_ratings,
            "total_matches": self.total_matches,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }

    def to_public_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "profile_picture": self.profile_picture,
            "bio": self.bio,
            "average_rating": self.average_rating,
            "total_matches": self.total_matches,
        }
