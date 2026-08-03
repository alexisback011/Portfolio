# Run Instructions

## Prerequisites

- Python 3.11+
- Node.js
- npm (Node's package manager)

No database server is required to run locally: the backend defaults to a
file-based SQLite database. For production you set one environment variable
(`DATABASE_URL`) to a PostgreSQL URL, which works on Render, AWS RDS,
Hostinger, Railway, Neon, Supabase, etc.

## Configuration

All settings come from environment variables. Copy them from `backend/.env`
(the file already exists locally):

| Variable          | Default                                   | Purpose                              |
|-------------------|-------------------------------------------|--------------------------------------|
| `DATABASE_URL`    | `sqlite+aiosqlite:///./portfolio.db`      | SQL database connection string       |
| `JWT_SECRET`      | *(required)*                              | Secret used to sign auth tokens      |
| `FRONTEND_URL`    | `http://localhost:3000`                   | Allowed CORS origin                  |
| `BACKEND_URL`     | `http://localhost:8000`                   | Backend base URL (info only)         |
| `APP_ENV`         | `development`                             | `development` or `production`        |
| `ADMIN_EMAIL`     | `admin@alex.dev`                          | Auto-seeded admin login              |
| `ADMIN_PASSWORD`  | `admin123`                                | Auto-seeded admin password           |

`DATABASE_URL` accepts three forms:

```
sqlite+aiosqlite:///./portfolio.db          # local dev, zero setup (default)
postgresql+asyncpg://user:pass@host:5432/db # PostgreSQL (async driver)
postgres://user:pass@host:5432/db           # auto-converted to the async driver
```

Tables are created automatically on startup and the admin user is seeded if
missing.

## Step-by-step (local)

### 1. Install Python dependencies

```powershell
pip install -r "backend\requirements.txt"
```

### 2. Start backend (detached)

```powershell
Start-Process -FilePath "python" -ArgumentList "-m uvicorn server:app --host 0.0.0.0 --port 8000" -WorkingDirectory (Join-Path $PWD "backend") -WindowStyle Hidden
Start-Sleep -Seconds 5
netstat -ano | Select-String ":8000"
```

### 3. Install frontend dependencies

```powershell
Set-Location frontend
yarn install
Set-Location ..
```

### 4. Start frontend (detached)

```powershell
Start-Process -FilePath "yarn.cmd" -ArgumentList "start" -WorkingDirectory (Join-Path $PWD "frontend") -WindowStyle Hidden
Start-Sleep -Seconds 20
netstat -ano | Select-String ":3000"
```

### 5. Verify

```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/" -UseBasicParsing
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
```

### 6. Open

```
http://localhost:3000
```

## Tests

```powershell
Set-Location backend
$env:REACT_APP_BACKEND_URL = "http://localhost:8000"
python -m pytest
```

## URLs

| Service     | URL                          |
|-------------|------------------------------|
| Frontend    | http://localhost:3000        |
| Backend API | http://localhost:8000/api/   |
| API Docs    | http://localhost:8000/docs   |

Admin login: `admin@alex.dev` / `admin123`

---

## Spotify "Now Playing" widget

The floating music widget polls `GET /api/spotify/now-playing`, which proxies
Spotify's `currently-playing` endpoint (with a `recently-played` fallback).
It only turns on once you connect your own Spotify account:

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard),
   log in with your Spotify account, and click **Create app**.
2. Give it a name (e.g. "Alex Portfolio"), check **Web API**, and add this
   **Redirect URI**:
   ```
   http://127.0.0.1:8888/callback
   ```
3. Note the **Client ID** and **Client Secret**.
4. Generate the refresh token (one-time OAuth dance):
   ```powershell
   Set-Location backend
   python scripts/get_spotify_token.py --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET
   ```
   Your browser opens, you approve, and the script prints three lines.
5. Add those three values to:
   - `backend/.env` (local dev):
     ```
     SPOTIFY_CLIENT_ID=...
     SPOTIFY_CLIENT_SECRET=...
     SPOTIFY_REFRESH_TOKEN=...
     ```
   - The Render service env vars (for production, same three names).
