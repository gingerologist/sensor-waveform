const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
// const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');

const { SerialPort } = require('serialport')
// const deepEqual = require('deep-equal');

const { parseSensPacket } = require('./sensor-protocol')
const adaptViewData = require('./adapt-viewdata')

const Fili = require('fili')
const firCalculator = new Fili.FirCoeffs()
const firFilterCoeffs = firCalculator.bandstop({
  order: 100,
  Fs: 250,
  F1: 45,
  F2: 55,
  Fc: 45,
  Fc2: 55
})

const firFilter = new Fili.FirFilter(firFilterCoeffs)
const iirCalculator = new Fili.CalcCascades()
const availableFilters = iirCalculator.available()

const iirFilterCoeffs = iirCalculator.bandstop({
  order: 1,
  characteristic: 'butterworth',
  Fs: 250,
  Fc: 50,
  BW: 1
})

const iirFilterCoeffs2 = iirCalculator.bandstop({
  order: 1,
  characteristic: 'butterworth',
  Fs: 250,
  Fc: 50,
  BW: 1
})

const iirFilterCoeffs3 = iirCalculator.lowpass({
  order: 2,
  characteristic: 'butterworth',
  Fs: 250,
  Fc: 50
})

const iirFilterCoeffs4 = iirCalculator.highpass({
  order: 2,
  characteristic: 'butterworth',
  Fs: 250,
  Fc: 1
})

const iirFilter = new Fili.IirFilter(iirFilterCoeffs)
const iirFilter2 = new Fili.IirFilter(iirFilterCoeffs2)
const iirFilter3 = new Fili.IirFilter(iirFilterCoeffs3)
const iirFilter4 = new Fili.IirFilter(iirFilterCoeffs4)

let counter = 0
let port = null
let conn = null

/** */
let input = Buffer.alloc(0)

/**  */

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

async function handleSelectDir () {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory', 'promptToCreate'] })
  if (!canceled) {
    return filePaths[0]
  }
}

// let pollingSerialPortTimer
let pollingPortsTimer = null
let pollingPortsSorts = null

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      // sandbox: false,
      nodeIntegration: true // required for, well, Serial port
      // contextIsolation: false
    }
  })

  mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    console.log('select-serial-port fired', portList)
    // Add listeners to handle ports being added or removed before the callback for `select-serial-port`
    // is called.
    mainWindow.webContents.session.on('serial-port-added', (event, port) => {
      console.log('serial-port-added FIRED WITH', port)
      // Optionally update portList to add the new port
    })

    mainWindow.webContents.session.on('serial-port-removed', (event, port) => {
      console.log('serial-port-removed FIRED WITH', port)
      // Optionally update portList to remove the port
    })

    event.preventDefault()
    if (portList && portList.length > 0) {
      callback(portList[0].portId)
    } else {
      // eslint-disable-next-line n/no-callback-literal
      callback('') // Could not find any matching devices
    }
  })

  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (permission === 'serial' && details.securityOrigin === 'file:///') {
      return true
    }

    return false
  })

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'serial' && details.origin === 'file://') {
      return true
    }

    return false
  })

  mainWindow.setMenuBarVisibility(false)
  // const menu = Menu.buildFromTemplate([
  //   {
  //     label: app.name,
  //     submenu: [
  //       {
  //         click: () => mainWindow.webContents.send('update-counter', 1),
  //         label: 'Increment'
  //       },
  //       {
  //         click: () => mainWindow.webContents.send('update-counter', -1),
  //         label: 'Decrement'
  //       }
  //     ]
  //   }
  // ])

  // Menu.setApplicationMenu(menu)
  ipcMain.on('aloha', () => {
    if (conn) {
      conn.close()
      conn = null
      port = null
    }

    const myDocPath = app.getPath('documents')
    mainWindow.webContents.send('ahola', {
      dirPath: path.join(myDocPath, 'sensor-waveform')
    })
  })

  ipcMain.on('start-polling-ports', () => {
    console.log(`start-polling-ports received, ${counter++}`)
    if (!pollingPortsTimer) {
      const poll = () => {
        console.log(`poll ${counter++}`)
        SerialPort.list()
          .then(ports => {
            const sorts = ports.sort((a, b) => a.path.localeCompare(b.path))
            console.log('sorts', sorts)
            if (!pollingPortsSorts || sorts.reduce((acc, c) => (acc + c.path), '') != pollingPortsSorts.reduce((acc, c) => (acc + c.path), '')) {
              mainWindow.webContents.send('ports', null, ports)
              pollingPortsSorts = sorts
            }
          })
          .catch(err => {
            // TODO
            // mainWindow.webContents.send('ports', err, null)
            console.log(err)
          })
      }

      poll()
      pollingPortsTimer = setInterval(poll, 3000)
    }
  })

  ipcMain.on('stop-polling-ports', () => {
    console.log('stop-polling-ports received')
    if (pollingPortsTimer) {
      clearInterval(pollingPortsTimer)
      pollingPortsTimer = null
      pollingPortsSorts = null
    }
  })

  ipcMain.on('connect', (event, _port) => {
    console.log('connect', _port)

    iirFilter.reinit()
    iirFilter2.reinit()
    iirFilter3.reinit()
    iirFilter4.reinit()

    port = _port
    conn = new SerialPort({ path: port.path, baudRate: 115200 })
    conn.on('open', () => {
      console.log('port opened')
      mainWindow.webContents.send('connected', port)
    })

    conn.on('data', data => {
      try {
        input = Buffer.concat([input, data])
        const parsed = parseSensPacket(input)
        if (parsed) {
          if (parsed.packetStart) {
            console.log('packet not started from the very beginning')
          }

          input = input.subarray(parsed.packetEnd)
          const adapted = adaptViewData(parsed.data)
          adapted.ecgIir1 = iirFilter.multiStep(adapted.ecgOrig)
          // adapted.ecgIir2 = iirFilter2.multiStep(adapted.ecgOrig)
          // adapted.ecgIir2 = iirFilter3.multiStep(adapted.ecgIir1)
          adapted.ecgIir2 = iirFilter4.multiStep(iirFilter3.multiStep(adapted.ecgIir1))
          mainWindow.webContents.send('data', null, adapted)
        }
      } catch (e) {
        console.log(e)
      }
    })

    conn.on('close', () => {
      console.log('port close')
      input = Buffer.alloc(0)
      conn = null
      port = null
      mainWindow.webContents.send('disconnected', _port)
    })
  })

  ipcMain.on('disconnect', (event, _port) => {
    console.log('disconnect', _port)
    if (conn) {
      conn.close()
      // conn.removeAllListeners();
      conn = null
      // port = null
      // mainWindow.webContents.send('disconnected', _port)
    }
  })

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)

  const ports = []

  // mainWindow.webContents.on('did-finish-load', () => {

  //   const myDocPath = app.getPath('documents')

  //   console.log('starts to polling serial ports')
  //   pollingSerialPortTimer = setInterval(() => {
  //     SerialPort.list()
  //       .then(ports => {
  //         console.log(ports)
  //         mainWindow.webContents.send('update-serial-ports', ports)
  //       })
  //       .catch(err => console.log(err))
  //   }, 3000)
  // })

  // Open the DevTools.
  mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// app.on('ready', createWindow);
app.whenReady().then(() => {
  // installExtension(REACT_DEVELOPER_TOOLS)
  //   .then((name) => console.log(`Added Extension: ${name}`))
  //   .catch((err) => console.log(`An error occurred: `, err))
  ipcMain.handle('serial:list', async () => SerialPort.list())
  ipcMain.handle('dialog:selectDir', handleSelectDir)
  createWindow()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
