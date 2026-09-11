# Behavior & Rules Reference

**Living snapshot** of product rules currently in force on `dev`.
Last updated: Feature 1 — User Authentication & Session Management.

These files answer: *"What rules does the app enforce right now?"*
They do **not** authorize new scope — implement only from `features/feature-*.md`.

| File | Role |
|------|------|
| [api.md](./api.md) | Routes / payloads |
| [data-model.md](./data-model.md) | Tables / columns |
| **This file** | Ownership, sort, validation, UI rules |

## Identity & sessions

| Rule | Enforcement | Provenance |
|------|-------------|------------|
| Users authenticate with username + password, never email | `auth.controller.js` `login` | Feature 1 FR-001 |
| Usernames are trimmed and lowercased on register and login | `auth.controller.js` | Feature 1 data model |
| Passwords are bcrypt-hashed (`SALT_ROUNDS = 10`) and never returned | `auth.controller.js`, `user.model.js` `defaultScope` | Feature 1 FR-003 |
| Sessions are JWT + `sessions` row; clients send `Authorization: Bearer <token>` | `authorization.js` `authenticate` | Feature 1 FR-004 |
| Sessions expire 24 hours after creation | `auth.controller.js` `issueSession` | Feature 1 FR-005 |
| Login reuses an existing non-expired session instead of issuing a second token | `auth.controller.js` `login` | Feature 1 FR-006 |
| New accounts default to role `worker` | `user.model.js` | Feature 1 FR-007 |
| Every authenticated request resolves to exactly one owner via `req.user.id` | `authorization.js` | Feature 1 FR-008 |
| Logout clears the token on the session row; replaying it returns `401` | `auth.controller.js` `logout` | Feature 1 US-1.4 |

## Validation

| Rule | Enforcement | Provenance |
|------|-------------|------------|
| Registration requires first name, last name, email, username, password | `auth.controller.js` `register`, `Register.vue` | Feature 1 FR-002 |
| Whitespace-only values count as missing | `clean()` in `auth.controller.js`, `?.trim()` rules in views | Feature 1 edge cases |
| Passwords must be at least 8 characters | `auth.controller.js`, `Register.vue` | Feature 1 US-1.1 |
| Email format uses shared `emailRules` (`Enter a valid email address.`) | `frontend/src/config/validation.js` | Feature 1 FR-009 |
| Duplicate username → `Username is already taken.`; duplicate email → `Email is already registered.` | `auth.controller.js` `register` | Feature 1 US-1.1 |
| Failed login returns one message for both unknown username and wrong password | `auth.controller.js` `login` | Feature 1 US-1.2 |

## UI rules

| Rule | Enforcement | Provenance |
|------|-------------|------------|
| The full login response is stored in `localStorage` under key `user` | `Login.vue`, `Register.vue` via `Utils.setStore` | Feature 1 US-1.1 / US-1.2 |
| Visiting a protected route without a session redirects to login | `router.beforeEach` | Feature 1 US-1.5 |
| Visiting login or register with a session redirects to home | `router.beforeEach` | Feature 1 US-1.3 |
| A `401` response clears the stored user and routes to login | `services.js` response interceptor | Feature 1 US-1.3 |
| Client-side validation blocks submit before any API call | `Login.vue`, `Register.vue` | Feature 1 US-1.1 / US-1.2 |
| Login, register, and the home placeholder use a full-screen layout (no `MenuBar` yet) | `App.vue` | Feature 1 Screen Requirements |
