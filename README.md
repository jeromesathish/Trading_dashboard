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

```powershell
uvicorn backend.main:app --reload
```

Open the frontend by opening `frontend/index.html` in your browser (or serve it from a local static server).

Project layout

- `backend/` FastAPI app and DB models
- `frontend/` Static single-page UI (Tailwind + Chart.js)
- `database/` DB helper

Notes

- Tailwind and Chart.js are loaded via CDN for simplicity.
- The backend stores data in `database/trading.db` (SQLite).
