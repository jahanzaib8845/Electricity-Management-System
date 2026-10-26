
import requests

from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)


def _build_url(endpoint: str) -> str:
    return f"{settings.bmrs_base_url}/datasets/{endpoint}/stream"


def fetch_actual_wind(
    settlement_date_from: str,
    settlement_date_to: str,
) -> list[dict]:
    """Fetch half-hourly actual wind generation from FUELHH.

    Args:
        settlement_date_from: ISO date string (yyyy-MM-dd).
        settlement_date_to: ISO date string (yyyy-MM-dd).

    Returns:
        List of records: {startTime, generation, settlementPeriod, ...}
    """
    url = _build_url("FUELHH")
    params = {
        "fuelType": "WIND",
        "settlementDateFrom": settlement_date_from,
        "settlementDateTo": settlement_date_to,
    }
    logger.info("Fetching actual wind data: %s -> %s", settlement_date_from, settlement_date_to)
    response = requests.get(url, params=params, timeout=settings.bmrs_timeout)
    response.raise_for_status()
    data = response.json()
    logger.info("Received %d actual wind records", len(data))
    return data


def fetch_wind_forecasts(
    publish_datetime_from: str,
    publish_datetime_to: str,
) -> list[dict]:
    """Fetch wind generation forecasts from WINDFOR.

    Args:
        publish_datetime_from: ISO datetime string with timezone.
        publish_datetime_to: ISO datetime string with timezone.

    Returns:
        List of records: {startTime, publishTime, generation, ...}
    """
    url = _build_url("WINDFOR")
    params = {
        "publishDateTimeFrom": publish_datetime_from,
        "publishDateTimeTo": publish_datetime_to,
    }
    logger.info(
        "Fetching wind forecast data: %s -> %s",
        publish_datetime_from,
        publish_datetime_to,
    )
    response = requests.get(url, params=params, timeout=settings.bmrs_timeout)
    response.raise_for_status()
    data = response.json()
    logger.info("Received %d forecast records", len(data))
    return data
