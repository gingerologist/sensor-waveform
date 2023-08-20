import * as React from 'react'
import { tokens } from '@fluentui/react-theme'

const EcgDisplay = ({ hr, la, ra }) => {
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
          HEART RATE
        </div>
      </div>
      <div style={{ display: 'flex', height: 96 }}>
        <div style={{ flex: '19%'}} />
        <div style={{ flex: '62%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: tokens.fontSizeHero900, fontFamily: tokens.fontFamilyNumeric }}>
          {hr}
        </div>
        <div style={{ flex: '19%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          BPM
        </div>
      </div>
      <div style={{ display: 'flex', height: 48 }}>
        <div style={{ flex: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          LA: {la}%
        </div>
        <div style={{ flex: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          RA: {ra}%
        </div>
      </div>
    </div>
  )
}

export default EcgDisplay
