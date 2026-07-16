const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

// Determine if we are in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

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
      sandbox: true,
      backgroundThrottling: false,
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
          sandbox: true,
          backgroundThrottling: false,
        }
      }
    };
  });

  // Handle window close events
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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
