import { AppConfig } from '../types';

export type ProviderId = 'google' | 'openai-compatible' | 'deepseek';
export type ProviderState = 'connected' | 'disconnected' | 'error';

export interface ProviderStatusResponse {
  provider: ProviderId;
  ok: boolean;
  state: ProviderState;
  message: string;
  configured: boolean;
  masked: string;
  api_base_url?: string;
  models?: string[];
  count?: number;
  selected_model?: string;
}

export interface ProviderTestResponse {
  provider: ProviderId;
  ok: boolean;
  message: string;
  text?: string;
}

export interface ProviderModelsResponse {
  provider: ProviderId;
  ok: boolean;
  models: string[];
  count?: number;
}

export interface ProviderConfigSnapshot {
  provider?: ProviderId;
  configured: boolean;
  masked: string;
  api_base_url?: string;
  state?: ProviderState;
  models?: string[];
  count?: number;
  selected_model?: string;
}

export interface ProviderConfigMapResponse {
  providers: Partial<Record<ProviderId, ProviderConfigSnapshot>>;
}

interface UpdateProviderConfigPayload {
  provider: ProviderId;
  api_key?: string;
  api_base_url?: string;
  models?: string[];
  selected_model?: string;
  state?: 'connected' | 'disconnected' | 'error';
}

const KNOWN_PROVIDER_IDS: ProviderId[] = ['google', 'openai-compatible', 'deepseek'];

const isProviderId = (value: string): value is ProviderId => {
  return KNOWN_PROVIDER_IDS.includes(value as ProviderId);
};

const getBackendBaseUrl = (appConfig: AppConfig | null): string => {
  if (!appConfig?.isReady || !appConfig.port) {
    throw new Error('Backend is not ready');
  }
  return `http://127.0.0.1:${appConfig.port}`;
};

const getHeaders = (appConfig: AppConfig | null): HeadersInit => {
  if (!appConfig?.token) {
    throw new Error('Backend auth token missing');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': appConfig.token
  };
};

const parseError = async (response: Response): Promise<Error> => {
  const data = await response.json().catch(() => ({}));
  const detail = data.detail || data.message || data.text || `Request failed (${response.status})`;
  return new Error(detail);
};

export const getGoogleProviderStatus = async (
  appConfig: AppConfig | null
): Promise<ProviderStatusResponse> => {
  return getProviderStatus(appConfig, 'google');
};

export const getProviderStatus = async (
  appConfig: AppConfig | null,
  providerId: ProviderId
): Promise<ProviderStatusResponse> => {
  const baseUrl = getBackendBaseUrl(appConfig);
  const response = await fetch(`${baseUrl}/api/providers/${providerId}/status`, {
    method: 'GET',
    headers: getHeaders(appConfig)
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
};

export const getAllProviderStatuses = async (
  appConfig: AppConfig | null
): Promise<ProviderConfigMapResponse> => {
  const baseUrl = getBackendBaseUrl(appConfig);
  const response = await fetch(`${baseUrl}/api/config/api-key`, {
    method: 'GET',
    headers: getHeaders(appConfig)
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const payload = await response.json().catch(() => ({}));
  const rawProviders = payload?.providers;
  const providers: Partial<Record<ProviderId, ProviderConfigSnapshot>> = {};

  if (rawProviders && typeof rawProviders === 'object') {
    for (const [providerKey, providerValue] of Object.entries(rawProviders as Record<string, unknown>)) {
      if (!isProviderId(providerKey)) {
        continue;
      }
      if (!providerValue || typeof providerValue !== 'object') {
        continue;
      }
      providers[providerKey] = providerValue as ProviderConfigSnapshot;
    }
  }

  return { providers };
};

export const updateProviderConfig = async (
  appConfig: AppConfig | null,
  payload: UpdateProviderConfigPayload
): Promise<ProviderConfigSnapshot> => {
  const baseUrl = getBackendBaseUrl(appConfig);
  const response = await fetch(`${baseUrl}/api/config/api-key`, {
    method: 'POST',
    headers: getHeaders(appConfig),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
};

export const connectGoogleProvider = async (
  appConfig: AppConfig | null,
  payload: { apiKey?: string; verify?: boolean } = {}
): Promise<ProviderStatusResponse> => {
  return connectProvider(appConfig, 'google', payload);
};

export const connectProvider = async (
  appConfig: AppConfig | null,
  providerId: ProviderId,
  payload: { apiKey?: string; apiBaseUrl?: string; verify?: boolean } = {}
): Promise<ProviderStatusResponse> => {
  const baseUrl = getBackendBaseUrl(appConfig);
  const response = await fetch(`${baseUrl}/api/providers/${providerId}/connect`, {
    method: 'POST',
    headers: getHeaders(appConfig),
    body: JSON.stringify({
      api_key: payload.apiKey?.trim() || undefined,
      api_base_url: payload.apiBaseUrl?.trim() || undefined,
      verify: payload.verify ?? true
    })
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
};

export const getGoogleProviderModels = async (
  appConfig: AppConfig | null
): Promise<ProviderModelsResponse> => {
  return getProviderModels(appConfig, 'google');
};

export const getProviderModels = async (
  appConfig: AppConfig | null,
  providerId: ProviderId
): Promise<ProviderModelsResponse> => {
  const baseUrl = getBackendBaseUrl(appConfig);
  const response = await fetch(`${baseUrl}/api/providers/${providerId}/models`, {
    method: 'GET',
    headers: getHeaders(appConfig)
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
};

export const testGoogleProvider = async (
  appConfig: AppConfig | null,
  payload: { model?: string; message?: string } = {}
): Promise<ProviderTestResponse> => {
  return testProvider(appConfig, 'google', payload);
};

export const testProvider = async (
  appConfig: AppConfig | null,
  providerId: ProviderId,
  payload: { model?: string; message?: string } = {}
): Promise<ProviderTestResponse> => {
  const baseUrl = getBackendBaseUrl(appConfig);
  const response = await fetch(`${baseUrl}/api/providers/${providerId}/test`, {
    method: 'POST',
    headers: getHeaders(appConfig),
    body: JSON.stringify({
      model: payload.model,
      message: payload.message
    })
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
};
