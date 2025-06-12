import { app, BrowserWindow, ipcMain } from 'electron';
import { createWriteStream, mkdirSync, readFileSync } from 'fs';
import { createServer } from 'http';
import { spawn } from 'node:child_process';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(os.homedir(), 'Library', 'Logs', 'MyAppName');
mkdirSync(logDir, { recursive: true });
const logStream = createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' });
const log = (...args) => logStream.write(`[${new Date().toISOString()}] ${args.join(' ')}\n`);

const config = {
  backend: {
    entry: path.join(app.getAppPath(), 'backend/dist/main.js'),
    port: 3001,
    env: {
      PORT: '3001',
      CORS_ORIGIN: 'http://localhost:3002',
    },
  },
  window: {
    width: 1200,
    height: 800,
    devHeight: 1200,
  },
  reloadAttempts: 10,
};

let mainWindow = null;
let backendProcess = null;

const server = createServer((req, res) => {
  try {
    const filePath = path.join(__dirname, '../dist', req.url === '/' || req.url.startsWith('/settings') ? 'index.html' : req.url).split('?')[0];
    const content = readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'text/html';
    if (ext === '.css') contentType = 'text/css';
    else if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.woff2' || ext === '.woff') contentType = 'font/woff2';
    else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (e) {
    log('File not found:', e.message);
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3002, () => {
  log('Frontend server running on http://localhost:3002');
});

function startBackend () {
  if (backendProcess) {
    log('Backend process already running!');
    return;
  }

  log('Starting backend:', config.backend.entry);

  backendProcess = spawn('/usr/local/bin/node', [config.backend.entry], {
    stdio: 'pipe',
    env: { ...process.env, ...config.backend.env },
  });

  backendProcess.stdout.on('data', data => {
    log(`Backend stdout: ${data}`);
  });

  backendProcess.stderr.on('data', data => {
    log(`Backend stderr: ${data}`);
  });

  backendProcess.on('error', err => {
    log('❌ Backend failed to start:', err.message);
    backendProcess = null;
  });

  backendProcess.on('exit', code => {
    log(`🔴 Backend exited with code ${code}`);
    backendProcess = null;
  });
}

function setupIpcHandlers () {
  ipcMain.removeHandler('window:minimize');
  ipcMain.removeHandler('window:maximize');
  ipcMain.removeHandler('window:close');
  ipcMain.removeHandler('backend-port');

  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('backend-port', () => config.backend.port);
}

function createWindow () {
  if (mainWindow) {
    log('Main window already exists! Focusing it instead.');
    mainWindow.focus();
    return;
  }

  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
  const windowHeight = isDev ? config.window.devHeight : config.window.height;

  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: windowHeight,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    log('🚀 Running in development mode');
    mainWindow.loadURL('http://localhost:3002');
    mainWindow.webContents.openDevTools();
  } else {
    log('🏁 Running in production mode');
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:3002');
    }, 2000);
  }

  setupIpcHandlers();

  let reloadAttempts = config.reloadAttempts;

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', () => {
    if (reloadAttempts <= 0) {
      log('Failed to load after multiple attempts');
      return;
    }
    reloadAttempts--;
    setTimeout(() => mainWindow.reload(), 500);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    reloadAttempts = config.reloadAttempts;
    mainWindow.webContents.send('backend-port', config.backend.port);
  });
}

function cleanup () {
  if (backendProcess) {
    log('Terminating backend process...');
    backendProcess.kill();
    backendProcess = null;
  }
  server.close(() => {
    log('Frontend server stopped');
  });
}

app.whenReady()
  .then(() => {
    log('🟢 App is ready!');
    startBackend();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch(err => {
    log('💥 Failed to start app:', err);
    cleanup();
    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanup();
    app.quit();
  }
});
