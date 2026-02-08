import * as electronModule from 'electron';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync, execSync } from 'child_process';
import net from 'net';
import crypto from 'crypto';

// ESM/CJS Interop for Electron
// Sometimes electron is default, sometimes namespace.
const electron = electronModule.default || electronModule;
const { app, BrowserWindow, ipcMain, dialog } = electron;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.join(__dirname, '..');
const devBackendExePath = path.join(appRoot, 'backend', 'dist', 'backend.exe');
const packagedBackendExePath = path.join(process.resourcesPath, 'backend', 'backend.exe');
const devBackendMainPath = path.join(appRoot, 'backend', 'main.py');
const packagedBackendMainPath = path.join(process.resourcesPath, 'backend', 'main.py');

let pythonProcess = null;
let mainWindow = null;
let backendPort = null;
let backendToken = null;
let isBackendReady = false;
const PROVIDER_CACHE_SETTINGS_KEY = 'providerCache';
const PREFERRED_PROVIDER_SETTINGS_KEY = 'preferredProvider';

const normalizeProviderCacheKey = (providerKey) => {
    if (typeof providerKey !== 'string') {
        return '';
    }
    return providerKey.trim().toLowerCase();
};

const normalizeProviderSelectionKey = (providerKey) => {
    const normalized = normalizeProviderCacheKey(providerKey);
    if (!normalized) {
        return '';
    }
    if (normalized === 'openai') {
        return 'openai-compatible';
    }
    if (normalized === 'openai_compatible') {
        return 'openai-compatible';
    }
    if (normalized === 'google-ai-studio') {
        return 'google';
    }
    if (!['google', 'openai-compatible', 'deepseek'].includes(normalized)) {
        return '';
    }
    return normalized;
};

// --------------------------------------------------------------------------
// 1. Utilities (Port & Token)
// --------------------------------------------------------------------------

function generateToken() {
    return crypto.randomUUID();
}

function findAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(startPort, '127.0.0.1', () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
    });
}

// --------------------------------------------------------------------------
// 2. Python Lifecycle Management
// --------------------------------------------------------------------------

const canRunPythonCandidate = (candidate) => {
    try {
        if (path.isAbsolute(candidate.command) && !fsSync.existsSync(candidate.command)) {
            return false;
        }
        const result = spawnSync(candidate.command, [...candidate.args, '--version'], {
            shell: true,
            windowsHide: true,
            stdio: 'ignore',
            timeout: 8000
        });
        return result.status === 0;
    } catch {
        return false;
    }
};

async function resolveBackendEntry() {
    const candidates = app?.isPackaged
        ? [packagedBackendMainPath, devBackendMainPath]
        : [devBackendMainPath, packagedBackendMainPath];

    for (const candidate of candidates) {
        try {
            await fs.access(candidate);
            return candidate;
        } catch {
            // try next
        }
    }

    const error = new Error(`Backend entry not found. Tried:\n- ${candidates.join('\n- ')}`);
    error.code = 'BACKEND_ENTRY_MISSING';
    throw error;
}

async function resolveBackendExecutable() {
    // In development we prefer Python source backend to avoid stale dist/backend.exe.
    // backend.exe should only be preferred in packaged app.
    if (!app?.isPackaged) {
        return null;
    }

    const candidates = app?.isPackaged
        ? [packagedBackendExePath, devBackendExePath]
        : [devBackendExePath, packagedBackendExePath];

    for (const candidate of candidates) {
        try {
            await fs.access(candidate);
            return candidate;
        } catch {
            // try next
        }
    }

    return null;
}

async function getPythonCommand() {
    if (process.env.PYTHON_PATH) {
        const envCandidate = { command: process.env.PYTHON_PATH, args: [] };
        if (canRunPythonCandidate(envCandidate)) {
            return envCandidate;
        }
        console.warn(`[Python] PYTHON_PATH is set but unusable: ${process.env.PYTHON_PATH}`);
    }

    const candidates = process.platform === 'win32'
        ? [
            { command: 'py', args: ['-3'] },
            { command: 'python', args: [] },
            { command: 'python3', args: [] },
            { command: 'conda', args: ['run', '-n', 'ainovel', 'python'] }
        ]
        : [
            { command: 'python3', args: [] },
            { command: 'python', args: [] }
        ];

    for (const candidate of candidates) {
        if (canRunPythonCandidate(candidate)) {
            return candidate;
        }
    }

    const error = new Error(
        "No usable Python runtime found. Install Python 3.10+ or set PYTHON_PATH environment variable."
    );
    error.code = 'PYTHON_NOT_FOUND';
    throw error;
}

