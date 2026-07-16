const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

// Determine if we are in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

// ---- Auto Updater (only active in packaged/distributed builds) ----
let autoUpdater = null;
if (!isDev) {
  try {
    const { autoUpdater: au } = require('electron-updater');
    autoUpdater = au;
    autoUpdater.autoDownload = false;       // Don't download automatically — user must click "Update"
    autoUpdater.autoInstallOnAppQuit = true; // Install when user quits after download

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
    });
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
      return { error: e.message };
    }
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

  // Check for updates 5 seconds after app is ready (only packaged builds)
  if (!isDev && autoUpdater) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(console.error);
    }, 5000);
  }
}

// App Ready Lifecycle
app.whenReady().then(() => {
  createWindows();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindows();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  app.quit();
});
