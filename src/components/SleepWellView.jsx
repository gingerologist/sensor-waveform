import * as React from 'react'
import { Label, Input, Text, makeStyles } from '@fluentui/react-components'
import ReactECharts from 'echarts-for-react'

const Something = () => {
  return (
  <div>
    <Label style={{ marginLeft: '10%' }}>Generial ADC (Original)</Label>
    <ReactECharts style={{ minWidth: 800, height: 300 }} option={genericAdcOption} />
    <Label style={{ marginLeft: '10%' }}>50Hz Notch Filter</Label>
    <ReactECharts style={{ minWidth: 800, height: 300 }} option={genericAdcIir1Option} />
  </div>
  )
}
