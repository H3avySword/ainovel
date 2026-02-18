import logging

from services import llm_service


def test_normalize_provider_aliases():
    assert llm_service.normalize_provider('openai') == 'openai-compatible'
    assert llm_service.normalize_provider('google-ai-studio') == 'google'


def test_infer_model_type():
    assert llm_service.infer_model_type('gemini-2.5-pro') == 'gemini'
    assert llm_service.infer_model_type('gpt-4o-mini') == 'gpt'
    assert llm_service.infer_model_type('deepseek-chat') == 'deepseek'


def test_generate_response_returns_error_for_unsupported_provider(caplog):
    caplog.set_level(logging.INFO)

    result = llm_service.generate_response(
        message='hello',
        history=[],
        system_instruction='sys',
        model_name='foo',
        provider_name='unsupported-provider'
    )

    assert result.startswith('Error generation response: Unsupported provider:')


def test_generate_response_google_path(monkeypatch):
    monkeypatch.setattr(llm_service, '_generate_google_response', lambda **kwargs: 'google-ok')

    result = llm_service.generate_response(
        message='hello',
        history=[],
        system_instruction='sys',
        model_name='gemini-3-flash-preview',
        provider_name='google'
    )

    assert result == 'google-ok'


def test_generate_response_openai_compatible_path(monkeypatch):
    monkeypatch.setattr(llm_service, '_generate_openai_style_response', lambda **kwargs: 'openai-ok')

    result = llm_service.generate_response(
        message='hello',
        history=[],
        system_instruction='sys',
        model_name='gpt-4o-mini',
        provider_name='openai-compatible'
    )

    assert result == 'openai-ok'
