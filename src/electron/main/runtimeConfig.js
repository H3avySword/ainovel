const E2E_BACKEND_PORT_ENV = 'LOCALAPP_BACKEND_PORT';
const E2E_BACKEND_TOKEN_ENV = 'LOCALAPP_BACKEND_TOKEN';

export const isE2EMode = () => process.env.LOCALAPP_E2E === '1';

export const getE2EBackendOverrides = () => {
    const rawPort = Number.parseInt(process.env[E2E_BACKEND_PORT_ENV] || '', 10);
    const port = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : 8000;
    const token = String(process.env[E2E_BACKEND_TOKEN_ENV] || '').trim() || 'localapp-e2e-token';
    return { port, token };
};
