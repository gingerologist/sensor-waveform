import * as React from 'react'
import { useState, useEffect, useRef } from 'react'

import {
  Button, Input, makeStyles, Toolbar, ToolbarButton, Caption1, Body1, ToolbarDivider, Divider, shorthands,
  Tab, TabList, SelectTabData, SelectTabEvent, TabValue, Popover, Dropdown, Option, Select,
  PopoverTrigger,
  PopoverSurface,
  Label, Menu, MenuTrigger, MenuList, MenuItem, MenuPopover, Text,
  Accordion, AccordionHeader, AccordionPanel, AccordionItem, ToggleButton, RadioGroup, Radio
} from '@fluentui/react-components'
import {
  FolderOpen24Regular, AlignSpaceFitVertical20Regular, AlignSpaceEvenlyVertical20Regular,
  ArrowSort24Regular, ArrowSortUp24Regular, ArrowSortDown24Regular, ZoomIn24Regular, ZoomOut24Regular, Edit24Regular, Edit24Filled
} from '@fluentui/react-icons'
import { tokens } from '@fluentui/react-theme'

import ReactECharts from 'echarts-for-react'
import StopWatch from './StopWatch'
import EcgDisplay from './EcgDisplay'

import { Transition, CSSTransition } from 'react-transition-group'
import AnimateHeight from 'react-animate-height'

import { shell } from 'electron'

import path from 'node:path'
import process from 'node:process'

const ECG_SAMPLE_COUNT = 2000

const useStyles = makeStyles({

})

const makeChartOpt = (base, data, opt = {}) => {
  const series = [Object.assign({}, base.series[0], { data })]
  return { ...base, series, ...opt }
}

const GRID_RIGHT = 0
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

const chartOpt = (data) => ({ series: [{ data }] })

const Spacer24 = () => (<div style={{ height: 24 }}></div>)
const Spacer96 = () => (<div style={{ height: 96 }}></div>)

const max86141ConfigStyles = makeStyles({
  listbox: {
    maxHeight: '200px'
  }
})

const Max86141ConfigPanel = config => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'left', margin: 16 }}>
      <Divider>Photo Diode</Divider>
      {/* ppg selection */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <RadioGroup layout='horizontal' value='dual' disabled>
          <Radio value='single' label='Single PPG' />
          <Radio value='dual' label='Dual PPG' />
        </RadioGroup>
      </div>

      {/* integration time, adc range */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Label>Integration Time: </Label>
        <Dropdown listbox={{ className: max86141ConfigStyles.listbox }}>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'tint-key-' + opt}>
              {['14.8μS', '29.4μS', '58.7μS', '117.3μS'][opt]}
            </Option>
          ))}
        </Dropdown>
        <Label>PPG1 ADC Range:</Label>
        <Dropdown listbox={{ className: max86141ConfigStyles.listbox }}>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'ppg1-adc-key-' + opt}>
              {[
                '7.8125pA - full scale  4096nA',
                '15.625pA - full scale  8192nA',
                '31.250pA - full scale 16384nA',
                '62.500pA - full scale 32768nA'][opt]}
            </Option>
          ))}
        </Dropdown>
        <Label>PPG2 ADC Range:</Label>
        <Dropdown listbox={{ className: max86141ConfigStyles.listbox }}>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'ppg2-adc-key-' + opt}>
              {[
                '7.8125pA - full scale  4096nA',
                '15.625pA - full scale  8192nA',
                '31.250pA - full scale 16384nA',
                '62.500pA - full scale 32768nA'][opt]}
            </Option>
          ))}
        </Dropdown>
      </div>

      {/* integration time, adc range */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Label>Sampling Rate: </Label>
        <Dropdown listbox={{ className: max86141ConfigStyles.listbox }}>
          { [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13].map(opt => (
            <Option key={'sampling-rate-key-' + opt}>
              {[
                '25Hz', '50Hz', '84Hz', '100Hz', '200Hz', '400Hz', '25Hz (2 pulses per sample)',
                '50Hz (2 pulses per sample)', '84Hz (2 pulses per sample)', '100Hz (2 pulses per sample)',
                '8Hz', '16Hz', '32Hz', '64Hz', '128Hz', '256Hz', '512Hz', '1024Hz', '2048Hz', '4096Hz'
              ][opt]}

            </Option>
          ))}
        </Dropdown>
        <Label>Sample Averaging:</Label>
        <Dropdown listbox={{ className: max86141ConfigStyles.listbox }}>
          { [0, 1, 2, 3, 4, 5, 6, 7].map(opt => (
            <Option key={'tint-key-' + opt}>
              {['1 (no averageing)', '2', '4', '8', '16', '32', '64', '128'][opt]}
            </Option>
          ))}
        </Dropdown>
        <Label>PPG2 ADC Range:</Label>
        <Dropdown>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'tint-key-' + opt}>
              {[
                '7.8125pA - full scale  4096nA',
                '15.625pA - full scale  8192nA',
                '31.250pA - full scale 16384nA',
                '62.500pA - full scale 32768nA'][opt]}
            </Option>
          ))}
        </Dropdown>
      </div>

      {/* */}

    </div>
  )
}

