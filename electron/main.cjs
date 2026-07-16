const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

// Determine if we are in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let codeWindow;

function createWindows() {
  // Get screen width and height to position windows side-by-side nicely
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Window 1: Main Video & Timeline (Left side)
  const mainWidth = Math.floor(screenWidth * 0.62);
  const mainHeight = Math.floor(screenHeight * 0.85);
  
  mainWindow = new BrowserWindow({
    width: mainWidth,
    height: mainHeight,
    x: 30,
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

  // Window 2: Code Window Tagger (Right side)
  const codeWidth = Math.floor(screenWidth * 0.33);
  const codeHeight = Math.floor(screenHeight * 0.80);
  
  codeWindow = new BrowserWindow({
    width: codeWidth,
    height: codeHeight,
    x: 30 + mainWidth + 20,
    y: 55,
    minWidth: 320,
    minHeight: 350,
    title: "Sportscode Code Window - Tagging Designer",
    backgroundColor: "#09090b",
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
    codeWindow.loadURL('http://localhost:5173/#code');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    
    // For production local file load, Hash route must be passed via the file path
    // Under HTML5 standards: file:///path/index.html#/code
    codeWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: 'code'
    });
  }

  // Handle window close events
  mainWindow.on('closed', () => {
    mainWindow = null;
    // If main window closes, close code window too
    if (codeWindow) codeWindow.close();
  });

  codeWindow.on('closed', () => {
    codeWindow = null;
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
