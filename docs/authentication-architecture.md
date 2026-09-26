# Authentication Architecture

Phase 12 adds backend-owned authentication without changing the deterministic access decision pipeline.

## Flow

```text
React AuthContext
      |
      v
Express /api/auth routes
      |
      v
HTTP-only JWT cookie
      |
      v
Authentication middleware -> User service -> mock store or MongoDB User model
```

Registration and login use `bcryptjs` password hashes. The API never returns a password or password hash. The session token is stored in an `HttpOnly`, `SameSite=Lax` cookie and is not exposed to browser JavaScript.

## Endpoints

- `POST /api/auth/register`: validates input, hashes the password, creates a user, and starts a session.
- `POST /api/auth/login`: verifies credentials and starts a session.
- `POST /api/auth/logout`: clears the session cookie.
- `GET /api/auth/me`: returns the authenticated user's safe profile.
- `PATCH /api/auth/me`: updates only the authenticated user's editable profile fields.

Authentication failures use safe generic messages. Private user records are never addressable through another user's ID; profile access is scoped to the authenticated session.

## Environment

```env
DATABASE_MODE=mock
JWT_SECRET=replace-with-a-long-random-secret
AUTH_COOKIE_NAME=dont_buy_it_session
```

`DATABASE_MODE=mock` stores users in memory for local demonstrations. `DATABASE_MODE=mongo` persists users through the Phase 11 Mongoose model and requires both `MONGODB_URI` and `JWT_SECRET`.

## Frontend behavior

`AuthProvider` loads `/api/auth/me` on startup. Login and registration navigate to the requested destination or dashboard. Profile, dashboard, settings, requests, listings, messages, saved items, notifications, and help are protected. The AI Assistant and Scenario Comparison remain available without authentication so the existing demo flow is preserved.
