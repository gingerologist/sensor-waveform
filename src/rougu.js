const { SerialPort } = require('serialport')

const port = new SerialPort({
  path: '/dev/ttyACM0',
  baudRate: 115200
})

port.on('data', data => {
  console.log(data)
})

port.on('error', err => {
  console.log(err)
})

port.on('close', () => {
  console.log('closed')
})
