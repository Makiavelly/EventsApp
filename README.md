# EventsApp

## Structure

- `backend/` - Go backend, migrations, swagger docs, backend Dockerfile.
- `frontend/` - React + TypeScript + Vite frontend.
- `docker-compose.yaml` - shared local infrastructure and backend deployment.
- `out/` - local logs and PostgreSQL data, ignored by git.

## Backend

```bash
cd backend
make eventsapp-run
```

Docker/DB commands can be run either from `backend/` or through the root Makefile:

```bash
make env-up
make migrate-up
make eventsapp-deploy
```

Перед production-запуском задайте `AUTH_SECRET` случайной строкой длиной не менее 32 байт.
Access JWT по умолчанию живёт `15m`, а серверная refresh-сессия — `720h`. Параметры
настраиваются через `AUTH_ACCESS_TOKEN_TTL` и `AUTH_REFRESH_TOKEN_TTL`.

Refresh token хранится в `HttpOnly` cookie и в открытом виде в PostgreSQL не записывается.
Для HTTPS обязательно задайте `AUTH_REFRESH_COOKIE_SECURE=true`. Разрешённые frontend-origin
задаются через `HTTP_ALLOWED_ORIGINS` через запятую. После обновления существующей базы примените
миграции командой `make migrate-up`.

Аутентификация доступна через `/api/v1/auth/register`, `/api/v1/auth/login`,
`/api/v1/auth/refresh`, `/api/v1/auth/me` и `/api/v1/auth/logout`. Защищённые запросы принимают access token в заголовке
`Authorization: Bearer <token>`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server opens at `http://localhost:5173/`.
