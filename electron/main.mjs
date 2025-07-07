import { app, BrowserWindow, ipcMain } from 'electron';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'fs';
import http, { createServer } from 'http';
import { spawn } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(app.getPath('logs'), 'PrivateGPT');
mkdirSync(logDir, { recursive: true });
const logStream = createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' });
const log = (...args) => {
  try {
    logStream.write(`[${new Date().toISOString()}] ${args.join(' ')}\n`);
  } catch (err) {}
};

const config = {
  backend: {
    entry: path.join(__dirname, '../backend/dist/main.js'),
    port: 3001,
    env: {
      PORT: '3001',
      CORS_ORIGIN: 'http://localhost:3002',
      OLLAMA_URL: 'http://192.168.0.126:11434',
      UPLOADS_PATH: path.join(app.getPath('userData'), 'PrivateGPT', 'uploads'),
      DB_PATH: path.join(app.getPath('userData'), 'PrivateGPT', 'db.sqlite'),
    },
  },
  frontend: {
    port: 3002,
  },
  window: {
    width: 1200,
    height: 800,
    devHeight: 1200,
  },
  reloadAttempts: 5,
};

let mainWindow = null;
let backendProcess = null;
let frontendServer = null;

if (!app.requestSingleInstanceLock()) {
  log('Another instance is running, quitting...');
  app.quit();
  process.exit(0);
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
      let contentType = 'text/html';
      if (ext === '.css') contentType = 'text/css';
      else if (ext === '.js') contentType = 'application/javascript';
      else if (ext === '.woff2' || ext === '.woff') contentType = 'font/woff2';
      else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.svg') contentType = 'image/svg+xml';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (e) {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  frontendServer.on('error', err => {
    log('Frontend server error:', err.message);
  });

  frontendServer.listen(config.frontend.port, () => {
    log(`Frontend server running on http://localhost:${config.frontend.port}`);
  });
}

function startBackend () {
  if (backendProcess) {
    log('Backend process already running!');
    return;
  }

  const uploadsPath = config.backend.env.UPLOADS_PATH;
  const dbPath = config.backend.env.DB_PATH;
  if (!existsSync(uploadsPath)) {
    log('Creating uploads path:', uploadsPath);
    mkdirSync(uploadsPath, { recursive: true });
  }
  log(`Checking uploads path: ${uploadsPath}, exists: ${existsSync(uploadsPath)}`);
  log(`Checking db path: ${dbPath}, exists: ${existsSync(dbPath)}`);
  log(`Checking backend entry: ${config.backend.entry}, exists: ${existsSync(config.backend.entry)}`);

  if (!existsSync(config.backend.entry)) {
    log(`❌ Backend entry file missing: ${config.backend.entry}`);
    throw new Error(`Backend entry file not found: ${config.backend.entry}`);
  }

  log(`Starting backend: ${config.backend.entry}`);
  backendProcess = spawn(process.execPath, [config.backend.entry], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...config.backend.env },
  });

  backendProcess.stdout.on('data', data => log(`Backend stdout: ${data.toString()}`));
  backendProcess.stderr.on('data', data => log(`Backend stderr: ${data.toString()}`));
  backendProcess.on('error', err => log(`Backend error: ${err.message}`));
  backendProcess.on('exit', (code, signal) => {
    log(`Backend exited with code ${code}, signal: ${signal || 'none'}`);
    log(`Backend env: ${JSON.stringify(config.backend.env)}`);
  });

  backendProcess.on('spawn', () => log('Backend process spawned'));
  backendProcess.stdout.on('data', data => log(`Backend stdout: ${data.toString()}`));
  backendProcess.stderr.on('data', data => log(`Backend stderr: ${data.toString()}`));
  backendProcess.on('error', err => {
    log(`❌ Backend process error: ${err.message}`);
    backendProcess = null;
  });
  backendProcess.on('exit', (code, signal) => {
    log(`🔴 Backend exited with code ${code}, signal: ${signal || 'none'}`);
    backendProcess = null;
  });
}

function waitForBackend (attempts = 30, interval = 2000) {
  return new Promise((resolve, reject) => {
    const tryConnect = attempt => {
      const req = http.get(`http://localhost:${config.backend.port}/api/tags`, res => {
        log(`Backend response status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          log('Backend responded successfully');
          resolve();
        } else {
          if (attempt <= 0) reject(new Error(`Backend not ready, last status: ${res.statusCode || 'none'}`));
          else setTimeout(() => tryConnect(attempt - 1), interval);
        }
      });

      req.on('error', err => {
        if (attempt <= 0) reject(new Error(`Backend not ready: ${err.message}`));
        else setTimeout(() => tryConnect(attempt - 1), interval);
      });

      req.end();
    };
    tryConnect(attempts);
  });
}

function waitForVite (attempts = 20, interval = 1000) {
  return new Promise((resolve, reject) => {
    const tryConnect = attempt => {
      const req = http.get(`http://localhost:${config.frontend.port}`, res => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          if (attempt <= 0) reject(new Error(`Vite server not ready, last status: ${res.statusCode || 'none'}`));
          else setTimeout(() => tryConnect(attempt - 1), interval);
        }
      });

      req.on('error', err => {
        if (attempt <= 0) reject(new Error(`Vite server not ready: ${err.message}`));
        else setTimeout(() => tryConnect(attempt - 1), interval);
      });

      req.end();
    };
    tryConnect(attempts);
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
    mainWindow.loadURL(`http://localhost:${config.frontend.port}`);
  } else {
    const distPath = path.join(__dirname, '../dist/index.html');
    if (!existsSync(distPath)) {
      log(`❌ Frontend dist file missing: ${distPath}`);
      throw new Error(`Frontend dist file not found: ${distPath}`);
    }
    mainWindow.loadFile(distPath);
  }

  setupIpcHandlers();

  let reloadAttempts = config.reloadAttempts;

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (reloadAttempts <= 0) {
      app.quit();
      return;
    }
    reloadAttempts--;
    setTimeout(() => mainWindow.reload(), 500);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('backend-port', config.backend.port);
  });
}

function cleanup () {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  if (frontendServer) {
    frontendServer.close();
    frontendServer = null;
  }
}

app.whenReady().then(async () => {
  try {
    startBackend();
    await waitForBackend();
    if (process.argv.includes('--dev') || process.env.NODE_ENV === 'development') {
      await waitForVite();
    }
    createWindow();
  } catch (err) {
    log(`Failed: ${err.message}`);
    app.quit();
  }
}).catch(err => {
  log(`Init failed: ${err.message}`);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanup();
    app.quit();
  }
});
