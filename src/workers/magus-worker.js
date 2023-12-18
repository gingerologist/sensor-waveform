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
import assert from 'node:assert/strict'

import { sensparse } from '../protocol/sensparse.js'
import { ads129xParse } from '../protocol/ads129xParse.js'
import { max86141Parse } from '../protocol/max86141Parse.js'
import { m601zParse } from '../protocol/m601zParse.js'
import createAds129xViewData from '../viewdata/ads129xViewData.js'

import timestamp from '../lib/timestamp.js'
import createMax86141ViewData from '../viewdata/max86141ViewData.js'
// import createMax86141Config from '../protocol/max86141Config.js'

import createM601zViewData from '../viewdata/m601zViewData.js'

/******************************************************************************
 *
 * Constants
 *
 ******************************************************************************/

const VIEW_ABP_SAMPLES_IN_CHART = 10240
const VIEW_ABP_CLEAR_AHEAD = 512

const VIEW_SPO_SAMPLES_IN_CHART = 300
const VIEW_SPO_CLEAR_AHEAD = 30

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

let spoParsed = {
  samples: []
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

  const writer = port.writable.getWriter()

  const ads129xViewData = createAds129xViewData({
    samplesInChart: 2000,
    clearAhead: 200,
    filters: [] // not respected yet TODO
  })

  const spoMax86141ViewData = createMax86141ViewData({
    samplingRate: 50,
    samplesInChart: VIEW_SPO_SAMPLES_IN_CHART,
    clearAhead: VIEW_SPO_CLEAR_AHEAD,
    taglist: ['PPG1_LEDC1', 'PPG1_LEDC2']
  })

  const abpMax86141ViewData = createMax86141ViewData({
    samplingRate: 2048,
    samplesInChart: VIEW_ABP_SAMPLES_IN_CHART,
    clearAhead: VIEW_ABP_CLEAR_AHEAD,
    taglist: ['PPG1_LEDC1', 'PPG2_LEDC1', 'PPG1_LEDC2', 'PPG2_LEDC2', 'PPG1_LEDC3', 'PPG2_LEDC3']
  })

  const comboMax86141ViewData = createMax86141ViewData({
    samplesInChart: 1024,
    clearAhead: 128,
    taglist: ['PPG1_LEDC1', 'PPG1_LEDC2', 'PPG2_LEDC1', 'PPG2_LEDC2']
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
  const max86141AbpStartUs = 0
  const max86141AbpCount = 0

  let m601zLog = null
  let tempCount = 0

  const makeHeadline = arr => arr.map(s => `"${s}"`).join(', ') + '\r\n'

  const ads129xHeadline = makeHeadline([
    'original data',
    'processed by Zhirou algorithem',
    '50Hz notch',
    '50Hz notch, LPF, and HPF'
  ])

  const max86141SpoHeadline = makeHeadline(['PPG1-LEDC1', 'PPG1_LEDC2'])
  const max86141AbpHeadline = makeHeadline(['PPG1-LEDC1', 'PPG2-LEDC1', 'feat_ptt', 'feat_idc', 'feat_imax', 'feat_imin', 'sbp', 'dbp'])
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

  const spoAutoRecording = true
  const startMax86141SpoLogging = () => {
    // if (max86141SpoLog === null) {
    //   const filename = `spodata-${timestamp()}.csv`
    //   const filepath = path.join(process.cwd(), 'log', filename)
    //   max86141SpoLog = fs.createWriteStream(filepath)
    //   max86141SpoLog.write(max86141SpoHeadline)
    // }

    // if (max86141SpoRouguLog === null) {
    //   const filename = `spodata-rougu-${timestamp()}.csv`
    //   const filepath = path.join(process.cwd(), 'log', filename)
    //   max86141SpoRouguLog = fs.createWriteStream(filepath)
    //   max86141SpoRouguLog.write(max86141SpoRouguHeadline)
    // }

    // spoAutoRecording = true
    self.postMessage({ oob: 'max86141-spo-recording-started' })
  }

  const stopMax86141SpoLogging = () => {
    // if (max86141SpoLog) {
    //   max86141SpoLog.end()
    //   max86141SpoLog = null
    // }

    // if (max86141SpoRouguLog) {
    //   max86141SpoRouguLog.end()
    //   max86141SpoRouguLog = null
    // }
    // spoAutoRecording = false
    self.postMessage({ oob: 'max86141-spo-recording-stopped' })
  }

  const abpAutoRecording = true

  const startMax86141AbpLogging = () => {
    // if (max86141AbpLog === null) {
    //   const filename = `abpdata-${timestamp()}.csv`
    //   const filepath = path.join(process.cwd(), 'log', filename)
    //   max86141AbpLog = fs.createWriteStream(filepath)

    //   // reset count
    //   max86141AbpCount = 0
    //   max86141AbpLog.write(max86141AbpHeadline)
    // }
    // abpAutoRecording = true
    self.postMessage({ oob: 'max86141-abp-recording-started' })
  }

  const stopMax86141AbpLogging = () => {
    // if (max86141AbpLog) {
    //   max86141AbpLog.end()
    //   max86141AbpLog = null
    // }
    // abpAutoRecording = false
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
      case 'get-abp-coeff': {
        const preamble = new Uint8Array([0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0xd5])
        const type = new Uint8Array([0x02, 0x00])
        const length = new Uint8Array([0x00, 0x00])
        const tlv = new Uint8Array([...type, ...length])
        let cka = 0; let ckb = 0
        for (let i = 0; i < tlv.length; i++) {
          cka += tlv[i]
          cka &= 0xff
          ckb += cka
          ckb &= 0xff
        }

        const pkt = new Uint8Array([...preamble, ...tlv, cka, ckb])
        writer.write(pkt)
          .then(() => {})
          .catch(e => {})
        break
      }
      case 'set-abp-coeff': {
        const data = new Float32Array([...message.data])
        // console.log(data.byteLength) -> 32
        const buffer = new ArrayBuffer(data.byteLength)
        const floatView = new Float32Array(buffer)
        floatView.set(data)
        const value = new Uint8Array(buffer)

        const preamble = new Uint8Array([0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0xd5])
        const type = new Uint8Array([0x03, 0x00])
        const length = new Uint8Array([0x20, 0x00])
        const tlv = new Uint8Array([...type, ...length, ...value])
        let cka = 0; let ckb = 0
        for (let i = 0; i < tlv.length; i++) {
          cka += tlv[i]
          cka &= 0xff
          ckb += cka
          ckb &= 0xff
        }

        const pkt = new Uint8Array([...preamble, ...tlv, cka, ckb])
        writer.write(pkt)
          .then(() => {})
          .catch(e => {})

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
          console.log(`packetStart ${parted.packetStart} not zero`, input)
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

            // this is config packet
            if (!parsed.samples) {
              console.log('conf pkt', parsed.brief.instanceId)

              if (max86141SpoLog) {
                console.log('close spo log')
                max86141SpoLog.end()
                max86141SpoLog = null
              }

              if (max86141SpoRouguLog) {
                console.log('close spo rougu log')
                max86141SpoRouguLog.end()
                max86141SpoRouguLog = null
              }

              if (max86141AbpLog) {
                console.log('close abp log')
                max86141AbpLog.end()
                max86141AbpLog = null
              }

              if (parsed.brief.instanceId === 0) { // SPO
                assert.equal(parsed.brief.samplingRate, 50, 'spo sampling rate not 50')
                spoMax86141ViewData.reset(VIEW_SPO_SAMPLES_IN_CHART, VIEW_SPO_CLEAR_AHEAD)

                if (spoAutoRecording) {
                  const filename1 = `spodata-${timestamp()}.csv`
                  const filepath1 = path.join(process.cwd(), 'log', filename1)
                  max86141SpoLog = fs.createWriteStream(filepath1)
                  max86141SpoLog.write(max86141SpoHeadline)

                  console.log(`logfile ${filename1}`)

                  const filename2 = `spodata-rougu-${timestamp()}.csv`
                  const filepath2 = path.join(process.cwd(), 'log', filename2)
                  max86141SpoRouguLog = fs.createWriteStream(filepath2)
                  max86141SpoRouguLog.write(max86141SpoRouguHeadline)

                  console.log(`logfile ${filename2}`)
                }
              } else if (parsed.brief.instanceId === 1) { // ABP
                const { brief, coeff } = parsed

                if (!coeff) {
                  assert.equal(parsed.brief.samplingRate, 2048, 'abp sampling rate not 2048')
                  abpMax86141ViewData.reset(VIEW_ABP_SAMPLES_IN_CHART, VIEW_ABP_CLEAR_AHEAD)

                  if (abpAutoRecording) {
                    const filename = `abpdata-${timestamp()}.csv`
                    const filepath = path.join(process.cwd(), 'log', filename)
                    max86141AbpLog = fs.createWriteStream(filepath)
                    max86141AbpLog.write(max86141AbpHeadline)

                    console.log(`logfile ${filename}`)
                  }
                }

                self.postMessage({ brief, coeff })
              }
            } else if (parsed.brief.instanceId === 0) { // spo
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
              const { brief, filed, origs, filts, acs, tags, feature } = viewData
              self.postMessage({ brief, origs, filts, acs, tags, feature },
                [...origs.map(x => x.buffer), ...filts.map(x => x.buffer), ...acs.map(x => x.buffer)])

              if (max86141AbpLog) {
                for (let i = 0; i < filed[0].length; i++) {
                  if (feature && feature.index === i) {
                    max86141AbpLog.write(`${filed[0][i]}, ${filed[1][i]}, ${feature.ptt}, ${feature.idc}, ${feature.imax}, ${feature.imin}, ${feature.sbp}, ${feature.dbp}\r\n`)
                  } else {
                    max86141AbpLog.write(`${filed[0][i]}, ${filed[1][i]}\r\n`)
                  }
                }
              }
            } else if (parsed.brief.instanceId === 128) { // combo
              if (spoParsed.samples.length === 0) {
                spoParsed.brief = { ...parsed.brief }
                spoParsed.brief.instanceId = 0
                spoParsed.reg10 = parsed.reg10
                spoParsed.reg20 = parsed.reg20
              }

              const ppg1Led1 = parsed.samples.filter(x => x.tag === 1).map(x => x.val)
              const ppg1Led2 = parsed.samples.filter(x => x.tag === 2).map(x => x.val)

              spoParsed.samples.push({
                tag: 1,
                name: 'PPG1_LEDC1',
                val: ppg1Led1.reduce((acc, x) => acc + x, 0) / ppg1Led1.length
              })

              spoParsed.samples.push({
                tag: 2,
                name: 'PPG1_LED2',
                val: ppg1Led2.reduce((acc, x) => acc + x, 0) / ppg1Led2.length
              })

              if (spoParsed.samples.length === 60) {
                const viewData = spoMax86141ViewData.build(spoParsed)
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
                spoParsed = { samples: [] }
              }

              const abpParsed = {
                brief: { ...parsed.brief, instanceId: 1 },
                reg10: parsed.reg10,
                reg20: parsed.reg20,
                samples: parsed.samples.filter(x => x.tag === 1 || x.tag === 7)
              }

              const viewData = abpMax86141ViewData.build(abpParsed)
              const { brief, filed, origs, filts, acs, tags } = viewData
              self.postMessage({ brief, origs, filts, acs, tags },
                [...origs.map(x => x.buffer), ...filts.map(x => x.buffer), ...acs.map(x => x.buffer)])

              if (max86141AbpLog) {
                for (let i = 0; i < parsed.samples.length / 4; i++) {
                  const ir1 = parsed.samples[i * 4 + 0].val
                  const ir2 = parsed.samples[i * 4 + 1].val
                  const rd1 = parsed.samples[i * 4 + 2].val
                  const rd2 = parsed.samples[i * 4 + 3].val
                  max86141AbpLog.write(`${ir1}, ${ir2}, ${rd1}, ${rd2}\r\n`)
                }
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
