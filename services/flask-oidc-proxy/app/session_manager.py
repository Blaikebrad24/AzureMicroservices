import json

import redis


class SessionManager:
    def __init__(self, redis_url: str):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.session_prefix = "oidc_session:"
        self.default_ttl = 1800  # 30 minutes

    def store_session(self, session_id: str, data: dict, ttl: int = None) -> None:
        """Store session data in Redis."""
        key = f"{self.session_prefix}{session_id}"
        self.redis_client.setex(
            key,
            ttl or self.default_ttl,
            json.dumps(data),
        )

    def get_session(self, session_id: str) -> dict | None:
        """Retrieve session data from Redis."""
        key = f"{self.session_prefix}{session_id}"
        data = self.redis_client.get(key)
        if data:
            return json.loads(data)
        return None

    def delete_session(self, session_id: str) -> None:
        """Delete a session from Redis."""
        key = f"{self.session_prefix}{session_id}"
        self.redis_client.delete(key)

    def refresh_session_ttl(self, session_id: str, ttl: int = None) -> None:
        """Extend session expiration."""
        key = f"{self.session_prefix}{session_id}"
        self.redis_client.expire(key, ttl or self.default_ttl)

    def store_state(self, state: str, data: dict) -> None:
        """Store OIDC state parameter for CSRF protection (short TTL)."""
        key = f"oidc_state:{state}"
        self.redis_client.setex(key, 300, json.dumps(data))  # 5 min TTL

    def get_and_delete_state(self, state: str) -> dict | None:
        """Retrieve and delete OIDC state (one-time use)."""
        key = f"oidc_state:{state}"
        pipe = self.redis_client.pipeline()
        pipe.get(key)
        pipe.delete(key)
        result = pipe.execute()
        if result[0]:
            return json.loads(result[0])
        return None
