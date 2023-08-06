import * as React from 'react'
import { useState, useEffect } from 'react'

import { CommandBar } from '@fluentui/react/lib/CommandBar'
import { Label } from '@fluentui/react/lib/Label'
import { TextField } from '@fluentui/react/lib/TextField'
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog'
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button'
import { ChoiceGroup } from '@fluentui/react/lib/ChoiceGroup'

import ReactECharts from 'echarts-for-react'

const ECG_SAMPLE_COUNT = 2000

const main = window.electronAPI
let handleSerialData = null
let handleSerialConnected = null
let handleSerialDisconnected = null

const register = (event, handler) => {
  switch (event) {
    case 'data':
      handleSerialData = handler
      break
    case 'connected':
      handleSerialConnected = handler
      break
    case 'disconnected':
      handleSerialDisconnected = handler
      break
    default:
      break
  }
}

const unregister = event => register(event, null)

main.on('data', (e, _, data) => handleSerialData && handleSerialData(data))

let ecgOrigCount = 0
let ecgFiltCount = 0
let ecgIir1Count = 0
let ecgIir2Count = 0

const ecgOrig = new Array(ECG_SAMPLE_COUNT).fill(null)
const ecgFilt = new Array(ECG_SAMPLE_COUNT).fill(null)
const ecgIir1 = new Array(ECG_SAMPLE_COUNT).fill(null)
const ecgIir2 = new Array(ECG_SAMPLE_COUNT).fill(null)

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

const initEcgOrigOption = {
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
    ecgOrig
  }]
}

const initEcgFiltOption = {
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
    ecgFilt
  }]
}

const initEcgFirOption = {
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
    ecgIir1
  }]
}

const ConnectDialog = (props) => {
  const { onDismiss, hidden } = props

  /*
   * both sets should be cleared
   */
  const [ports, setPorts] = useState([])
  const [select, setSelect] = useState('')

  const portsListener = (event, err, ports) => {
    if (err) {
      // TODO
    } else {
      setPorts(ports)
    }
  }

  useEffect(() => {
    if (hidden) {
      return () => {}
    }

    main.send('start-polling-ports')
    main.on('ports', portsListener)

    console.log('start polling ports')

    return () => {
      main.off('ports', portsListener)
      main.send('stop-polling-ports')

      console.log('stop polling ports')

      setPorts([])
      setSelect('')
    }
  }, [hidden])

  return (
    <Dialog
      hidden={hidden}
      onDismiss={onDismiss}
      dialogContentProps={{
        type: DialogType.largeHeader,
        title: 'Select a serial port'
      }}
      modalProps={{
        isBlocking: true,
        styles: {
          main: {
            width: 450
          }
        }
      }}
    >
      <div style={{ height: 120 }}>
        <ChoiceGroup
          defaultSelectedKey={ select }
          options={
            ports.map(raw => ({ key: raw.path, text: raw.friendlyName }))
          }
          onChange={(event, value) => {
            setSelect(value.key)
          }}
        />
      </div>
      <DialogFooter>
        <PrimaryButton
          onClick={() => {
            const port = ports.find(port => port.path === select)
            if (port) {
              onDismiss(port)
            }
          }}
          text="Connect"
        />
        <DefaultButton
          onClick={() => onDismiss()}
          text="Cancel"
        />
      </DialogFooter>
    </Dialog>
  )
}

let oneTimeInit = false
const lastHandled = null

