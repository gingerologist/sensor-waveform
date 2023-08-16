const parseBrief = tlv => {
  if (tlv.type !== 0xff) {
    throw new Error(`not a global tlv, type: ${tlv.type}`)
  }

  const sensorId = tlv.value.readUInt16LE(0)
  const version = tlv.value.readUInt8(2)
  const instanceId = tlv.value.readUInt8(3)
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

const parseDetail = (data, tlv) => {
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

export const ads129xParse = tlvs =>
  tlvs.reduce((acc, c) => acc
    ? parseDetail(acc, c)
    : ({ brief: parseBrief(c) }), null)
