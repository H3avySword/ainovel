import os

import pytest
from fastapi.testclient import TestClient

from main import app
from services.providers import deepseek_provider, google_provider, openai_compatible_provider


@pytest.mark.live
def test_google_live_smoke(monkeypatch, tmp_path):
    api_key = os.environ.get('LIVE_GOOGLE_API_KEY', '').strip()
    if not api_key:
        pytest.skip('LIVE_GOOGLE_API_KEY is not set')

    monkeypatch.setenv('LOCALAPP_PROVIDER_STORE_PATH', str(tmp_path / 'provider_settings.json'))
    google_provider.save_config(api_key=api_key)

    client = TestClient(app)
    response = client.post('/api/providers/google/test', json={'message': 'Reply with exactly: OK'})

    assert response.status_code == 200
    payload = response.json()
    assert payload['ok'] is True


@pytest.mark.live
def test_openai_compatible_live_smoke(monkeypatch, tmp_path):
    api_key = os.environ.get('LIVE_OPENAI_API_KEY', '').strip()
    if not api_key:
        pytest.skip('LIVE_OPENAI_API_KEY is not set')

    base_url = os.environ.get('LIVE_OPENAI_BASE_URL', 'https://api.openai.com/v1')
    monkeypatch.setenv('LOCALAPP_PROVIDER_STORE_PATH', str(tmp_path / 'provider_settings.json'))
    openai_compatible_provider.save_config(api_key=api_key, api_base_url=base_url)

    client = TestClient(app)
    response = client.post('/api/providers/openai-compatible/test', json={'message': 'Reply with exactly: OK'})

    assert response.status_code == 200
    payload = response.json()
    assert payload['ok'] is True


@pytest.mark.live
def test_deepseek_live_smoke(monkeypatch, tmp_path):
    api_key = os.environ.get('LIVE_DEEPSEEK_API_KEY', '').strip()
    if not api_key:
        pytest.skip('LIVE_DEEPSEEK_API_KEY is not set')

    base_url = os.environ.get('LIVE_DEEPSEEK_BASE_URL', 'https://api.deepseek.com')
    monkeypatch.setenv('LOCALAPP_PROVIDER_STORE_PATH', str(tmp_path / 'provider_settings.json'))
    deepseek_provider.save_config(api_key=api_key, api_base_url=base_url)

    client = TestClient(app)
    response = client.post('/api/providers/deepseek/test', json={'message': 'Reply with exactly: OK'})

    assert response.status_code == 200
    payload = response.json()
    assert payload['ok'] is True
