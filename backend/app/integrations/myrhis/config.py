from dataclasses import dataclass
from functools import lru_cache
import os


@dataclass(frozen=True)
class MyRhisSettings:
    base_url: str
    api_key: str
    username: str
    password: str
    timeout_seconds: float
    max_restaurant_pages: int


@lru_cache(maxsize=1)
def get_myrhis_settings() -> MyRhisSettings:
    base_url = os.getenv("MYRHIS_BASE_URL", "").strip().rstrip("/")
    api_key = os.getenv("MYRHIS_API_KEY", "").strip()
    username = os.getenv("MYRHIS_USERNAME", "").strip()
    password = os.getenv("MYRHIS_PASSWORD", "").strip()
    timeout_seconds = float(os.getenv("MYRHIS_TIMEOUT_SECONDS", "10"))
    max_restaurant_pages = int(os.getenv("MYRHIS_MAX_RESTAURANT_PAGES", "25"))

    missing = [
        name
        for name, value in (
            ("MYRHIS_BASE_URL", base_url),
            ("MYRHIS_API_KEY", api_key),
            ("MYRHIS_USERNAME", username),
            ("MYRHIS_PASSWORD", password),
        )
        if not value
    ]
    if missing:
        raise RuntimeError(f"MyRHIS configuration is missing: {', '.join(missing)}")

    return MyRhisSettings(
        base_url=base_url,
        api_key=api_key,
        username=username,
        password=password,
        timeout_seconds=timeout_seconds,
        max_restaurant_pages=max_restaurant_pages,
    )
