from unittest.mock import patch, MagicMock

from app.config import Config
from app.oidc_handler import OIDCHandler


def test_build_authorization_url():
    config = Config()
    handler = OIDCHandler(config)
    url = handler.build_authorization_url(
        redirect_uri="https://localhost/auth/callback",
        state="test-state-123",
    )
    assert config.KEYCLOAK_PUBLIC_URL in url
    assert "response_type=code" in url
    assert f"client_id={config.CLIENT_ID}" in url
    assert "state=test-state-123" in url


def test_generate_state():
    state1 = OIDCHandler.generate_state()
    state2 = OIDCHandler.generate_state()
    assert state1 != state2
    assert len(state1) > 20


@patch("app.oidc_handler.requests.post")
def test_exchange_code_for_tokens(mock_post):
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "access_token": "test-access-token",
        "id_token": "test-id-token",
        "refresh_token": "test-refresh-token",
    }
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    config = Config()
    handler = OIDCHandler(config)
    tokens = handler.exchange_code_for_tokens(
        code="test-code",
        redirect_uri="https://localhost/auth/callback",
    )

    assert tokens["access_token"] == "test-access-token"
    mock_post.assert_called_once()
    call_kwargs = mock_post.call_args
    assert call_kwargs[1]["data"]["grant_type"] == "authorization_code"
    assert call_kwargs[1]["data"]["code"] == "test-code"
