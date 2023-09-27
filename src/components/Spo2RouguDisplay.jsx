import * as React from 'react'
import { tokens } from '@fluentui/react-theme'

const Spo2RouguDisplay = ({ spo, hr }) => {
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
          {spo === 0 ? '--.-' : spo.toFixed(1)}
        </div>
        <div style={{ flex: '19%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          %
        </div>
      </div>
      <div style={{ height: 24 }} />

      <div style={{ height: 1, backgroundColor: 'white' }} />

      <div style={{ display: 'flex', height: 48 }}>
        <div style={{ flex: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          HEART RATE
        </div>
      </div>
      <div style={{ display: 'flex', height: 96 }}>
        <div style={{ flex: '19%' }} />
        <div style={{ flex: '62%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: tokens.fontSizeHero900, fontFamily: tokens.fontFamilyNumeric }}>
          {hr === 0 ? '--.-' : hr.toFixed(1)}
        </div>
        <div style={{ flex: '19%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          BPM
        </div>
      </div>
      <div style={{ height: 24 }} />
    </div>
  )
}

export default Spo2RouguDisplay
