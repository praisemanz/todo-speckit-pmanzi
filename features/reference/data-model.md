# Data Model Reference

**Current integrated state on `dev`.** Last updated: Feature 1 — User Authentication & Session Management.

## Tables

### `users`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `fName` | STRING | Required |
| `lName` | STRING | Required |
| `email` | STRING | Required, unique |
| `username` | STRING(100) | Required, unique; stored lowercase |
| `password` | STRING(255) | Required; bcrypt hash only (`SALT_ROUNDS = 10`) |
| `role` | STRING(20) | Required, defaults to `worker` |
| `createdAt` / `updatedAt` | DATE | Sequelize timestamps |

`password` is excluded by a Sequelize `defaultScope`; use `User.unscoped()` only where a
hash comparison is required (login).

### `sessions`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `token` | STRING | Required; set to `""` on logout |
| `email` | STRING | Required |
| `expirationDate` | DATE | Required; 24 hours after creation |
| `userId` | INTEGER FK | Required, references `users.id` |
| `createdAt` / `updatedAt` | DATE | Sequelize timestamps |

## Associations

- `users` **hasMany** `sessions` (`userId`, `onDelete: CASCADE`)
- `sessions` **belongsTo** `users` (`userId`)
