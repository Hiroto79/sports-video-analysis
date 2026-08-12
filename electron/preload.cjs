const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC bridge to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Update event listeners
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', () => callback()),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', () => callback()),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (_event, error) => callback(error)),

  // AI Live Stat ingestion listeners
  onAiStatReceived: (callback) => ipcRenderer.on('ai-stat-received', (_event, data) => callback(data)),
  removeAiStatListener: () => ipcRenderer.removeAllListeners('ai-stat-received'),

  // AI Baseball Engine execution
  runBaseballAi: (params) => ipcRenderer.invoke('run-baseball-ai', params),
  onBaseballAiProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('baseball-ai-progress', handler);
    return () => ipcRenderer.removeListener('baseball-ai-progress', handler);
  },

  // Cleanup listeners
  removeAllUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-not-available');
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-error');
    ipcRenderer.removeAllListeners('ai-stat-received');
    ipcRenderer.removeAllListeners('baseball-ai-progress');
  }
});
