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

  const sensorId = tlv.value.readUInt16LE(0)
  const instanceId = tlv.value.readUInt8(2)
  const version = tlv.value.readUInt8(3)

  switch (sensorId) {
    case 0x0001: {
      throw new Error('not implemented yet')
    }
    case 0x0002: {
      const numOfSamples = tlv.value.readUInt8(4)
      const heartRate = tlv.value.readUInt8(5)
      const respiratoryRate = tlv.value.readUInt8(6)
      return { sensorId, instanceId, version, numOfSamples, heartRate, respiratoryRate }
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

const handlerMap = new Map()
handlerMap.set(0x0002, ads129xHandler)

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

  /**

  if (input[crcStart] === cka && input[crcStart + 1] === ckb) {
    let payload = input.subarray(12, crcStart)

    // const global = payload.subarray(0, 7);
    // payload = payload.subarray(7);

    let value

    const globalTLV = tlv(payload)
    value = globalTLV.value

    const global = {
      sensorId: value.readUInt16LE(0),
      instandeId: value.readUInt8(2),
      version: value.readUInt8(3)
    }

    payload = payload.subarray(globalTLV.size)

    if (global.sensorId == 0x0001) {
      // TODO
      return {
        packetStart,
        packedEnd,
        parsed: {}
      }
    } else if (global.sensorId == 0x0002) {
      const regsTLV = tlv(payload)
      const regs = Array.from(regsTLV.value)
      payload = payload.subarray(regsTLV.size)

      const samplesTLV = tlv(payload)
      const samples = []

      const numOfSamples = samplesTLV.length / 9
      value = samplesTLV.value
      for (i = 0; i < numOfSamples; i++) {
        const status = value.readUIntBE((i * 9 + 0), 3)
        const chan1 = value.readIntBE((i * 9 + 3), 3)
        const chan2 = value.readIntBE((i * 9 + 6), 3)
        samples.push({ status, chan1, chan2 })
      }

      return {
        packetStart,
        packetEnd,
        parsed: { global, regs, samples }
      }
    }

    // const local_00 = payload.subarray(0, 15);
    // payload = payload.subarray(15);

    // const local_10_data = payload.subarray(3);

    // mainWindow.webContents.send('data', null, { rawData: local_10_data })

    // console.log(`good crc ${payload_len}`, payload.slice(0, 7))
    // console.log(payload.slice(0, 3));
    input = input.subarray(packetEnd)
  } else {
    console.log(`bad crc: cka ${input[235]}, ${cka}, ckb ${input[236]}, ${ckb}`)
    // input.subarray(10)
    return {
      packetStart: -1
    }
  }
  */
}

module.exports = { parseSensPacket }
