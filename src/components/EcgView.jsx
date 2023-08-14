import * as React from 'react'
import { useState, useEffect } from 'react'

import ReactECharts from 'echarts-for-react'

const ECG_SAMPLE_COUNT = 2000

const initEcgOption = {
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
    data: []
  }]
}

/**
 *
 * @param { data } param0 is array
 * @returns
 */
const EcgView = ({ data }) => {

  let next
  if (data.length === 0) {
    next = []
  } else {
    const curr = ecgOption.series[0].data
    const start = curr.length ? curr.at(-1)[0] : 0
    const concat = [...curr, ...data.map((y, idx) => [start + idx, y])]
    next = concat.length > ECG_SAMPLE_COUNT ? concat.slice(concat.length - ECG_SAMPLE_COUNT) : concat
  }

  // setEcgOption({ series: [{ data: [] }] })

  return (
    <ReactECharts option={ecgOption} />
  )
}

// EcgView.propTypes = {
//   firstname: PropTypes.string.isRequired
// }

export default EcgView
