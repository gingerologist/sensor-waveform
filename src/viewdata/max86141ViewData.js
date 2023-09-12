const Fili = require('fili')

const iirCalc = new Fili.CalcCascades()
const firCalc = new Fili.FirCoeffs()

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

class Transform {
  constructor (name, samplesInChart) {
    this.name = name
    this.tag = fromTagName(name)
    this.reset(samplesInChart)
  }

  reset (samplesInChart) {
    this.samplesInChart = samplesInChart
    this.orig = Array(this.samplesInChart).fill(0)
    this.filt = Array(this.samplesInChart).fill(0)
    this.ac = Array(this.samplesInChart).fill(0)
    this.dc = Array(this.samplesInChart).fill(0)
    this.absIndex = 0

    // Idoia Badiola Aguirregomezcorta*, Vladimir Blazek, Steffen Leonhardt,
    // Christoph Hoog Antink
    // Learning about reflective PPG for SpO 2
    // determination using Machine Learning
    // First, a Butterworth low-pass filter with a cutoff frequency of 10 Hz,
    // attenuation of 50 dB and 170 th order removes the higher
    // frequencies from the signals
    this.firLowpass1 = new Fili.FirFilter(firCalc.lowpass({
      order: 170,
      Fs: 50,
      Fc: 10,
      Att: 50 // don't know whether this is used at all.
    }))

    // Because the AC part relates to
    // the heart activity, a 4 th order Butterworth band-pass filter with
    // cutoff frequencies 0.67 Hz to 4.5 Hz extracts the AC part of
    // the PPG.
    this.acBandpass = new Fili.IirFilter(iirCalc.bandpass({
      order: 4,
      characteristic: 'butterworth',
      Fs: 50,
      Fc: 2.585, // (0.67 + 4.5) / 2
      BW: 3.83 // (4.5 - 0.67)
    }))

    // Finally, a 6 th order Butterworth low-pass filter
    // isolates the DC part of the PPG signals below 0.67 Hz.
    this.dcLowpass = new Fili.IirFilter(iirCalc.lowpass({
      order: 6,
      characteristic: 'butterworth',
      Fs: 50,
      Fc: 0.67
    }))
  }

  modulo (n) {
    return n % this.samplesInChart
  }

  plotIndex () {
    return this.absIndex % this.samplesInChart
  }

  increment () {
    this.absIndex++
  }

  /**
   * Write data into interal buffers. This function does not clear ahead
   * @param {number[]} orig - raw data from packet parser, the length depends on
   *                          samplesInPacket and how many tags are used.
   */
  write (orig) {
    const filt = this.firLowpass1.multiStep(orig)
    const ac = this.acBandpass.multiStep(filt)
    const dc = this.dcLowpass.multiStep(filt)

    for (let i = 0; i < orig.length; i++) {
      this.orig[this.plotIndex()] = orig[i]
      this.filt[this.plotIndex()] = filt[i]
      this.ac[this.plotIndex()] = ac[i]
      this.dc[this.plotIndex()] = dc[i]
      this.increment()
    }
  }

  toTypedArray (arr, clearAhead) {
    if (!Number.isInteger(clearAhead) || clearAhead < 1) {
      clearAhead = 1
    }

    const data = new Float32Array(arr.length * 2)
    for (let i = 0; i < arr.length; i++) {
      data[i * 2] = i
      data[i * 2 + 1] = arr[i]
    }

    for (let i = 0; i < clearAhead; i++) {
      data[(this.plotIndex() + i) * 2 + 1] = NaN
    }

    return data
  }

  acRms () {
    const sum = this.ac
      .map(x => x * x)
      .reduce((sum, x) => sum + x, 0)
    const avg = sum / this.ac.length
    const rms = Math.sqrt(avg)
    return rms
  }

  dcAvg () {
    return this.dc.reduce((sum, x) => sum + x, 0) / this.dc.length
  }

  viewData (clearAhead) {
    const acRms = this.acRms()
    const dcAvg = this.dcAvg()
    const ratio = acRms / dcAvg
    return {
      orig: this.toTypedArray(this.orig, clearAhead),
      filt: this.toTypedArray(this.filt, clearAhead),
      ac: this.toTypedArray(this.ac, clearAhead),
      dc: this.toTypedArray(this.dc, clearAhead),
      acRms,
      dcAvg,
      ratio
    }
  }
}

