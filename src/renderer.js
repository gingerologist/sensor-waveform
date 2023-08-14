/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

// https://stackoverflow.com/questions/74292327/how-can-i-use-multiple-preload-scripts-for-different-electron-windows-when-using

import './index.css'
import * as React from 'react'
import { createRoot } from 'react-dom/client'

import { FluentProvider, teamsLightTheme } from '@fluentui/react-components'

// import { initializeIcons } from '@fluentui/react/lib/Icons' // not renewed TODO

import App from './App.jsx'

// console.log('This message is being logged by "renderer.js", included via webpack')

// const counter = document.getElementById('counter')

// window.electronAPI.handleCounter((event, value) => {
//   const oldValue = Number(counter.innerText)
//   const newValue = oldValue + value
//   counter.innerText = newValue
//   event.sender.send('counter-value', newValue)
// })

// const btn = document.getElementById('btn')
// const filePathElement = document.getElementById('filePath')

// btn.addEventListener('click', async () => {
//   const filePath = await window.electronAPI.openFile()
//   filePathElement.innerText = filePath
// })

// Also available from @uifabric/icons (7 and earlier) and @fluentui/font-icons-mdl2 (8+)

// initializeIcons('https://static2.sharepointonline.com/files/fabric/assets/icons/')

// const style1 = {position: "absolute", /* width: 1200, height: 600, */ top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
const root = createRoot(document.getElementById('root'))
// root.render(<App />)

root.render(
  <FluentProvider theme={teamsLightTheme}>
    <App />
  </FluentProvider>
)
