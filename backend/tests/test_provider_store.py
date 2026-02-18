import json
from pathlib import Path

import pytest

from services.providers import provider_store


def test_provider_store_round_trip(monkeypatch, tmp_path):
    store_path = tmp_path / 'provider_store.json'
    monkeypatch.setenv('LOCALAPP_PROVIDER_STORE_PATH', str(store_path))

    state = provider_store.update_provider_state('google', {'api_key': 'abc', 'connection_state': 'disconnected'})
    assert state['api_key'] == 'abc'

    loaded = provider_store.get_provider_state('google')
    assert loaded['api_key'] == 'abc'

    raw = json.loads(Path(store_path).read_text(encoding='utf-8'))
    assert 'providers' in raw
    assert 'google' in raw['providers']


def test_normalize_models_deduplicates_and_strips():
    models = provider_store.normalize_models([' gpt-4o-mini ', '', 'gpt-4o-mini', 'gpt-4.1-mini'])
    assert models == ['gpt-4o-mini', 'gpt-4.1-mini']


def test_set_connection_state_rejects_invalid_state(monkeypatch, tmp_path):
    monkeypatch.setenv('LOCALAPP_PROVIDER_STORE_PATH', str(tmp_path / 'provider_store.json'))

    with pytest.raises(ValueError, match='Invalid connection state'):
        provider_store.set_provider_connection_state('google', 'invalid')


def test_corrupted_store_file_falls_back_to_empty(monkeypatch, tmp_path):
    store_path = tmp_path / 'provider_store.json'
    store_path.write_text('not-json', encoding='utf-8')
    monkeypatch.setenv('LOCALAPP_PROVIDER_STORE_PATH', str(store_path))

    state = provider_store.get_provider_state('google')
    assert state == {}
