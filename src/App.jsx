import * as React from 'react'
import { useState, useEffect } from 'react'
import {
  makeStyles, Toolbar, ToolbarButton, ToolbarGroup,
  Dialog as NewDialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent, Button
} from '@fluentui/react-components'

import { PlugConnected20Regular, FolderOpen20Regular } from '@fluentui/react-icons'

import MagusView from './components/MagusView'

import path from 'node:path'
import process from 'node:process'
import { shell } from 'electron'

console.log(shell)

const GADC_SAMPLE_COUNT = 2000

let genericAdcCount = 0
let genericAdcIir1Count = 0
let genericAdcIir2Count = 0

const genericAdc = new Array(GADC_SAMPLE_COUNT).map((_, index) => [index, null])
const genericAdcIir1 = new Array(GADC_SAMPLE_COUNT).map((_, index) => [index, null])
const genericAdcIir2 = new Array(GADC_SAMPLE_COUNT).map((_, index) => [index, null])

const initGenericAdcOption = {
  grid: {
    show: true,
    top: 8,
    bottom: 24
  },
  xAxis: {
    type: 'value',
    min: 0,
    max: GADC_SAMPLE_COUNT,
    splitNumber: GADC_SAMPLE_COUNT / 25 + 1,
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

navigator.serial.getPorts()
  .then(ports => console.log(ports))
  .catch(e => console.log(e))

const useStyles = makeStyles({
  toolbar: {
    position: 'fixed',
    top: 0, //
    width: '100%',
    justifyContent: 'space-between'
  }
})

const App = () => {
  const [connected, setConnected] = useState(null)

  const [genericAdcOption, setGenericAdcOption] = useState(initGenericAdcOption)
  const [genericAdcIir1Option, setGenericAdcIir1Option] = useState(initGenericAdcOption)

  useEffect(() => {
    if (connected && connected.connected) {
      register('data', parsed => {
        const handleGenericAdc = () => {
          parsed.adc.forEach((adc, index) => {
            const modulo = genericAdcCount % GADC_SAMPLE_COUNT
            genericAdc[modulo] = [modulo, adc]
            const modulo2 = (genericAdcCount + parsed.brief.numOfSamples) % GADC_SAMPLE_COUNT
            genericAdc[modulo2] = [modulo2, null]
            genericAdcCount++
          })

          setGenericAdcOption({ series: [{ data: genericAdc, bump: genericAdcCount }] })

          parsed.adcIir1.forEach((adc, index) => {
            const modulo = genericAdcIir1Count % GADC_SAMPLE_COUNT
            genericAdcIir1[modulo] = [modulo, adc]
            const modulo2 = (genericAdcIir1Count + parsed.brief.numOfSamples) % GADC_SAMPLE_COUNT
            genericAdcIir1[modulo2] = [modulo2, null]
            genericAdcIir1Count++
          })

          setGenericAdcIir1Option({ series: [{ data: genericAdcIir1, bump: genericAdcIir1Count }] })

          parsed.adcIir2.forEach((adc, index) => {
            const modulo = genericAdcIir2Count % GADC_SAMPLE_COUNT
            genericAdcIir2[modulo] = [modulo, adc]
            const modulo2 = (genericAdcIir2Count + parsed.brief.numOfSamples) % GADC_SAMPLE_COUNT
            genericAdcIir2[modulo2] = [modulo2, null]
            genericAdcIir2Count++
          })
        }

        switch (parsed.brief.sensorId) {
          case 0xfff0:
            handleGenericAdc()
            break
          default:
            break
        }
      })

      genericAdcCount = 0
      genericAdc.fill(null)
      genericAdcIir1Count = 0
      genericAdcIir1.fill(null)
      genericAdcIir2Count = 0
      genericAdcIir2.fill(null)
      setGenericAdcOption({ series: [{ data: genericAdc, bump: genericAdcCount }] })
      setGenericAdcIir1Option({ series: [{ data: genericAdcIir1, bump: genericAdcIir1Count }] })
      // setGenericAdcIir2Option({ series: [{ data: genericAdcIir2, bump: genericAdcIir2Count }] })

      return () => {}
    } else {
      return () => {}
    }
  }, [])

  return (
    <div>
      <Toolbar classname={useStyles().toolbar}>

          <NewDialog>
            <DialogTrigger disableButtonEnhancement>
              <ToolbarButton icon={<PlugConnected20Regular />} disabled={true} onClick={async () => {
                const filters = [{ usbVendorId: 0x1915, usbProductId: 0x521a }]
                try {
                  const port = await navigator.serial.requestPort({ filters })
                  const portInfo = port.getInfo()
                  console.log(portInfo)
                } catch (e) {
                  console.log(e)
                }
              }}>Connect</ToolbarButton>
            </DialogTrigger>
            <DialogSurface>
              <DialogBody>
                <DialogTitle>Dialog title</DialogTitle>
                <DialogContent>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam
                  exercitationem cumque repellendus eaque est dolor eius expedita
                  nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates
                  in natus iure cumque eaque?
                </DialogContent>
                <DialogActions>
                  <DialogTrigger disableButtonEnhancement>
                    <Button appearance="secondary">Close</Button>
                  </DialogTrigger>
                  <Button appearance="primary">Do Something</Button>
                </DialogActions>
              </DialogBody>
            </DialogSurface>
          </NewDialog>

          <ToolbarButton icon={<FolderOpen20Regular />} onClick={() => shell.openExternal(path.join(process.cwd(), 'log'))}>Open Folder</ToolbarButton>

      </Toolbar>

      <div style={{ height: '100vh', overflow: 'scroll' }}>

        <MagusView />
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}

export default App
