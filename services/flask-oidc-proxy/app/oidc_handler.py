import secrets
import urllib.parse

import requests

from .config import Config


class OIDCHandler:
    def __init__(self, config: Config):
        self.config = config

    def build_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Build the OIDC authorization URL for browser redirect."""
        params = {
            "response_type": "code",
            "client_id": self.config.CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": self.config.SCOPES,
            "state": state,
        }
        return f"{self.config.public_auth_url}?{urllib.parse.urlencode(params)}"

    def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> dict:
        """Exchange authorization code for tokens at Keycloak's token endpoint."""
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": self.config.CLIENT_ID,
            "client_secret": self.config.CLIENT_SECRET,
        }
        response = requests.post(
            self.config.token_url,
            data=data,
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    def refresh_tokens(self, refresh_token: str) -> dict:
        """Use refresh token to obtain new access/id tokens."""
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": self.config.CLIENT_ID,
            "client_secret": self.config.CLIENT_SECRET,
        }
        response = requests.post(
            self.config.token_url,
            data=data,
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    def get_userinfo(self, access_token: str) -> dict:
        """Fetch user info from Keycloak's userinfo endpoint."""
        response = requests.get(
            self.config.userinfo_url,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    @staticmethod
    def generate_state() -> str:
        """Generate a cryptographically random state parameter."""
        return secrets.token_urlsafe(32)
