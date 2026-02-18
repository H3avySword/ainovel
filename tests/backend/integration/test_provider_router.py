from fastapi.testclient import TestClient

from services.providers import google_provider


def test_provider_test_requires_configured_key(client: TestClient):
    response = client.post('/api/providers/google/test', json={'model': 'm', 'message': 'hi'})
    assert response.status_code == 400
    assert response.json()['detail'] == 'API key is not configured.'


def test_provider_connect_verify_false_returns_disconnected(client: TestClient):
    response = client.post(
        '/api/providers/google/connect',
        json={'api_key': 'abc12345', 'verify': False}
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['provider'] == 'google'
    assert payload['state'] == 'disconnected'


def test_provider_models_returns_502_on_upstream_error(client: TestClient, monkeypatch):
    google_provider.save_config(api_key='abc12345')
    monkeypatch.setattr(google_provider, 'list_models', lambda: (_ for _ in ()).throw(RuntimeError('boom')))

    response = client.get('/api/providers/google/models')

    assert response.status_code == 502
    assert 'Failed to fetch models' in response.json()['detail']


def test_provider_test_returns_502_on_upstream_error(client: TestClient, monkeypatch):
    google_provider.save_config(api_key='abc12345')

    def _raise(*_args, **_kwargs):
        raise RuntimeError('send failed')

    monkeypatch.setattr(google_provider, 'send_test_message', _raise)

    response = client.post('/api/providers/google/test', json={'model': 'gemini', 'message': 'hi'})

    assert response.status_code == 502
    assert response.json()['detail'].startswith('Test message failed:')


def test_provider_status_endpoint_contract(client: TestClient):
    response = client.get('/api/providers/google/status')
    assert response.status_code == 200

    payload = response.json()
    for key in ['provider', 'ok', 'state', 'message', 'configured', 'masked']:
        assert key in payload
