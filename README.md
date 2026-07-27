# EventsApp

EventsApp — приложение для создания событий, поиска по карте и управления участием. Backend написан на Go, данные хранятся в PostgreSQL/PostGIS, frontend — React + TypeScript.

## Быстрый локальный запуск

1. Скопируйте `.env.example` в `.env` и задайте PostgreSQL credentials и случайный `AUTH_SECRET` длиной не менее 32 байт.
2. Запустите БД и миграции:

```bash
make env-up
make migrate-up
```

3. В отдельных терминалах запустите backend и frontend:

```bash
make eventsapp-run
make frontend-install
make frontend-dev
```

Frontend будет доступен на `http://localhost:5173`, backend — на `http://localhost:5050`. Для local HTTP оставьте `AUTH_REFRESH_COOKIE_SECURE=false`.

## Docker

Локальный full-stack deployment:

```bash
make eventsapp-deploy
```

Compose применяет миграции, запускает PostgreSQL/PostGIS, Go backend и Nginx со SPA на `http://localhost:8080`. Backend и PostgreSQL не публикуются наружу.

Nginx проксирует `/api`, health и точный `/metrics`; backend доверяет client IP только от явно заданного собственного Nginx. Не добавляйте широкие RFC1918 ranges в `AUTH_RATE_LIMIT_TRUSTED_PROXIES`.

Вспомогательные сервисы не входят в стандартный запуск: DB port-forwarder включается командой `make env-port-forward`, Swagger generator — `make swagger-gen`.

Production-вариант добавляет Caddy с автоматическим TLS. Задайте реальный `APP_DOMAIN`, направьте на сервер DNS и выполните:

```bash
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d --build edge
```

Production override принудительно включает Secure-cookie. Для внешней PostgreSQL задайте `POSTGRES_SSL_MODE=verify-full` и `POSTGRES_SSL_ROOT_CERT`.

## Проверки

```bash
cd backend && go test -race ./... && go vet ./...
cd ../frontend && npm ci && npm run playwright:install
npm run lint && npm run test && npm run build && npm run test:e2e
```

Playwright хранит Chromium в стандартном `~/.cache/ms-playwright` и переиспользует его. Install script принудительно предпочитает IPv4 DNS, чтобы не повторять известный сбой CDN по IPv6.

Swagger UI: `http://localhost:5050/swagger/` при прямом backend-запуске. Служебные endpoints: `/health/live`, `/health/ready`, `/metrics`; через full stack они доступны на порту 8080.

Подробная документация находится в `docs/`; актуальный журнал исправлений — `docs/KNOWN_ISSUES.md`.
