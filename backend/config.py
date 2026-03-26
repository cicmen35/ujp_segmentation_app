import os
from pathlib import Path


def parse_bool_env(name: str, default: bool) -> bool:
    """Parse a boolean environment variable with a safe fallback."""
    value = os.getenv(name)
    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "none").strip().lower()
COOKIE_SECURE = parse_bool_env("COOKIE_SECURE", True)
ENABLE_DEV_AUTH_BYPASS = parse_bool_env("ENABLE_DEV_AUTH_BYPASS", False)
STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", Path(__file__).resolve().parent / "data" / "storage"))
