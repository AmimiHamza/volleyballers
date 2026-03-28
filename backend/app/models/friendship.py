from datetime import datetime, timezone
from app import db


class Friendship(db.Model):
    __tablename__ = "friendships"
    __table_args__ = (db.UniqueConstraint("requester_id", "addressee_id"),)

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    requester_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    addressee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(20), default="pending")  # pending | accepted | declined
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    accepted_at = db.Column(db.DateTime, nullable=True)

    requester = db.relationship("User", foreign_keys=[requester_id], backref="sent_friend_requests")
    addressee = db.relationship("User", foreign_keys=[addressee_id], backref="received_friend_requests")


class MatchInvite(db.Model):
    __tablename__ = "match_invites"
    __table_args__ = (db.UniqueConstraint("match_id", "invitee_id"),)

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    match_id = db.Column(db.Integer, db.ForeignKey("matches.id"), nullable=False)
    inviter_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    invitee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(20), default="pending")  # pending | accepted | declined
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    match = db.relationship("Match", backref="invites")
    inviter = db.relationship("User", foreign_keys=[inviter_id])
    invitee = db.relationship("User", foreign_keys=[invitee_id])
