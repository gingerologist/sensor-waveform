class M601zViewData {
  constructor ({ samplesInChart, clearAhead }) {
    this.samplesInChart = samplesInChart || 100
    this.clearAhead = clearAhead || 2
    this.ids = []
    this.temps = []
    this.x = 0
  }

  build (parsed) {
    const { idTemps } = parsed

    const ids = idTemps.map(x => x.id)
    if (this.ids.join() !== ids.join()) {
      this.ids = ids
      this.temps = Array(ids.length).fill([])
      this.xAxis = []
      for (let i = 0; i < this.samplesInChart; i++) {
        this.xAxis.push(i)
      }
    }

    // rotate xAxis if necessary
    if (this.temps[0].length === this.samplesInChart) {
      this.x++
    }

    const series = []

    for (let i = 0; i < ids.length; i++) {
      this.temps[i].push(idTemps[i].temp)
      if (this.temps[i].length > this.samplesInChart) {
        this.temps[i].shift()
      }

      series.push({
        name: this.ids[i],
        type: 'line',
        stack: 'stack',
        data: this.temps[i].map((t, j) => [this.x + j, t])
      })
    }

    return {
      xAxis: { type: 'value' },
      yAxis: { type: 'value' },
      series
    }
  }
}

const createM601zViewData = (opt) => new M601zViewData(opt)

export default createM601zViewData
