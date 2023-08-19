import * as React from 'react'
import { useState, useEffect } from 'react'

import { Input, makeStyles, Toolbar, ToolbarButton, Body1Strong, ToolbarDivider, Divider } from '@fluentui/react-components'
import { FolderOpen20Regular, AlignSpaceFitVertical20Regular, AlignSpaceEvenlyVertical20Regular } from '@fluentui/react-icons'

import ReactECharts from 'echarts-for-react'
import StopWatch from './StopWatch'

import { shell } from 'electron'

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

const initSpoOption = {
  grid: {
    show: true,
    top: 8,
    bottom: 24
  },
  xAxis: {
    type: 'value',
    min: 0,
    max: 300,
    splitNumber: 600 / 25 + 1,
    axisLabel: { show: false },
    axisTick: { show: false },
    animation: false
  },
  yAxis: {
    type: 'value',
    scale: true,
    animation: false
  },

  // https://jsfiddle.net/aqjxko1e/
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

const chartOpt = (data) => ({ series: [{ data }] })

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

  const [spoIr, setSpoIr] = useState(initSpoOption)
  const [spoRed, setSpoRed] = useState(initSpoOption)
  const [spoIrFilt, setSpoIrFilt] = useState(initSpoOption)
  const [spoRedFilt, setSpoRedFilt] = useState(initSpoOption)
  const [spoIrAc, setSpoIrAc] = useState(initSpoOption)
  const [spoRedAc, setSpoRedAc] = useState(initSpoOption)
  const [spoIrDc, setSpoIrDc] = useState(initSpoOption)
  const [spoRedDc, setSpoRedDc] = useState(initSpoOption)

  const [abpIr1, setAbpIr1] = useState(initSpoOption)
  const [abpIr2, setAbpIr2] = useState(initSpoOption)
  const [abpRed1, setAbpRed1] = useState(initSpoOption)
  const [abpRed2, setAbpRed2] = useState(initSpoOption)
  const [abpGreen1, setAbpGreen1] = useState(initSpoOption)
  const [abpGreen2, setAbpGreen2] = useState(initSpoOption)

  const [abpIr1f, setAbpIr1f] = useState(initSpoOption)
  const [abpIr2f, setAbpIr2f] = useState(initSpoOption)
  const [abpRed1f, setAbpRed1f] = useState(initSpoOption)
  const [abpRed2f, setAbpRed2f] = useState(initSpoOption)
  const [abpGreen1f, setAbpGreen1f] = useState(initSpoOption)
  const [abpGreen2f, setAbpGreen2f] = useState(initSpoOption)

  // run once
  useEffect(() => {
    const w = new Worker(new URL('../workers/magus-worker.js', import.meta.url))
    w.onmessage = e => {
      if (e.data.oob) {
        if (e.data.oob === 'ads129x-recording-started') {
          setRecording(true)
        } else if (e.data.oob === 'ads129x-recording-stopped') {
          setRecording(false)
        }
        return
      }

      const { brief } = e.data

      if (brief.sensorId === 1) { // max86141
        if (brief.instanceId === 0) { // spo2
          const [ppg1led1, ppg1led2] = e.data.origs
          const [ppg1led1Filt, ppg1led2Filt] = e.data.filts
          const [ppg1led1Ac, ppg1led2Ac] = e.data.acs
          const [ppg1led1Dc, ppg1led2Dc] = e.data.dcs
          setSpoIr({ series: [{ data: ppg1led1 }] })
          setSpoRed({ series: [{ data: ppg1led2 }] })
          setSpoIrFilt({ series: [{ data: ppg1led1Filt }] })
          setSpoRedFilt({ series: [{ data: ppg1led2Filt }] })
          setSpoIrAc(chartOpt(ppg1led1Ac))
          setSpoRedAc(chartOpt(ppg1led2Ac))
          setSpoIrDc(chartOpt(ppg1led1Dc))
          setSpoRedDc(chartOpt(ppg1led2Dc))
        } else if (brief.instanceId === 1) { // abp
          const [ppg1led1, ppg2led1, ppg1led2, ppg2led2, ppg1led3, ppg2led3] = e.data.origs
          const [ppg1led1f, ppg2led1f, ppg1led2f, ppg2led2f, ppg1led3f, ppg2led3f] = e.data.filts
          setAbpIr1(chartOpt(ppg1led1))
          setAbpIr1f(chartOpt(ppg1led1f))
          setAbpIr2(chartOpt(ppg2led1))
          setAbpIr2f(chartOpt(ppg2led1f))
          setAbpRed1(chartOpt(ppg1led2))
          setAbpRed1f(chartOpt(ppg1led2f))
          setAbpRed2(chartOpt(ppg2led2))
          setAbpRed2f(chartOpt(ppg2led2f))
          setAbpGreen1(chartOpt(ppg1led3))
          setAbpGreen1f(chartOpt(ppg1led3f))
          setAbpGreen2(chartOpt(ppg2led3))
          setAbpGreen2f(chartOpt(ppg2led3f))
        }
      } else if (brief.sensorId === 2) { // ads129x
        const { leadOff, ecgOrigData, ecgProcData, ecgNtchData, ecgNlhpData } = e.data
        setHeartRate(brief.heartRate)
        setIn2pOff(leadOff.in2pOff * 2)
        setIn2nOff(leadOff.in2nOff * 2)
        setEcgOrig({ series: [{ data: ecgOrigData }] })
        setEcgProc({ series: [{ data: ecgProcData }] })
        setEcgNtch({ series: [{ data: ecgNtchData }] })
        setEcgNlhp({ series: [{ data: ecgNlhpData }] })
      }
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
        worker.postMessage({ type: 'ads129x-recording-start' })
      }}
      onStop={() => {
        worker.postMessage({ type: 'ads129x-recording-stop' })
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
      <div style={{ height: 32 }} />
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

      <Divider style={{ marginTop: 48, marginBottom: 48 }}/>

      <div style={{ display: 'flex', marginLeft: '6%', marginRight: '6%' }}>
        <div style={{ flexGrow: 1, flexBasis: 0 }}>
          <center><Body1Strong>SPO2-IR, Original</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={spoIr} />
          <center><Body1Strong>SPO2-IR, Original</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={spoIrFilt} />
          <center><Body1Strong>SPO2-IR, Original</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={spoIrAc} />
          <center><Body1Strong>SPO2-IR, Original</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={spoIrDc} />
        </div>
        <div style={{ flexGrow: 1, flexBasis: 0 }}>
          <center><Body1Strong>SPO2-RED, Filtered</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={spoRed} />
          <center><Body1Strong>SPO2-RED, Filtered</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={spoRedFilt} />
          <center><Body1Strong>SPO2-RED, Filtered</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={spoRedAc} />
          <center><Body1Strong>SPO2-RED, Filtered</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={spoRedDc} />
        </div>
      </div>

      <Divider style={{ marginTop: 48, marginBottom: 48 }}/>

      <div style={{ display: 'flex', marginLeft: '5%', marginRight: '5%', justifyContent: 'space-around' }}>
        <div style={{ width: '30%' }}>
          <center><Body1Strong>PPG1-IR, Original</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={abpIr1} />
          <center><Body1Strong>PPG1-IR, Filtered</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={abpIr1f} />
        </div>
        <div style={{ width: '30%' }}>
          <center><Body1Strong>PPG1-RED, Original</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={abpRed1} />
          <center><Body1Strong>PPG1-RED, Filtered</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={abpRed1f} />
        </div>
        <div style={{ width: '30%' }}>
          <center><Body1Strong>PPG1-GREEN, Original</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={abpGreen1} />
          <center><Body1Strong>PPG1-GREEN, Filtered</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={abpGreen1f} />
        </div>
      </div>

      <div style={{ display: 'flex', marginLeft: '5%', marginRight: '5%', justifyContent: 'space-around' }}>
        <div style={{ width: '30%' }}>
          <center><Body1Strong>PPG2-IR, Original</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={abpIr2} />
          <center><Body1Strong>PPG2-IR, Filtered</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={abpIr2f} />
        </div>
        <div style={{ width: '30%' }}>
          <center><Body1Strong>PPG2-RED, Original</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={abpRed2} />
          <center><Body1Strong>PPG2-RED, Filtered</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={abpRed2f} />
        </div>
        <div style={{ width: '30%' }}>
          <center><Body1Strong>PPG2-GREEN, Original</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={abpGreen2} />
          <center><Body1Strong>PPG2-GREEN, Filtered</Body1Strong></center>
          <ReactECharts style={{ height: 240, width: '100%' }} option={abpGreen2f} />
        </div>
      </div>

      <div style={{ height: 64 }} />
    </div>
    </div>
  )
}

export default MagusView
