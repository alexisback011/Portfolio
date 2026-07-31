@echo off
REM ============================================
REM  Run Instructions - Command Prompt (cmd.exe)
REM  SQL backend (SQLite locally, PostgreSQL in production)
REM ============================================
setlocal
cd /d "%~dp0"

REM --- 1. Create backend .env (if missing) ---
if not exist "backend\.env" (
(
echo DATABASE_URL=sqlite+aiosqlite:///./portfolio.db
echo JWT_SECRET=dev-jwt-secret-change-in-production
echo FRONTEND_URL=http://localhost:3000
echo BACKEND_URL=http://localhost:8000
echo APP_ENV=development
echo ADMIN_EMAIL=admin@alex.dev
echo ADMIN_PASSWORD=admin123
) > "backend\.env"
)

REM --- 2. Install Python dependencies ---
pip install -r "backend\requirements.txt"

REM --- 3. Start backend ---
cd /d "%~dp0backend"
start /B "" python -m uvicorn server:app --host 0.0.0.0 --port 8000 > "C:\Users\susna\AppData\Local\Temp\opencode\backend.log" 2>&1
timeout /t 5 >nul
netstat -ano | findstr :8000

REM --- 4. Install frontend deps (if missing) ---
cd /d "%~dp0frontend"
if not exist "node_modules" call yarn.cmd install

REM --- 5. Start frontend ---
start /B "" yarn.cmd start > "C:\Users\susna\AppData\Local\Temp\opencode\frontend.log" 2>&1
timeout /t 20 >nul
netstat -ano | findstr :3000

REM --- 6. Verify ---
curl -s http://localhost:8000/api/
echo.
curl -s -o NUL -w "%%{http_code}" http://localhost:3000
echo.

REM --- 7. Open ---
echo Open http://localhost:3000 in your browser
echo Admin login: admin@alex.dev / admin123
endlocal
