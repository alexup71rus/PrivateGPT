import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  backend: {
    entry: path.join(__dirname, '../backend/dist/main.js'),
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

function startBackend () {
  if (backendProcess) {
    console.warn('Backend process already running!');
    return;
  }

  console.log('Starting backend:', config.backend.entry);

  backendProcess = spawn('node', [config.backend.entry], {
    stdio: 'inherit',
    env: { ...process.env, ...config.backend.env },
  });

  backendProcess.on('error', err => {
    console.error('❌ Backend failed to start:', err);
    backendProcess = null;
  });

  backendProcess.on('exit', code => {
    console.log(`🔴 Backend exited with code ${code}`);
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
    console.warn('Main window already exists! Focusing it instead.');
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
    console.log('🚀 Running in development mode');
    mainWindow.loadURL('http://localhost:3002');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('🏁 Running in production mode');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  setupIpcHandlers();

  let reloadAttempts = config.reloadAttempts;

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', () => {
    if (reloadAttempts <= 0) {
      console.error('Failed to load after multiple attempts');
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
    console.log('Terminating backend process...');
    backendProcess.kill();
    backendProcess = null;
  }
}

app.whenReady()
  .then(() => {
    console.log('App is ready!');
    createWindow();
    startBackend();

    // macOS hint
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch(err => {
    console.error('Failed to start app:', err);
    cleanup();
    app.quit();
  });

app.on('window-all-closed', () => {
  // macOS hint
  if (process.platform !== 'darwin') {
    cleanup();
    app.quit();
  }
});
