/**
 * This is the re-written version of sensor-proto
 */

const PKT_PREAMBLE_LEN = 8
const PKT_TYPE_LEN = 2
const PKT_LENGTH_LEN = 2
const PKT_CRC_LEN = 2

/** without this comment, eslint complains, don't know why */
const readUInt16LE = (u8arr, pos) => {
  return u8arr[pos] + u8arr[pos + 1] * 256
}

const readUInt24BE = (u8arr, pos) => {
  return u8arr[pos] * 256 * 256 + u8arr[pos + 1] * 256 + u8arr[pos + 2]
}

const readInt24BE = (u8arr, pos) => {
  const u = readUInt24BE(u8arr, pos)
  return (u < 0x800000) ? u : u - 0x01000000
}

const readUInt32LE = (u8arr, pos) => {
  return u8arr[0] + u8arr[1] * 256 + u8arr[2] * 256 * 256 + u8arr[3] * 256 * 256 * 256
}

export const concat = (arr1, arr2) => {
  const arr = new Uint8Array(arr1.length + arr2.length)
  arr.set(arr1, 0)
  arr.set(arr2, arr1.length)
  return arr
}

// const token = Buffer.from('55555555555555D50101', 'hex')
const token = new Uint8Array([0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0xd5, 0x01, 0x01])
const tokstr = new TextDecoder('ascii').decode(token)

const readTLV = (payload, offset) => {
  try {
    const type = payload[offset] // payload.readUInt8(offset)
    const length = payload[offset + 1] + payload[offset + 2] * 256 // payload.readInt16LE(offset + 1)
    const value = payload.subarray(offset + 3, offset + 3 + length)
    const size = length + 3

    // console.log(`payload.length: ${payload.length}`, offset, type, length, value, size)

    return { type, length, value, size }
  } catch (e) {
    console.log(`error reading tlv @ offset ${offset}`)
    throw e
  }
}

const readAllTLVs = payload => {
  const tlvs = []
  for (let offset = 0, tlv; offset < payload.length; offset += tlv.size) {
    tlv = readTLV(payload, offset)
    tlvs.push(tlv)
  }
  return tlvs
}

const readBrief = tlv => {
  if (tlv.type !== 0xff) {
    throw new Error(`not a global tlv, type: ${tlv.type}`)
  }

  const sensorId = readUInt16LE(tlv.value, 0) // tlv.value.readUInt16LE(0)
  const version = tlv.value[2] // .readUInt8(2)
  const instanceId = tlv.value[3] // .readUInt8(3)

  switch (sensorId) {
    case 0x0001: {
      throw new Error('not implemented yet')
    }
    case 0x0002: {
      const numOfSamples = tlv.value[4] // .readUInt8(4)
      const heartRate = tlv.value[5] // .readUInt8(5)
      const respiratoryRate = tlv.value[6] // .readUInt8(6)
      return {
        sensorId,
        instanceId,
        version,
        numOfSamples,
        heartRate,
        respiratoryRate
      }
    }
    case 0xfff0: {
      const samplingRate = readUInt16LE(tlv.value, 4) // .readUInt16LE(4)
      const samplingRateUnit = tlv.value[6] // .readUInt8(6)
      const resolution = tlv.value[7] // .readUInt8(7)
      const vref = readUInt16LE(tlv.value, 8) // .readUInt16LE(8)
      const numOfSamples = readUInt16LE(tlv.value, 10) // .readUInt16LE(10)
      return {
        sensorId,
        version,
        instanceId,
        samplingRate,
        samplingRateUnit,
        resolution,
        vref,
        numOfSamples
      }
    }
    default:
      throw new Error(`unknown sensor id ${sensorId}`)
  }
}

const ads129xHandler = (data, tlv) => {
  switch (tlv.type) {
    case 0x00:
      data.regs = Array.from(tlv.value) // for Uint8Array this is OK
      break

    case 0x10: {
      data.samples = []
      for (let i = 0; i < data.brief.numOfSamples; i++) {
        // const status = (tlv.value.readUIntBE(9 * i + 0, 3) >> 15) & 0x0000001F
        // const chan1 = tlv.value.readIntBE(9 * i + 3, 3)
        // const chan2 = tlv.value.readIntBE(9 * i + 6, 3)
        const status = (readUInt24BE(tlv.value, 9 * i + 0) >> 15) & 0x0000001F
        const chan1 = readInt24BE(tlv.value, 9 * i + 3)
        const chan2 = readInt24BE(tlv.value, 9 * i + 6)
        data.samples.push({ status, chan1, chan2 })
      }
      break
    }

    case 0x80:
      data.ecg1 = []
      for (let i = 0; i < data.brief.numOfSamples; i++) {
        // data.ecg1.push(tlv.value.readUInt16LE(i * 2))
        const sample = readUInt16LE(tlv.value, i * 2)
        data.ecg1.push(sample)
      }
      break

    case 0x81:
      data.resp1 = []
      for (let i = 0; i < data.brief.numOfSamples / 10; i++) {
        const lp = readUInt32LE(tlv.value, 8 * i + 0) // tlv.value.readUInt32LE(8 * i + 0)
        const hp = readUInt32LE(tlv.value, 8 * i + 4) // tlv.value.readUInt32LE(8 * i + 4)
        data.resp1.push({ lp, hp })
      }
      break
  }
  return data
}

const genericAdcHandler = (data, tlv) => {
  switch (tlv.type) {
    // uint16_t
    case 0x00:
      data.adc = []
      for (let i = 0; i < tlv.length / 2; i++) {
        data.adc.push(tlv.value.readInt16LE(i * 2))
      }
      break
    default:
      break
  }

  return data
}

const handlerMap = new Map()
handlerMap.set(0x0002, ads129xHandler)
handlerMap.set(0xfff0, genericAdcHandler)

/**
 *
 * @param {Buffer} input
 * @returns
 */
export const parseSensPacket = input => {
  // const packetStart = input.indexOf(token)
  const inputStr = new TextDecoder('ascii').decode(input)
  const packetStart = inputStr.indexOf(tokstr) // Uint8ArrayIndexOf(input, token)

  if (packetStart < 0) return

  if (packetStart > 0) input = input.subarray(packetStart)
  if (input.length < 12) return

  // const payloadLen = input.readUInt16LE(10)
  const payloadLen = readUInt16LE(input, 10)
  if (input.length < 14 + payloadLen) return

  const crcStart = PKT_PREAMBLE_LEN + PKT_TYPE_LEN + PKT_LENGTH_LEN + payloadLen
  const packetEnd = crcStart + PKT_CRC_LEN

  let cka = 0
  let ckb = 0
  for (let i = 8; i < crcStart; i++) {
    cka = (cka + input[i]) & 0xff
    ckb = (ckb + cka) & 0xff
  }

  if (input[crcStart] !== cka || input[crcStart + 1] !== ckb) {
    throw new Error('bad crc')
  }

  const payload = input.subarray(12, crcStart)
  const tlvs = readAllTLVs(payload)
  const brief = readBrief(tlvs.shift())
  const handler = handlerMap.get(brief.sensorId)

  const data = handler
    ? tlvs.reduce(handler, { brief })
    : { brief }

  return { packetStart, packetEnd, data }
}
