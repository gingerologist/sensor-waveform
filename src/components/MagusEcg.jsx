import React, { useState, useEffect } from 'react'
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/react'
import ReactECharts from 'echarts-for-react'

const GRID_RIGHT = 16
const GRID_LEFT = 96

const ECG_SAMPLE_COUNT = 2000

const buildOption = data => {
  return 0
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

const makeChartOpt = (base, data, opt = {}) => {
  const series = [Object.assign({}, base.series[0], { data })]
  return { ...base, series, ...opt }
}

const MagusEcg = ({ worker }) => {
  const [ecgRecording, setEcgRecording] = useState(false)
  const [heartRate, setHeartRate] = useState(255)
  const [in2pOff, setIn2pOff] = useState(100)
  const [in2nOff, setIn2nOff] = useState(100)
  const [ecgOrig, setEcgOrig] = useState(ecgOptBase)
  const [ecgProc, setEcgProc] = useState(ecgOptBase)
  const [ecgNtch, setEcgNtch] = useState(ecgOptBase)
  const [ecgNlhp, setEcgNlhp] = useState(ecgOptBase)

  console.log(worker)

  useEffect(() => {
    worker.onmessage = e => {
      const { brief } = e.data
      if (brief.instanceId === 2) {

        const { leadOff, ecgOrigData, ecgProcData, ecgNtchData, ecgNlhpData } = e.data
        setHeartRate(brief.heartRate)
        setIn2pOff(leadOff.in2pOff * 2)
        setIn2nOff(leadOff.in2nOff * 2)

        setEcgOrig(makeChartOpt(ecgOptBase, ecgOrigData))
        setEcgProc(makeChartOpt(ecgOptBase, ecgProcData))
        setEcgNtch(makeChartOpt(ecgOptBase, ecgNtchData))
        setEcgNlhp(makeChartOpt(ecgOptBase, ecgNlhpData))
      }
    }
  }, [])

  return (
    <>
      <IonHeader mode="ios">
        <IonToolbar>
          <IonTitle>ECG</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              Original
            </IonCardTitle>
            <IonCardContent>
              <ReactECharts style={{ height: 300 /* ecgChartHeight */ }} option={ecgOrig} />
            </IonCardContent>
          </IonCardHeader>
        </IonCard>
      </IonContent>
    </>
  )
}

export default MagusEcg
