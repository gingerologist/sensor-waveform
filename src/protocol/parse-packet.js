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

const peekBrief = tlv => {
  if (tlv.type !== 0xff) {
    throw new Error(`not a global tlv, type: ${tlv.type}`)
  }

  const sensorId = tlv.value.readUInt16LE(0)
  const version = tlv.value.readUInt8(2)
  const instanceId = tlv.value.readUInt8(3)

  return { sensorId, version, instanceId }
}

/**
 *
 * @param {Buffer} input
 * @returns
 */
export const parsePacket = input => {
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
  const peek = peekBrief(tlvs[0])
  // const handler = handlerMap.get(brief.sensorId)

  // const data = handler
  //   ? tlvs.reduce(handler, { brief })
  //   : { brief }

  return { packetStart, packetEnd, peek, tlvs }
}
