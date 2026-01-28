import pytest

from app.main import app as flask_app
from app.config import Config


@pytest.fixture
def app():
    flask_app.config["TESTING"] = True
    yield flask_app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def config():
    return Config()
