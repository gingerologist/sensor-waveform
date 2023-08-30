const samplingRate = (ppgCfg2) => {
  const ppgSr = ppgCfg2 >> 3
  const smpAve = ppgCfg2 & 0x07

  const srmap = [
    [0x00, 25],
    [0x01, 50],
    [0x02, 84],
    [0x03, 100],
    [0x04, 200],
    [0x05, 400],
    [0x06, 25],
    [0x07, 50],
    [0x08, 84],
    [0x09, 100],
    [0x0a, 8],
    [0x0b, 16],
    [0x0c, 32],
    [0x0d, 64],
    [0x0e, 128],
    [0x0f, 256],
    [0x10, 512],
    [0x11, 1024],
    [0x12, 2048],
    [0x13, 4096]
  ]

  const pair = srmap.find(arr => arr[0] === ppgSr)
  return pair[1] / (1 << smpAve)
}

const parseBrief = tlv => {
  if (tlv.type !== 0xff) {
    throw new Error(`not a brief tlv, type: ${tlv.type}`)
  }

  const sensorId = tlv.value.readUInt16LE(0)
  const instanceId = tlv.value.readUInt8(2)
  const version = tlv.value.readUInt8(3)
  const ppg1 = tlv.value.readUInt8(4)
  const ppg2 = tlv.value.readUInt8(5)
  const ppfProx = tlv.value.readUInt8(6)
  const lowPower = tlv.value.readUInt8(7)
  const numOfSamples = tlv.value.readUInt8(8)
  return {
    sensorId,
    version,
    instanceId,
    ppg1,
    ppg2,
    ppfProx,
    lowPower,
    numOfSamples
  }
}

// see datasheet table 3 fifo data and tag
const tagName = tag => {
  switch (tag) {
    case 0x01:
      return 'PPG1_LED1'
    case 0x02:
      return 'PPG1_LED2'
    case 0x03:
      return 'PPG1_LED3'
    case 0x04:
      return 'PPG1_LED4'
    case 0x05:
      return 'PPG1_LED5'
    case 0x06:
      return 'PPG1_LED6'
    case 0x07:
      return 'PPG2_LED1'
    case 0x08:
      return 'PPG2_LED2'
    case 0x09:
      return 'PPG2_LED3'
    case 0x0a:
      return 'PPG2_LED4'
    case 0x0b:
      return 'PPG2_LED5'
    case 0x0c:
      return 'PPG2_LED6'
    case 0x0d:
      return 'PPF1_LED1'
    case 0x0e:
      return 'PPF1_LED2'
    case 0x0f:
      return 'PPF1_LED3'
    case 0x13:
      return 'PPF2_LED1'
    case 0x14:
      return 'PPF2_LED2'
    case 0x15:
      return 'PPF2_LED3'
    case 0x19:
      return 'PROX1'
    case 0x1a:
      return 'PROX2'
    case 0x1e:
      return 'INVALID'
    case 0x1f:
      return 'TIMESTAMP'
    default:
      return 'UNKNOWN'
  }
}

// Big Endian
const parseSample = (high, middle, low) => {
  const tag = high >> 3
  const name = tagName(tag)
  const val = (high & 0x07) * 256 * 256 + middle * 256 + low
  return { tag, name, val }
}

const parseDetail = (data, tlv) => {
  switch (tlv.type) {
    case 0x08: {
      const samples = []
      for (let i = 0; i < data.brief.numOfSamples; i++) {
        samples.push(parseSample(tlv.value[3 * i], tlv.value[3 * i + 1], tlv.value[3 * i + 2]))
      }
      data.samples = samples
      break
    }
    case 0x10: {
      const raw = Array.from(tlv.value)
      if (!data.regs) {
        data.regs = {}
      }

      data.regs.ppgSyncCtrl = {
        timeStampEn: (raw[0] & 0x80) ? 1 : 0,
        swForceSync: (raw[0] & 0x10) ? 1 : 0,
        gpioCtrl: raw[0] & 0x0f
      }
      data.regs.ppgCfg = {
        alcDisable: (raw[1] & 0x80) ? 1 : 0,
        addOffset: (raw[1] & 0x40) ? 1 : 0,
        ppg2AdcRge: ((raw[1] >> 4) & 0x03),
        ppg1AdcRge: ((raw[1] >> 2) & 0x03),
        ppgTint: raw[1] & 0x03,
        ppgSr: (raw[2] >> 3) & 0x1f,
        smpAve: raw[2] & 0x07,
        samplingRate: samplingRate(raw[2]), // calc
        ledSetlng: (raw[3] >> 6) & 0x03,
        digFiltSel: (raw[3] & 0x20) ? 1 : 0,
        burstRate: (raw[3] >> 1) & 0x03,
        burstEn: raw[3] & 0x01
      }
      data.regs.proxIntThresh = raw[4]
      data.regs.pdbias = [raw[5] & 0x07, (raw[5] >> 4) & 0x07]
      data.regs.picketFence = {
        pfEnable: (raw[6] & 0x80) ? 1 : 0,
        pfOrder: (raw[6] & 0x40) ? 1 : 0,
        iirTc: (raw[6] >> 4) & 0x03,
        iirInitValue: (raw[6] >> 2) & 0x03,
        thresholdSigmaMult: raw[6] & 0x03
      }
      break
    }
    case 0x20: {
      const raw = Array.from(tlv.value)
      if (!data.regs) {
        data.regs = {}
      }

      data.regs.ledSeqCtrl = [raw[0] & 0x0f, (raw[0] >> 4) & 0x0f, raw[1] & 0x0f, (raw[1] >> 4) & 0x0f, raw[2] & 0x0f, (raw[2] >> 4) & 0x0f]
      data.regs.ledPa = [raw[3], raw[4], raw[5], raw[6], raw[7], raw[8]]
      data.regs.pilotPa = raw[9]
      data.regs.ledRge = [
        (raw[10] >> 0) & 0x03,
        (raw[10] >> 2) & 0x03,
        (raw[10] >> 4) & 0x03,
        (raw[11] >> 0) & 0x03,
        (raw[11] >> 2) & 0x03,
        (raw[11] >> 4) & 0x03
      ]
      break
    }
    default:
      break
  }
  return data
}

export const max86141Parse = tlvs =>
  tlvs.reduce((acc, c) => acc
    ? parseDetail(acc, c)
    : ({ brief: parseBrief(c) }), null)