const App = () => {
  const [connected, setConnected] = useState(null)
  const [dirPath, setDirPath] = useState('')
  const [connectDialog, setConnectDialog] = useState(false)

  const [ecgOrigOption, setEcgOrigOption] = useState(initEcgOption) // useState(initEcgOrigOption)
  const [ecgFiltOption, setEcgFiltOption] = useState(initEcgOption) //useState(initEcgFiltOption)
  const [ecgIir1Option, setEcgIir1Option] = useState(initEcgOption) //useState(initEcgFirOption)
  const [ecgIir2Option, setEcgIir2Option] = useState(initEcgOption)

  const [heartRate, setHeartRate] = useState(255)

  const [rldStat, setRldStat] = useState(100)
  const [in2pOff, setIn2pOff] = useState(100)
  const [in2nOff, setIn2nOff] = useState(100)

  useEffect(() => {
    console.log('connected effect', connected)
    if (connected && connected.connected) {
      const onDisconnected = (_, port) => {
        console.log('onDisconnected', port)
        const conn = { ...port, connected: false }
        setConnected(conn)
      }

      register('data', parsed => {
        parsed.ecgOrig.forEach((orig, index) => {
          const modulo = ecgOrigCount % ECG_SAMPLE_COUNT
          ecgOrig[modulo] = [modulo, orig]
          const modulo2 = (ecgOrigCount + parsed.brief.numOfSamples) % ECG_SAMPLE_COUNT
          ecgOrig[modulo2] = [modulo2, null]
          ecgOrigCount++
        })

        parsed.ecgFilt.forEach((filt, index) => {
          const modulo = ecgFiltCount % ECG_SAMPLE_COUNT
          ecgFilt[modulo] = [modulo, filt]
          const modulo2 = (ecgFiltCount + parsed.brief.numOfSamples) % ECG_SAMPLE_COUNT
          ecgFilt[modulo2] = [modulo2, null]
          ecgFiltCount++
        })

        parsed.ecgIir1.forEach((iir1, index) => {
          const modulo = ecgIir1Count % ECG_SAMPLE_COUNT
          ecgIir1[modulo] = [modulo, iir1]
          const modulo2 = (ecgIir1Count + parsed.brief.numOfSamples) % ECG_SAMPLE_COUNT
          ecgIir1[modulo2] = [modulo2, null]
          ecgIir1Count++
        })

        parsed.ecgIir2.forEach((iir2, index) => {
          const modulo = ecgIir2Count % ECG_SAMPLE_COUNT
          ecgIir2[modulo] = [modulo, iir2]
          const modulo2 = (ecgIir2Count + parsed.brief.numOfSamples) % ECG_SAMPLE_COUNT
          ecgIir2[modulo2] = [modulo2, null]
          ecgIir2Count++
        })

        setHeartRate(parsed.brief.heartRate)
        setRldStat(parsed.leadOff.rldStat * 2)
        setIn2pOff(parsed.leadOff.in2pOff * 2)
        setIn2nOff(parsed.leadOff.in2nOff * 2)
        setEcgOrigOption({ series: [{ data: ecgOrig, bump: ecgOrigCount }] })
        setEcgFiltOption({ series: [{ data: ecgFilt, bump: ecgFiltCount }] })
        setEcgIir1Option({ series: [{ data: ecgIir1, bump: ecgIir1Count }] })
        setEcgIir2Option({ series: [{ data: ecgIir2, bump: ecgIir2Count }] })
      })

      main.on('disconnected', onDisconnected)

      ecgOrigCount = 0
      ecgOrig.fill(null)
      ecgFiltCount = 0
      ecgFilt.fill(null)
      ecgIir1Count = 0
      ecgIir1.fill(null)
      ecgIir2Count = 0
      ecgIir2.fill(null)
      setEcgOrigOption({ series: [{ data: ecgOrig, bump: ecgOrigCount }] })
      setEcgFiltOption({ series: [{ data: ecgFilt, bump: ecgFiltCount }] })
      setEcgIir1Option({ series: [{ data: ecgIir1, bump: ecgIir1Count }] })
      setEcgIir2Option({ series: [{ data: ecgIir2, bump: ecgIir2Count }] })

      return () => {
        unregister('data', null)
        main.off('disconnected', onDisconnected)
      }
    } else {
      const listener = (_, port) => {
        console.log('connected', port)
        const conn = { ...port, connected: true }
        setConnected(conn)
      }

      main.on('connected', listener)
      return () => main.off('connected', listener)
    }
  }, [connected])

  if (!oneTimeInit) {
    oneTimeInit = true
    main.on('ahola', (_, opt) => {
      console.log('ahola', opt)
      setDirPath(opt.dirPath)
    })

    main.send('aloha')
  }

  const onConnect = () => {
    console.log('connect clicked')
    setConnectDialog(true)
  }

  const connectDisabled = connected && connected.connected

  const disconnectText =
    connected === null
      ? 'Disconnect'
      : connected.connected
        ? 'Disconnect'
        : `${connected.path} Disconnected`

  const disconnectDisabled = !connected || !connected.connected

  const commandBarItems = [
    {
      key: 'connect',
      text: 'Connect',
      cacheKey: 'connectCacheKey',
      iconProps: { iconName: 'PlugConnected' },
      disabled: connectDisabled,
      onClick: onConnect
    },
    {
      key: 'disconnect',
      text: disconnectText,
      cacheKey: 'disconnectCacheKey',
      iconProps: { iconName: 'PlugDisconnected' },
      disabled: disconnectDisabled,
      onClick: () => {
        main.send('disconnect', connected)
      }
    }
  ]

  const commandBarFarItems = [
    {
      key: 'openDir',
      text: 'Open Directory',
      cacheKey: 'openDirectoryCacheKey',
      iconProps: { iconName: 'OpenFolderHorizontal' },
      split: true,
      subMenuProps: {
        items: [
          {
            key: 'changeDir',
            text: 'Change  Directory',
            cacheKey: 'changeDirCacheKey',
            iconProps: {
              iconName: 'FolderHorizontal'
            }
          }
        ]
      }
    }
  ]

  const onDismiss = port => {
    setConnectDialog(false)
    console.log('connecting port', port)
    port && main.send('connect', port)
  }

  return (
    <>
      <CommandBar
        items={commandBarItems}
        farItems={commandBarFarItems}
      />
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', justifyContent: 'flex-start', alignItems: 'stretch', gap: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginLeft: '10%', marginRight: '10%', gap: 60 }}>
            <TextField style={{ width: 100 }} label="Heart Rate" readOnly controlled value={heartRate} suffix='BPM'/>
            <TextField style={{ width: 100 }} label="RL Lead Off" readOnly controlled value={rldStat} suffix='%'/>
            <TextField style={{ width: 100 }} label="LA Lead Off" readOnly controlled value={in2pOff} suffix='%'/>
            <TextField style={{ width: 100 }} label="RA Lead Off" readOnly controlled value={in2nOff} suffix='%'/>
          </div>
          <Label style={{ marginLeft: '10%' }}>Original</Label>
          <ReactECharts style={{ minWidth: 800, height: 192 }} option={ecgOrigOption} />
          <Label style={{ marginLeft: '10%' }}>Processed on MCU (Zhirou Algorithm))</Label>
          <ReactECharts style={{ minWidth: 800, height: 192 }} option={ecgFiltOption} />
          <Label style={{ marginLeft: '10%' }}>IIR Notch Filter (on PC, Experimental)</Label>
          <ReactECharts style={{ minWidth: 800, height: 192 }} option={ecgIir1Option} />
          <Label style={{ marginLeft: '10%' }}>IIR Notch + Lowpass/Highpass Filter (on PC, Experimental)</Label>
          <ReactECharts style={{ minWidth: 800, height: 192 }} option={ecgIir2Option} />
        </div>
      <ConnectDialog
        hidden={!connectDialog}
        onDismiss={onDismiss}
      />
    </>
  )
}

export default App
