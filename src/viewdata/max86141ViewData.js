const Fili = require('fili')

const iirCalc = new Fili.CalcCascades()

const fromTagName = name => {
  switch (name) {
    case 'PPG1_LED1':
      return 0x01
    case 'PPG1_LED2':
      return 0x02
    case 'PPG1_LED3':
      return 0x03
    case 'PPG1_LED4':
      return 0x04
    case 'PPG1_LED5':
      return 0x05
    case 'PPG1_LED6':
      return 0x06
    case 'PPG2_LED1':
      return 0x07
    case 'PPG2_LED2':
      return 0x08
    case 'PPG2_LED3':
      return 0x09
    case 'PPG2_LED4':
      return 0x0a
    case 'PPG2_LED5':
      return 0x0b
    case 'PPG2_LED6':
      return 0x0c
    case 'PPF1_LED1':
      return 0x0d
    case 'PPF1_LED2':
      return 0x0e
    case 'PPF1_LED3':
      return 0x0f
    case 'PPF2_LED1':
      return 0x13
    case 'PPF2_LED2':
      return 0x14
    case 'PPF2_LED3':
      return 0x15
    case 'PROX1':
      return 0x19
    case 'PROX2':
      return 0x1a
    default:
      throw new Error('non-value tag name')
  }
}

/**
 * {
 *    name: 'PPG1_LED1',
 *    tag: 0x0001,
 *    array: [],
 *    plotIndex: 0,
 * }
 */

class Max86141ViewData {
  constructor ({ samplesInChart, clearAhead, filters, taglist }) {
    this.samplesInChart = samplesInChart || 600
    this.clearAhead = clearAhead || 100
    this.filters = Array.isArray(filters) || []
    this.offlineArray = taglist.map(name => ({
      name,
      tag: fromTagName(name),
      orig: Array(this.samplesInChart).fill(NaN),
      filt: Array(this.samplesInChart).fill(NaN),
      plotIndex: 0,
      lowpass: new Fili.IirFilter(iirCalc.lowpass({
        order: 2,
        characteristic: 'butterworth',
        Fs: 128,
        Fc: 6
      })),
      highpass: new Fili.IirFilter(iirCalc.highpass({
        order: 1,
        characteristic: 'butterworth',
        Fs: 128,
        Fc: 0.5
      }))
    }))
  }

  reset () {
    this.offlineArray.forEach(offline => {
      offline.orig = Array(this.samplesInChart).fill(NaN)
      offline.filt = Array(this.samplesInChart).fill(NaN)
      offline.plotIndex = 0
    })
  }

  modulo (n) {
    return (n % this.samplesInChart)
  }

  createViewData (parsed = {}) {
    const { brief, samples } = parsed
    const tags = this.offlineArray.map(o => o.tag)
    const filed = tags.map(tag => samples.filter(sample => tag === sample.tag).map(sample => sample.val))
    return { brief, samples, filed }
  }

  appendFilteredData (viewdata) {
    const { filed } = viewdata
    viewdata.filtered = filed.map((samples, index) => {
      const highpass = this.offlineArray[index].highpass
      const lowpass = this.offlineArray[index].lowpass
      const filtered = lowpass.multiStep(highpass.multiStep(samples))
      return filtered
    })
  }

  fillOfflineArray (viewdata) {
    // for (let i = 0; i < viewdata.brief.numOfSamples; i++) {
    //   const sample = viewdata.samples[i]
    //   const x = this.offlineArray.find(x => x.tag === sample.tag)
    //   if (x) {
    //     x.orig[x.plotIndex] = sample.val
    //     x.orig[this.modulo(x.plotIndex + this.clearAhead)] = NaN
    //     x.plotIndex = this.modulo(x.plotIndex + 1)
    //   }
    // }

    const length = viewdata.filed[0].length

    this.offlineArray.forEach((o, index) => {
      for (let i = 0; i < length; i++) {
        o.orig[o.plotIndex] = viewdata.filed[index][i]
        o.orig[this.modulo(o.plotIndex + this.clearAhead)] = NaN
        o.filt[o.plotIndex] = viewdata.filtered[index][i]
        o.filt[this.modulo(o.plotIndex + this.clearAhead)] = NaN
        o.plotIndex = this.modulo(o.plotIndex + 1)
      }
    })
  }

  appendTypedArray (viewdata) {
    viewdata.origs = []
    viewdata.filts = []
    this.offlineArray.forEach(o => {
      const data = new Float32Array(this.samplesInChart * 2)
      for (let i = 0; i < this.samplesInChart; i++) {
        data[i * 2] = i
        data[i * 2 + 1] = o.orig[i]
      }
      viewdata.origs.push(data)

      const tada = new Float32Array(this.samplesInChart * 2)
      for (let i = 0; i < this.samplesInChart; i++) {
        tada[i * 2] = i
        tada[i * 2 + 1] = o.filt[i]
      }
      viewdata.filts.push(tada)
    })
  }

  build (parsed) {
    const viewdata = this.createViewData(parsed)
    this.appendFilteredData(viewdata)
    this.fillOfflineArray(viewdata)
    this.appendTypedArray(viewdata)
    return viewdata
  }
}

const createMax86141ViewData = (opt) => new Max86141ViewData(opt)

export default createMax86141ViewData
