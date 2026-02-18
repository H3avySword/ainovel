import { expect, test } from '@playwright/test';

test('loads app shell with mocked electron bridge', async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    const noop = () => {};

    (window as any).electronAPI = {
      getAppConfig: async () => ({ isReady: true, port: 8000, token: 'e2e-token' }),
      onBackendReady: () => noop,
      onProjectStateChanged: () => noop,
      getLastProject: async () => null,
      selectDirectory: async () => null,
      createProject: async () => ({ success: true }),
      minimize: noop,
      maximize: noop,
      close: noop,
      clipboard: {
        readText: async () => '',
        writeText: async () => ({ ok: true })
      },
      providerCache: {
        get: async () => null,
        set: async () => ({ ok: true }),
        clear: async () => ({ ok: true })
      },
      providerSelection: {
        get: async () => 'google',
        set: async () => ({ ok: true })
      },
      project: {
        getState: async () => ({ success: true, data: null }),
        selectNode: async () => ({ success: true, data: { revision: 1 } }),
        loadNodeField: async () => ({ success: true, data: { value: '' } }),
        updateNode: async () => ({ success: true, data: { node: {}, revision: 1 } }),
        save: async () => ({ success: true, data: { revision: 1 } }),
        addNode: async () => ({ success: true, data: {} }),
        renameNode: async () => ({ success: true, data: { revision: 1 } }),
        deleteNode: async () => ({ success: true, data: {} }),
        splitShortPreview: async () => ({ success: true, chapters: [] }),
        applyShortSplit: async () => ({ success: true, data: {} })
      }
    };
  });

  await page.goto(baseURL || 'http://127.0.0.1:4173');

  await expect(page.locator('[data-testid="right-sidebar"]')).toBeVisible();
  await expect(page.locator('[data-testid="ai-chat-panel"]')).toBeVisible();
});