class Max86141ViewData {
  constructor ({ samplesInChart, clearAhead, filters, taglist }) {
    this.samplesInChart = samplesInChart || 600
    this.clearAhead = clearAhead || 100
    this.filters = Array.isArray(filters) || []
    this.transforms = taglist.map(name => new Transform(name, this.samplesInChart))
    this.regbuf = Buffer.alloc(0)
  }

  reset (samplesInChart) {
    this.samplesInChart = samplesInChart
    this.transforms.forEach(trans => trans.reset(samplesInChart))
    this.regbuf = Buffer.alloc(0)
  }

  modulo (n) {
    return (n % this.samplesInChart)
  }

  createViewData (parsed = {}) {
    const { brief, samples } = parsed
    const tags = this.transforms.map(o => o.tag)
    const filed = tags.map(tag => samples.filter(sample => tag === sample.tag).map(sample => sample.val))
    return { brief, samples, filed }
  }

  appendFilteredData (viewdata) {
    const { filed } = viewdata

    const filtered = filed.map((samples, index) =>
      this.transforms[index].firLowpass1.multiStep(samples))

    const ac = filtered.map((samples, index) =>
      this.transforms[index].acBandpass.multiStep(samples))

    const dc = filtered.map((samples, index) =>
      this.transforms[index].dcLowpass.multiStep(samples))

    Object.assign(viewdata, { filtered, ac, dc })
  }

  fillOfflineArray (viewdata) {
    const length = viewdata.filed[0].length

    this.transforms.forEach((o, index) => {
      for (let i = 0; i < length; i++) {
        o.orig[o.plotIndex] = viewdata.filed[index][i]
        o.orig[this.modulo(o.plotIndex + this.clearAhead)] = NaN
        o.filt[o.plotIndex] = viewdata.filtered[index][i]
        o.filt[this.modulo(o.plotIndex + this.clearAhead)] = NaN
        o.ac[o.plotIndex] = viewdata.ac[index][i]
        o.ac[this.modulo(o.plotIndex + this.clearAhead)] = NaN
        o.dc[o.plotIndex] = viewdata.dc[index][i]
        o.dc[this.modulo(o.plotIndex + this.clearAhead)] = NaN
        o.plotIndex = this.modulo(o.plotIndex + 1)
      }
    })
  }

  appendTypedArray (viewdata) {
    viewdata.origs = []
    viewdata.filts = []
    viewdata.acs = []
    viewdata.dcs = []
    this.transforms.forEach(o => {
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

      const dat3 = new Float32Array(this.samplesInChart * 2)
      for (let i = 0; i < this.samplesInChart; i++) {
        dat3[i * 2] = i
        dat3[i * 2 + 1] = o.ac[i]
      }
      viewdata.acs.push(dat3)

      const dat4 = new Float32Array(this.samplesInChart * 2)
      for (let i = 0; i < this.samplesInChart; i++) {
        dat4[i * 2] = i
        dat4[i * 2 + 1] = o.dc[i]
      }
      viewdata.dcs.push(dat4)
    })
  }

  // build (parsed) {
  //   const viewdata = this.createViewData(parsed)
  //   this.appendFilteredData(viewdata)
  //   this.fillOfflineArray(viewdata)
  //   this.appendTypedArray(viewdata)
  //   return viewdata
  // }
  build (parsed) {
    const { brief, samples, reg10, reg20 } = parsed

    const viewData = { brief, filed: [], origs: [], filts: [], acs: [], dcs: [], acRms: [], dcAvg: [], ratio: [] }
    this.transforms.forEach(trans => {
      const filed = samples
        .filter(smpl => smpl.tag === trans.tag)
        .map(smpl => smpl.val)
      viewData.filed.push(filed)
      trans.write(filed)
      const { orig, filt, ac, dc, acRms, dcAvg, ratio } = trans.viewData(10)
      viewData.origs.push(orig)
      viewData.filts.push(filt)
      viewData.acs.push(ac)
      viewData.dcs.push(dc)
      viewData.acRms.push(acRms)
      viewData.dcAvg.push(dcAvg)
      viewData.ratio.push(ratio)
    })

    // const reg0d = Buffer.alloc(1)
    // if (Object.prototype.hasOwnProperty.call(brief, 'ppg1') && 
    //   Object.prototype.hasOwnProperty.call(brief, 'ppg2')) {
    //   const val = brief.ppg2 === 0 ?  : 
    // }

    return viewData
  }
}

const createMax86141ViewData = (opt) => new Max86141ViewData(opt)

export default createMax86141ViewData
