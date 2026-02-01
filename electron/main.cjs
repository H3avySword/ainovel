const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const fsSync = require('fs'); // For existence check if needed
const path = require('path');
const { spawn, execSync } = require('child_process');
const dotenv = require('dotenv');
const net = require('net');
const crypto = require('crypto');

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

/**
 * Find an available TCP port starting from startPort.
 */
function findAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(startPort, () => {
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
        env: { ...process.env, APP_TOKEN: token } // Also set in env as backup/compatibility
    });

    pythonProcess.stdout?.on('data', (data) => console.log(`[Python] ${data.toString()}`));
    pythonProcess.stderr?.on('data', (data) => console.error(`[Python Error] ${data.toString()}`));

    pythonProcess.on('error', (err) => {
        console.error('Failed to start python backend:', err);
    });

    pythonProcess.on('exit', (code, signal) => {
        console.log(`Python backend exited with code ${code} and signal ${signal}`);
        if (code !== 0) {
            // Notify frontend of crash if window exists
            // Notify frontend of crash if window exists and is not destroyed
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('backend-crashed', { code, signal });
            }
        }
    });
}

async function waitForBackendHealth(port) {
    const healthUrl = `http://127.0.0.1:${port}/api/health`;
    let retries = 30; // Try for ~15 seconds (30 * 500ms)

    while (retries > 0) {
        try {
            const response = await fetch(healthUrl);
            if (response.ok) {
                console.log('Backend is healthy!');
                return true;
            }
        } catch (e) {
            // Ignore connection errors, backend starting
        }
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

app.whenReady().then(async () => {
    try {
        // A. Setup Config
        backendPort = await findAvailablePort(8000);
        backendToken = generateToken();
        console.log(`Configured: Port=${backendPort}, Token=${backendToken}`);

        // B. Start Backend
        await startPythonBackend(backendPort, backendToken);

        // C. Create Window (Show "Loading" state in React initially)
        createWindow();

        // D. Poll Health
        const healthy = await waitForBackendHealth(backendPort);
        if (healthy) {
            isBackendReady = true;
            // Notify Renderer
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

app.on('will-quit', () => {
    if (pythonProcess && pythonProcess.pid) {
        if (process.platform === 'win32') {
            try {
                // Try port-based kill first (more reliable if shell spawned subprocesses)
                if (backendPort) {
                    const port = backendPort;
                    // netstat output is mostly ASCII for the data rows, so toString() is generally safe for parsing PIDs
                    const netstatOutput = execSync(`netstat -ano | findstr :${port}`).toString();
                    const lines = netstatOutput.split('\n');
                    lines.forEach(line => {
                        const parts = line.trim().split(/\s+/);
                        // netstat -ano columns: Protocol, Local Address, Foreign Address, State, PID
                        // If state is LISTENING, PID is usually the 5th element (index 4)
                        if (parts.length > 4 && parts[1].includes(`:${port}`)) {
                            const pid = parts[parts.length - 1]; // PID is last column
                            if (pid && /^\d+$/.test(pid) && pid !== '0') {
                                try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore', windowsHide: true }); } catch (e) { }
                            }
                        }
                    });
                }

                // Fallback to direct PID kill
                if (pythonProcess.pid) {
                    execSync(`taskkill /F /T /PID ${pythonProcess.pid}`, { stdio: 'ignore', windowsHide: true });
                }
            } catch (e) { }
        } else {
            pythonProcess.kill('SIGTERM');
        }
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --------------------------------------------------------------------------
// 5. IPC Handlers
// --------------------------------------------------------------------------

ipcMain.handle('get-app-config', async () => {
    // Return config to renderer. If not ready, frontend should wait or retry.
    return {
        port: backendPort,
        token: backendToken,
        isReady: isBackendReady
    };
});

// -- Window Controls --
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window-close', () => mainWindow?.close());

// -- File/Project Handlers (Existing) --
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

async function loadSettings() {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

async function saveSettings(settings) {
    try {
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (e) {
        console.error('Failed to save settings:', e);
    }
}

ipcMain.handle('get-last-project', async () => {
    const settings = await loadSettings();
    return settings.lastProject || null;
});

ipcMain.handle('select-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory']
    });
    if (canceled || filePaths.length === 0) return null;
    return filePaths[0];
});

ipcMain.handle('save-project', async (event, dirPath, content) => {
    try {
        const filePath = path.join(dirPath, 'novel.json');
        await fs.writeFile(filePath, content, 'utf-8');
        const settings = await loadSettings();
        settings.lastProject = dirPath;
        await saveSettings(settings);
        return { success: true, filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('load-project', async (event, dirPath) => {
    try {
        const filePath = path.join(dirPath, 'project.json');
        const content = await fs.readFile(filePath, 'utf-8');
        const settings = await loadSettings();
        settings.lastProject = dirPath;
        await saveSettings(settings);
        return content;
    } catch (e) {
        console.error('Load project failed:', e);
        return null;
    }
});

ipcMain.handle('show-save-dialog', async (event, defaultName) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: defaultName,
        filters: [{ name: 'Project JSON', extensions: ['json'] }]
    });
    if (canceled) return null;
    return filePath;
});

ipcMain.handle('save-file', async (event, filePath, content) => {
    try {
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// -- New File Management Handlers --

ipcMain.handle('read-file-content', async (event, filePath) => {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return { success: true, content };
    } catch (e) {
        if (e.code === 'ENOENT') {
            return { success: true, content: '' }; // Return empty string for new files
        }
        return { success: false, error: e.message };
    }
});

ipcMain.handle('save-file-content', async (event, filePath, content) => {
    try {
        // Ensure directory exists first
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('ensure-directory', async (event, dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('move-to-trash', async (event, filePath, projectRoot) => {
    try {
        const trashDir = path.join(projectRoot, '.trash');
        await fs.mkdir(trashDir, { recursive: true });

        const fileName = path.basename(filePath);
        const timestamp = Date.now();
        const trashPath = path.join(trashDir, `${timestamp}_${fileName}`);

        await fs.rename(filePath, trashPath);
        return { success: true };
    } catch (e) {
        if (e.code === 'ENOENT') return { success: true };
        return { success: false, error: e.message };
    }
});

ipcMain.handle('path-join', (event, ...args) => {
    return path.join(...args);
});

ipcMain.handle('save-project-meta', async (event, dirPath, content) => {
    try {
        const filePath = path.join(dirPath, 'project.json');
        await fs.writeFile(filePath, content, 'utf-8');

        const settings = await loadSettings();
        settings.lastProject = dirPath;
        await saveSettings(settings);

        return { success: true, filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
