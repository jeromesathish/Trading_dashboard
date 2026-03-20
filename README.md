Risk & Reward Calculator

I added a standalone local calculator at `calculator/` (UI) with a small FastAPI backend to serve it.
Run locally:

```powershell
# Start the calculator backend (serves the UI at http://127.0.0.1:9000/)
uvicorn backend.calculator_api:app --reload --host 127.0.0.1 --port 9000

# Then open in your browser:
http://127.0.0.1:9000/
```

Files added:
- `calculator/index.html` — frontend UI (Tailwind + Chart.js)
- `calculator/app.js` — frontend logic (real-time calculation, localStorage, chart)
- `backend/calculator_api.py` — serves the static UI and provides a ping endpoint
This calculator runs entirely in the browser for calculations; the backend simply serves static files. It supports BUY/SELL toggle, brokerage (fixed/percent), recommended position size, local save/reset, keyboard-friendly inputs, and a small risk vs reward chart.
# Trading Dashboard (Local)

Professional local trading dashboard to plan trades, journal executions, enforce discipline, and review analytics.

Run locally

1. Create virtualenv (recommended) and activate it.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install requirements

```powershell
pip install -r requirements.txt
```

3. Run the backend

You can start the backend in two equivalent ways. The app now serves `frontend/index.html` at the root when present, so opening http://127.0.0.1:8000/ will load the frontend directly.

```powershell
# Option A: run with Python module entry (binds to localhost)
python -m backend.main

# Option B: run with uvicorn (same; explicitly bind to localhost)
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

If you prefer to open the frontend file directly, you can still open `frontend/index.html` in your browser or serve it from a static server.

Start-dev helper

There is a helper PowerShell script at the project root named `start-dev.ps1` that opens two PowerShell windows and starts the backend and a simple static server for the frontend.

Run it with a one-time bypass (no policy change required):

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

If you'd rather allow local scripts permanently for your user, run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\start-dev.ps1
```

Or skip the script and run the backend and frontend manually (examples above).

Project layout

- `backend/` FastAPI app and DB models
- `frontend/` Static single-page UI (Tailwind + Chart.js)
- `database/` DB helper

Notes

- Tailwind and Chart.js are loaded via CDN for simplicity.
- The backend stores data in `database/trading.db` (SQLite).

Risk & Reward Calculator

I added a standalone local calculator at `calculator/` (UI) with a small FastAPI backend to serve it.
Files added:
- `calculator/index.html` — frontend UI (Tailwind + Chart.js)
- `calculator/app.js` — frontend logic (real-time calculation, localStorage, chart)
- `backend/calculator_api.py` — serves the static UI and provides a ping endpoint

Run locally (development)

```powershell
# Start the calculator locally (dev): binds to localhost
uvicorn backend.calculator_api:app --reload --host 127.0.0.1 --port 9000
# Open in your browser:
http://127.0.0.1:9000/
```

Deploy to your server (recommended options)

1) Simple production run with Uvicorn (systemd / process manager)

```bash
# on the server (install Python, create venv, install requirements)
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# run uvicorn binding to all interfaces (0.0.0.0) and production port
uvicorn backend.calculator_api:app --host 0.0.0.0 --port 8000
```

Then point your reverse proxy (nginx) or firewall to port `8000`, or change the port to `80` if you prefer.

2) Containerized deployment (Docker)

Build and run the container (recommended for servers):

```bash
docker build -t rr-calculator:latest .
docker run -d -p 8000:8000 --name rr-calculator rr-calculator:latest
```

Or using docker-compose:

```bash
docker-compose up -d --build
```

The app will be available at `http://<your-server-ip>:8000/`.

Notes for production
- Use a reverse proxy (nginx) to terminate TLS (HTTPS) and forward to the container or Uvicorn process.
- If you expose the app publicly, adjust CORS in `backend/calculator_api.py` to restrict `allow_origins`.
- Consider running Uvicorn with a process manager (systemd, supervisord) or use `gunicorn` with `uvicorn.workers.UvicornWorker` for robust process management.

