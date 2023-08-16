const Fili = require('fili')

const iirCalc = new Fili.CalcCascades()

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

/**
 * This class processes raw data (parse output) to two formats
 * 1. for display
 * 2. for output to file
 * @param {object} opt - options
 * @param {number} opt.samplesInChart - how many points drawn in chart
 * @param {number} opt.
 */
class Ads129xViewData {
  constructor ({ samplesInChart, clearAhead, filters }) {
    this.samplesInChart = samplesInChart || 2000
    this.clearAhead = clearAhead || 200
    this.filters = Array.isArray(filters) || []

    this.ecgNotch = new Fili.IirFilter(iirCalc.bandstop({
      order: 2,
      characteristic: 'butterworth',
      Fs: 250,
      Fc: 50,
      BW: 1
    }))

    this.ecgLowpass = new Fili.IirFilter(iirCalc.lowpass({
      order: 2,
      characteristic: 'butterworth',
      Fs: 250,
      Fc: 50
    }))

    this.ecgHighpass = new Fili.IirFilter(iirCalc.highpass({
      order: 2,
      characteristic: 'butterworth',
      Fs: 250,
      Fc: 1
    }))

    this.reset()
  }

  reset () {
    this.ecgPlotIndex = 0
    this.ecgOrigArray = Array(this.samplesInChart).fill(0)
    this.ecgProcArray = Array(this.samplesInChart).fill(0)
    this.ecgNtchArray = Array(this.samplesInChart).fill(0)
    this.ecgNlhpArray = Array(this.samplesInChart).fill(0)
  }

  modulo (n) {
    return (n % this.samplesInChart)
  }

  addFilter () {

  }

  removeFilter () {

  }

  /**
   * Create new viewdata object from parsed object
   * @param {object} parsed - The parsed object contains all data in protocol
   *                          packet, but translated into JavaScript data format.
   * @returns New viewdata object contains only required properties for view and
   *          file output. Some calculation may be done here, such as average.
   */
  createViewData (parsed = {}) {
    const { brief, regs, samples, ecg1, resp1 } = parsed
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
      ecgProc: ecg1,
      respOrig,
      respFilt: resp1.map(x => x.hp)
    }
  }

  /**
   * Append filtered data to viewdata
   * @param {object} viewdata
   */
  appendFilteredData (viewdata) {
    viewdata.ecgNtch = this.ecgNotch.multiStep(viewdata.ecgOrig)
    viewdata.ecgNlhp = this.ecgHighpass.multiStep(this.ecgLowpass.multiStep(viewdata.ecgNtch))
  }

  /**
   * Fill both original data and filtered data into offline array buffer
   * @param {object} viewdata
   */
  fillOfflineArray (viewdata) {
    const fill = (arrName, sample) => {
      this[arrName][this.ecgPlotIndex] = sample
      this[arrName][this.modulo(this.ecgPlotIndex + this.clearAhead)] = NaN
    }

    for (let i = 0; i < viewdata.brief.numOfSamples; i++) {
      fill('ecgOrigArray', viewdata.ecgOrig[i])
      fill('ecgProcArray', viewdata.ecgProc[i])
      fill('ecgNtchArray', viewdata.ecgNtch[i])
      fill('ecgNlhpArray', viewdata.ecgNlhp[i])
      this.ecgPlotIndex = this.modulo(this.ecgPlotIndex + 1)
    }
  }

  appendTypedArray (viewdata) {
    const length = this.samplesInChart
    const ecgOrigData = new Float32Array(length * 2)
    const ecgProcData = new Float32Array(length * 2)
    const ecgNtchData = new Float32Array(length * 2)
    const ecgNlhpData = new Float32Array(length * 2)

    for (let i = 0; i < length; i++) {
      ecgOrigData[i * 2] = i
      ecgOrigData[i * 2 + 1] = this.ecgOrigArray[i]
      ecgProcData[i * 2] = i
      ecgProcData[i * 2 + 1] = this.ecgProcArray[i]
      ecgNtchData[i * 2] = i
      ecgNtchData[i * 2 + 1] = this.ecgNtchArray[i]
      ecgNlhpData[i * 2] = i
      ecgNlhpData[i * 2 + 1] = this.ecgNlhpArray[i]
    }

    Object.assign(viewdata, { ecgOrigData, ecgProcData, ecgNtchData, ecgNlhpData })
  }

  /**
   * Build a viewdata object in the following steps:
   * 1. create viewdata from parsed data
   * 2. append filtered data
   * 3. fill (draw) offline array
   * 4. append typed array (buffer)
   * @param {object} parsed - parsed data from parser
   * @returns built viewdata
   */
  build (parsed) {
    const viewdata = this.createViewData(parsed)
    this.appendFilteredData(viewdata)
    this.fillOfflineArray(viewdata)
    this.appendTypedArray(viewdata)
    return viewdata
  }
}

const createAds129xViewData = (opt) => new Ads129xViewData(opt)

export default createAds129xViewData
