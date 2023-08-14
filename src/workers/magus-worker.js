/**
 * This module
 * 1. establishes a serial connection, emit 'connected' and 'disconnected' message.
 * 2.
 */

import { parseSensPacket, concat } from '../sens-proto-web'
import Fili from '../lib/fili.min.js'
import adaptViewData from '../adapt-viewdata'

// Uncaught ReferenceError: window is not defined
// console.log('magus-worker', window)

const ECG_SAMPLE_COUNT = 2000
const iirCalc = new Fili.CalcCascades()

const ecgNotch = new Fili.IirFilter(iirCalc.bandstop({
  order: 2,
  characteristic: 'butterworth',
  Fs: 250,
  Fc: 50,
  BW: 1
}))

const ecgLowpass = new Fili.IirFilter(iirCalc.lowpass({
  order: 2,
  characteristic: 'butterworth',
  Fs: 250,
  Fc: 50
}))

const ecgHighpass = new Fili.IirFilter(iirCalc.highpass({
  order: 2,
  characteristic: 'butterworth',
  Fs: 250,
  Fc: 1
}))

const startAsync = async () => {
  const [port] = await navigator.serial.getPorts()
  if (!port) throw new Error('no available port')

  await port.open({ baudRate: 115200 })

  console.log('port opened', port.getInfo())

  const chanEcgOrig = new MessageChannel()
  const chanEcgProc = new MessageChannel()

  self.postMessage({
    oob: {
      type: 'passport',
      ports: [
        {
          target: 'file',
          folder: 'default', // optional
          port: chanEcgOrig.port1
        },
        {
          target: 'file',
          folder: 'default',
          port: chanEcgProc.port1
        }
      ]
    }
  }, [chanEcgOrig.port1, chanEcgProc.port1])

  let ecgPlotIndex = 0
  const ecgOrigArray = Array(2000).fill(0)
  const ecgProcArray = Array(2000).fill(0)
  const ecgNtchArray = Array(2000).fill(0)
  const ecgNlhpArray = Array(2000).fill(0)

  ecgNotch.reinit()
  ecgLowpass.reinit()
  ecgHighpass.reinit()

  while (port.readable) {
    const reader = port.readable.getReader()

    try {
      let input = new Uint8Array(0)
      for (let counter = 0; ; counter++) {
        const { done, value } = await reader.read()
        if (done) {
          // |reader| has been canceled.
          break
        }

        input = concat(input, value)
        const parsed = parseSensPacket(input)
        if (parsed) {
          if (parsed.packetStart) {
            console.log('packetStart not zero')
          }

          input = input.subarray(parsed.packetEnd)
          const adapted = adaptViewData(parsed.data)

          switch (adapted.brief.sensorId) {
            case 0x0002:
              break
            default:
              break
          }

          for (let i = 0; i < adapted.brief.numOfSamples; i++) {
            ecgOrigArray[ecgPlotIndex] = adapted.ecgOrig[i]
            ecgProcArray[ecgPlotIndex] = adapted.ecgProc[i]
            ecgPlotIndex = (ecgPlotIndex + 1) % 2000
          }

          for (let j = 0; j < adapted.brief.numOfSamples * 2; j++) {
            ecgOrigArray[(ecgPlotIndex + j) % 2000] = NaN
            ecgProcArray[(ecgPlotIndex + j) % 2000] = NaN
          }

          const ecgOrigData = new Float32Array(ecgOrigArray.length * 2)
          const ecgProcData = new Float32Array(ecgProcArray.length * 2)

          for (let i = 0; i < ecgOrigArray.length; i++) {
            ecgOrigData[i * 2] = i // ecgPlotIndex + i
            ecgOrigData[i * 2 + 1] = ecgOrigArray[i]
            ecgProcData[i * 2] = i // ecgPlotIndex + i
            ecgProcData[i * 2 + 1] = ecgProcArray[i]
          }

          const { brief, leadOff } = adapted

          self.postMessage({ brief, leadOff, ecgOrigData, ecgProcData }, [ecgOrigData.buffer, ecgProcData.buffer])
        }
      }
    } catch (error) {
      // Handle |error|...
      console.log(error)
    } finally {
      reader.releaseLock()
    }
  }
}

let connectDebouncer = null

navigator.serial.addEventListener('connect', (e) => {
  // Connect to `e.target` or add it to a list of available ports.
  console.log('magus connect', e.target)
  clearInterval(connectDebouncer)

  connectDebouncer = setInterval(() => {
    clearInterval(connectDebouncer)
    connectDebouncer = null
    console.log('debounced connect')
    startAsync().then(() => {
      console.log('closed')
    }).catch(e => {
      console.log('closed')
    })
  }, 3000)
})

navigator.serial.addEventListener('disconnect', (e) => {
  // Remove `e.target` from the list of available ports.
  console.log('magus disconnect', e.target)
  clearInterval(connectDebouncer)
  connectDebouncer = null
})

self.addEventListener('message', function (e) {
  console.log(e.data)
  // self.postMessage('You said: ' + e.data)
}, false)

// navigator.serial.requestPort()
//   .then(port => {
//     console.log(port)
//   })
//   .catch(e => {
//     console.log(e)
//   })

// navigator.serial.getPorts()
//   .then(([port]) => {
//   // Initialize the list of available ports with `ports` on page load.
//     console.log(port)
//     if (port) {

//     } else {

//     }
//   })
//   .catch(e => {

//   })

startAsync().then(() => {}).catch(e => console.log(e))

console.log('magus worker started')
