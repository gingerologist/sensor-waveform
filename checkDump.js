import { readFile } from 'node:fs'
import { sensparse } from './src/protocol/sensparse.js'
readFile('dumpdata', (err, dump) => {
  if (err) {
    console.log(err)
    return
  }

  let start = 0
  for (;;) {
    const parted = sensparse(dump)
    if (parted === undefined) return
    if (parted.packetStart) {
      console.log(`packetStart ${parted.packetStart} not zero (${start})`)
    } else {
      console.log(`parted sensor id ${parted.sensorId}, length: ${parted.packetEnd}`)
    }
    dump = dump.subarray(parted.packetEnd)
    start += parted.packetEnd
  }
})
