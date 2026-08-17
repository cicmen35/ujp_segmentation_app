from pydantic import BaseModel


class MessageResponse(BaseModel):
    """Generic single-message response used across all routers."""

    message: str
