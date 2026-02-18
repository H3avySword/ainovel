import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[2] / 'src' / 'python_backend'
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: E402


@pytest.fixture(autouse=True)
def isolated_provider_store(monkeypatch, tmp_path):
    store_path = tmp_path / 'provider_settings.json'
    monkeypatch.setenv('LOCALAPP_PROVIDER_STORE_PATH', str(store_path))
    monkeypatch.delenv('APP_TOKEN', raising=False)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
