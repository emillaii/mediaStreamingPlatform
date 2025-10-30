# Backend Service

Node.js Express backend with PostgreSQL integration for handling authentication and user management.

## Requirements

- Node.js 18+
- PostgreSQL instance
- `.env` file (you can copy `.env.example`)

## Environment variables

```
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=media_platform
DB_USER=postgres
DB_PASSWORD=postgres
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/media_platform
ALLOWED_ORIGINS=http://localhost:5173
```

## Setup

```bash
cd backend
npm install
cp .env.example .env # adjust the values
```

## Development

```bash
npm run dev
```

The server will start on the configured `PORT` (defaults to `4000`).

## Database setup

1. Ensure PostgreSQL is running and the target database exists (see `.env`).
2. Apply the schema (automatically executed on server start, or run manually):

   ```bash
   npm run db:init

   # alternatively, apply the SQL file directly with psql:
   # psql "$DATABASE_URL" -f db/schema.sql
   # psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/schema.sql
   ```

3. (Optional) Seed a super admin account:

   ```bash
   node scripts/createSuperAdmin.js
   ```

   The script hashes the provided password and upserts the record into the `super_admins` table.

## APIs

### Health

- `GET /health` – service heartbeat.

### Authentication

- `POST /auth/super-admin/login`
  - Request body: `{ "email": "admin@example.com", "password": "secret" }`
  - Verifies credentials against the `super_admins` table (`password_hash` is expected to be a bcrypt hash).

### Users

- `GET /users` – retrieves users ordered by `created_at`.
- `POST /users`
  - Request body: `{ "email": "user@example.com", "password": "secret", "displayName": "Jane", "role": "member" }`
  - Creates a new user with a bcrypt-hashed password.

> **Note:** Ensure the PostgreSQL schema contains the `super_admins` and `users` tables with columns matching the queries in the routes.
