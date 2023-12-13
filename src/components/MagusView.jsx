import * as React from 'react'
import { useState, useEffect } from 'react'

import {
  Button, Toolbar, ToolbarButton, Caption1, Body1, ToolbarDivider, Divider,
  Popover, PopoverTrigger, PopoverSurface, Text, ToggleButton, Switch
} from '@fluentui/react-components'
import {
  FolderOpen24Regular, AlignSpaceFitVertical20Regular, AlignSpaceEvenlyVertical20Regular,
  ArrowSort24Regular, ArrowSortUp24Regular, ArrowSortDown24Regular, ZoomIn24Regular, ZoomOut24Regular, Edit24Regular, Edit24Filled,
  Settings24Regular, Settings24Filled
} from '@fluentui/react-icons'
import { tokens } from '@fluentui/react-theme'

import ReactECharts from 'echarts-for-react'
import StopWatch from './StopWatch'
import EcgDisplay from './EcgDisplay'
import Spo2Display from './Spo2Display'
import Spo2RouguDisplay from './Spo2RouguDisplay'

import { shell } from 'electron'

import path from 'node:path'
import process from 'node:process'
import { IonHeader, IonPage, IonTitle, IonToggle, IonToolbar, IonButtons, IonButton, IonText, IonCard, IonCardHeader, IonCardTitle } from '@ionic/react'

const ECG_SAMPLE_COUNT = 2000

const makeChartOpt = (base, data, opt = {}) => {
  const series = [Object.assign({}, base.series[0], { data })]
  return { ...base, series, ...opt }
}

const GRID_RIGHT = 16
const GRID_LEFT = 96

const DISPLAY_MARGIN_LEFT = 24
const DISPLAY_WIDTH = 240
const DISPLAY_MARGIN_RIGHT = 96
const DISPLAY_COLUMN_WIDTH = DISPLAY_MARGIN_LEFT + DISPLAY_WIDTH + DISPLAY_MARGIN_RIGHT

const CHART_MIN_HEIGHT = 150
const CHART_STEP_HEIGHT = 30
const CHART_MAX_HEIGHT = 720

const ABP_DEFAULT_SAMPLES_IN_CHART = 10240

const buildAbpOption = (data) => {
  return {
    grid: {
      show: true,
      top: 8,
      bottom: 16,
      left: GRID_LEFT,
      right: GRID_RIGHT
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: ABP_DEFAULT_SAMPLES_IN_CHART,
      // splitNumber: 5, not working
      interval: 2048,
      axisLabel: { show: false },
      axisTick: { show: false },
      axisLine: { show: false },
      animation: false
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisTick: { show: false },
      axisLine: { show: false },
      animation: false
    },
    series: [{
      type: 'line',
      lineStyle: { width: 0.5 },
      showSymbol: false,
      dimensions: ['xDim', 'yDim'],
      encode: { x: 'xDim', y: 'yDim' },
      // data: new Uint32Array(0),
      data,
      animation: false
    }]
  }
}

