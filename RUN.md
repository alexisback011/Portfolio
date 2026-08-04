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

## "Now Playing" widget (Last.fm)

The floating music widget polls `GET /api/now-playing`, which reads your most
recent scrobble from Last.fm (showing a live "now playing" track when you're
listening, otherwise your last played track). It only turns on once you connect
a Last.fm account. This uses Last.fm instead of Spotify's player APIs because
those require a Premium account.

1. Create a free account at [last.fm](https://www.last.fm/join).
2. Get a free **API key** at [last.fm/api/account/create](https://www.last.fm/api/account/create).
3. Connect Spotify to Last.fm so your listening gets scrobbled (this works on
   Spotify's free tier): in the Spotify app go to
   **Settings → "Connect to Last.fm"** and follow the login. Last.fm starts
   recording every track you play.
4. Add two env vars:
   - `backend/.env` (local dev):
     ```
     LASTFM_API_KEY=...
     LASTFM_USERNAME=...
     ```
   - The Render service env vars (for production, same two names).
5. Restart the backend / redeploy. The widget appears bottom-right with an
   animated equalizer while something is playing, falls back to your last
   played track otherwise, and hides entirely if the values are missing.

Notes:

- The browser only ever calls your own `/api/now-playing` endpoint.
- The endpoint degrades safely: if credentials are missing it returns
  `{"configured": false}` and the widget hides.
- Polling is 30 seconds, and Last.fm's API is free, so the backend won't hit
  any rate limits.

---

## AI assistant (Google Gemini)

The floating "Ask Alex" chat bubble (`POST /api/ai/chat`) is a concierge
chatbot that answers questions about Alex and the site. It's backed by
Google's Gemini free tier, so it costs nothing at portfolio scale.

1. Create a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   (any Google account works; copy the API key once it's generated).
2. Add one env var:
   - `backend/.env` (local dev):
     ```
     GEMINI_API_KEY=...
     ```
   - The Render service env vars (for production, same name).
3. Restart the backend / redeploy. The bubble appears bottom-right with a
   "Ask Alex" button. It hides entirely if the key is missing.

Notes:

- The API key stays server-side; the browser only ever calls your own
  `/api/ai/chat` endpoint.
- The model defaults to `gemini-2.0-flash`; override with an `AI_MODEL` env var
  if you ever want a different one.
- The endpoint is public, so it's lightly rate-limited per visitor (10
  messages/minute) to protect your free quota.
- If the key is missing, `GET /api/ai/chat` returns `{"configured": false}`
  and the widget hides.

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
