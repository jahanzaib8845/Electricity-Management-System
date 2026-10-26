from datetime import UTC, datetime, timedelta

import pandas as pd

from core.logging import get_logger
from services.bmrs_client import fetch_actual_wind, fetch_wind_forecasts

logger = get_logger(__name__)


def _parse_iso(value: str) -> datetime:
    """Parse an ISO-8601 datetime string into a timezone-aware datetime."""
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt


def _split_date_range(start: str, end: str) -> list[tuple[str, str]]:
    """BMRS FUELHH settlement queries accept at most 7 days per request.
    Split the range into chunks of <= 7 days.

    Args:
        start: ISO date string (yyyy-MM-dd).
        end: ISO date string (yyyy-MM-dd).

    Returns:
        List of (from, to) date-string tuples.
    """
    start_date = datetime.strptime(start, "%Y-%m-%d").date()
    end_date = datetime.strptime(end, "%Y-%m-%d").date()
    chunks: list[tuple[str, str]] = []
    current = start_date
    while current <= end_date:
        chunk_end = min(current + timedelta(days=6), end_date)
        chunks.append((current.isoformat(), chunk_end.isoformat()))
        current = chunk_end + timedelta(days=1)
    return chunks


def fetch_actual_data(start: str, end: str) -> pd.DataFrame:
    """Fetch and assemble actual wind generation data.

    Args:
        start: ISO date string (yyyy-MM-dd).
        end: ISO date string (yyyy-MM-dd).

    Returns:
        DataFrame with columns ['time', 'actual'].
    """
    chunks: list[pd.DataFrame] = []
    for date_from, date_to in _split_date_range(start, end):
        raw = fetch_actual_wind(date_from, date_to)
        df = pd.DataFrame(
            [
                {
                    "time": rec["startTime"],
                    "actual": rec.get("generation"),
                }
                for rec in raw
            ]
        )
        df["time"] = pd.to_datetime(df["time"], utc=True)
        chunks.append(df)

    if not chunks:
        return pd.DataFrame(columns=["time", "actual"])

    result = pd.concat(chunks, ignore_index=True)
    result = result.drop_duplicates(subset=["time"])
    result = result.sort_values("time").reset_index(drop=True)
    logger.info("Total actual wind data points: %d", len(result))
    return result


def fetch_forecast_data(
    start: str,
    end: str,
) -> pd.DataFrame:
    """Fetch wind forecast data covering the target date range.

    The WINDFOR API is queried by publishDateTime. We need forecasts that
    were published before the end of the target range and could cover
    any target time within [start, end].

    Args:
        start: ISO date string (yyyy-MM-dd).
        end: ISO date string (yyyy-MM-dd).

    Returns:
        DataFrame with columns ['time', 'publish_time', 'forecast'].
    """
    publish_from = (
        datetime.strptime(start, "%Y-%m-%d") - timedelta(days=1)
    ).strftime("%Y-%m-%dT00:00:00Z")
    publish_to = f"{end}T23:59:59Z"

    raw = fetch_wind_forecasts(publish_from, publish_to)
    df = pd.DataFrame(
        [
            {
                "time": rec["startTime"],
                "publish_time": rec.get("publishTime"),
                "forecast": rec.get("generation"),
            }
            for rec in raw
        ]
    )

    if df.empty:
        logger.warning("No forecast records returned from WINDFOR API")
        return df

    df["time"] = pd.to_datetime(df["time"], utc=True)
    df["publish_time"] = pd.to_datetime(df["publish_time"], utc=True)
    df = df.sort_values(["time", "publish_time"]).reset_index(drop=True)
    logger.info("Total forecast records fetched: %d", len(df))
    return df


def select_forecast_by_horizon(
    actual_df: pd.DataFrame,
    forecast_df: pd.DataFrame,
    horizon_hours: int,
) -> pd.DataFrame:
    """Select one forecast per actual data point based on horizon.

    For each actual target time *t*, a forecast is valid if its
    ``publishTime <= t - horizon_hours``. Among all valid forecasts
    for the same ``startTime``, the **latest** published one within
    the allowed horizon window is selected.

    Args:
        actual_df: DataFrame with ['time', 'actual'].
        forecast_df: DataFrame with ['time', 'publish_time', 'forecast'].
        horizon_hours: Minimum hours between publish time and target time.

    Returns:
        DataFrame with columns ['time', 'forecast', 'publish_time'].
    """
    if actual_df.empty or forecast_df.empty:
        return pd.DataFrame(columns=["time", "forecast", "publish_time"])

    horizon_delta = timedelta(hours=horizon_hours)
    selected_rows: list[dict] = []

    for target_time in actual_df["time"]:
        cutoff = target_time - horizon_delta
        valid = forecast_df[
            (forecast_df["time"] == target_time)
            & (forecast_df["publish_time"] <= cutoff)
        ]
        if not valid.empty:
            latest = valid.sort_values("publish_time").iloc[-1]
            selected_rows.append(
                {
                    "time": target_time,
                    "forecast": latest["forecast"],
                    "publish_time": latest["publish_time"],
                }
            )

    result = pd.DataFrame(selected_rows, columns=["time", "forecast", "publish_time"])
    logger.info(
        "Selected %d forecast points at horizon=%dh (out of %d actual points)",
        len(result),
        horizon_hours,
        len(actual_df),
    )
    return result


def get_wind_data(
    start: str,
    end: str,
    horizon_hours: int,
) -> pd.DataFrame:
    """Fetch actual + forecast wind data and merge by time.

    Args:
        start: ISO date string (yyyy-MM-dd).
        end: ISO date string (yyyy-MM-dd).
        horizon_hours: Forecast horizon in hours.

    Returns:
        DataFrame with columns ['time', 'actual', 'forecast', 'publish_time'].
    """
    actual_df = fetch_actual_data(start, end)
    forecast_df = fetch_forecast_data(start, end)

    selected_forecast = select_forecast_by_horizon(
        actual_df, forecast_df, horizon_hours
    )

    if actual_df.empty:
        return pd.DataFrame(columns=["time", "actual", "forecast", "publish_time"])

    if not selected_forecast.empty:
        merged = actual_df.merge(selected_forecast, on="time", how="left")
    else:
        merged = actual_df.copy()
        merged["forecast"] = pd.NA
        merged["publish_time"] = pd.NA

    merged = merged.sort_values("time").reset_index(drop=True)
    return merged


def calculate_metrics(df: pd.DataFrame) -> dict:
    """Calculate forecast accuracy metrics: MAE, MAPE, RMSE.

    Args:
        df: DataFrame with 'actual' and 'forecast' columns (NaNs dropped).

    Returns:
        Dict with mae, mape, rmse, and data_points.
    """
    valid = df[["actual", "forecast"]].dropna()
    if valid.empty:
        return {"mae": 0.0, "mape": 0.0, "rmse": 0.0, "data_points": 0}

    actual = valid["actual"].astype(float)
    forecast = valid["forecast"].astype(float)
    errors = actual - forecast

    mae = float(errors.abs().mean())
    rmse = float((errors ** 2).mean() ** 0.5)

    mask = actual != 0
    if mask.any():
        mape = float((errors[mask].abs() / actual[mask]).mean() * 100)
    else:
        mape = 0.0

    return {
        "mae": round(mae, 2),
        "mape": round(mape, 4),
        "rmse": round(rmse, 2),
        "data_points": int(len(valid)),
    }
