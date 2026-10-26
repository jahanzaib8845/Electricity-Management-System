
from pydantic import BaseModel


class WindDataPoint(BaseModel):
    time: str
    actual: float | None = None
    forecast: float | None = None
    publish_time: str | None = None


class WindDataResponse(BaseModel):
    horizon_hours: int
    range_start: str
    range_end: str
    data: list[WindDataPoint]


class MetricsResponse(BaseModel):
    horizon_hours: int
    range_start: str
    range_end: str
    mae: float
    mape: float
    rmse: float
    data_points: int


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"


class ErrorResponse(BaseModel):
    detail: str
    error_code: str | None = None
