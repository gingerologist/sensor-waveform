import * as React from 'react'
import { useState } from 'react'
import { tokens } from '@fluentui/react-theme'
import { Switch, Tooltip } from '@fluentui/react-components'

const inRange = (values, min, max) => {
  return values.findIndex(x => x < min || x >= max) === -1
}

const { isArray } = Array
const a = -16.666666
const b = 8.333333
const c = 100

const Spo2Display = ({ acRms, dcAvg, ratio }) => {
  const [filter, setFilter] = useState(true)

  let spo2 = '--.--'

  if (isArray(acRms) && isArray(dcAvg) && isArray(ratio)) {
    if (!filter || (inRange(acRms, 30, 300) && inRange(dcAvg, 200000, 520000))) {
      const r = ratio[1] / ratio[0]
      spo2 = (a * r * r + b * r + c).toFixed(2)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: tokens.colorBrandBackground,
      color: tokens.colorBrandBackgroundInverted,
      border: '1px'
    }}>
      <div style={{ display: 'flex', height: 48 }}>
        <div style={{ flex: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          SPO2
        </div>
      </div>
      <div style={{ display: 'flex', height: 96 }}>
        <div style={{ flex: '19%' }} />
        <div style={{ flex: '62%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: tokens.fontSizeHero900, fontFamily: tokens.fontFamilyNumeric }}>
          {spo2}
        </div>
        <div style={{ flex: '19%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          %
        </div>
      </div>
      <div style={{ display: 'flex', height: 48 }}>
        <div style={{ flex: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          IR
        </div>
        <div style={{ flex: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          RED
        </div>
      </div>
      <div style={{ display: 'flex', height: 48 }}>
        {/* <div style={{ flex: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          AC<sub>RMS</sub>: {Array.isArray(acRms) ? acRms[0].toFixed(2) : ''}
        </div> */}
        {/* <div style={{ flex: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          AC<sub>RMS</sub> : {Array.isArray(acRms) ? acRms[1].toFixed(2) : ''}
        </div> */}
      </div>
      <div style={{ display: 'flex', height: 48 }}>
        {/* <div style={{ flex: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          DC: {Array.isArray(dcAvg) ? dcAvg[0].toFixed(0) : ''}
        </div> */}
        {/* <div style={{ flex: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          DC: {Array.isArray(dcAvg) ? dcAvg[1].toFixed(0) : ''}
        </div> */}
      </div>
      <div style={{ backgroundColor: tokens.colorNeutralBackground1, height: 48, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Tooltip content='The calculated spo2 value is considered "valid" only if the average DCs are in the range of 200,000 to 520,000 and ACs (rms) are in the range of 30 to 300 for both IR and RED signals.'>
          <Switch checked={filter} onChange={() => setFilter(!filter)} label='filter out invalid result'/>
        </Tooltip>
      </div>
    </div>
  )
}

export default Spo2Display
