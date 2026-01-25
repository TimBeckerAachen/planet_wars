from fastapi import Header, HTTPException, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import settings

# Initialize Rate Limiter
# key_func=get_remote_address uses the IP address of the client
limiter = Limiter(key_func=get_remote_address, enabled=settings.limiter_enabled)


def verify_client_source(
    x_client_source: str = Header(default=None),
) -> None:
    """
    Verify that the request comes from the allowed frontend application.
    This relies on a custom header 'X-Client-Source' that the frontend must send.

    While not a replacement for authentication, this adds a layer of defense
    against direct API abuse by ensuring requests at least attempt to mimic the frontend.
    """
    if not settings.enable_security_header:
        return

    expected_value = "planet-wars-frontend"

    if x_client_source != expected_value:
        # We can return 400 or 403. 403 Forbidden is appropriate for access denied.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Invalid client source.",
        )
