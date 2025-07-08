import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { existsSync, readFileSync } from 'fs';
import http, { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  backend: {
    entry: path.join(__dirname, '../backend/dist/main.js'),
    port: 3001,
    env: { PORT: '3001', CORS_ORIGIN: 'http://localhost:3002' },
  },
  frontend: { port: 3002 },
  window: { width: 1200, height: 800, devHeight: 1200 },
  reloadAttempts: 5,
};

let mainWindow = null;
let frontendServer = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

if (process.argv.includes('--dev') || process.env.NODE_ENV === 'development') {
  frontendServer = createServer((req, res) => {
    try {
      let filePath = path.join(__dirname, '../dist', req.url.split('?')[0]);
      if (!['.html', '.css', '.js', '.woff2', '.woff', '.png', '.jpg', '.jpeg', '.svg'].includes(path.extname(filePath))) {
        filePath = path.join(__dirname, '../dist/index.html');
      }
      const content = readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = {
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff2',
        '.png': 'image/jpeg',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
      }[ext] || 'text/html';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  frontendServer.listen(config.frontend.port);
}

async function startBackend() {
  if (!existsSync(config.backend.entry)) {
    throw new Error('Backend entry file not found');
  }
  Object.assign(process.env, config.backend.env, { NODE_ENV: 'production' });
  return import(config.backend.entry);
}

function waitForBackend(attempts = 20, interval = 1000) {
  return new Promise((resolve, reject) => {
    const tryConnect = attempt => {
      const req = http.get(`http://localhost:${config.backend.port}/api/tags`, res => {
        if ([200, 400, 404].includes(res.statusCode)) resolve();
        else if (attempt <= 0) reject(new Error('Backend not ready'));
        else setTimeout(() => tryConnect(attempt - 1), interval);
      });
      req.on('error', () => {
        if (attempt <= 0) reject(new Error('Backend not ready'));
        else setTimeout(() => tryConnect(attempt - 1), interval);
      });
      req.end();
    };
    tryConnect(attempts);
  });
}

function waitForVite(attempts = 20, interval = 1000) {
  return new Promise((resolve, reject) => {
    const tryConnect = attempt => {
      const req = http.get(`http://localhost:${config.frontend.port}`, res => {
        if (res.statusCode === 200) resolve();
        else if (attempt <= 0) reject(new Error('Vite server not ready'));
        else setTimeout(() => tryConnect(attempt - 1), interval);
      });
      req.on('error', () => {
        if (attempt <= 0) reject(new Error('Vite server not ready'));
        else setTimeout(() => tryConnect(attempt - 1), interval);
      });
      req.end();
    };
    tryConnect(attempts);
  });
}

function setupIpcHandlers() {
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle('window:close', () => {
    mainWindow?.close();
    app.quit();
  });
  ipcMain.handle('backend-port', () => config.backend.port);
  ipcMain.handle('open-external', async (_, url) => shell.openExternal(url));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

function createWindow() {
  if (mainWindow) {
    mainWindow.focus();
    return;
  }
  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
  const windowHeight = isDev ? config.window.devHeight : config.window.height;
  const iconPath = process.platform === 'darwin' ? 'electron/logo.icns' : 'electron/logo.ico';
  const iconFullPath = path.join(__dirname, iconPath);
  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: windowHeight,
    frame: false,
    icon: existsSync(iconFullPath) ? iconFullPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  const frontendUrl = `http://localhost:${config.frontend.port}`;
  if (isDev) {
    mainWindow.loadURL(frontendUrl).catch(() => app.quit());
  } else {
    const distPath = path.join(__dirname, '../dist/index.html');
    if (!existsSync(distPath)) {
      app.quit();
    }
    mainWindow.loadFile(distPath);
  }
  mainWindow.webContents.on('did-finish-load', () => {
    if (isDev) mainWindow.webContents.openDevTools();
    mainWindow.webContents.send('backend-port', config.backend.port);
  });
  mainWindow.webContents.on('did-fail-load', () => {
    if (config.reloadAttempts <= 0) {
      app.quit();
      return;
    }
    config.reloadAttempts--;
    setTimeout(() => mainWindow.reload(), 500);
  });
  setupIpcHandlers();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function cleanup() {
  if (frontendServer) {
    frontendServer.close();
    frontendServer = null;
  }
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    await waitForBackend();
    if (process.argv.includes('--dev') || process.env.NODE_ENV === 'development') {
      await waitForVite();
    }
    createWindow();
  } catch {
    app.quit();
  }
});

app.on('window-all-closed', () => {
  cleanup();
  app.quit();
});