async function startPythonBackend(port, token) {
    console.log(`Starting Python backend on port ${port}...`);
    const backendExePath = await resolveBackendExecutable();
    const providerStorePath = path.join(app.getPath('userData'), 'provider_settings.json');
    let command = '';
    let spawnArgs = [];
    let backendCwd = '';
    let useShell = true;

    if (backendExePath) {
        command = backendExePath;
        spawnArgs = ['--port', port.toString(), '--token', token];
        backendCwd = path.dirname(backendExePath);
        useShell = false;
        console.log(`[Backend] Using packaged executable: ${backendExePath}`);
    } else {
        const backendPath = await resolveBackendEntry();
        const { command: pythonCommand, args: pythonArgs } = await getPythonCommand();
        command = pythonCommand;
        spawnArgs = [
            ...pythonArgs,
            backendPath,
            '--port', port.toString(),
            '--token', token
        ];
        backendCwd = path.dirname(backendPath);
        useShell = true;
        console.log(`[Backend] Executable not found, fallback to Python script: ${backendPath}`);
    }

    console.log(`[Backend] Spawning: ${command} ${spawnArgs.join(' ')}`);

    pythonProcess = spawn(command, spawnArgs, {
        cwd: backendCwd,
        shell: useShell,
        stdio: 'pipe',
        windowsHide: true,
        env: {
            ...process.env,
            APP_TOKEN: token,
            LOCALAPP_PROVIDER_STORE_PATH: providerStorePath
        }
    });

    pythonProcess.stdout?.on('data', (data) => console.log(`[Python] ${data.toString()}`));
    pythonProcess.stderr?.on('data', (data) => console.error(`[Python Error] ${data.toString()}`));

    pythonProcess.on('error', (err) => {
        console.error('Failed to start python backend:', err);
    });

    pythonProcess.on('exit', (code, signal) => {
        console.log(`Python backend exited with code ${code} and signal ${signal}`);
        if (code !== 0) {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('backend-crashed', { code, signal });
            }
        }
    });
}

async function waitForBackendHealth(port) {
    const healthUrl = `http://127.0.0.1:${port}/api/health`;
    let retries = 30; // 15s

    while (retries > 0) {
        try {
            const response = await fetch(healthUrl);
            if (response.ok) {
                console.log('Backend is healthy!');
                return true;
            }
        } catch (e) { }
        await new Promise(resolve => setTimeout(resolve, 500));
        retries--;
    }
    return false;
}

