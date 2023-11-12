import * as React from 'react'
import { useState, useEffect } from 'react'

import {
  Button, Toolbar, ToolbarButton, Caption1, Body1, ToolbarDivider, Divider,
  Popover, PopoverTrigger, PopoverSurface, Text, ToggleButton
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
import Max86141ConfigPanel from './Max86141ConfigPanel'

import AnimateHeight from 'react-animate-height'

import { shell } from 'electron'

import path from 'node:path'
import process from 'node:process'

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

const ABP_DEFAULT_SAMPLES_IN_CHART = 1000

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
    max: 1024,
    splitNumber: 2048 / 25 + 1,
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

const abpLineDataProps = {
  type: 'line',
  lineStyle: { width: 0.5 },
  showSymbol: false,
  dimensions: ['xDim', 'yDim'],
  encode: { x: 'xDim', y: 'yDim' },
  data: new Uint32Array(0),
  animation: false
}

const initAbpOption = {
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
    splitNumber: ABP_DEFAULT_SAMPLES_IN_CHART / 50 + 1,
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

/**
 * series: [
    {
      name: 'foo',
      type: 'line',
      data: [[1, 2], [2, 3]]
    }, {
      name: 'bar',
      type: 'line',
      data: [[1, 0], [2, 7]]
    }
  ]
 */
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

let abpListInitialized = false

const MagusView = (props) => {
  // const [selectedTab, setSelectedTab] = useState('ECG')

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

  const [abpSamplesInChart, setAbpSamplesInChart] = useState(ABP_DEFAULT_SAMPLES_IN_CHART)

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

  const [abpOrigs, setAbpOrigs] = useState([])

  const [abpConfigPanelHeight, setAbpConfigPanelHeight] = useState(0)
  const [abpConfigShow, setAbpConfigShow] = useState(false)
  const [abpConfigEdit, setAbpConfigEdit] = useState([])

  const [tempChartOption, setTempChartOption] = useState(tempChartInitOption)

  const [abpOrder, setAbpOrder] = useState([])

  const abpReorder = (up, index) => {
    if (up) {
      setAbpOrder([
        ...abpOrder.slice(0, index - 1),
        abpOrder[index],
        abpOrder[index - 1],
        ...abpOrder.slice(index + 1)
      ])
    } else {
      setAbpOrder([
        ...abpOrder.slice(0, index),
        abpOrder[index + 1],
        abpOrder[index],
        ...abpOrder.slice(index + 2)
      ])
    }
  }

  const abpZoom = zoomIn => {
    const newSamplesInChart = zoomIn ? abpSamplesInChart / 2 : abpSamplesInChart * 2
    const opt = {
      xAxis: {
        max: newSamplesInChart,
        splitNumber: newSamplesInChart / 50 + 1
      },
      series: [{
        data: new Uint32Array(0)
      }]
    }

    setAbpOrigs(Object.keys(abpOrigs).reduce((obj, key) => ({ ...obj, [key]: opt }), {}))
    setAbpSamplesInChart(newSamplesInChart)

    worker.postMessage({ type: 'max86141-abp-samples-in-chart', samplesInChart: newSamplesInChart })
  }
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
        if (brief.instanceId === 0 || brief.instanceId === 128) { // spo2
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
          const { tags, origs, filts, acs } = e.data

          // console.log('acs', acs)

          // first set of data is dropped
          if (!abpListInitialized) {
            setAbpOrder(e.data.tags)
            // setAbpOrigs(tags.reduce((obj, tag, index) => ({ ...obj, [tag]: initAbpOption }), {}))
            abpListInitialized = true
          }

          setAbpOrigs(tags.reduce((obj, tag, index) => ({
            ...obj,
            [tag]: Object.assign({}, initAbpOption, {
              series: [Object.assign({}, abpLineDataProps, { data: origs[index] })]
            })
          }), {}))
        }
      } else if (brief.sensorId === 2) { // ads129x
        const { leadOff, ecgOrigData, ecgProcData, ecgNtchData, ecgNlhpData } = e.data
        setHeartRate(brief.heartRate)
        setIn2pOff(leadOff.in2pOff * 2)
        setIn2nOff(leadOff.in2nOff * 2)
        // setEcgOrig({ series: [{ data: ecgOrigData }] })
        setEcgOrig(makeChartOpt(ecgOptBase, ecgOrigData))
        // setEcgProc({ series: [{ data: ecgProcData }] })
        setEcgProc(makeChartOpt(ecgOptBase, ecgProcData))
        // setEcgNtch({ series: [{ data: ecgNtchData }] })
        setEcgNtch(makeChartOpt(ecgOptBase, ecgNtchData))
        // setEcgNlhp({ series: [{ data: ecgNlhpData }] })
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

  // const onTabSelect = (e, data) => setSelectedTab(data.value)

  return (
    <div style={{ display: 'flex' }}>

      {/** left nav */}
      <div style={{ width: 160 }}>
        {/** hide temporarily
        <div style={{ height: 96 }} />
        <TabList style={{ marginLeft: 24, marginTop: 0 }} selectedValue={selectedTab} onTabSelect={onTabSelect} vertical>
          <Tab value="ECG">ECG</Tab>
          <Tab value="SPO">SPO2</Tab>
          <Tab value="ABP">ABP</Tab>
        </TabList> */}
      </div>

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
            <ToolbarButton onClick={() => shell.openExternal(path.join(process.cwd(), 'log'))} icon={<FolderOpen24Regular />} />
            <ToolbarDivider />
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
            <StopWatch
              onStart={() => {
                worker.postMessage({ type: 'max86141-spo-recording-start' })
              }}
              onStop={() => {
                worker.postMessage({ type: 'max86141-spo-recording-stop' })
              }}
              started={spoRecording}
            >
              {spoRecording}
            </StopWatch>
            <ToolbarButton onClick={() => shell.openExternal(path.join(process.cwd(), 'log'))} icon={<FolderOpen24Regular />} />
            <ToolbarDivider />
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
            <StopWatch
              onStart={() => {
                worker.postMessage({ type: 'max86141-abp-recording-start' })
              }}
              onStop={() => {
                worker.postMessage({ type: 'max86141-abp-recording-stop' })
              }}
              started={abpRecording}
              disabled={abpConfigShow}
            >
              {abpRecording}
            </StopWatch>
            <ToolbarButton onClick={() => shell.openExternal(path.join(process.cwd(), 'log'))} icon={<FolderOpen24Regular />} />
            <ToolbarDivider />
            <Popover withArrow>
              <PopoverTrigger disableButtonEnhancement>
                <ToolbarButton icon={<ArrowSort24Regular />} >
                  ORDER
                </ToolbarButton>
              </PopoverTrigger>
              <PopoverSurface>
                {
                  abpOrder.map((name, index, arr) => {
                    return (
                      <div key={name} style={{ display: 'flex', alignItems: 'center' }}>
                        <Body1 style={{ flex: 1, minWidth: 0, marginTop: 8, marginBottom: 8, marginRight: 32 }}>{name}</Body1>
                        <Button icon={<ArrowSortUp24Regular />} disabled={index === 0} appearance="subtle" onClick={() => abpReorder(true, index)} />
                        <Button icon={<ArrowSortDown24Regular />} disabled={index === arr.length - 1} appearance="subtle" onClick={() => abpReorder(false, index)} />
                      </div>
                    )
                  })
                }
              </PopoverSurface>
            </Popover>
            <ToolbarDivider />
            <ToolbarButton icon={<ZoomIn24Regular />} onClick={() => abpZoom(true)} disabled={abpSamplesInChart <= 250} />
            <Text style={{ width: 48 }} align='center'>{abpSamplesInChart}</Text>
            <ToolbarButton icon={<ZoomOut24Regular />} onClick={() => abpZoom(false)} disabled={abpSamplesInChart >= 16000} />
            <ToolbarDivider />
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
            <ToolbarDivider />
            <ToggleButton
              checked={abpConfigShow}
              appearance='transparent'
              icon={abpConfigShow ? <Settings24Filled /> : <Settings24Regular />}
              onClick={() => {
                setAbpConfigShow(!abpConfigShow)
                setAbpConfigPanelHeight(!abpConfigShow ? 900 : 0)
              }}
              // disabled={abpRecording}
              disabled={true}
            >
              SHOW
            </ToggleButton>
            <ToggleButton
              checked={!!abpConfigEdit.length}
              appearance='transparent'
              icon={abpConfigEdit.length ? <Edit24Filled /> : <Edit24Regular />}
              onClick={() => {
                // setAbpConfigEdit(!abpConfigShow)
              }}
              // disabled={abpRecording}
              disabled={true}
            >
              EDIT
            </ToggleButton>
          </Toolbar>
        </div>

        <AnimateHeight
          duration={250}
          height={abpConfigPanelHeight}
          style={{
            marginTop: 8,
            marginLeft: GRID_LEFT,
            marginRight: DISPLAY_COLUMN_WIDTH,
            backgroundColor: tokens.colorNeutralBackground1,
            borderRadius: tokens.borderRadiusMedium,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Max86141ConfigPanel />
        </AnimateHeight>

        <Spacer24 />

        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {
              abpOrder.map(name => (
                  <div key={name} style={{ flex: 1, flexBasis: 0, minWidth: 0 }}>
                    <Caption1 style={{ marginLeft: GRID_LEFT }}>{name}</Caption1>
                    <ReactECharts style={{ height: abpChartHeight }} option={{
                      ...abpOrigs[name],
                      xAxis: {
                        max: abpSamplesInChart,
                        splitNumber: abpSamplesInChart / 50 + 1,
                        type: 'value',
                        min: 0,
                        // max: ABP_DEFAULT_SAMPLES_IN_CHART,
                        // splitNumber: ABP_DEFAULT_SAMPLES_IN_CHART / 50 + 1,
                        axisLabel: { show: false },
                        axisTick: { show: false },
                        axisLine: { show: false },
                        animation: false
                      }
                    }} />
                  </div>
              ))
            }
            {/*
            <div key='abp-original-all' style={{ flex: 1, flexBasis: 0, minWidth: 0 }}>
              <Caption1 style={{ marginLeft: GRID_LEFT }}>ABP (original)</Caption1>
              <ReactECharts style={{ height: abpChartHeight }} option={Object.assign({}, initAbpOption, {
                xAxis: {
                  max: abpSamplesInChart,
                  splitNumber: abpSamplesInChart / 50 + 1,
                  type: 'value',
                  min: 0,
                  // max: ABP_DEFAULT_SAMPLES_IN_CHART,
                  // splitNumber: ABP_DEFAULT_SAMPLES_IN_CHART / 50 + 1,
                  axisLabel: { show: false },
                  axisTick: { show: false },
                  axisLine: { show: false },
                  animation: false
                },

                series: Object.keys(abpOrigs).map(key => {
                  return { ...abpOrigs[key].series[0], name: key }
                }, [])
              })} />
            </div> */}
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
            <ToolbarButton onClick={() => shell.openExternal(path.join(process.cwd(), 'log'))} icon={<FolderOpen24Regular />} />
            <ToolbarDivider />
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
  )
}

export default MagusView
