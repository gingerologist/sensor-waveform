/**
 * magus is the code name of a custom board.
 * it has
 * 1. one ti ads1292r sensor for ecg
 * 2. two analog/maxim max86141 ppg sensors for spo2 and abp
 * 3. one imu
 * 4. 1-wire and multiple temperature sensors
 */

import path from 'node:path'
import fs from 'node:fs'
import process from 'node:process'
import { Buffer } from 'node:buffer'

import { sensparse } from '../protocol/sensparse.js'
import { ads129xParse } from '../protocol/ads129xParse.js'
import createAds129xViewData from '../viewdata/ads129xViewData.js'

import timestamp from '../lib/timestamp.js'

// prepare log folder
const logDir = path.join(process.cwd(), 'log')
fs.mkdir(logDir, err => console.log(err))

let handleMessage = null

const startAsync = async () => {
  const [port] = await navigator.serial.getPorts()
  if (!port) throw new Error('no available port')

  await port.open({ baudRate: 115200 })
  console.log('port opened', port.getInfo())

  const ads129xViewData = createAds129xViewData({
    samplesInChart: 2000,
    clearAhead: 200,
    filters: [] // not respected yet TODO
  })

  let ads129xLog = null

  handleMessage = ({ type }) => {
    switch (type) {
      case 'ads129x-recording-start': {
        if (ads129xLog === null) {
          const filename = `ecgdata-${timestamp()}.csv`
          const filepath = path.join(process.cwd(), 'log', filename)
          ads129xLog = fs.createWriteStream(filepath)
        }
        self.postMessage({ oob: 'ads129x-recording-started' })
        break
      }
      case 'ads129x-recording-stop': {
        if (ads129xLog) {
          ads129xLog.end()
          ads129xLog = null
        }
        self.postMessage({ oob: 'ads129x-recording-stopped' })
        break
      }
      default:
        break
    }
  }

  while (port.readable) {
    const reader = port.readable.getReader()

    try {
      let input = Buffer.alloc(0) // new Uint8Array(0)
      for (let counter = 0; ; counter++) {
        const { done, value } = await reader.read()
        if (done) {
          // |reader| has been canceled.
          break
        }

        input = Buffer.concat([input, value])
        const parted = sensparse(input)
        if (!parted) continue

        if (parted.packetStart) {
          console.log('packetStart not zero')
        }
        input = input.subarray(parted.packetEnd)

        switch (parted.sensorId) {
          case 0x0002: {
            const parsed = ads129xParse(parted.tlvs)
            const {
              brief, leadOff, ecgOrig, ecgProc, ecgNtch, ecgNlhp,
              ecgOrigData, ecgProcData, ecgNtchData, ecgNlhpData
            } = ads129xViewData.build(parsed)

            self.postMessage({
              brief, leadOff, ecgOrigData, ecgProcData, ecgNtchData, ecgNlhpData
            }, [ecgOrigData.buffer, ecgProcData.buffer, ecgNtchData.buffer, ecgNlhpData.buffer
            ])

            if (ads129xLog) {
              for (let i = 0; i < brief.numOfSamples; i++) {
                ads129xLog.write(`${ecgOrig[i]}, ${ecgProc[i]}, ${ecgNtch[i]}, ${ecgNlhp[i]}\r\n`)
              }
            }
            break
          }
          default:
            break
        }
      }
    } catch (error) {
      // Handle |error|...
      console.log(error)
    } finally {
      reader.releaseLock()
      if (ads129xLog) {
        ads129xLog.end()
        ads129xLog = null
      }
      self.postMessage({ oob: 'stopped' })
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
  if (handleMessage) {
    handleMessage(e.data)
  }
})

startAsync().then(() => {}).catch(e => console.log(e))

console.log('magus worker started')