const MagusView = (props) => {
  const [worker, setWorker] = useState(null)

  // const abpConfigPanelRef = useRef(null)
  const [abpConfigPanelHeight, setAbpConfigPanelHeight] = useState(0)

  const [selectedTab, setSelectedTab] = useState('ECG')

  const [ecgRecording, setEcgRecording] = useState(false)
  const [spoRecording, setSpoRecording] = useState(false)
  const [abpRecording, setAbpRecording] = useState(false)

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

  const [abpSamplesInChart, setAbpSamplesInChart] = useState(ABP_DEFAULT_SAMPLES_IN_CHART)

  const [spoIr, setSpoIr] = useState(initSpoOption)
  const [spoRed, setSpoRed] = useState(initSpoOption)
  const [spoIrFilt, setSpoIrFilt] = useState(initSpoOption)
  const [spoRedFilt, setSpoRedFilt] = useState(initSpoOption)
  const [spoIrAc, setSpoIrAc] = useState(initSpoOption)
  const [spoRedAc, setSpoRedAc] = useState(initSpoOption)
  const [spoIrDc, setSpoIrDc] = useState(initSpoOption)
  const [spoRedDc, setSpoRedDc] = useState(initSpoOption)

  const [abpIr1, setAbpIr1] = useState(initAbpOption)
  const [abpIr2, setAbpIr2] = useState(initAbpOption)
  const [abpRed1, setAbpRed1] = useState(initAbpOption)
  const [abpRed2, setAbpRed2] = useState(initAbpOption)
  const [abpGreen1, setAbpGreen1] = useState(initAbpOption)
  const [abpGreen2, setAbpGreen2] = useState(initAbpOption)

  const [abpIr1f, setAbpIr1f] = useState(initAbpOption)
  const [abpIr2f, setAbpIr2f] = useState(initAbpOption)
  const [abpRed1f, setAbpRed1f] = useState(initAbpOption)
  const [abpRed2f, setAbpRed2f] = useState(initAbpOption)
  const [abpGreen1f, setAbpGreen1f] = useState(initAbpOption)
  const [abpGreen2f, setAbpGreen2f] = useState(initAbpOption)

  const [abpConfiguring, setAbpConfiguring] = useState(false)

  const [abpOrder, setApbOrder] = useState([
    'PPG1-IR, Original',
    'PPG2-IR, Original',
    'PPG1-RED, Original',
    'PPG2-RED, Original',
    'PPG1-GREEN, Original',
    'PPG2-GREEN, Original'
  ])

  const abpReorder = (up, index) => {
    if (up) {
      setApbOrder([
        ...abpOrder.slice(0, index - 1),
        abpOrder[index],
        abpOrder[index - 1],
        ...abpOrder.slice(index + 1)
      ])
    } else {
      setApbOrder([
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

    setAbpIr1(opt)
    setAbpIr2(opt)
    setAbpRed1(opt)
    setAbpRed2(opt)
    setAbpGreen1(opt)
    setAbpGreen2(opt)

    setAbpSamplesInChart(newSamplesInChart)

    worker.postMessage({ type: 'max86141-abp-samples-in-chart', samplesInChart: newSamplesInChart })
  }
  // run once
  useEffect(() => {
    const w = new Worker(new URL('../workers/magus-worker.js', import.meta.url))
    w.onmessage = e => {
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
        // setEcgOrig({ series: [{ data: ecgOrigData }] })
        setEcgOrig(makeChartOpt(ecgOptBase, ecgOrigData))
        // setEcgProc({ series: [{ data: ecgProcData }] })
        setEcgProc(makeChartOpt(ecgOptBase, ecgProcData))
        // setEcgNtch({ series: [{ data: ecgNtchData }] })
        setEcgNtch(makeChartOpt(ecgOptBase, ecgNtchData))
        // setEcgNlhp({ series: [{ data: ecgNlhpData }] })
        setEcgNlhp(makeChartOpt(ecgOptBase, ecgNlhpData))
      }
    }

    setWorker(w)

    return () => {
      w.terminate()
      setWorker(null)
    }
  }, [])

  const onTabSelect = (e, data) => setSelectedTab(data.value)

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
        <Spacer24 />
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

        <Divider style={{ marginTop: 48, marginBottom: 48 }} />

        <h1 style={{ marginLeft: GRID_LEFT }}>SPO2</h1>
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
        <Spacer24 />
        <div style={{ display: 'flex' }}>
          {/* <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-around' }}> */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* <div style={{ width: '50%' }}> */}
              <Caption1 style={{ marginLeft: GRID_LEFT }}>IR - Original</Caption1>
              <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={spoIr} />
              {/*
              <Caption1 style={{ marginLeft: 96 }}>IR - 170th order FIR Lowpass, cutoff freq 10Hz</Caption1>
              <ReactECharts style={{ height: 210, width: '100%' }} option={spoIrFilt} />
              <Caption1 style={{ marginLeft: 96 }}>IR, 4th Order Butterworth IIR Bandpass, cutoff freq 0.67Hz ~ 4.5Hz (AC)</Caption1>
              <ReactECharts style={{ height: 210, width: '100%' }} option={spoIrAc} />
              <Caption1 style={{ marginLeft: 96 }}>IR, 6th Order Butterworth IIR Lowpass, cutoff freq 0.67Hz (DC)</Caption1>
              <ReactECharts style={{ height: 210, width: '100%' }} option={spoIrDc} /> */}
            {/* </div> */}
            {/* <div style={{ width: '50%' }}> */}
              <Caption1 style={{ marginLeft: GRID_LEFT }}>RED - Original</Caption1>
              <ReactECharts style={{ height: spoChartHeight, width: '100%' }} option={spoRed} />
              {/*
              <Caption1 style={{ marginLeft: 96 }}>RED - 170th order FIR Lowpass, cutoff freq 10Hz</Caption1>
              <ReactECharts style={{ height: 210, width: '100%' }} option={spoRedFilt} />
              <Caption1 style={{ marginLeft: 96 }}>RED, 4th Order Butterworth IIR Bandpass, cutoff freq 0.67Hz ~ 4.5Hz (AC)</Caption1>
              <ReactECharts style={{ height: 210, width: '100%' }} option={spoRedAc} />
              <Caption1 style={{ marginLeft: 96 }}>IR, 6th Order Butterworth IIR Lowpass, cutoff freq 0.67Hz (DC)</Caption1>
            <ReactECharts style={{ height: 210, width: '100%' }} option={spoRedDc} /> */}
            {/* </div> */}
          </div>
          <div style={{ width: DISPLAY_COLUMN_WIDTH }} />
        </div>

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
              disabled={abpConfiguring}
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
                        <Button icon={<ArrowSortUp24Regular />} disabled={index === 0} appearance="subtle" onClick={() => abpReorder(true, index)}/>
                        <Button icon={<ArrowSortDown24Regular />} disabled={index === arr.length - 1} appearance="subtle" onClick={() => abpReorder(false, index)}/>
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
              checked={abpConfiguring}
              appearance='transparent'
              icon={abpConfiguring ? <Edit24Filled /> : <Edit24Regular />}
              onClick={() => {
                setAbpConfiguring(!abpConfiguring)
                setAbpConfigPanelHeight(!abpConfiguring ? 500 : 0)
              }}
              // disabled={abpRecording}
              disabled={true}
            >
              CONFIGURE
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
            backgroundColor: tokens.colorNeutralBackground4,
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
            {/*
            <div style={{ flex: 1, flexBasis: 0, minWidth: 0 }}>
              <Caption1 style={{ marginLeft: GRID_LEFT }}>PPG1-IR, Original</Caption1>
              <ReactECharts style={{ height: abpChartHeight, width: '100%' }} option={abpIr1} />
            </div>
            <div style={{ flex: 1, flexBasis: 0, minWidth: 0 }}>
              <Caption1 style={{ marginLeft: GRID_LEFT }}>PPG2-IR, Original</Caption1>
              <ReactECharts style={{ height: abpChartHeight, width: '100%' }} option={abpIr2} />
            </div>
            <div style={{ flex: 1, flexBasis: 0, minWidth: 0 }}>
              <Caption1 style={{ marginLeft: GRID_LEFT }}>PPG1-RED, Original</Caption1>
              <ReactECharts style={{ height: abpChartHeight, width: '100%' }} option={abpRed1} />
            </div>
            <div style={{ flex: 1, flexBasis: 0, minWidth: 0 }}>
              <Caption1 style={{ marginLeft: GRID_LEFT }}>PPG2-RED, Original</Caption1>
              <ReactECharts style={{ height: abpChartHeight, width: '100%' }} option={abpRed2} />
            </div>
            <div style={{ flex: 1, flexBasis: 0, minWidth: 0 }}>
              <Caption1 style={{ marginLeft: GRID_LEFT }}>PPG1-GREEN, Original</Caption1>
              <ReactECharts style={{ height: abpChartHeight, width: '100%' }} option={abpGreen1} />
            </div>
            <div style={{ flex: 1, flexBasis: 0, minWidth: 0 }}>
              <Caption1 style={{ marginLeft: GRID_LEFT }}>PPG2-GREEN, Original</Caption1>
              <ReactECharts style={{ height: abpChartHeight, width: '100%' }} option={abpGreen2} />
              </div> */}

            {
              abpOrder.map(name => {
                let option
                switch (name) {
                  case 'PPG1-IR, Original':
                    option = abpIr1
                    break
                  case 'PPG2-IR, Original':
                    option = abpIr2
                    break
                  case 'PPG1-RED, Original':
                    option = abpRed1
                    break
                  case 'PPG2-RED, Original':
                    option = abpRed2
                    break
                  case 'PPG1-GREEN, Original':
                    option = abpGreen1
                    break
                  case 'PPG2-GREEN, Original':
                    option = abpGreen2
                    break
                  default:
                    break
                }
                return (
                  <div key={name} style={{ flex: 1, flexBasis: 0, minWidth: 0 }}>
                    <Caption1 style={{ marginLeft: GRID_LEFT }}>{name}</Caption1>
                    <ReactECharts style={{ height: abpChartHeight, width: '100%' }} option={option} />
                  </div>
                )
              })
            }
          </div>
          <div style={{ width: DISPLAY_COLUMN_WIDTH }} />
        </div>

        <div style={{ height: 240 }} />
      </div>
    </div>
  )
}

export default MagusView
