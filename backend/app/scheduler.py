import logging
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler(daemon=True)


def send_match_reminders(app):
    """Send push reminders for matches starting within the next hour."""
    with app.app_context():
        from app import db
        from app.models.match import Match, MatchPlayer
        from app.utils.push import send_push_notification

        now = datetime.now(timezone.utc)
        one_hour = now + timedelta(hours=1)

        # Find open/closed matches happening within the next hour that haven't been reminded
        matches = Match.query.filter(
            Match.status.in_(["open", "closed"]),
            Match.reminder_sent_at.is_(None),
            Match.date == now.date(),
        ).all()

        for match in matches:
            # Combine date + time to get full datetime
            match_dt = datetime.combine(match.date, match.time, tzinfo=timezone.utc)
            if now <= match_dt <= one_hour:
                # Send reminder to all players
                players = MatchPlayer.query.filter_by(match_id=match.id).all()
                time_str = match.time.strftime("%H:%M")
                for player in players:
                    send_push_notification(
                        user_id=player.user_id,
                        title=f"Match reminder: {match.title}",
                        message=f"Your match starts at {time_str} at {match.location}",
                        data={
                            "type": "match_reminder",
                            "reference_type": "match",
                            "reference_id": match.id,
                        },
                    )

                # Also remind the organizer
                organizer_is_player = any(p.user_id == match.organizer_id for p in players)
                if not organizer_is_player:
                    send_push_notification(
                        user_id=match.organizer_id,
                        title=f"Match reminder: {match.title}",
                        message=f"Your match starts at {time_str} at {match.location}",
                        data={
                            "type": "match_reminder",
                            "reference_type": "match",
                            "reference_id": match.id,
                        },
                    )

                match.reminder_sent_at = now
                logger.info("Sent reminders for match %d: %s", match.id, match.title)

        db.session.commit()


def start_scheduler(app):
    """Start the background scheduler for periodic tasks."""
    scheduler.add_job(
        send_match_reminders,
        "interval",
        minutes=5,
        args=[app],
        id="match_reminders",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Match reminder scheduler started (every 5 minutes)")
