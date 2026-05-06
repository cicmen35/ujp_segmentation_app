import os
from pathlib import Path


def parse_bool_env(name: str, default: bool) -> bool:
    """Parse a boolean environment variable with a safe fallback."""
    value = os.getenv(name)
    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


def parse_csv_env(name: str, default: list[str]) -> list[str]:
    """Parse a comma-separated environment variable into a trimmed string list."""
    value = os.getenv(name)
    if value is None:
        return default

    items = [item.strip() for item in value.split(",")]
    return [item for item in items if item]


COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "none").strip().lower()
COOKIE_SECURE = parse_bool_env("COOKIE_SECURE", True)
ENABLE_DEV_AUTH_BYPASS = parse_bool_env("ENABLE_DEV_AUTH_BYPASS", False)
STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", Path(__file__).resolve().parent / "data" / "storage"))
CORS_ALLOW_ORIGINS = parse_csv_env("CORS_ALLOW_ORIGINS", ["http://localhost:5173"])