const ecgOptBase = {
  grid: {
    show: true,
    left: GRID_LEFT,
    right: GRID_RIGHT,
    top: 8,
    bottom: 16
  },
  xAxis: {
    type: 'value',
    min: 0,
    max: ECG_SAMPLE_COUNT,
    splitNumber: ECG_SAMPLE_COUNT / 25 + 1,
    axisLabel: { show: false },
    axisTick: { show: false },
    axisLine: { show: false },
    animation: false
  },
  yAxis: {
    type: 'value',
    scale: true,
    // axisLabel: { show: false },
    axisTick: { show: false },
    axisLine: { show: false },
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
    bottom: 16,
    left: GRID_LEFT,
    right: GRID_RIGHT
  },
  xAxis: {
    type: 'value',
    min: 0,
    max: 300,
    splitNumber: 600 / 25 + 1,
    axisLabel: { show: false },
    axisTick: { show: false },
    axisLine: { show: false },
    animation: false
  },
  yAxis: {
    type: 'value',
    scale: true,
    // axisLabel: { show: false },
    axisTick: { show: false },
    axisLine: { show: false },
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

const makeRouguSpoChartOpt = (data, append) => {
  const start = data.length === 0 ? 0 : data[data.length - 1][0] + 1

  if (append) {
    append.reduce((acc, x, i) => {
      acc.push([start + i, x])
      return acc
    }, data)

    while (data.length > 300) {
      data.shift()
    }
  }

  const xmin = data.length === 0 ? 0 : data[0][0]

  return {
    grid: {
      show: true,
      top: 8,
      bottom: 16,
      left: GRID_LEFT,
      right: GRID_RIGHT
    },
    xAxis: {
      type: 'value',
      min: xmin,
      max: xmin + 300,
      splitNumber: 600 / 25 + 1,
      axisLabel: { show: false },
      axisTick: { show: false },
      axisLine: { show: false },
      animation: false
    },
    yAxis: {
      type: 'value',
      scale: true,
      // axisLabel: { show: false },
      axisTick: { show: false },
      axisLine: { show: false },
      animation: false
    },

    // https://jsfiddle.net/aqjxko1e/
    series: [{
      type: 'line',
      lineStyle: { width: 0.5 },
      showSymbol: false,
      dimensions: ['xDim', 'yDim'],
      encode: { x: 'xDim', y: 'yDim' },
      data,
      animation: false
    }],

    bump: start
  }
}

const rouguSpoIrData = []
const rouguSpoRdData = []
const rouguSpoIrFiltData = []
const rouguSpoRdFiltData = []

const initRouguSpoIrChartOpt = makeRouguSpoChartOpt(rouguSpoIrData)
const initRouguSpoRdChartOpt = makeRouguSpoChartOpt(rouguSpoRdData)
const initRouguSpoIrFiltChartOpt = makeRouguSpoChartOpt(rouguSpoIrFiltData)
const initRouguSpoRdFiltChartOpt = makeRouguSpoChartOpt(rouguSpoRdFiltData)

const tempChartInitOption = {
  grid: {
    show: true,
    left: GRID_LEFT,
    right: GRID_RIGHT,
    top: 64,
    bottom: 24
  },
  legend: { show: true },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'value',
    minInterval: 60
  },
  yAxis: {
    type: 'value',
    min: 15,
    max: 45
  },
  series: []
}

const chartOpt = (data) => ({ series: [{ data }] })

const Spacer24 = () => (<div style={{ height: 24 }}></div>)
// const Spacer96 = () => (<div style={{ height: 96 }}></div>)

const worker = new Worker(new URL('../workers/magus-worker.js', import.meta.url))

const dummy = new Uint32Array(0)

const MagusView = (props) => {

  const [ecgRecording, setEcgRecording] = useState(false)
  const [spoRecording, setSpoRecording] = useState(false)
  const [abpRecording, setAbpRecording] = useState(false)
  const [tempRecording, setTempRecording] = useState(false)

  const [heartRate, setHeartRate] = useState(255)
  const [in2pOff, setIn2pOff] = useState(100)
  const [in2nOff, setIn2nOff] = useState(100)
  const [ecgOrig, setEcgOrig] = useState(ecgOptBase)
  const [ecgProc, setEcgProc] = useState(ecgOptBase)
  const [ecgNtch, setEcgNtch] = useState(ecgOptBase)
  const [ecgNlhp, setEcgNlhp] = useState(ecgOptBase)

  const [ecgChartHeight, setEcgChartHeight] = useState(300)
  const [spoChartHeight, setSpoChartHeight] = useState(300)
  const [abpChartHeight, setAbpChartHeight] = useState(300)
  const [tempChartHeight, setTempChartHeight] = useState(600)

  const [spoIr, setSpoIr] = useState(initSpoOption)
  const [spoRed, setSpoRed] = useState(initSpoOption)
  const [spoIrFilt, setSpoIrFilt] = useState(initSpoOption)
  const [spoRedFilt, setSpoRedFilt] = useState(initSpoOption)
  const [spoIrAc, setSpoIrAc] = useState(initSpoOption)
  const [spoRedAc, setSpoRedAc] = useState(initSpoOption)
  const [spoIrDc, setSpoIrDc] = useState(initSpoOption)
  const [spoRedDc, setSpoRedDc] = useState(initSpoOption)

  const [spoOutput, setSpoOutput] = useState({})

  const [rouguSpoIr, setRouguSpoIr] = useState(initRouguSpoIrChartOpt)
  const [rouguSpoRd, setRouguSpoRd] = useState(initRouguSpoRdChartOpt)
  const [rouguSpoIrFilt, setRouguSpoIrFilt] = useState(initRouguSpoIrFiltChartOpt)
  const [rouguSpoRdFilt, setRouguSpoRdFilt] = useState(initRouguSpoRdFiltChartOpt)
  const [rouguSpo, setRouguSpo] = useState(0)
  const [rouguHr, setRouguHr] = useState(0)

  const [abpOrigs, setAbpOrigs] = useState([dummy, dummy])

  const [tempChartOption, setTempChartOption] = useState(tempChartInitOption)

  // run once
  useEffect(() => {
    // const w = new Worker(new URL('../workers/magus-worker.js', import.meta.url))
    worker.onmessage = e => {
      if (e.data.oob) {
        if (e.data.oob === 'ads129x-recording-started') {
          setEcgRecording(true)
        } else if (e.data.oob === 'ads129x-recording-stopped') {
          setEcgRecording(false)
        } else if (e.data.oob === 'max86141-spo-recording-started') {
          setSpoRecording(true)
        } else if (e.data.oob === 'max86141-spo-recording-stopped') {
          setSpoRecording(false)
        } else if (e.data.oob === 'max86141-abp-recording-started') {
          console.log('max86141-abp-recording-started')
          setAbpRecording(true)
        } else if (e.data.oob === 'max86141-abp-recording-stopped') {
          setAbpRecording(false)
        } else if (e.data.oob === 'm601z-recording-started') {
          setTempRecording(true)
        } else if (e.data.oob === 'm601z-recording-stopped') {
          setTempRecording(false)
        }
        return
      }

      const { brief } = e.data

      if (brief.sensorId === 1) { // max86141
        if (brief.instanceId === 0) { // spo2
          const { acRms, dcAvg, ratio, rougu } = e.data
          setSpoOutput({ acRms, dcAvg, ratio })

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

          if (rougu) {
            setRouguSpoIr(makeRouguSpoChartOpt(rouguSpoIrData, rougu.ir))
            setRouguSpoRd(makeRouguSpoChartOpt(rouguSpoRdData, rougu.rd))
            setRouguSpoIrFilt(makeRouguSpoChartOpt(rouguSpoIrFiltData, rougu.irFilt))
            setRouguSpoRdFilt(makeRouguSpoChartOpt(rouguSpoRdFiltData, rougu.rdFilt))
            setRouguSpo(rougu.spo.reduce((sum, v) => sum + v, 0) / rougu.spo.length)
            setRouguHr(rougu.hr.reduce((sum, v) => sum + v, 0) / rougu.hr.length)
          }
        } else if (brief.instanceId === 1) { // abp
          const { origs } = e.data
          setAbpOrigs([origs[0], origs[1]])
        }
      } else if (brief.sensorId === 2) { // ads129x
        const { leadOff, ecgOrigData, ecgProcData, ecgNtchData, ecgNlhpData } = e.data
        setHeartRate(brief.heartRate)
        setIn2pOff(leadOff.in2pOff * 2)
        setIn2nOff(leadOff.in2nOff * 2)

        setEcgOrig(makeChartOpt(ecgOptBase, ecgOrigData))
        setEcgProc(makeChartOpt(ecgOptBase, ecgProcData))
        setEcgNtch(makeChartOpt(ecgOptBase, ecgNtchData))
        setEcgNlhp(makeChartOpt(ecgOptBase, ecgNlhpData))
      } else if (brief.sensorId === 4) { // m601z
        const { idTemps, count } = e.data

        /**
         * convert old series (object array) to new one
         * 1. find line data, append or create new
         */

        const { series } = tempChartOption

        idTemps.forEach(({ id, temp }) => {
          const line = series.find(x => x.name === id)
          if (line) {
            line.data.push([count * 2, temp])
            if (line.data.length > 1200) {
              line.data.shift()
            }
          } else {
            series.push({
              name: id,
              type: 'line',
              data: [[count * 2, temp]]
            })
          }
        })

        setTempChartOption({ series, count })
      }
    }
  }, [])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar mode="ios">
          <IonTitle>IFET WEARABLE</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => shell.openExternal(path.join(process.cwd(), 'log'))}>Open Data Folder</IonButton>
          </IonButtons>
          {/* <ToolbarButton onClick={() => shell.openExternal(path.join(process.cwd(), 'log'))} icon={<FolderOpen24Regular />} />           */}
        </IonToolbar>
      </IonHeader>
      <div style={{ display: 'flex' }}>

        {/** left nav */}
        <div style={{ width: 160 }}></div>

        <div style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'scroll', overflowX: 'hidden' }}>
          <h1 style={{ marginLeft: GRID_LEFT, marginTop: 48 }}>ECG</h1>

          {/* ECG Toolbar begin */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginRight: DISPLAY_COLUMN_WIDTH }}>
            <Toolbar style={{ backgroundColor: tokens.colorNeutralBackground3, borderRadius: 8 }}>
              <StopWatch
                onStart={() => {
                  worker.postMessage({ type: 'ads129x-recording-start' })
                }}
                onStop={() => {
                  worker.postMessage({ type: 'ads129x-recording-stop' })
                }}
                started={ecgRecording}
              >
                {ecgRecording}
              </StopWatch>
              {/* <ToolbarButton onClick={() => shell.openExternal(path.join(process.cwd(), 'log'))} icon={<FolderOpen24Regular />} />
              <ToolbarDivider /> */}
              <ToolbarButton
                disabled={ecgChartHeight <= CHART_MIN_HEIGHT}
                icon={<AlignSpaceEvenlyVertical20Regular />}
                onClick={() => {
                  setEcgChartHeight(ecgChartHeight - CHART_STEP_HEIGHT)
                }} />
              <ToolbarButton
                disabled={ecgChartHeight >= CHART_MAX_HEIGHT}
                icon={<AlignSpaceFitVertical20Regular />}
                onClick={() => {
                  setEcgChartHeight(ecgChartHeight + CHART_STEP_HEIGHT)
                }} />
            </Toolbar>
          </div>
          {/* ECG Toolbar End */}

          <Spacer24 />

          {/* ECG Chart Begin */}
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Caption1 style={{ marginLeft: GRID_LEFT }}>Original</Caption1>
              <ReactECharts style={{ height: ecgChartHeight }} option={ecgOrig} />
              <Caption1 style={{ marginLeft: GRID_LEFT }}>MCU Processed (Zhirou Algorithm)</Caption1>
              <ReactECharts style={{ height: ecgChartHeight }} option={ecgProc} />
              <Caption1 style={{ marginLeft: GRID_LEFT }}>IIR Notch Filter (on PC, Experimental)</Caption1>
              <ReactECharts style={{ height: ecgChartHeight }} option={ecgNtch} />
              <Caption1 style={{ marginLeft: GRID_LEFT }}>IIR Notch + Lowpass/Highpass Filter (on PC, Experimental)</Caption1>
              <ReactECharts style={{ height: ecgChartHeight }} option={ecgNlhp} />
            </div>
            <div style={{ width: DISPLAY_WIDTH, marginTop: 27, marginLeft: DISPLAY_MARGIN_LEFT, marginRight: DISPLAY_MARGIN_RIGHT }}>
              <EcgDisplay hr={heartRate} la={in2pOff} ra={in2nOff} />
            </div>
          </div>
          {/* ECG Chart End */}

          <Divider style={{ marginTop: 48, marginBottom: 48 }} />

          <h1 style={{ marginLeft: GRID_LEFT }}>SPO2</h1>

          {/* SPO2 Toolbar Begin */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginRight: DISPLAY_COLUMN_WIDTH }}>
            <Toolbar style={{ backgroundColor: tokens.colorNeutralBackground3, borderRadius: 8 }}>
              {/* <StopWatch
                onStart={() => {
                  worker.postMessage({ type: 'max86141-spo-recording-start' })
                }}
                onStop={() => {
                  worker.postMessage({ type: 'max86141-spo-recording-stop' })
                }}
                started={spoRecording}
              >
                {spoRecording}
              </StopWatch> */}
              {/* <Switch label="AUTO RECORDING" checked={spoRecording} onChange={(ev, data) => {
                if (data.checked) {
                  worker.postMessage({ type: 'max86141-spo-recording-start' })
                } else {
                  worker.postMessage({ type: 'max86141-spo-recording-stop' })
                }
              }}/> */}
              {/* <ToolbarDivider /> */}
              {/* <ToolbarButton onClick={() => shell.openExternal(path.join(process.cwd(), 'log'))} icon={<FolderOpen24Regular />} />
              <ToolbarDivider /> */}
              <ToolbarButton
                disabled={spoChartHeight <= CHART_MIN_HEIGHT}
                icon={<AlignSpaceEvenlyVertical20Regular />}
                onClick={() => {
                  setSpoChartHeight(spoChartHeight - CHART_STEP_HEIGHT)
                }} />
              <ToolbarButton
                disabled={spoChartHeight >= CHART_MAX_HEIGHT}
                icon={<AlignSpaceFitVertical20Regular />}
                onClick={() => {
                  setSpoChartHeight(spoChartHeight + CHART_STEP_HEIGHT)
                }} />
            </Toolbar>
          </div>
          {/* SPO2 Toolbar End */}

          <Spacer24 />

          {/* SPO2 Chart Begin */}
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ width: '50%' }}>
                <Caption1 style={{ marginLeft: GRID_LEFT }}>IR - Original</Caption1>
                <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={spoIr} />
                <Caption1 style={{ marginLeft: GRID_LEFT }}>IR - 170th order FIR Lowpass, cutoff freq 10Hz</Caption1>
                <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={spoIrFilt} />
                <Caption1 style={{ marginLeft: GRID_LEFT }}>IR, 4th Order Butterworth IIR Bandpass, cutoff freq 0.67Hz ~ 4.5Hz (AC)</Caption1>
                <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={spoIrAc} />
                <Caption1 style={{ marginLeft: GRID_LEFT }}>IR, 6th Order Butterworth IIR Lowpass, cutoff freq 0.67Hz (DC)</Caption1>
                <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={spoIrDc} />
              </div>
              <div style={{ width: '50%' }}>
                <Caption1 style={{ marginLeft: GRID_LEFT }}>RED - Original</Caption1>
                <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={spoRed} />
                <Caption1 style={{ marginLeft: GRID_LEFT }}>RED - 170th order FIR Lowpass, cutoff freq 10Hz</Caption1>
                <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={spoRedFilt} />
                <Caption1 style={{ marginLeft: GRID_LEFT }}>RED, 4th Order Butterworth IIR Bandpass, cutoff freq 0.67Hz ~ 4.5Hz (AC)</Caption1>
                <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={spoRedAc} />
                <Caption1 style={{ marginLeft: GRID_LEFT }}>RED, 6th Order Butterworth IIR Lowpass, cutoff freq 0.67Hz (DC)</Caption1>
                <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={spoRedDc} />
              </div>
            </div>

            <div style={{ width: DISPLAY_WIDTH, marginTop: 27, marginLeft: DISPLAY_MARGIN_LEFT, marginRight: DISPLAY_MARGIN_RIGHT }}>
              <Spo2Display {...spoOutput} />
            </div>
            {/* <div style={{ width: DISPLAY_COLUMN_WIDTH }} /> */}
          </div>
          {/* SPO2 Chart End */}

          {/* <Divider style={{ marginTop: 48, marginBottom: 48 }} /> */}

          <h3 style={{ marginLeft: GRID_LEFT, color: 'gray' }}>ROUGU</h3>
          {/* SPO2 ROUGU Toolbar Begin */}
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ width: '50%' }}>
                <Caption1 style={{ marginLeft: GRID_LEFT }}>IR - Original</Caption1>
                <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={rouguSpoIr} />
                <Caption1 style={{ marginLeft: GRID_LEFT }}>IR - Filtered</Caption1>
                <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={rouguSpoIrFilt} />
              </div>
              <div style={{ width: '50%' }}>
                <Caption1 style={{ marginLeft: GRID_LEFT }}>Red - Original</Caption1>
                <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={rouguSpoRd} />
                <Caption1 style={{ marginLeft: GRID_LEFT }}>Red - Filtered</Caption1>
                <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={rouguSpoRdFilt} />
              </div>
            </div>
            <div style={{ width: DISPLAY_WIDTH, marginTop: 27, marginLeft: DISPLAY_MARGIN_LEFT, marginRight: DISPLAY_MARGIN_RIGHT }}>
              <Spo2RouguDisplay spo={rouguSpo} hr={rouguHr} />
            </div>
            {/* <div style={{ width: DISPLAY_COLUMN_WIDTH }} /> */}
          </div>
          {/* SPO2 ROUGU Toolbar End */}

          <Spacer24 />

          {/* SPO2 ROUGU Chart Begin */}
          {/* SPO2 ROUGU Chart End */}

          <Divider style={{ marginTop: 48, marginBottom: 48 }} />

          <h1 style={{ marginLeft: GRID_LEFT }}>ABP</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginRight: DISPLAY_COLUMN_WIDTH }}>
            <Toolbar style={{ backgroundColor: tokens.colorNeutralBackground3, borderRadius: 8 }}>
              {/* <Switch label="AUTO RECORDING" checked={abpRecording} onChange={(ev, data) => {
                if (data.checked) {
                  worker.postMessage({ type: 'max86141-abp-recording-start' })
                } else {
                  worker.postMessage({ type: 'max86141-abp-recording-stop' })
                }
              }}/> */}
              {/* <ToolbarDivider /> */}
              {/* <ToolbarButton onClick={() => shell.openExternal(path.join(process.cwd(), 'log'))} icon={<FolderOpen24Regular />} />
              <ToolbarDivider /> */}
              <ToolbarButton
                disabled={abpChartHeight <= CHART_MIN_HEIGHT}
                icon={<AlignSpaceEvenlyVertical20Regular />}
                onClick={() => {
                  setAbpChartHeight(abpChartHeight - CHART_STEP_HEIGHT)
                }} />
              <ToolbarButton
                disabled={abpChartHeight >= CHART_MAX_HEIGHT}
                icon={<AlignSpaceFitVertical20Regular />}
                onClick={() => {
                  setAbpChartHeight(abpChartHeight + CHART_STEP_HEIGHT)
                }} />
            </Toolbar>
          </div>

          <Spacer24 />

          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div key="ABP_PPG1_LEDC1" style={{ flex: 1, flexBasis: 0, minWidth: 0 }}>
                <Caption1 style={{ marginLeft: GRID_LEFT }}>PPG1_LEDC1</Caption1>
                <ReactECharts style={{ height: abpChartHeight }} option={buildAbpOption(abpOrigs[0])} />
              </div>
              <div key="ABP_PPG2_LEDC1" style={{ flex: 1, flexBasis: 0, minWidth: 0 }}>
                <Caption1 style={{ marginLeft: GRID_LEFT }}>PPG1_LEDC1</Caption1>
                <ReactECharts style={{ height: abpChartHeight }} option={buildAbpOption(abpOrigs[1])} />
              </div>

            </div>
            <div style={{ width: DISPLAY_COLUMN_WIDTH }} />
          </div>

          <Divider style={{ marginTop: 48, marginBottom: 48 }} />

          <h1 style={{ marginLeft: GRID_LEFT }}>BODY TEMPERATURES</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginRight: DISPLAY_COLUMN_WIDTH }}>
            <Toolbar style={{ backgroundColor: tokens.colorNeutralBackground3, borderRadius: 8 }}>
              <StopWatch
                onStart={() => {
                  worker.postMessage({ type: 'm601z-recording-start' })
                }}
                onStop={() => {
                  worker.postMessage({ type: 'm601z-recording-stop' })
                }}
                started={tempRecording}
              >
                {tempRecording}
              </StopWatch>
              {/* <ToolbarButton onClick={() => shell.openExternal(path.join(process.cwd(), 'log'))} icon={<FolderOpen24Regular />} />
              <ToolbarDivider /> */}
              <ToolbarButton
                disabled={tempChartHeight <= CHART_MIN_HEIGHT}
                icon={<AlignSpaceEvenlyVertical20Regular />}
                onClick={() => {
                  setTempChartHeight(tempChartHeight - CHART_STEP_HEIGHT)
                }} />
              <ToolbarButton
                disabled={tempChartHeight >= CHART_MAX_HEIGHT}
                icon={<AlignSpaceFitVertical20Regular />}
                onClick={() => {
                  setTempChartHeight(tempChartHeight + CHART_STEP_HEIGHT)
                }} />
            </Toolbar>
          </div>

          <Spacer24 />

          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ReactECharts
                style={{ height: tempChartHeight, width: '100%' }}
                option={tempChartOption}
              />
            </div>
            <div style={{ width: DISPLAY_COLUMN_WIDTH }} />
          </div>

          <div style={{ height: 240 }} />
        </div>
      </div>
    </IonPage>)
}

export default MagusView
