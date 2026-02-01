import * as electronModule from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import dotenv from 'dotenv';
import net from 'net';
import crypto from 'crypto';

// ESM/CJS Interop for Electron
// Sometimes electron is default, sometimes namespace.
const electron = electronModule.default || electronModule;
const { app, BrowserWindow, ipcMain, dialog } = electron;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

let pythonProcess = null;
let mainWindow = null;
let backendPort = null;
let backendToken = null;
let isBackendReady = false;

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

async function getPythonCommand() {
    // 1. Env Var
    if (process.env.PYTHON_PATH) {
        return { command: process.env.PYTHON_PATH, args: [] };
    }

    // 2. Hardcoded User Path (Robustness)
    const specificPath = 'D:\\Anaconda\\envs\\ainovel\\python.exe';
    try {
        await fs.access(specificPath);
        console.log("Found specific python path:", specificPath);
        return { command: specificPath, args: [] };
    } catch { }

    // 3. Fallback to conda
    return {
        command: 'conda',
        args: ['run', '-n', 'ainovel', 'python']
    };
}

async function startPythonBackend(port, token) {
    console.log(`Starting Python backend on port ${port}...`);
    const backendPath = path.join(__dirname, '../backend/main.py');
    const { command, args: pythonArgs } = await getPythonCommand();

    const spawnArgs = [
        ...pythonArgs,
        backendPath,
        '--port', port.toString(),
        '--token', token
    ];

    console.log(`Spawning backend: ${command} ${spawnArgs.join(' ')}`);

    // Use conda run to ensure environment.
    pythonProcess = spawn(command, spawnArgs, {
        cwd: path.join(__dirname, '..'),
        shell: true,
        stdio: 'pipe',
        windowsHide: true,
        env: { ...process.env, APP_TOKEN: token }
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

            startPythonBackend(backendPort, backendToken);
            createWindow();

            const healthy = await waitForBackendHealth(backendPort);
            if (healthy) {
                isBackendReady = true;
                mainWindow?.webContents?.send('backend-ready');
            } else {
                console.error("Backend failed to start in time.");
                dialog.showErrorBox("Startup Error", "AI Engine failed to start. Please check logs.");
            }

        } catch (err) {
            console.error("Fatal startup error:", err);
        }

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('window-all-closed', () => {
        console.log('Window all closed. Exiting...');
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

// ... (Pre-existing imports like electron, child_process, etc. remain up top, but we will add FileManager import and remove FS if possible later, or just ignore unused imports for now)

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
    ipcMain.on('window-close', () => mainWindow?.close());

    // --- Project Management via FileManager ---

    ipcMain.handle('get-last-project', async () => {
        const settings = await FileManager.loadAppSettings();
        return settings.lastProject || null;
    });

    ipcMain.handle('select-directory', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory']
        });
        if (canceled || filePaths.length === 0) return null;
        return filePaths[0];
    });

    ipcMain.handle('load-project', async (event, dirPath) => {
        const res = await FileManager.loadProject(dirPath);
        if (res.success) {
            return res.data; // Return object directly
        } else {
            console.error('Load project failed:', res.error);
            return null;
        }
    });

    ipcMain.handle('save-project', async (event, dirPath, updates) => {
        // App.tsx sends updates object, not string
        const res = await FileManager.saveProject(dirPath, updates);
        return res;
    });



    ipcMain.handle('create-project', async (event, dirPath, nodes, mode) => {
        return await FileManager.createProject(dirPath, nodes, mode);
    });

    // --- Content / Node Files ---

    // New Handler: Load Node Content
    ipcMain.handle('load-node-content', async (event, { projectPath, nodes, mode, nodeId, fileType }) => {
        return await FileManager.loadNodeContent(projectPath, nodes, mode, nodeId, fileType);
    });

    // New Handler: Save Node Content
    ipcMain.handle('save-node-content', async (event, { projectPath, nodes, mode, nodeId, content, fileType }) => {
        return await FileManager.saveNodeContent(projectPath, nodes, mode, nodeId, content, fileType);
    });

    // New Handler: Delete Node File
    ipcMain.handle('delete-node-file', async (event, { projectPath, nodes, mode, nodeId, fileType }) => {
        return await FileManager.deleteNodeFile(projectPath, nodes, mode, nodeId, fileType);
    });

    // --- Utilities ---

    ipcMain.handle('path-join', (event, ...args) => {
        return path.join(...args);
    });

    // Legacy support for manual file reads if used elsewhere (App.tsx currently doesn't seem to use raw read-file-content for anything other than project loading which is now covered)
    // But keeping it safe.
    ipcMain.handle('read-file-content', async (event, filePath) => {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return { success: true, content };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    /* 
       Helper for generic save if needed.
       Note: App.tsx doesn't seem to call 'save-file' directly anymore, it calls FileManager services.
    */
    ipcMain.handle('ensure-directory', async (event, dirPath) => {
        return await FileManager.ensureDirectory(dirPath);
    });
}
