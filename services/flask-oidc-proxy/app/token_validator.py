import time

import jwt
import requests

from .config import Config


class TokenValidator:
    def __init__(self, config: Config):
        self.config = config
        self._jwks_cache = None
        self._jwks_cache_time = 0
        self._jwks_cache_ttl = 300  # 5 minutes

    def _get_jwks(self) -> dict:
        """Fetch and cache JWKS from Keycloak."""
        now = time.time()
        if self._jwks_cache and (now - self._jwks_cache_time) < self._jwks_cache_ttl:
            return self._jwks_cache

        response = requests.get(self.config.jwks_url, timeout=10)
        response.raise_for_status()
        self._jwks_cache = response.json()
        self._jwks_cache_time = now
        return self._jwks_cache

    def _get_signing_key(self, token: str):
        """Get the signing key for a specific JWT token."""
        jwks = self._get_jwks()
        unverified_header = jwt.get_unverified_header(token)

        for key_data in jwks.get("keys", []):
            if key_data.get("kid") == unverified_header.get("kid"):
                return jwt.algorithms.RSAAlgorithm.from_jwk(key_data)

        # Key not found, force refresh JWKS cache and retry
        self._jwks_cache = None
        jwks = self._get_jwks()
        for key_data in jwks.get("keys", []):
            if key_data.get("kid") == unverified_header.get("kid"):
                return jwt.algorithms.RSAAlgorithm.from_jwk(key_data)

        raise jwt.InvalidTokenError("Unable to find signing key")

    def validate_id_token(self, id_token: str) -> dict:
        """Validate and decode an ID token."""
        signing_key = self._get_signing_key(id_token)

        issuer = f"{self.config.KEYCLOAK_URL}/realms/{self.config.KEYCLOAK_REALM}"

        decoded = jwt.decode(
            id_token,
            key=signing_key,
            algorithms=["RS256"],
            audience=self.config.CLIENT_ID,
            issuer=issuer,
            options={
                "verify_exp": True,
                "verify_iat": True,
                "verify_aud": True,
                "verify_iss": True,
            },
        )
        return decoded

    def validate_access_token(self, access_token: str) -> dict:
        """Validate and decode an access token."""
        signing_key = self._get_signing_key(access_token)

        issuer = f"{self.config.KEYCLOAK_URL}/realms/{self.config.KEYCLOAK_REALM}"

        decoded = jwt.decode(
            access_token,
            key=signing_key,
            algorithms=["RS256"],
            issuer=issuer,
            options={
                "verify_exp": True,
                "verify_iat": True,
                "verify_iss": True,
                "verify_aud": False,  # Access tokens may have different audience
            },
        )
        return decoded

    def is_token_expired(self, token: str) -> bool:
        """Check if a token is expired without full validation."""
        try:
            claims = jwt.decode(
                token,
                options={
                    "verify_signature": False,
                    "verify_exp": True,
                },
            )
            return False
        except jwt.ExpiredSignatureError:
            return True
        except jwt.DecodeError:
            return True
