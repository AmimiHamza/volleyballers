from datetime import datetime, timezone
from app import db


class Rating(db.Model):
    __tablename__ = "ratings"
    __table_args__ = (db.UniqueConstraint("match_id", "rater_id", "ratee_id"),)

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    match_id = db.Column(db.Integer, db.ForeignKey("matches.id"), nullable=False)
    rater_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    ratee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    match = db.relationship("Match", backref="ratings")
    rater = db.relationship("User", foreign_keys=[rater_id], backref="ratings_given")
    ratee = db.relationship("User", foreign_keys=[ratee_id], backref="ratings_received")
