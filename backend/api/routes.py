from datetime import datetime

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from core.logging import get_logger
from models.wind import (
    HealthResponse,
    MetricsResponse,
    WindDataPoint,
    WindDataResponse,
)
from services.wind_service import calculate_metrics, get_wind_data

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1")

MAX_RANGE_DAYS = 30


def _validate_date_range(start: str, end: str) -> tuple[str, str]:
    """Validate and parse ISO date strings; return them normalized."""
    try:
        start_dt = datetime.strptime(start, "%Y-%m-%d")
        end_dt = datetime.strptime(end, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Dates must be in YYYY-MM-DD format",
        ) from None

    if end_dt < start_dt:
        raise HTTPException(
            status_code=400,
            detail="End date must be on or after start date",
        )

    if (end_dt - start_dt).days > MAX_RANGE_DAYS:
        raise HTTPException(
            status_code=400,
            detail=f"Date range cannot exceed {MAX_RANGE_DAYS} days",
        )

    return start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d")


def _safe_float(value) -> float | None:
    if value is None or pd.isna(value):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _format_optional_datetime(value) -> str | None:
    if value is None or pd.isna(value):
        return None
    return value.strftime("%Y-%m-%dT%H:%M:%SZ")


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="ok", version="1.0.0")


@router.get("/wind-data", response_model=WindDataResponse)
def wind_data(
    start: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end: str = Query(..., description="End date (YYYY-MM-DD)"),
    horizon: int = Query(
        default=4,
        ge=0,
        le=48,
        description=(
            "Forecast horizon in hours. Only forecasts published at least "
            "this many hours before each target time are considered."
        ),
    ),
) -> WindDataResponse:
    """Fetch actual and forecast wind generation data for a date range.

    - **start**: Start date in YYYY-MM-DD format
    - **end**: End date in YYYY-MM-DD format
    - **horizon**: Forecast horizon in hours. Only forecasts published at least
      this many hours before each target time are considered. The latest valid
      forecast is selected for each time point.
    """
    start_date, end_date = _validate_date_range(start, end)

    try:
        df = get_wind_data(start_date, end_date, horizon)
    except Exception as exc:
        logger.error("Error fetching wind data: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch data from upstream API",
        ) from exc

    points: list[WindDataPoint] = []
    for _, row in df.iterrows():
        time_val = row.get("time")
        points.append(
            WindDataPoint(
                time=time_val.strftime("%Y-%m-%dT%H:%M:%SZ") if pd.notna(time_val) else None,
                actual=_safe_float(row.get("actual")),
                forecast=_safe_float(row.get("forecast")),
                publish_time=_format_optional_datetime(row.get("publish_time")),
            )
        )

    return WindDataResponse(
        horizon_hours=horizon,
        range_start=start_date,
        range_end=end_date,
        data=points,
    )


@router.get("/metrics", response_model=MetricsResponse)
def metrics(
    start: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end: str = Query(..., description="End date (YYYY-MM-DD)"),
    horizon: int = Query(
        default=4,
        ge=0,
        le=48,
        description="Forecast horizon in hours",
    ),
) -> MetricsResponse:
    """Calculate forecast accuracy metrics for a given date range and horizon.

    Returns MAE, MAPE, and RMSE comparing actual vs forecast values.
    """
    start_date, end_date = _validate_date_range(start, end)

    try:
        df = get_wind_data(start_date, end_date, horizon)
    except Exception as exc:
        logger.error("Error fetching wind data for metrics: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch data from upstream API",
        ) from exc

    m = calculate_metrics(df)

    return MetricsResponse(
        horizon_hours=horizon,
        range_start=start_date,
        range_end=end_date,
        mae=m["mae"],
        mape=m["mape"],
        rmse=m["rmse"],
        data_points=m["data_points"],
    )
