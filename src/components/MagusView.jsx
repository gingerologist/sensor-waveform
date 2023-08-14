import * as React from 'react'
import { useState, useEffect } from 'react'

import { ipcRenderer } from 'electron'

import fs from 'node:fs'

import ReactECharts from 'echarts-for-react'

// this doesn't work
// import { ipcRenderer } from 'electron'

// this doesn't work either
// console.log('==========')
// console.log('MagusView', window.electronAPI)
// console.log('==========')

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
    min: -1,
    scale: true,
    animation: false
  },

  // https://jsfiddle.net/aqjxko1e/
  // series: [{
  //   type: 'line',
  //   lineStyle: { width: 0.5 },
  //   showSymbol: false,
  //   data: []
  // }]
  series: [{
    type: 'line',
    lineStyle: { width: 0.5 },
    showSymbol: false,
    dimensions: ['xDim', 'yDim'],
    encode: { x: 'xDim', y: 'yDim' },
    data: new Uint32Array(0),
    animation: false
  }]
}

/**
 *
 * @param {*} oob something like
 * ```
 * {
 *   type: 'passport',
 *   port: port (message port)
 *   ... otherdata
 * }
 * ```
 */
const handleOob = (oob) => {
  if (oob.type === 'passport') {
    // ipcRenderer.postMessage('passport', null, oob)
    // console.log(oob.ports.map(p => p.port))
    // window.electronAPI.postMessage('passport', oob, oob.ports.map(p => p.port))
    // ipcRenderer.postMessage('passport', oob, oob.ports.map(p => p.port))
    const { port1, port2 } = new MessageChannel()
    // window.postMessage({ message: 'hello' }, '*', [port1])
    const port = oob.ports[0].port
    // console.log(port)
    // ipcRenderer.postMessage('passport', { port: port1 }) // oob, [oob.ports[0].port, oob.ports[1].port])
    ipcRenderer.postMessage('passport', { hello: 'world' }, oob.ports.map(p => p.port))
  }
}

window.onmessage = e => {
  console.log('window.onmessage', e)
  // e.ports[0].postMessage('hello')
}

const MagusView = (props) => {
  let worker = null

  const [ecgOrig, setEcgOrig] = useState(initEcgOption)
  const [ecgProc, setEcgProc] = useState(initEcgOption)
  const [ecgNtch, setEcgNtch] = useState(initEcgOption)
  const [ecgNlhp, setEcgNlhp] = useState(initEcgOption)

  // run once
  useEffect(() => {
    worker = new Worker(new URL('../workers/magus-worker.js', import.meta.url))
    worker.onmessage = e => {
      if (e.data.oob) {
        handleOob(e.data.oob)
        return
      }

      setEcgOrig({
        xAxis: { min: e.data.ecgOrigData[0], max: e.data.ecgOrigData[0] + 2000 },
        series: [{ data: e.data.ecgOrigData }]
      })

      setEcgProc({
        xAxis: { min: e.data.ecgProcData[0], max: e.data.ecgProcData[0] + 2000 },
        series: [{ data: e.data.ecgProcData }]
      })
    }

    return () => {
      worker.terminate()
      worker = null
    }
  }, [])

  // console.log(ecgOrig.series[0].data[0], ecgOrig.series[0].data[1])

  return (
    <div>
      <ReactECharts {...props} option={ecgOrig} />
      <ReactECharts {...props} option={ecgProc} />
    </div>
  )
}

export default MagusView
