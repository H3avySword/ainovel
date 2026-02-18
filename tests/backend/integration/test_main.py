from fastapi.testclient import TestClient


def test_health_is_public(client: TestClient):
    response = client.get('/api/health')
    assert response.status_code == 200
    payload = response.json()
    assert payload['status'] == 'ok'


def test_token_middleware_rejects_missing_auth(client: TestClient, monkeypatch):
    monkeypatch.setenv('APP_TOKEN', 'secure-token')

    response = client.get('/api/config/api-key')
    assert response.status_code == 403


def test_token_middleware_allows_valid_auth(client: TestClient, monkeypatch):
    monkeypatch.setenv('APP_TOKEN', 'secure-token')

    response = client.get('/api/config/api-key', headers={'Authorization': 'secure-token'})
    assert response.status_code == 200
    payload = response.json()
    assert 'providers' in payload


def test_update_api_key_validates_state(client: TestClient):
    response = client.post(
        '/api/config/api-key',
        json={
            'provider': 'google',
            'api_key': 'test-key',
            'state': 'invalid-state'
        }
    )
    assert response.status_code == 400
    assert response.json()['detail'] == 'Invalid state.'
