# Forecast Analysis: Wind Generation Accuracy vs Horizon

This analysis examines how forecast accuracy degrades as the forecast horizon increases,
using real data from the Elexon BMRS API.

## Key Findings

(to be populated from notebook execution)

## Methodology

1. Fetch actual wind generation (FUELHH) for a date range
2. Fetch all wind forecasts (WINDFOR) published within the range
3. For each horizon H (0h, 1h, 2h, 4h, 8h, 12h, 24h):
   - Select the latest forecast published at least H hours before each target time
   - Compute MAE, MAPE, RMSE
4. Plot error metrics vs horizon to show accuracy degradation

## Metrics Computed

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| MAE | mean(|actual - forecast|) | Average absolute error (MW) |
| MAPE | mean(\|actual - forecast\| / \|actual\|) * 100 | Percentage error |
| RMSE | sqrt(mean((actual - forecast)^2)) | Root mean squared error (MW) |
