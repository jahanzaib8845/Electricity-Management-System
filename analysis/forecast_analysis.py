import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt

ACTUAL_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream"
FORECAST_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream"

START = "2024-01-08"
END = "2024-01-15"


def fetch_actual(start, end):
    from_dt = datetime.strptime(start, "%Y-%m-%d")
    to_dt = datetime.strptime(end, "%Y-%m-%d")
    chunks = []
    current = from_dt
    while current <= to_dt:
        chunk_end = min(current + timedelta(days=6), to_dt)
        params = {
            "fuelType": "WIND",
            "settlementDateFrom": current.strftime("%Y-%m-%d"),
            "settlementDateTo": chunk_end.strftime("%Y-%m-%d"),
        }
        resp = requests.get(ACTUAL_URL, params=params, timeout=30)
        resp.raise_for_status()
        for rec in resp.json():
            chunks.append({"time": rec["startTime"], "actual": rec.get("generation")})
        current = chunk_end + timedelta(days=1)
    df = pd.DataFrame(chunks)
    df["time"] = pd.to_datetime(df["time"], utc=True)
    return df.drop_duplicates(subset=["time"]).sort_values("time")


def fetch_forecast(start, end):
    publish_from = (datetime.strptime(start, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%dT00:00:00Z")
    publish_to = f"{end}T23:59:59Z"
    params = {"publishDateTimeFrom": publish_from, "publishDateTimeTo": publish_to}
    resp = requests.get(FORECAST_URL, params=params, timeout=30)
    resp.raise_for_status()
    df = pd.DataFrame([
        {"time": r["startTime"], "publish_time": r.get("publishTime"), "forecast": r.get("generation")}
        for r in resp.json()
    ])
    df["time"] = pd.to_datetime(df["time"], utc=True)
    df["publish_time"] = pd.to_datetime(df["publish_time"], utc=True)
    return df.sort_values(["time", "publish_time"])


def select_forecast(actual_df, forecast_df, horizon_hours):
    horizon_delta = timedelta(hours=horizon_hours)
    selected = []
    for target in actual_df["time"]:
        cutoff = target - horizon_delta
        valid = forecast_df[(forecast_df["time"] == target) & (forecast_df["publish_time"] <= cutoff)]
        if not valid.empty:
            latest = valid.sort_values("publish_time").iloc[-1]
            selected.append({"time": target, "forecast": latest["forecast"], "publish_time": latest["publish_time"]})
    return pd.DataFrame(selected, columns=["time", "forecast", "publish_time"])


def compute_metrics(df):
    valid = df[["actual", "forecast"]].dropna()
    actual = valid["actual"].astype(float)
    forecast = valid["forecast"].astype(float)
    errors = actual - forecast
    mae = errors.abs().mean()
    rmse = np.sqrt((errors ** 2).mean())
    mask = actual != 0
    mape = (errors[mask].abs() / actual[mask]).mean() * 100 if mask.any() else 0
    return {"mae": mae, "mape": mape, "rmse": rmse, "n": len(valid)}


# Fetch data
print(f"Fetching actual data for {START} to {END}...")
actual = fetch_actual(START, END)
print(f"  {len(actual)} actual records")

print(f"Fetching forecast data...")
forecast = fetch_forecast(START, END)
print(f"  {len(forecast)} forecast records")

# Compute metrics at different horizons
horizons = [0, 1, 2, 4, 8, 12, 24]
results = []
for h in horizons:
    merged = actual.merge(select_forecast(actual, forecast, h), on="time", how="left")
    m = compute_metrics(merged)
    results.append({"horizon": h, **m})
    print(f"  Horizon {h:3d}h: MAE={m['mae']:.1f} MAPE={m['mape']:.2f}% RMSE={m['rmse']:.1f} N={m['n']}")

metrics_df = pd.DataFrame(results)
print(metrics_df)
