from unittest.mock import patch, MagicMock

import jwt as pyjwt

from app.config import Config
from app.token_validator import TokenValidator


def test_is_token_expired_with_expired_token():
    config = Config()
    validator = TokenValidator(config)

    # Create an expired token (no signature verification needed for this test)
    expired_token = pyjwt.encode(
        {"exp": 0, "sub": "test"},
        "secret",
        algorithm="HS256",
    )
    assert validator.is_token_expired(expired_token) is True


def test_is_token_expired_with_valid_token():
    import time

    config = Config()
    validator = TokenValidator(config)

    valid_token = pyjwt.encode(
        {"exp": int(time.time()) + 3600, "sub": "test"},
        "secret",
        algorithm="HS256",
    )
    assert validator.is_token_expired(valid_token) is False


def test_is_token_expired_with_garbage():
    config = Config()
    validator = TokenValidator(config)
    assert validator.is_token_expired("not-a-token") is True
