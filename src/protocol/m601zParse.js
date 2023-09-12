const parseBrief = tlv => {
  if (tlv.type !== 0xff) {
    throw new Error(`not a brief tlv, type: ${tlv.type}`)
  }

  const sensorId = tlv.value.readUInt16LE(0)
  const instanceId = tlv.value.readUInt8(2)
  const version = tlv.value.readUInt8(3)
  const numOfDevices = tlv.value.readUInt8(4)
  return {
    sensorId,
    instanceId,
    version,
    numOfDevices
  }
}

const parseDetail = (data, tlv) => {
  switch (tlv.type) {
    case 0x00:
      data.idTemps = []
      for (let i = 0; i < data.brief.numOfDevices; i++) {
        const id = tlv.value.subarray(i * 10, i * 10 + 8).toString('hex')
        const temp = tlv.value.subarray(i * 10 + 8, i * 10 + 10).readInt16LE() / 256 + 40
        data.idTemps.push({ id, temp })
      }
      break

    default:
      break
  }
  return data
}

export const m601zParse = tlvs =>
  tlvs.reduce((acc, c) => acc
    ? parseDetail(acc, c)
    : ({ brief: parseBrief(c) }), null)