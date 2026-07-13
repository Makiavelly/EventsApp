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

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server opens at `http://localhost:5173/`.
