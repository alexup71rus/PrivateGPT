import { app, BrowserWindow, ipcMain } from 'electron';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../backend/src/app.module.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let backendPort;

async function startBackend() {
  try {
    const nestApp = await NestFactory.create(AppModule);
    nestApp.enableCors({ origin: 'http://localhost:3000' });
    await nestApp.listen(0, 'localhost');
    backendPort = nestApp.getHttpServer().address().port;
    console.log(`NestJS backend running on http://localhost:${backendPort}`);
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('backend-port', backendPort);
      console.log(`Sent backend-port ${backendPort} to frontend`);
    });
  } catch (error) {
    console.error('Failed to start NestJS backend:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
  console.log('Is Development:', isDev);

  if (isDev) {
    console.log('Loading development URL: http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Loading production file:', path.join(__dirname, '../dist/index.html'));
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  ipcMain.handle('window:minimize', () => mainWindow.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.handle('window:close', () => mainWindow.close());
  mainWindow.on('closed', () => (mainWindow = null));

  if (isDev) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('backend-port', 3001);
      console.log('Sent backend-port 3001 to frontend');
    });
  }
}

app.whenReady().then(async () => {
  createWindow();
  await startBackend();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
