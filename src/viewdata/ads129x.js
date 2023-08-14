const ads129xViewData = ({ brief, regs, samples, ecg1, resp1 }) => {
  const leadOff = samples.map(({ status }) => ({
    rldStat: (status >> 4) & 1,
    in2nOff: (status >> 3) & 1,
    in2pOff: (status >> 2) & 1,
    in1nOff: (status >> 1) & 1,
    in1pOff: (status >> 0) & 1
  }))
    .reduce((acc, c) => {
      acc.rldStat += c.rldStat
      acc.in2nOff += c.in2nOff
      acc.in2pOff += c.in2pOff
      acc.in1nOff += c.in1nOff
      acc.in1pOff += c.in1pOff
      return acc
    }, { rldStat: 0, in2nOff: 0, in2pOff: 0, in1nOff: 0, in1pOff: 0 })

  const ecgOrig = samples.map(({ chan2 }) => chan2)
  const respOrig = samples.reduce((acc, current, index) => {
    if (index % 10 === 0) {
      acc.push(samples[index].chan1)
    }

    return acc
  }, [])

  return {
    brief,
    leadOff,
    ecgOrig,
    ecgFilt: ecg1,
    respOrig,
    respFilt: resp1.map(x => x.hp)
  }
}

export default ads129xViewData
