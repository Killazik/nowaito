# Nowaito

Nowaito is a Telegram-like messenger with a gray monochrome UI, built with TypeScript, Express, Socket.io, PostgreSQL (Prisma), Redis, React, Vite, and TailwindCSS.

## Features implemented

- Registration/login with phone + password
- JWT access/refresh authentication
- Multi-device sessions (`sessions` table) with active-session management API
- Private/group/channel chat creation
- Real-time messaging via Socket.io
- Optimistic UI message sending on web client
- Basic typing and presence events
- Message history persistence in PostgreSQL
- File upload endpoint for message attachments
- Gray monochrome theme

## Project structure

- `backend/` - Express API + Socket.io + Prisma
- `frontend/` - React app
- `docker-compose.yml` - Postgres + Redis + Backend + Frontend

## Environment

Copy `.env.example` values into backend runtime if needed:

```env
DATABASE_URL=postgresql://nowaito:nowaito@localhost:5432/nowaito
REDIS_URL=redis://localhost:6379
JWT_SECRET=super-secret
JWT_REFRESH_SECRET=super-refresh-secret
PORT=3000
```

## Run with Docker

```bash
docker-compose up -d --build
```

Then apply DB schema and seed:

```bash
cd backend
npm run migrate
npm run seed
```

Open:

- Frontend: http://localhost:8080
- Backend: http://localhost:3000

## Local dev without Docker

Start services (Postgres + Redis), then:

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

## Test users

Seed creates:

- `+10000000001` / `1234`
- `+10000000002` / `1234`

Use two browser profiles/devices to verify synchronization.

## Phone and friends access

For phone access on the same Wi-Fi:

1. Start backend:
```bash
cd backend
npm run dev
```
2. Start frontend in LAN mode:
```bash
cd frontend
npm run dev:host
```
3. Open `http://<YOUR_PC_LAN_IP>:5173` on the phone.

The frontend now auto-detects host IP for API/Socket and connects to `:3000` on the same machine.

For friends outside your local network:

- Option A: deploy backend/frontend to a VPS (recommended)
- Option B: use a tunnel ([Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) or [ngrok](https://ngrok.com/))

Then set:

```env
VITE_API_URL=https://your-public-api-url
VITE_WS_URL=https://your-public-api-url
```

## Authentication

Nowaito currently uses password-based auth:

- `POST /api/auth/register` uses `phoneNumber + password`
- `POST /api/auth/login` uses `phoneNumber + password`

## Fly.io deploy

Prepared configs are included:

- `fly.backend.toml`
- `fly.frontend.toml`
- `DEPLOY_FLY_IO.md`

The project is prepared for two Fly apps:

- backend: `nowaito-api`
- frontend: `nowaito-web`

Backend production settings use:

- `DATABASE_URL=file:/data/nowaito.db`
- `UPLOAD_DIR=/data/uploads`

So you need a Fly volume for persistent SQLite data and uploaded files.
