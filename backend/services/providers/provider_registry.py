from typing import Any, Dict

from services.providers import deepseek_provider, google_provider, openai_compatible_provider

PROVIDER_MODULES: Dict[str, Any] = {
    "google": google_provider,
    "openai-compatible": openai_compatible_provider,
    "deepseek": deepseek_provider,
}

PROVIDER_ALIASES: Dict[str, str] = {
    "google": "google",
    "google-ai-studio": "google",
    "openai": "openai-compatible",
    "openai-compatible": "openai-compatible",
    "openai_compatible": "openai-compatible",
    "deepseek": "deepseek",
}


def normalize_provider_name(provider_name: str) -> str:
    normalized = (provider_name or "google").strip().lower()
    return PROVIDER_ALIASES.get(normalized, normalized)


def get_provider_module(provider_name: str):
    normalized = normalize_provider_name(provider_name)
    module = PROVIDER_MODULES.get(normalized)
    if not module:
        raise KeyError(f"Unsupported provider: {provider_name}")
    return module

