import * as React from 'react'
import { useState, useEffect } from 'react'

import { Label, Input, Button, Text, Divider, makeStyles, Subtitle2, Toolbar, ToolbarButton, Body1Strong, ToolbarDivider } from '@fluentui/react-components'
import { FolderOpen20Regular, AlignSpaceFitVertical20Regular, AlignSpaceEvenlyVertical20Regular } from '@fluentui/react-icons'

import ReactECharts from 'echarts-for-react'
import StopWatch from './StopWatch'

import { ipcRenderer, shell } from 'electron'

import path from 'node:path'
import process from 'node:process'

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
  const [worker, setWorker] = useState(null)
  const [recording, setRecording] = useState(false)
  const [heartRate, setHeartRate] = useState(255)
  const [in2pOff, setIn2pOff] = useState(100)
  const [in2nOff, setIn2nOff] = useState(100)
  const [ecgOrig, setEcgOrig] = useState(initEcgOption)
  const [ecgProc, setEcgProc] = useState(initEcgOption)
  const [ecgNtch, setEcgNtch] = useState(initEcgOption)
  const [ecgNlhp, setEcgNlhp] = useState(initEcgOption)
  const [chartHeight, setChartHeight] = useState(300)

  // run once
  useEffect(() => {
    const w = new Worker(new URL('../workers/magus-worker.js', import.meta.url))
    w.onmessage = e => {
      if (e.data.oob) {
        if (e.data.oob === 'started') {
          setRecording(true)
        } else if (e.data.oob === 'stopped') {
          setRecording(false)
        }
        return
      }

      const { brief, leadOff, ecgOrigData, ecgProcData, ecgNtchData, ecgNlhpData } = e.data

      setHeartRate(brief.heartRate)
      setIn2pOff(leadOff.in2pOff * 2)
      setIn2nOff(leadOff.in2nOff * 2)
      setEcgOrig({ series: [{ data: ecgOrigData }] })
      setEcgProc({ series: [{ data: ecgProcData }] })
      setEcgNtch({ series: [{ data: ecgNtchData }] })
      setEcgNlhp({ series: [{ data: ecgNlhpData }] })
    }
    setWorker(w)

    return () => {
      w.terminate()
      setWorker(null)
    }
  }, [])

  return (
    <div>
    <Toolbar size='medium' style={{ position: 'fixed', right: '11%', top: 4, border: '1px solid blue', borderRadius: '4px', backgroundColor: 'white', zIndex: 100 }}>
    <StopWatch
      onStart={() => {
        worker.postMessage({ type: 'start' })
      }}
      onStop={() => {
        worker.postMessage({ type: 'stop' })
      }}
      started = {recording}
    >
      {recording}
    </StopWatch>
    <ToolbarButton icon={<FolderOpen20Regular />} onClick={() => shell.openExternal(path.join(process.cwd(), 'log'))} />
    <ToolbarDivider />
    <ToolbarButton
      disabled={chartHeight < 200}
      icon={<AlignSpaceEvenlyVertical20Regular />}
      onClick={() => {
        setChartHeight(chartHeight - 30)
      }} />
    <ToolbarButton
      disabled={chartHeight > 600}
      icon={<AlignSpaceFitVertical20Regular />}
      onClick={() => {
        setChartHeight(chartHeight + 30)
      }}/>
  </Toolbar>
    <div style={{ height: '100vh', overflow: 'scroll' }}>
      <div style={{ height: 32}} />
      <div style={{ display: 'flex', justifyContent: 'center', marginLeft: '10%', marginRight: '10%', gap: 30 }}>
        <Input style={{ width: 120 }} contentBefore='HR:' value={heartRate} contentAfter='BPM' readOnly controlled />
        <Input style={{ width: 120 }} contentBefore="LA:" value={in2pOff} contentAfter='%' readOnly controlled />
        <Input style={{ width: 120 }} contentBefore="RA:" value={in2nOff} contentAfter='%' readOnly controlled />
      </div>

      <Body1Strong style={{ marginLeft: '10%' }}>Original</Body1Strong>
      <ReactECharts style={{ height: chartHeight }} option={ecgOrig} />
      <Body1Strong style={{ marginLeft: '10%' }}>MCU Processed (Zhirou Algorithm)</Body1Strong>
      <ReactECharts style={{ height: chartHeight }} option={ecgProc} />
      <Body1Strong style={{ marginLeft: '10%' }}>IIR Notch Filter (on PC, Experimental)</Body1Strong>
      <ReactECharts style={{ height: chartHeight }} option={ecgNtch} />
      <Body1Strong style={{ marginLeft: '10%' }}>IIR Notch + Lowpass/Highpass Filter (on PC, Experimental)</Body1Strong>
      <ReactECharts style={{ height: chartHeight }} option={ecgNlhp} />
    </div>
    </div>
  )
}

export default MagusView