// --------------------------------------------------------------------------
// 3. Window Management
// --------------------------------------------------------------------------

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        backgroundColor: '#f8fafc',
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    const loadUrl = 'http://localhost:5173';

    mainWindow.loadURL(loadUrl).catch(() => {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
}

// --------------------------------------------------------------------------
// 4. Main App Lifecycle
// --------------------------------------------------------------------------

if (app) {
    // Enable remote debugging for MCP server (only in dev/unpacked mode or if specifically requested)
    // This allows electron-mcp-server to connect to this app.
    if (!app.isPackaged || process.env.NODE_ENV === 'development') {
        app.commandLine.appendSwitch('remote-debugging-port', '9222');
    }

    app.whenReady().then(async () => {
        try {
            backendPort = await findAvailablePort(8000);
            backendToken = generateToken();
            console.log(`Configured: Port=${backendPort}, Token=${backendToken}`);

            await startPythonBackend(backendPort, backendToken);
            createWindow();

            const healthy = await waitForBackendHealth(backendPort);
            if (healthy) {
                isBackendReady = true;
                mainWindow?.webContents?.send('backend-ready');
            } else {
                console.error("Backend failed to start in time.");
                dialog.showErrorBox(
                    "Startup Error",
                    "AI Engine failed to start in time.\n\n" +
                    "Please verify Python availability and provider API configuration in settings."
                );
            }

        } catch (err) {
            console.error("Fatal startup error:", err);
            dialog.showErrorBox(
                "Startup Error",
                `Failed to initialize backend.\n\n${err?.message || err}`
            );
        }

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('window-all-closed', async () => {
        console.log('Window all closed. Exiting...');
        await ProjectService.flushAllPendingPersists();
        if (pythonProcess) {
            console.log('Killing Python process...');
            try {
                if (process.platform === 'win32') {
                    execSync(`taskkill /F /T /PID ${pythonProcess.pid}`);
                } else {
                    pythonProcess.kill('SIGKILL');
                }
            } catch (e) {
                console.error("Kill failed (maybe already dead):", e.message);
            }
        }
        console.log('Forcing app exit (Graceful Shutdown Attempt).');

        // 2. Try graceful quit to allow pending file writes
        app.quit();

        // 3. Force exit via suicide timer if graceful quit hangs
        setTimeout(() => {
            console.log('Shutdown timed out. Forcing exit.');
            process.exit(0);
        }, 1000);

        if (process.platform !== 'darwin') {
            // Let app.quit handle it
        }
    });
} else {
    console.error("ELECTRON APP IS UNDEFINED. Check imports.");
}

import FileManager from './FileManager.js';
import { registerProjectHandlers } from './ipc/projectHandlers.js';
import ProjectService from './services/ProjectService.js';

// --------------------------------------------------------------------------
// 5. IPC Handlers
// --------------------------------------------------------------------------

if (ipcMain) {
    ipcMain.handle('get-app-config', async () => {
        return {
            port: backendPort,
            token: backendToken,
            isReady: isBackendReady
        };
    });

    ipcMain.on('window-minimize', () => mainWindow?.minimize());
    ipcMain.on('window-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
    ipcMain.on('window-close', async () => {
        await ProjectService.flushAllPendingPersists();
        mainWindow?.close();
    });

    // --- Project Management via FileManager ---

    ipcMain.handle('get-last-project', async () => {
        const settings = await FileManager.loadAppSettings();
        const lastProject = typeof settings.lastProject === 'string' ? settings.lastProject.trim() : '';
        if (!lastProject) {
            return null;
        }

        const projectMetaPath = path.join(lastProject, 'project.json');
        if (!fsSync.existsSync(projectMetaPath)) {
            await FileManager.updateAppSettings((current) => {
                const next = { ...current };
                delete next.lastProject;
                return next;
            });
            return null;
        }

        return lastProject;
    });

    ipcMain.handle('select-directory', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory']
        });
        if (canceled || filePaths.length === 0) return null;
        return filePaths[0];
    });

    ipcMain.handle('create-project', async (event, dirPath, nodes, mode) => {
        return await FileManager.createProject(dirPath, nodes, mode);
    });

    ipcMain.handle('provider-cache:get', async (event, providerKey) => {
        const normalizedKey = normalizeProviderCacheKey(providerKey);
        if (!normalizedKey) {
            return null;
        }

        const settings = await FileManager.loadAppSettings();
        const providerCache = settings[PROVIDER_CACHE_SETTINGS_KEY];
        if (!providerCache || typeof providerCache !== 'object') {
            return null;
        }

        return providerCache[normalizedKey] ?? null;
    });

    ipcMain.handle('provider-cache:set', async (event, providerKey, payload) => {
        const normalizedKey = normalizeProviderCacheKey(providerKey);
        if (!normalizedKey) {
            throw new Error('providerKey is required');
        }

        await FileManager.updateAppSettings((current) => {
            const providerCache =
                current[PROVIDER_CACHE_SETTINGS_KEY] && typeof current[PROVIDER_CACHE_SETTINGS_KEY] === 'object'
                    ? { ...current[PROVIDER_CACHE_SETTINGS_KEY] }
                    : {};

            providerCache[normalizedKey] = payload ?? null;

            return {
                ...current,
                [PROVIDER_CACHE_SETTINGS_KEY]: providerCache,
            };
        });

        return { ok: true };
    });

    ipcMain.handle('provider-cache:clear', async (event, providerKey) => {
        const normalizedKey = normalizeProviderCacheKey(providerKey);
        if (!normalizedKey) {
            throw new Error('providerKey is required');
        }

        await FileManager.updateAppSettings((current) => {
            const providerCache = current[PROVIDER_CACHE_SETTINGS_KEY];
            if (!(providerCache && typeof providerCache === 'object' && normalizedKey in providerCache)) {
                return current;
            }

            const nextProviderCache = { ...providerCache };
            delete nextProviderCache[normalizedKey];
            return {
                ...current,
                [PROVIDER_CACHE_SETTINGS_KEY]: nextProviderCache,
            };
        });

        return { ok: true };
    });

    ipcMain.handle('provider-selection:get', async () => {
        const settings = await FileManager.loadAppSettings();
        const preferred = normalizeProviderSelectionKey(settings[PREFERRED_PROVIDER_SETTINGS_KEY]);
        return preferred || null;
    });

    ipcMain.handle('provider-selection:set', async (event, providerKey) => {
        const normalizedKey = normalizeProviderSelectionKey(providerKey);
        if (!normalizedKey) {
            throw new Error('providerKey is invalid');
        }

        await FileManager.updateAppSettings((current) => ({
            ...current,
            [PREFERRED_PROVIDER_SETTINGS_KEY]: normalizedKey,
        }));
        return { ok: true };
    });

    registerProjectHandlers(ipcMain, {
        getBackendPort: () => backendPort,
        getBackendToken: () => backendToken,
        emitProjectState: (projectPath, data) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('project:state-changed', { projectPath, data });
            }
        }
    });
}
