from pydantic import BaseModel


class UserResponse(BaseModel):
    """Authenticated user payload returned by login, register, and /me."""

    id: str
    username: str
    role: str


class UserListItemResponse(BaseModel):
    """Slim user record returned by the admin user-listing endpoint."""

    username: str
    role: str


class PromptPointSchema(BaseModel):
    """Single SAM prompt point as stored/returned by the preset endpoints."""

    x: float
    y: float
    label: int


class PromptPresetResponse(BaseModel):
    """Full prompt-preset record returned by GET /auth/prompt-preset."""

    model: str
    prompt_mode: str
    preprocessing_mode: str
    bounding_box: list[float] | None = None
    prompt_points: list[PromptPointSchema]
