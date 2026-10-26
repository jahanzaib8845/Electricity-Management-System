# Wind Forecast Monitoring Application

A full-stack web application that compares actual vs forecasted UK national wind power
generation data to help users understand how forecast accuracy changes over time.

This is a take-home assignment for the **REint AI Full Stack Software Engineer Intern**
position (GridBricks). The project demonstrates strong full-stack engineering: a FastAPI
backend that fetches and processes real data from the Elexon BMRS API, and a Next.js
frontend with interactive Chart.js visualizations.

## Architecture

```
.
├── backend/          # FastAPI backend (Python)
│   ├── api/          # Route definitions
│   ├── core/         # Configuration & logging
│   ├── services/     # BMRS client & data processing (horizon filtering)
│   ├── models/       # Pydantic models
│   ├── tests/        # Unit tests (13 tests)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/         # Next.js frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/  # Chart, controls, metrics card
│   │   ├── hooks/       # SWR data hooks
│   │   ├── lib/         # API client
│   │   └── types/       # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── analysis/         # Forecast accuracy analysis script
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Quick Start

### Docker (recommended)

```bash
docker compose up --build
```

Backend: http://localhost:8000  
Frontend: http://localhost:3000

### Local development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## API

| Endpoint | Method | Params | Description |
|---|---|---|---|
| `/api/v1/health` | GET | — | Health check |
| `/api/v1/wind-data` | GET | `start`, `end`, `horizon` | Actual + forecast wind generation data |
| `/api/v1/metrics` | GET | `start`, `end`, `horizon` | Error metrics (MAE, MAPE, RMSE) |

## How the Forecast Horizon Works

For each target time *t* (from actual data):
1. We look at all forecasts for that same target time
2. A forecast is valid only if `publishTime <= t - horizon_hours`
3. Among valid forecasts, we select the **latest published** one

This simulates what was actually knowable at the chosen horizon. Higher horizons
(forecasts made further in advance) typically have lower accuracy.

## Data Sources

- **Actual generation**: Elexon BMRS `FUELHH` dataset (half-hourly, filtered for `fuelType=WIND`)
- **Forecasts**: Elexon BMRS `WINDFOR` dataset (published up to 8×/day at 30-min intervals)

## AI Tools Usage

AI tools (Claude) were used for:
- Debugging Python pandas timezone handling and NaN/NaT edge cases
- Troubleshooting Chart.js TypeScript typing issues
- CI workflow YAML configuration assistance

All architectural decisions, data processing logic, forecast horizon algorithm design,
error metric calculations, and analytical reasoning were performed independently.

## License

This project is an assignment submission. See individual file headers for details.
