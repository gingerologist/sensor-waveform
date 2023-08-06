// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron')

console.log('loading preload.js')

contextBridge.exposeInMainWorld('electronAPI', {

  // from renderer to main
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),

  // bidirectional
  selectDir: () => ipcRenderer.invoke('dialog:selectDir'),
  listSerials: () => ipcRenderer.invoke('serial:list'),

  // invoke
  // this function returns a promise
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  // from main to renderer
  on: (channel, listener) => ipcRenderer.on(channel, listener),
  off: (channel, listener) => ipcRenderer.removeListener(channel, listener),
})