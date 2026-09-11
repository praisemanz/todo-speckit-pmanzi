# Behavior & Rules Reference

**Living snapshot** of product rules currently in force on `dev`.
Last updated: Feature 3 — Todo List Item Management.

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

## List ownership

| Rule | Enforcement | Provenance |
|------|-------------|------------|
| Every list endpoint requires a valid session | `list.routes.js` `authenticate` | Feature 2 FR-001 |
| A list belongs to one user for its whole lifetime; ownership never changes | `list.controller.js` | Feature 2 FR-002 |
| Reads, updates, and deletes are scoped by `userId: req.user.id` | `getAccessibleListOrNull` in `authorization.js`, `list.controller.js` `findAll` | Feature 2 FR-003 |
| On create, `userId` comes from the session; a body `userId` is ignored | `list.controller.js` `create` | Feature 2 FR-004 |
| Another user's list responds `404`, never `403` | `list.controller.js` | Feature 2 Data Ownership |
| Lists are returned ordered alphabetically by name | `list.controller.js` `findAll` | Feature 2 FR-006 |

## Todo ownership

| Rule | Enforcement | Provenance |
|------|-------------|------------|
| Every todo endpoint requires a valid session | `list.routes.js`, `todo.routes.js` `authenticate` | Feature 3 FR-001 |
| A todo belongs to exactly one list and one user for its whole lifetime | `todo.controller.js` | Feature 3 FR-002 |
| Todo reads, updates, and deletes are scoped by `userId: req.user.id` | `getAccessibleTodoOrNull`, `todo.controller.js` | Feature 3 FR-003 |
| Creating a todo requires the parent list to be owned by the caller, else `404` | `todo.controller.js` `create` | Feature 3 FR-004 |
| `userId` and `listId` come from the session and validated list, never the request body | `todo.controller.js` `create` | Feature 3 FR-005 |
| New todos default to `completed: false` | `todo.model.js` | Feature 3 FR-007 |
| Deleting a list cascades to its todos | `models/index.js` `onDelete: CASCADE` | Feature 3 FR-008 |
| Todos are returned incomplete first, then oldest first | `todo.controller.js` `TODO_ORDER` | Feature 3 FR-009 |

## Validation

| Rule | Enforcement | Provenance |
|------|-------------|------------|
| Registration requires first name, last name, email, username, password | `auth.controller.js` `register`, `Register.vue` | Feature 1 FR-002 |
| Whitespace-only values count as missing | `clean()` in `auth.controller.js`, `?.trim()` rules in views | Feature 1 edge cases |
| Passwords must be at least 8 characters | `auth.controller.js`, `Register.vue` | Feature 1 US-1.1 |
| Email format uses shared `emailRules` (`Enter a valid email address.`) | `frontend/src/config/validation.js` | Feature 1 FR-009 |
| Duplicate username → `Username is already taken.`; duplicate email → `Email is already registered.` | `auth.controller.js` `register` | Feature 1 US-1.1 |
| Failed login returns one message for both unknown username and wrong password | `auth.controller.js` `login` | Feature 1 US-1.2 |
| List names are trimmed; empty names rejected with `List name is required.` | `list.controller.js`, `Dashboard.vue` | Feature 2 FR-005 |
| List names longer than 100 characters rejected with `List name must be 100 characters or fewer.` | `list.controller.js` | Feature 2 US-2.1 |
| Todo titles are trimmed; empty titles rejected with `Todo title is required.` | `todo.controller.js`, `ListItemsDialog.vue` | Feature 3 FR-006 |
| Todo titles longer than 255 characters rejected with `Todo title must be 255 characters or fewer.` | `todo.controller.js` | Feature 3 edge cases |

## UI rules

| Rule | Enforcement | Provenance |
|------|-------------|------------|
| The full login response is stored in `localStorage` under key `user` | `Login.vue`, `Register.vue` via `Utils.setStore` | Feature 1 US-1.1 / US-1.2 |
| Visiting a protected route without a session redirects to login | `router.beforeEach` | Feature 1 US-1.5 |
| Visiting login or register with a session redirects to home | `router.beforeEach` | Feature 1 US-1.3 |
| A `401` response clears the stored user and routes to login | `services.js` response interceptor | Feature 1 US-1.3 |
| Client-side validation blocks submit before any API call | `Login.vue`, `Register.vue` | Feature 1 US-1.1 / US-1.2 |
| `MenuBar` shows the signed-in user's name and Sign out, and is hidden on login and register | `App.vue`, `MenuBar.vue` | Feature 2 Screen Requirements |
| The dashboard is a single view with dialog-based add, rename, and delete — no sidebar split | `Dashboard.vue` | Feature 2 FR-007 |
| An empty lists view shows `No lists yet. Create your first list.` | `Dashboard.vue` | Feature 2 US-2.2 |
| Row actions are icon-only with `aria-label` `Edit list` / `Delete list` | `Dashboard.vue` | Feature 2 US-2.3 |
| Each list row has a `View items for <list name>` icon opening the list-items dialog | `Dashboard.vue` | Feature 3 FR-010 |
| Add, edit, and delete todo controls exist only inside the list-items dialog | `ListItemsDialog.vue` | Feature 3 US-3.1 |
| Opening the items dialog fetches only that list's todos | `ListItemsDialog.vue` watcher | Feature 3 US-3.2 |
| An empty items dialog shows `No todos in this list yet.` | `ListItemsDialog.vue` | Feature 3 US-3.2 |
| Completed todos render with struck-through title text | `ListItemsDialog.vue` | Feature 3 US-3.3 |
