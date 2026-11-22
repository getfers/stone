const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stone', {
  showMode: mode => ipcRenderer.send('stone:mode', mode),
  showMenu: () => ipcRenderer.send('stone:menu'),
  setRoaming: value => ipcRenderer.invoke('stone:roaming', value),
  onRoamingChanged: callback => {
    ipcRenderer.on('stone:roaming-changed', (_event, value) => callback(value));
  },
  setHitArea: area => ipcRenderer.send('stone:hit-area', area),
  setPointerHeld: held => ipcRenderer.send('stone:pointer-held', held)
});
