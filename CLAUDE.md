# VolleyUp — Development Reference

## Application Overview
VolleyUp is a mobile app for organizing and joining volleyball matches. Users authenticate, create profiles, organize/join matches, manage friends, rate players, and receive notifications. Matches enforce 6 min / 12 max player limits with organizer-controlled management.

## Tech Stack
- **Frontend:** React Native (Expo managed workflow)
- **Backend:** Python Flask (RESTful API)
- **Database:** SQLite (server-side, via SQLAlchemy ORM)
- **Auth:** JWT (access tokens 15 min, refresh tokens 30 days)
- **Storage:** Local filesystem for profile pictures
- **Deploy:** localhost initially → Google Cloud Platform
- **Config:** Shared `shared/config.json` for server IP/port used by both frontend and backend

## Project Structure
```
volleyup/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── config.py            # Server configuration (reads shared/config.json)
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── match.py
│   │   │   ├── friendship.py
│   │   │   ├── rating.py
│   │   │   └── notification.py
│   │   ├── routes/              # API blueprints
│   │   │   ├── auth.py
│   │   │   ├── matches.py
│   │   │   ├── friends.py
│   │   │   ├── ratings.py
│   │   │   └── notifications.py
│   │   ├── middleware/           # JWT auth middleware
│   │   └── utils/               # Helpers
│   ├── migrations/
│   ├── uploads/                 # Profile pictures storage
│   ├── requirements.txt
│   └── run.py
├── frontend/                    # Expo React Native app
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js        # Axios client, base URL from config
│   │   ├── config/
│   │   │   └── server.js        # Reads shared/config.json
│   │   ├── contexts/            # Auth context provider
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   ├── matches/
│   │   │   ├── friends/
│   │   │   ├── profile/
│   │   │   └── notifications/
│   │   ├── components/          # Shared UI components
│   │   └── navigation/          # React Navigation setup
│   ├── app.json
│   └── package.json
└── shared/
    └── config.json              # Server IP/port (shared between FE & BE)
```

## Database Tables
8 tables total:
1. **users** — accounts & profiles (username, password_hash, bio, average_rating, total_matches, etc.)
2. **matches** — volleyball match events (organizer_id FK→users, title, date, time, location, status, max/min/current players)
3. **match_players** — confirmed players in a match (match_id, user_id; unique constraint)
4. **join_requests** — pending/resolved join requests (match_id, user_id, status: pending|approved|rejected)
5. **friendships** — bidirectional friend relationships (requester_id, addressee_id, status: pending|accepted|declined; must query both directions)
6. **match_invites** — friend invitations to matches (match_id, inviter_id, invitee_id; unique on match_id+invitee_id)
7. **ratings** — post-match player ratings (match_id, rater_id, ratee_id, score 1-5; unique on match_id+rater_id+ratee_id)
8. **notifications** — in-app notifications (user_id, type, title, message, reference_type/id, is_read)

## API Conventions
- Base URL: `http://{SERVER_IP}:{PORT}/api`
- Auth: JWT Bearer token in `Authorization` header for protected routes
- Request/Response: JSON with `Content-Type: application/json`
- Timestamps: ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`)
- Pagination: `?page=1&per_page=20` on list endpoints
- Standard error: `{ "error": "code", "message": "...", "status": 400 }`
- Standard success: `{ "data": { ... }, "message": "..." }`

## API Route Prefixes
- `/api/auth/*` — registration, login, refresh, profile, user search
- `/api/matches/*` — CRUD, join requests, close/complete, player management
- `/api/friends/*` — friend requests, list, accept/decline, unfriend
- `/api/ratings/*` — rate players, get ratings per match
- `/api/notifications/*` — list, mark read, mark all read

## JWT Strategy
- Access token: 15 min expiry, sent with every request
- Refresh token: 30 day expiry, used to obtain new access tokens
- Stored on device via `expo-secure-store`
- Backend middleware validates on every protected route, attaches `user_id` to Flask `g`

## Key Business Rules
- Match player limits: 6 minimum (to close), 12 maximum (auto-closes on reaching 12)
- Organizer is NOT auto-added to match_players
- Passwords hashed with bcrypt (salt rounds 12)
- Profile pictures: JPEG/PNG, max 5MB, stored at `backend/uploads/profiles/{user_id}_{timestamp}.jpg`
- Friend queries must check both directions of the relationship
- When organizer invites a friend, accept can skip join_request and add directly to match_players
- Rating recalculation: `avg = (old_avg * old_count + new_score) / (old_count + 1)` in a transaction
- Notifications created server-side as side effects of actions

## Implementation Sections (Build Order)
1. **Section 0:** Shared config, project structure, Flask app factory, Expo scaffold
2. **Section 1:** Authentication & user profiles (users table, JWT, login/register, profile screens)
3. **Section 2:** Match creation & management (matches, match_players, join_requests tables)
4. **Section 3:** Friend system & match invitations (friendships, match_invites tables)
5. **Section 4:** Match history, ratings & notifications (ratings, notifications tables)

## Frontend Dependencies
- `@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs`
- `expo-secure-store`, `expo-image-picker`
- `axios`, `react-native-ratings`

## Backend Dependencies
- Flask 3.0.0, Flask-SQLAlchemy 3.1.1, Flask-Migrate 4.0.5, Flask-CORS 4.0.0
- PyJWT 2.8.0, bcrypt 4.1.2, Pillow 10.2.0, marshmallow 3.20.1
