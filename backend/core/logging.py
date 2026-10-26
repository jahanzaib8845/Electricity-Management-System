import logging
import sys

from .config import settings

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    stream=sys.stdout,
)


def get_logger(name: str = "wind_forecast") -> logging.Logger:
    return logging.getLogger(name)
