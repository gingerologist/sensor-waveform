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
      data.ppgcfg = Array.from(tlv.value)
      break
    }
    case 0x20: {
      data.ledcfg = Array.from(tlv.value)
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