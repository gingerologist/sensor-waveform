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
import { max86141Parse } from '../protocol/max86141Parse.js'
import { m601zParse } from '../protocol/m601zParse.js'
import createAds129xViewData from '../viewdata/ads129xViewData.js'

import timestamp from '../lib/timestamp.js'
import createMax86141ViewData from '../viewdata/max86141ViewData.js'
///// import createMax86141Config from '../protocol/max86141Config.js'

import createM601zViewData from '../viewdata/m601zViewData.js'

const samplingFreq = regVal => [
  24.995,
  50.027,
  84.021,
  99.902,
  199.805,
  399.610,
  24.995,
  50.207,
  84.021,
  99.902,
  8,
  16,
  32,
  64,
  128,
  256,
  512,
  1024,
  2048,
  4096
][regVal]

const readSamplingRate = reg12 => {
  const ppgSr = reg12 >> 3
  const freq = samplingFreq(ppgSr)
  const smpAve = reg12 & 0x07
  const oversamples = 0x01 << smpAve
  return freq / oversamples
}

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

  const spoMax86141ViewData = createMax86141ViewData({
    samplesInChart: 300,
    clearAhead: 30,
    taglist: ['PPG1_LED1', 'PPG1_LED2']
  })

  const abpMax86141ViewData = createMax86141ViewData({
    samplesInChart: 1000,
    clearAhead: 30,
    taglist: ['PPG1_LED1', 'PPG2_LED1', 'PPG1_LED2', 'PPG2_LED2', 'PPG1_LED3', 'PPG2_LED3']
  })

  const m601zViewData = createM601zViewData({
    samplesInChart: 60
  })

  // const abpMax86141Config = createMax86141Config()

  // const abpMax86141ViewData = createMax86141ViewData({
  //   samplesInChart: 1000,
  //   clearAhead: 100,
  //   filters: []
  // })

  let ads129xLog = null
  let max86141SpoLog = null
  let max86141SpoRouguLog = null

  let max86141AbpLog = null
  let max86141AbpStartUs = 0
  let max86141AbpCount = 0

  let m601zLog = null
  let tempCount = 0

  const makeHeadline = arr => arr.map(s => `"${s}"`).join(', ') + '\r\n'

  const ads129xHeadline = makeHeadline([
    'original data',
    'processed by Zhirou algorithem',
    '50Hz notch',
    '50Hz notch, LPF, and HPF'
  ])

  const max86141SpoHeadline = makeHeadline(['IR', 'RED'])
  // const max86141AbpHeadline = makeHeadline(['PPG1-IR', 'PPG2-IR', 'PPG1-RED', 'PPG2-RED', 'PPG1-GREEN', 'PPG2-GREEN'])
  // let max86141AbpHeadline
  const max86141SpoRouguHeadline = makeHeadline(['IR', 'IR Filtered', 'Red', 'Red Filtered', 'SpO2', 'Heart Rate'])

  let m601zHeadlineNames = []
  const m601zHeadline = () => makeHeadline(m601zHeadlineNames)

  const startAds129xLogging = () => {
    if (ads129xLog === null) {
      const filename = `ecgdata-${timestamp()}.csv`
      const filepath = path.join(process.cwd(), 'log', filename)
      ads129xLog = fs.createWriteStream(filepath)
      ads129xLog.write(ads129xHeadline)
    }
    self.postMessage({ oob: 'ads129x-recording-started' })
  }

  const stopAds129xLogging = () => {
    if (ads129xLog) {
      ads129xLog.end()
      ads129xLog = null
    }
    self.postMessage({ oob: 'ads129x-recording-stopped' })
  }

  const startMax86141SpoLogging = () => {
    if (max86141SpoLog === null) {
      const filename = `spodata-${timestamp()}.csv`
      const filepath = path.join(process.cwd(), 'log', filename)
      max86141SpoLog = fs.createWriteStream(filepath)
      max86141SpoLog.write(max86141SpoHeadline)
    }

    if (max86141SpoRouguLog === null) {
      const filename = `spodata-rougu-${timestamp()}.csv`
      const filepath = path.join(process.cwd(), 'log', filename)
      max86141SpoRouguLog = fs.createWriteStream(filepath)
      max86141SpoRouguLog.write(max86141SpoRouguHeadline)
    }

    self.postMessage({ oob: 'max86141-spo-recording-started' })
  }

  const stopMax86141SpoLogging = () => {
    if (max86141SpoLog) {
      max86141SpoLog.end()
      max86141SpoLog = null
    }

    if (max86141SpoRouguLog) {
      max86141SpoRouguLog.end()
      max86141SpoRouguLog = null
    }
    self.postMessage({ oob: 'max86141-spo-recording-stopped' })
  }

  const startMax86141AbpLogging = () => {
    if (max86141AbpLog === null) {
      const filename = `abpdata-${timestamp()}.csv`
      const filepath = path.join(process.cwd(), 'log', filename)
      max86141AbpLog = fs.createWriteStream(filepath)

      // reset count
      max86141AbpCount = 0
      // max86141AbpLog.write(max86141AbpHeadline)
    }
    self.postMessage({ oob: 'max86141-abp-recording-started' })
  }

  const stopMax86141AbpLogging = () => {
    if (max86141AbpLog) {
      max86141AbpLog.end()
      max86141AbpLog = null
    }
    self.postMessage({ oob: 'max86141-abp-recording-stopped' })
  }

  const startM601zLogging = () => {
    if (m601zLog === null) {
      const filename = `tempdata-${timestamp()}.csv`
      const filepath = path.join(process.cwd(), 'log', filename)
      m601zLog = fs.createWriteStream(filepath)
      m601zLog.write(m601zHeadline())
    }
    self.postMessage({ oob: 'm601z-recording-started' })
  }

  const stopM601zLogging = () => {
    if (m601zLog) {
      m601zLog.end()
      m601zLog = null
    }
    self.postMessage({ oob: 'm601z-recording-stopped' })
  }

  handleMessage = (message) => {
    const { type } = message
    console.log(`magus worker handle message: ${type}`)
    switch (type) {
      case 'ads129x-recording-start':
        startAds129xLogging()
        break
      case 'ads129x-recording-stop':
        stopAds129xLogging()
        break
      case 'max86141-spo-recording-start':
        startMax86141SpoLogging()
        break
      case 'max86141-spo-recording-stop':
        stopMax86141SpoLogging()
        break
      case 'max86141-abp-recording-start':
        startMax86141AbpLogging()
        break
      case 'max86141-abp-recording-stop':
        stopMax86141AbpLogging()
        break
      case 'max86141-abp-samples-in-chart':
        // console.log('max86141-abp-samples-in-chart', message.samplesInChart)
        abpMax86141ViewData.reset(message.samplesInChart)
        break
      case 'm601z-recording-start':
        startM601zLogging()
        break
      case 'm601z-recording-stop':
        stopM601zLogging()
        break
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
          console.log(`packetStart ${parted.packetStart} not zero`)
        }
        input = input.subarray(parted.packetEnd)

        switch (parted.sensorId) {
          case 0x0004: {
            const parsed = m601zParse(parted.tlvs)
            m601zHeadlineNames = parsed.idTemps.map(x => x.id)
            self.postMessage({ ...parsed, count: tempCount++ })

            if (m601zLog) {
              m601zLog.write(parsed.idTemps.map(x => x.temp).join() + '\r\n')
            }
            break
          }
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
          case 0x0001: {
            const parsed = max86141Parse(parted.tlvs)

            if (parsed.brief.instanceId === 0) { // spo
              const viewData = spoMax86141ViewData.build(parsed)
              const { brief, filed, origs, filts, acs, dcs, acRms, dcAvg, ratio, rougu } = viewData
              // const r = ratio[1] / ratio[0]
              // const a = -16.666666
              // const b = 8.333333
              // const c = 100
              // console.log(a * r * r + b * r + c)
              self.postMessage({ brief, origs, filts, acs, dcs, acRms, dcAvg, ratio, rougu },
                [...origs.map(x => x.buffer), ...filts.map(x => x.buffer), ...acs.map(x => x.buffer), ...dcs.map(x => x.buffer)])

              if (max86141SpoLog) {
                // console.log('spo filed', filed[0][0], filed[1][0])
                for (let i = 0; i < filed[0].length; i++) {
                  max86141SpoLog.write(`${filed[0][i]}, ${filed[1][i]}\r\n`)
                }
              }

              if (max86141SpoRouguLog && rougu) {
                for (let i = 0; i < rougu.ir.length; i++) {
                  const ir = rougu.ir[i]
                  const irFilt = rougu.irFilt[i]
                  const rd = rougu.rd[i]
                  const rdFilt = rougu.rdFilt[i]
                  const spo = rougu.spo[i]
                  const hr = rougu.hr[i]
                  max86141SpoRouguLog.write(`${ir}, ${irFilt}, ${rd}, ${rdFilt}, ${spo}, ${hr}\r\n`)
                }
              }
            } else if (parsed.brief.instanceId === 1) { // abp
              const viewData = abpMax86141ViewData.build(parsed)
              const { brief, filed, origs, filts, acs, tags } = viewData
              self.postMessage({ brief, origs, filts, acs, tags },
                [...origs.map(x => x.buffer), ...filts.map(x => x.buffer), ...acs.map(x => x.buffer)])

              if (max86141AbpLog) {
                if (max86141AbpCount === 0) {
                  max86141AbpStartUs = Date.now() * 1000
                  const headline = ['timestamp', ...tags].join(', ') + '\r\n'
                  max86141AbpLog.write(headline)
                }

                const rows = filed[0].length
                const intervalUs = 1000 * 1000 / readSamplingRate(parsed.reg10[2])
                const base = max86141AbpStartUs + max86141AbpCount * rows * intervalUs

                for (let row = 0; row < rows; row++) {
                  const timestamp = Math.round(base + row * intervalUs)
                  const list = filed.reduce((list, col) => [...list, col[row]], [])
                  const line = timestamp.toString() + ', ' + list.join(', ') + '\r\n'
                  max86141AbpLog.write(line)
                }

                max86141AbpCount++
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

      stopAds129xLogging()
      stopMax86141SpoLogging()
      stopMax86141AbpLogging()
      stopM601zLogging()

      self.postMessage({ oob: 'stopped' }) // TODO
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
  console.log(e.data.type ? e.data.type : e.data)
  // self.postMessage('You said: ' + e.data)
  if (handleMessage) {
    handleMessage(e.data)
  }
})

startAsync().then(() => { }).catch(e => console.log(e))

console.log('magus worker started')
