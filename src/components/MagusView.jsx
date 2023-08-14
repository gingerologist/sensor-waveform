import * as React from 'react'
import { useState, useEffect } from 'react'

import { Label, Input, Text, Divider, makeStyles } from '@fluentui/react-components'

import ReactECharts from 'echarts-for-react'

import { ipcRenderer } from 'electron'

const ECG_SAMPLE_COUNT = 2000

const useStyles = makeStyles({

})

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
    // min: -1,
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

const MagusView = (props) => {
  let worker = null

  const [heartRate, setHeartRate] = useState(255)
  const [in2pOff, setIn2pOff] = useState(100)
  const [in2nOff, setIn2nOff] = useState(100)
  const [ecgOrig, setEcgOrig] = useState(initEcgOption)
  const [ecgProc, setEcgProc] = useState(initEcgOption)
  const [ecgNtch, setEcgNtch] = useState(initEcgOption)
  const [ecgNlhp, setEcgNlhp] = useState(initEcgOption)

  // run once
  useEffect(() => {
    worker = new Worker(new URL('../workers/magus-worker.js', import.meta.url))
    worker.onmessage = e => {
      const { brief, leadOff, ecgOrigData, ecgProcData, ecgNtchData, ecgNlhpData } = e.data

      setHeartRate(brief.heartRate)
      setIn2pOff(leadOff.in2pOff * 2)
      setIn2nOff(leadOff.in2nOff * 2)
      setEcgOrig({ series: [{ data: ecgOrigData }] })
      setEcgProc({ series: [{ data: ecgProcData }] })
      setEcgNtch({ series: [{ data: ecgNtchData }] })
      setEcgNlhp({ series: [{ data: ecgNlhpData }] })
    }

    return () => {
      worker.terminate()
      worker = null
    }
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginLeft: '10%', marginRight: '10%', gap: 60 }}>
        <Input style={{ width: 200, textAlign: 'right' }} contentBefore='HR:' value={heartRate} contentAfter='BPM' readOnly controlled />
        <Input style={{ width: 200 }} contentBefore="LA:" value={in2pOff} contentAfter='%' readOnly controlled />
        <Input style={{ width: 200 }} contentBefore="RA:" value={in2nOff} contentAfter='%' readOnly controlled />
      </div>
      <Label style={{ marginLeft: '10%' }}>Original</Label>
      <ReactECharts {...props} option={ecgOrig} />
      <Label style={{ marginLeft: '10%' }}>MCU Processed (Zhirou Algorithm))</Label>
      <ReactECharts {...props} option={ecgProc} />
      <Label style={{ marginLeft: '10%' }}>IIR Notch Filter (on PC, Experimental)</Label>
      <ReactECharts {...props} option={ecgNtch} />
      <Label style={{ marginLeft: '10%' }}>IIR Notch + Lowpass/Highpass Filter (on PC, Experimental)</Label>
      <ReactECharts {...props} option={ecgNlhp} />
    </div>
  )
}

export default MagusView
