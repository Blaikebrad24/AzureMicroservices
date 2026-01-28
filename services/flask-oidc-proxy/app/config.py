import os


class Config:
    # Keycloak server-to-server URL (Docker internal network)
    KEYCLOAK_URL = os.environ.get("KEYCLOAK_URL", "http://keycloak:8080")

    # Keycloak browser-facing URL (for redirects the user's browser follows)
    KEYCLOAK_PUBLIC_URL = os.environ.get("KEYCLOAK_PUBLIC_URL", "http://localhost:8080")

    KEYCLOAK_REALM = os.environ.get("KEYCLOAK_REALM", "app-realm")
    CLIENT_ID = os.environ.get("CLIENT_ID", "nginx-proxy-client")
    CLIENT_SECRET = os.environ.get("CLIENT_SECRET", "changeme")
    REDIRECT_URI = os.environ.get("REDIRECT_URI", "https://localhost/auth/callback")

    # Redis for session storage
    REDIS_URL = os.environ.get("REDIS_URL", "redis://:redispassword@redis:6379/0")

    # Flask session secret
    SESSION_SECRET = os.environ.get("SESSION_SECRET", "super-secret-key")

    # OIDC scopes
    SCOPES = "openid profile email"

    @property
    def discovery_url(self):
        """Internal OIDC discovery endpoint (server-to-server)."""
        return f"{self.KEYCLOAK_URL}/realms/{self.KEYCLOAK_REALM}/.well-known/openid-configuration"

    @property
    def public_auth_url(self):
        """Public authorization endpoint (browser redirect)."""
        return f"{self.KEYCLOAK_PUBLIC_URL}/realms/{self.KEYCLOAK_REALM}/protocol/openid-connect/auth"

    @property
    def token_url(self):
        """Internal token endpoint (server-to-server)."""
        return f"{self.KEYCLOAK_URL}/realms/{self.KEYCLOAK_REALM}/protocol/openid-connect/token"

    @property
    def jwks_url(self):
        """Internal JWKS endpoint (server-to-server)."""
        return f"{self.KEYCLOAK_URL}/realms/{self.KEYCLOAK_REALM}/protocol/openid-connect/certs"

    @property
    def logout_url(self):
        """Public logout endpoint (browser redirect)."""
        return f"{self.KEYCLOAK_PUBLIC_URL}/realms/{self.KEYCLOAK_REALM}/protocol/openid-connect/logout"

    @property
    def userinfo_url(self):
        """Internal userinfo endpoint (server-to-server)."""
        return f"{self.KEYCLOAK_URL}/realms/{self.KEYCLOAK_REALM}/protocol/openid-connect/userinfo"
