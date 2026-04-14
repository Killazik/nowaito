# Fly.io deploy

This repo is prepared for two Fly apps:

- `nowaito-api` from `fly.backend.toml`
- `nowaito-web` from `fly.frontend.toml`

## 1. Install Fly CLI and login

```bash
fly auth login
```

Docs:

- https://fly.io/docs/launch/deploy/

## 2. Create a persistent volume for backend

SQLite database and uploads are stored in `/data`, so create a volume before first deploy:

```bash
fly volumes create nowaito_data --region waw --size 3 --app nowaito-api
```

Docs:

- https://fly.io/docs/volumes/overview/

## 3. Deploy backend

```bash
fly launch --no-deploy --copy-config --config fly.backend.toml
fly secrets set JWT_SECRET="replace-me" JWT_REFRESH_SECRET="replace-me-too" --app nowaito-api
fly deploy --config fly.backend.toml
```

Optional:

- set `REDIS_URL` if you want external Redis
- if `REDIS_URL` is omitted, the app falls back to in-memory cache

Backend public URL after deploy:

```text
https://nowaito-api.fly.dev
```

## 4. Deploy frontend

If your backend app name differs, update `fly.frontend.toml`:

```toml
[build.args]
  VITE_API_URL = "https://your-backend.fly.dev"
  VITE_WS_URL = "https://your-backend.fly.dev"
```

Then deploy:

```bash
fly launch --no-deploy --copy-config --config fly.frontend.toml
fly deploy --config fly.frontend.toml
```

Frontend public URL after deploy:

```text
https://nowaito-web.fly.dev
```

## 5. Connect a custom domain

Examples:

- `nowaito.com` -> frontend app
- `api.nowaito.com` -> backend app

Docs:

- https://fly.io/docs/networking/custom-domain/

Typical commands:

```bash
fly certs add nowaito.com --app nowaito-web
fly certs add api.nowaito.com --app nowaito-api
```

Then add the DNS records Fly shows you at your registrar.

## 6. `/ru` path

If you want `https://nowaito.com/ru`, that is a frontend route, not a DNS setting.
The current app does not yet define a dedicated `/ru` route.