6. Restart the backend / redeploy. The widget appears bottom-right when
   something is playing (animated equalizer), falls back to your last played
   track when nothing is playing, and hides entirely if the values are wrong
   or missing.

Notes:

- The refresh token stays server-side; the browser only ever calls your own
  `/api/spotify/now-playing` endpoint.
- Access tokens are auto-refreshed and cached for an hour, so the backend
  won't hammer Spotify.
- The endpoint degrades safely: if credentials are missing it returns
  `{"configured": false}` and the widget hides.

---

## Deployment

The backend is plain FastAPI + SQLAlchemy and runs anywhere Python (or Docker)
is supported. The frontend is a static React build you can serve from any
static host (Netlify, Vercel, Cloudflare Pages, S3 + CloudFront, Hostinger,
etc.).

For every host the same rules apply:

1. Set `DATABASE_URL` to a PostgreSQL URL (or use SQLite if you accept file
   storage on a single instance).
2. Set `JWT_SECRET` to a long random string.
3. Set `FRONTEND_URL` to the deployed frontend URL so CORS works.
4. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD`, or leave the defaults.
5. Set `APP_ENV=production` (secure cookies are used when it is not
   `development`).
6. Rebuild the frontend with the deployed API URL:
   `REACT_APP_BACKEND_URL=https://your-api.example.com` before running
   `yarn build`, or set that env var in the frontend host.

### Render (easiest — one click for the whole app)

The repo ships `render.yaml` (a Render Blueprint) that deploys **everything**:
the FastAPI backend, a managed PostgreSQL database, and the static frontend.
It wires the database, the API URL (`REACT_APP_BACKEND_URL`) and the CORS
origin (`FRONTEND_URL`) between services automatically.

Steps:

1. Push this repo to GitHub (or GitLab).
2. Go to [render.com](https://render.com) → **New → Blueprint**.
3. Connect your GitHub account and select this repo.
4. Render reads `render.yaml` and provisions:
   - `alex-portfolio-api` — Python web service (rootDir `backend`)
   - `alex-portfolio-db` — managed PostgreSQL
   - `alex-portfolio-frontend` — static site (rootDir `frontend`)
5. When prompted, set `ADMIN_PASSWORD` (the admin account password).
   `JWT_SECRET` is generated automatically.
6. Wait for the build to finish, then open the frontend URL
   (`https://alex-portfolio-frontend.onrender.com`).

Notes:

- The free plan sleeps when idle; the first request after sleep is slow.
- `fromService` references hand the API's hostname to the frontend and the
  frontend's hostname to the API, so CORS and `REACT_APP_BACKEND_URL` are
  set automatically. Both app codebases normalize a bare hostname by
  prefixing `https://`.
- To redeploy on new commits: push to the connected branch.
- To keep costs at zero: use the `free` plan for all three resources.

### AWS

- **AWS RDS**: create a PostgreSQL instance, put its connection string in
  `DATABASE_URL`.
- **AWS App Runner / ECS**: deploy the container from `backend/Dockerfile`
  (App Runner accepts the repo directly; for ECS push to ECR first).
- **Elastic Beanstalk**: `pip install -r requirements.txt` +
  `uvicorn server:app --host 0.0.0.0 --port 8000` as the run command.
- **Frontend**: upload `frontend/build` to S3 behind CloudFront, or use Amplify.

### Hostinger

- **VPS / Docker**: build the image from `backend/Dockerfile` and run it;
  create a PostgreSQL database in hPanel and set `DATABASE_URL`.
- **Frontend**: upload `frontend/build` via hPanel's File Manager / FTP, or
  use Hostinger's Node hosting for the whole app.

### Generic (Railway, Fly.io, Heroku-style)

- Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Attach any managed PostgreSQL service and set `DATABASE_URL` to its
  connection string. The port comes from the platform's `$PORT` variable.
