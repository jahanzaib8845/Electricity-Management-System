from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


class TestHealth:
    def test_health(self):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["version"] == "1.0.0"


class TestWindDataValidation:
    def test_invalid_date_format(self):
        resp = client.get(
            "/api/v1/wind-data?start=2024-13-01&end=2024-01-07&horizon=4"
        )
        assert resp.status_code == 400
        assert "YYYY-MM-DD" in resp.json()["detail"]

    def test_end_before_start(self):
        resp = client.get(
            "/api/v1/wind-data?start=2024-01-07&end=2024-01-01&horizon=4"
        )
        assert resp.status_code == 400
        assert "after" in resp.json()["detail"]

    def test_range_exceeds_30_days(self):
        resp = client.get(
            "/api/v1/wind-data?start=2024-01-01&end=2024-03-01&horizon=4"
        )
        assert resp.status_code == 400
        assert "exceed" in resp.json()["detail"].lower()

    def test_horizon_too_large(self):
        resp = client.get(
            "/api/v1/wind-data?start=2024-01-01&end=2024-01-07&horizon=99"
        )
        assert resp.status_code == 422

    def test_horizon_negative(self):
        resp = client.get(
            "/api/v1/wind-data?start=2024-01-01&end=2024-01-07&horizon=-1"
        )
        assert resp.status_code == 422

    def test_horizon_zero_ok(self):
        with patch("api.routes.get_wind_data") as mock_get:
            mock_get.return_value = MagicMock()
            mock_get.return_value.iterrows.return_value = iter([])
            resp = client.get(
                "/api/v1/wind-data?start=2024-01-01&end=2024-01-02&horizon=0"
            )
            assert resp.status_code == 200


class TestWindDataService:
    """Unit tests for the horizon-selection logic — no network calls."""

    def test_select_forecast_horizon_filter(self):
        import pandas as pd

        from services.wind_service import select_forecast_by_horizon

        # Actual data at 12:00 UTC
        actual_df = pd.DataFrame(
            {
                "time": pd.to_datetime(["2024-01-01T12:00:00Z"], utc=True),
                "actual": [100.0],
            }
        )

        # Three forecasts for the same target time, at different publish times
        forecast_df = pd.DataFrame(
            {
                "time": pd.to_datetime(
                    ["2024-01-01T12:00:00Z"] * 3, utc=True
                ),
                "publish_time": pd.to_datetime(
                    [
                        "2024-01-01T06:00:00Z",   # 6h before — valid
                        "2024-01-01T09:00:00Z",   # 3h before — invalid (horizon=4)
                        "2024-01-01T11:00:00Z",   # 1h before — invalid (horizon=4)
                    ],
                    utc=True,
                ),
                "forecast": [95.0, 102.0, 110.0],
            }
        )

        result = select_forecast_by_horizon(actual_df, forecast_df, horizon_hours=4)

        assert len(result) == 1
        # Should pick the latest valid forecast (06:00, forecast=95)
        assert result.iloc[0]["forecast"] == 95.0
        assert result.iloc[0]["publish_time"] == pd.to_datetime(
            "2024-01-01T06:00:00Z", utc=True
        )

    def test_select_forecast_empty_input(self):
        import pandas as pd

        from services.wind_service import select_forecast_by_horizon

        actual_df = pd.DataFrame(columns=["time", "actual"])
        forecast_df = pd.DataFrame(
            {
                "time": pd.to_datetime([], utc=True),
                "publish_time": pd.to_datetime([], utc=True),
                "forecast": [],
            }
        )

        result = select_forecast_by_horizon(actual_df, forecast_df, horizon_hours=4)
        assert len(result) == 0

    def test_calculate_metrics(self):
        import pandas as pd

        from services.wind_service import calculate_metrics

        df = pd.DataFrame(
            {
                "actual": [100.0, 200.0, 300.0, 400.0],
                "forecast": [110.0, 190.0, 290.0, 450.0],
            }
        )

        m = calculate_metrics(df)
        # Errors: -10, +10, +10, -50
        # MAE = (10+10+10+50)/4 = 20
        # RMSE = sqrt((100+100+100+2500)/4) = sqrt(700) ≈ 26.46
        # MAPE = (10/100 + 10/200 + 10/300 + 50/400)/4 * 100
        assert m["data_points"] == 4
        assert abs(m["mae"] - 20.0) < 0.1
        assert abs(m["rmse"] - 26.46) < 0.1

    def test_calculate_metrics_empty(self):
        import pandas as pd

        from services.wind_service import calculate_metrics

        df = pd.DataFrame({"actual": [], "forecast": []})
        m = calculate_metrics(df)
        assert m["data_points"] == 0
        assert m["mae"] == 0.0
        assert m["mape"] == 0.0

    def test_split_date_range(self):
        from services.wind_service import _split_date_range

        # 15-day range should be split into chunks of 7
        chunks = _split_date_range("2024-01-01", "2024-01-15")
        assert len(chunks) == 3  # 7 + 7 + 1
        assert chunks[0] == ("2024-01-01", "2024-01-07")
        assert chunks[1] == ("2024-01-08", "2024-01-14")
        assert chunks[2] == ("2024-01-15", "2024-01-15")

    def test_split_date_range_single_day(self):
        from services.wind_service import _split_date_range

        chunks = _split_date_range("2024-01-01", "2024-01-01")
        assert len(chunks) == 1
        assert chunks[0] == ("2024-01-01", "2024-01-01")
