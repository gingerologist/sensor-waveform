class EChartOpt {
  constructor (data) {
    this.opt = {
      grid: {
        show: true,
        top: 8,
        bottom: 24
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: ECG_SAMPLE_COUNT,
        splitNumber: ECG_SAMPLE_COUNT / 25 + 1,
        axisLabel: { show: false },
        axisTick: { show: false },
        animation: false
      },
      yAxis: {
        type: 'value',
        scale: true,
        animation: false
      },
      series: [{
        type: 'line',
        lineStyle: { width: 0.5 },
        showSymbol: false,
        dimensions: ['xDim', 'yDim'],
        encode: { x: 'xDim', y: 'yDim' },
        data,
        animation: false
      }]
    }
  }
}
