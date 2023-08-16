/**
 * This file is obsolete but don't remove it now.
 */

const PKT_PREAMBLE_LEN = 8
const PKT_TYPE_LEN = 2
const PKT_LENGTH_LEN = 2
const PKT_CRC_LEN = 2

const token = Buffer.from('55555555555555D50101', 'hex')

const readTLV = (payload, offset) => {
  try {
    const type = payload.readUInt8(offset)
    const length = payload.readInt16LE(offset + 1)
    const value = payload.subarray(offset + 3, offset + 3 + length)
    const size = length + 3

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

  const sensorId = tlv.value.readUInt16LE(0)
  const version = tlv.value.readUInt8(2)
  const instanceId = tlv.value.readUInt8(3)

  switch (sensorId) {
    case 0x0001: {
      throw new Error('not implemented yet')
    }
    case 0x0002: {
      const numOfSamples = tlv.value.readUInt8(4)
      const heartRate = tlv.value.readUInt8(5)
      const respiratoryRate = tlv.value.readUInt8(6)
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
      const samplingRate = tlv.value.readUInt16LE(4)
      const samplingRateUnit = tlv.value.readUInt8(6)
      const resolution = tlv.value.readUInt8(7)
      const vref = tlv.value.readUInt16LE(8)
      const numOfSamples = tlv.value.readUInt16LE(10)
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
      data.regs = Array.from(tlv.value)
      break

    case 0x10: {
      data.samples = []
      for (let i = 0; i < data.brief.numOfSamples; i++) {
        const status = (tlv.value.readUIntBE(9 * i + 0, 3) >> 15) & 0x0000001F
        const chan1 = tlv.value.readIntBE(9 * i + 3, 3)
        const chan2 = tlv.value.readIntBE(9 * i + 6, 3)
        data.samples.push({ status, chan1, chan2 })
      }
      break
    }

    case 0x80:
      data.ecg1 = []
      for (let i = 0; i < data.brief.numOfSamples; i++) {
        data.ecg1.push(tlv.value.readUInt16LE(i * 2))
      }
      break

    case 0x81:
      data.resp1 = []
      for (let i = 0; i < data.brief.numOfSamples / 10; i++) {
        const lp = tlv.value.readUInt32LE(8 * i + 0)
        const hp = tlv.value.readUInt32LE(8 * i + 4)
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
const parseSensPacket = input => {
  const packetStart = input.indexOf(token)

  if (packetStart < 0) return

  if (packetStart > 0) input = input.subarray(packetStart)
  if (input.length < 12) return

  const payloadLen = input.readInt16LE(10)
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

module.exports = { parseSensPacket }
