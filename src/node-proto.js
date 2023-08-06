const { SerialPort } = require('serialport')
const { inspect } = require('node:util')

// const deepEqual = require('deep-equal');

const { parseSensPacket } = require('./sensor-protocol')
const adaptViewData = require('./adapt-viewdata')

const port = new SerialPort({
  path: 'COM10',
  baudRate: 1000000
})

let packetCount = 0
let buf = Buffer.alloc(0)

port.on('data', data => {
  try {
    buf = Buffer.concat([buf, data])
    const parsed = parseSensPacket(buf)
    if (parsed) {
      if (parsed.packetStart) {
        console.log('packet not started from the very beginning')
      }

      buf = buf.subarray(parsed.packetEnd)
      packetCount++

      if (packetCount % 20) {
        const adapted = adaptViewData(parsed.data)
        console.log(inspect(adapted, { showHidden: false, depth: null }))
      }
    }
  } catch (e) {
    console.log(e)
  }
})

port.on('error', err => {
  console.log(err)
})

port.on('close', () => {
  console.log('closed')
})
