import { afterEach, describe, expect, it } from 'vitest';

import { getE2EBackendOverrides, isE2EMode } from '../../../src/electron/main/runtimeConfig.js';

describe('runtimeConfig', () => {
  afterEach(() => {
    delete process.env.LOCALAPP_E2E;
    delete process.env.LOCALAPP_BACKEND_PORT;
    delete process.env.LOCALAPP_BACKEND_TOKEN;
  });

  it('detects e2e mode', () => {
    process.env.LOCALAPP_E2E = '1';
    expect(isE2EMode()).toBe(true);
  });

  it('uses defaults when e2e backend env is not set', () => {
    expect(getE2EBackendOverrides()).toEqual({
      port: 8000,
      token: 'localapp-e2e-token'
    });
  });

  it('reads explicit backend overrides', () => {
    process.env.LOCALAPP_BACKEND_PORT = '9100';
    process.env.LOCALAPP_BACKEND_TOKEN = 'token-x';

    expect(getE2EBackendOverrides()).toEqual({
      port: 9100,
      token: 'token-x'
    });
  });
});
