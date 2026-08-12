const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Determine if we are in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

// ---- Auto Updater (only active in packaged/distributed builds with update config) ----
let autoUpdater = null;
if (!isDev) {
  try {
    const updateConfigPath = path.join(process.resourcesPath, 'app-update.yml');
    if (fs.existsSync(updateConfigPath)) {
      const { autoUpdater: au } = require('electron-updater');
      autoUpdater = au;
      autoUpdater.autoDownload = false;       // Don't download automatically — user must click "Update"
      autoUpdater.autoInstallOnAppQuit = process.platform !== 'darwin'; // Mac: can't auto-install without signing

    autoUpdater.on('update-available', (info) => {
      if (mainWindow) {
        mainWindow.webContents.send('update-available', info);
      }
    });

    autoUpdater.on('update-not-available', () => {
      if (mainWindow) {
        mainWindow.webContents.send('update-not-available');
      }
    });

    autoUpdater.on('download-progress', (progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('update-download-progress', progress);
      }
    });

    autoUpdater.on('update-downloaded', () => {
      if (mainWindow) {
        mainWindow.webContents.send('update-downloaded');
      }
    });

    autoUpdater.on('error', (err) => {
      console.error('Auto updater error:', err);
      if (mainWindow) {
        mainWindow.webContents.send('update-error', err ? err.message : 'Unknown error');
      }
    });
    }
  } catch (e) {
    console.log('electron-updater not available:', e.message);
  }
}

// IPC: Renderer requests update check
ipcMain.handle('check-for-updates', async () => {
  if (autoUpdater) {
    try {
      await autoUpdater.checkForUpdates();
      return { checking: true };
    } catch (e) {
      if (mainWindow) {
        mainWindow.webContents.send('update-error', e.message);
      }
      return { error: e.message };
    }
  }

  // Fallback for dev mode or packaged app without update config (electron-packager build)
  if (mainWindow) {
    setTimeout(() => {
      mainWindow.webContents.send('update-not-available');
    }, 1500);
  }
  return { isDev: true };
});

// IPC: Renderer requests to start downloading the update
ipcMain.handle('download-update', async () => {
  if (autoUpdater) {
    autoUpdater.downloadUpdate();
    return { downloading: true };
  }
  return { isDev: true };
});

// IPC: Renderer requests to quit and install
ipcMain.handle('quit-and-install', () => {
  if (autoUpdater) {
    autoUpdater.quitAndInstall();
  }
});

// IPC: Get app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// IPC: Open external URL in browser
ipcMain.handle('open-external', async (_event, url) => {
  const { shell } = require('electron');
  await shell.openExternal(url);
});


function createWindows() {
  // Get screen width and height to position windows nicely
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Window 1: Main Video & Timeline (Almost full screen height/width on startup)
  const mainWidth = Math.floor(screenWidth * 0.90);
  const mainHeight = Math.floor(screenHeight * 0.88);
  
  mainWindow = new BrowserWindow({
    width: mainWidth,
    height: mainHeight,
    x: 50,
    y: 50,
    minWidth: 450,
    minHeight: 400,
    title: "Sportscode Main Workspace - Video & Timeline",
    backgroundColor: "#09090b", // Match zinc-950
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,             // Needed for preload/IPC
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Load appropriate URLs
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Allow window.open to spawn new BrowserWindows natively with matching style
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        backgroundColor: '#09090b',
        title: "Sportscode Code Window - Tagging Designer",
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
          backgroundThrottling: false,
          preload: path.join(__dirname, 'preload.cjs'),
        }
      }
    };
  });

  // Handle window close events
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check for updates 5 seconds after app is ready (only packaged builds, NOT on macOS)
  // macOS: unsigned apps can't auto-update, so auto-check causes errors/popups. User must click button manually.
  if (!isDev && autoUpdater && process.platform !== 'darwin') {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(console.error);
    }, 5000);
  }
}

// ---- Local HTTP Receiver Server for AI Live Stat Ingestion (Port 3001) ----
let localServer = null;
const HTTP_PORT = process.env.AI_RECEIVER_PORT || 3001;

function startLocalReceiverServer() {
  const http = require('http');

  localServer = http.createServer((req, res) => {
    // Enable CORS for all local requests (Python, curl, external tools)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check endpoint
    if (req.method === 'GET' && (req.url === '/api/status' || req.url === '/status')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', server: 'SportsVideoAnalysis AI Receiver', version: app.getVersion() }));
      return;
    }

    // POST /api/add-stat endpoint
    if (req.method === 'POST' && (req.url === '/api/add-stat' || req.url === '/add-stat')) {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          console.log('📡 [AI Receiver] Received stat payload:', data);

          // Broadcast to renderer via IPC
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai-stat-received', {
              ...data,
              receivedAt: new Date().toISOString()
            });
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            message: 'Stat successfully delivered to UI',
            received: data
          }));
        } catch (err) {
          console.error('❌ [AI Receiver] Invalid JSON payload:', err);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON body: ' + err.message }));
        }
      });
      return;
    }

    // Fallback 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found', endpoints: ['POST /api/add-stat', 'GET /api/status'] }));
  });

  localServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ [AI Receiver] Port ${HTTP_PORT} is already in use. Trying port ${Number(HTTP_PORT) + 1}...`);
      localServer.listen(Number(HTTP_PORT) + 1, '0.0.0.0');
    } else {
      console.error('❌ [AI Receiver] Server error:', err);
    }
  });

    localServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🚀 [AI Receiver] Local HTTP receiver server listening at http://0.0.0.0:${HTTP_PORT}/api/add-stat`);
  });
}

// IPC: Run Local Python AI Baseball Video Pipeline
ipcMain.handle('run-baseball-ai', async (event, { videoPath, leadIn = 4.0, leadOut = 3.0 }) => {
  const { spawn } = require('child_process');
  const pythonPath = path.join(__dirname, '..', '.venv', 'bin', 'python');
  const scriptPath = path.join(__dirname, '..', 'scripts', 'baseball_ai_engine.py');

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonPath, [scriptPath, videoPath], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });
    let finalResult = null;

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed.type === 'progress') {
            event.sender.send('baseball-ai-progress', parsed);
          } else if (parsed.type === 'completed') {
            finalResult = parsed;
          }
        } catch (_) {}
      }
    });

    proc.stderr.on('data', (data) => {
      console.error('AI process stderr:', data.toString());
    });

    proc.on('close', (code) => {
      if (finalResult) {
        resolve(finalResult);
      } else {
        reject(new Error(`AI process exited with code ${code}`));
      }
    });
  });
});

// App Ready Lifecycle
app.whenReady().then(() => {
  createWindows();
  startLocalReceiverServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindows();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (localServer) {
    try { localServer.close(); } catch (_) {}
  }
  app.quit();
});
