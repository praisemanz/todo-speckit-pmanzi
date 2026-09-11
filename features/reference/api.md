# API Reference

**Current integrated state on `dev`.** Last updated: Feature 1 — User Authentication & Session Management.

All routes are mounted under `/todo` (see `backend/server.js`).

## Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/todo/health` | No | Harness health probe — `{ "status": "ok" }` |
| `POST` | `/todo/register` | No | Create a new user account and open a session |
| `POST` | `/todo/login` | No | Authenticate and return the session payload |
| `POST` | `/todo/logout` | Yes | Invalidate the caller's session token |

### `POST /todo/register`

Request: `{ fName, lName, email, username, password }`

`201` response — same flat payload as login:

```json
{
  "userId": 1,
  "username": "jdoe",
  "email": "jdoe@example.com",
  "fName": "Jane",
  "lName": "Doe",
  "role": "worker",
  "token": "<jwt>"
}
```

`400` cases: `First name is required.`, `Last name is required.`, `Email is required.`,
`Username is required.`, `Password must be at least 8 characters.`,
`Username is already taken.`, `Email is already registered.`

### `POST /todo/login`

Request: `{ username, password }` — username is trimmed and lowercased.

`200` response: the payload shown above. A non-expired session for the same user is reused
rather than issuing a second token.

`400`: `Username is required.` / `Password is required.`
`401`: `Invalid username or password.` (same message for unknown username and wrong password)

### `POST /todo/logout`

Requires `Authorization: Bearer <token>`. Clears the token on the session row and returns
`{ "message": "Signed out." }`. Replaying the old token afterwards returns `401`.

## Conventions

- Flat JSON responses (no `{ success, data }` envelope).
- Errors: `{ "message": "..." }`.
- Authenticated routes: `Authorization: Bearer <token>`.
- Missing, unknown, or expired token on an authenticated route → `401` with a message starting `Unauthorized!`.
- Password hashes are never returned by any endpoint.
