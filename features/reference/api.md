# API Reference

**Current integrated state on `dev`.** Last updated: Feature 3 — Todo List Item Management.

All routes are mounted under `/todo` (see `backend/server.js`).

## Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/todo/health` | No | Harness health probe — `{ "status": "ok" }` |
| `POST` | `/todo/register` | No | Create a new user account and open a session |
| `POST` | `/todo/login` | No | Authenticate and return the session payload |
| `POST` | `/todo/logout` | Yes | Invalidate the caller's session token |
| `GET` | `/todo/lists` | Yes | Fetch the caller's lists, sorted by name |
| `POST` | `/todo/lists` | Yes | Create a list owned by the caller |
| `PUT` | `/todo/lists/:listId` | Yes | Rename a list owned by the caller |
| `DELETE` | `/todo/lists/:listId` | Yes | Delete a list owned by the caller |
| `GET` | `/todo/lists/:listId/todos` | Yes | Fetch todos in a list owned by the caller |
| `POST` | `/todo/lists/:listId/todos` | Yes | Add a todo to a list owned by the caller |
| `PUT` | `/todo/todos/:id` | Yes | Update a todo's title and/or completed flag |
| `DELETE` | `/todo/todos/:id` | Yes | Delete a todo owned by the caller |

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

### Lists

`GET /todo/lists` returns an array ordered alphabetically by `name`, containing only rows
where `userId` matches the session owner.

```json
[
  {
    "id": 1,
    "name": "Groceries",
    "userId": 42,
    "createdAt": "2026-07-02T12:00:00.000Z",
    "updatedAt": "2026-07-02T12:00:00.000Z"
  }
]
```

`POST /todo/lists` takes `{ "name": "Groceries" }` and responds `201` with the created row.
A `userId` in the request body is ignored — ownership always comes from the session.

`PUT /todo/lists/:listId` takes `{ "name": "Shopping" }` and responds `200` with the updated row.

`DELETE /todo/lists/:listId` responds `200` with `{ "message": "List deleted." }`.

List error cases:

- `400` — `List name is required.`, `List name must be 100 characters or fewer.`, `Invalid list id.`
- `404` — `List with id=<id> not found.` (also returned when the list belongs to another user)

### Todos

`GET /todo/lists/:listId/todos` returns the list's todos ordered incomplete first, then
oldest first. The parent list must be owned by the caller, otherwise `404`.

```json
[
  {
    "id": 10,
    "listId": 1,
    "title": "Buy milk",
    "completed": false,
    "userId": 42,
    "createdAt": "2026-07-02T12:05:00.000Z",
    "updatedAt": "2026-07-02T12:05:00.000Z"
  }
]
```

`POST /todo/lists/:listId/todos` takes `{ "title": "Buy milk" }` and responds `201`. New
todos are always `completed: false`; `userId` comes from the session and `listId` from the
validated parent list.

`PUT /todo/todos/:id` takes `{ "title": "..." }`, `{ "completed": true }`, or both, and
responds `200` with the updated row.

`DELETE /todo/todos/:id` responds `200` with `{ "message": "Todo deleted." }`.

Todo error cases:

- `400` — `Todo title is required.`, `Todo title must be 255 characters or fewer.`,
  `Invalid todo id.`, `Invalid list id.`, `Nothing to update.`, `Completed must be true or false.`
- `404` — `List with id=<id> not found.` or `Todo with id=<id> not found.` (also returned
  when the row belongs to another user)

## Conventions

- Flat JSON responses (no `{ success, data }` envelope).
- Errors: `{ "message": "..." }`.
- Authenticated routes: `Authorization: Bearer <token>`.
- Missing, unknown, or expired token on an authenticated route → `401` with a message starting `Unauthorized!`.
- Password hashes are never returned by any endpoint.
