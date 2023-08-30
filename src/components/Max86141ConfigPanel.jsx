import * as React from 'react'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'

import {
  makeStyles,
  Label, Dropdown, Option, Divider, Input
} from '@fluentui/react-components'

const max86141ConfigStyles = makeStyles({
  listbox: {
    maxHeight: '300px'
  }
})

/**
 * Display and Edit Max86141 Config Panel
 *
 * @component
 */
const Max86141ConfigPanel = ({ data, editing }) => {
  const styles = max86141ConfigStyles()
  const minWidth = 0
  const width = 200

  const [shadow, setShadow] = useState([])
  
  useEffect(() => {
    if (editing === true) {
      setShadow(data)
    } else {
      setShadow([])
    }
  }, [editing])

  return (<div></div>)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'left', margin: 16 }}>
      <Divider>PPG Configuration</Divider>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
        gap: '8px',
        alignItems: 'center'
      }}>
        <Label>0x11</Label>
        <Label>PPG Configuration 1</Label>
        <Label style={{ textAlign: 'right' }}>Integration Time:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'tint-key-' + opt}>
              {['14.8μS', '29.4μS', '58.7μS', '117.3μS'][opt]}
            </Option>
          ))}
        </Dropdown>
        <Label style={{ textAlign: 'right' }}>PPG1 ADC Range:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'ppg1-adc-key-' + opt}>
              {[
                '4096nA (7.8125pA lsb)',
                '8192nA (15.625pA lsb)',
                '16384nA (31.250pA lsb)',
                '32768nA (62.500pA lsb)'][opt]}
            </Option>
          ))}
        </Dropdown>
        <Label style={{ textAlign: 'right' }}>PPG2 ADC Range:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'ppg2-adc-key-' + opt}>
              {[
                '4096nA (7.8125pA lsb)',
                '8192nA (15.625pA lsb)',
                '16384nA (31.250pA lsb)',
                '32768nA (62.500pA lsb)'][opt]}
            </Option>
          ))}
        </Dropdown>

        <Label>0x12</Label>
        <Label>PPG Configuration 2</Label>
        <Label style={{ textAlign: 'right' }}>Sampling Rate:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13].map(opt => (
            <Option key={'sampling-rate-key-' + opt}>
              {[
                '25Hz', '50Hz', '84Hz', '100Hz', '200Hz', '400Hz', '25Hz (2 pulses)',
                '50Hz (2 pulses)', '84Hz (2 pulses)', '100Hz (2 pulses)',
                '8Hz', '16Hz', '32Hz', '64Hz', '128Hz', '256Hz', '512Hz', '1024Hz', '2048Hz', '4096Hz'
              ][opt]}

            </Option>
          ))}
        </Dropdown>
        <Label style={{ textAlign: 'right' }}>Sample Averaging:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3, 4, 5, 6, 7].map(opt => (
            <Option key={'sample-average-key-' + opt}>
              {['1 (no averageing)', '2', '4', '8', '16', '32', '64', '128'][opt]}
            </Option>
          ))}
        </Dropdown>
        <div /><div />

        <Label>0x13</Label>
        <Label>PPG Configuration 3</Label>
        <Label style={{ textAlign: 'right' }}>LED Settling:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'led-settling-time-key-' + opt}>
              {['4.0μS', '6.0μS', '8.0μS', '12.0μS'][opt]}
            </Option>
          ))}
        </Dropdown>
      </div>

      {/* LED Sequence Control Begin */}
      <Divider style={{ marginTop: 24, marginBottom: 8 }}>LED Sequence Control, Pulse Amplitude</Divider>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
        gap: '8px',
        alignItems: 'center'
      }}>
        <Label>0x20</Label>
        <Label>LED Sequence Register 1</Label>
        <Label style={{ textAlign: 'right' }}>LEDC1:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [1, 2, 3, 4, 5, 6, 7].map(opt => (
            <Option key={'led-sequence-1-key-' + opt}>
              {['LED1', 'LED2', 'LED3', 'LED1 + LED2', 'LED1 + LED3', 'LED2 + LED3', 'LED1 + LED2 + LED3'][opt - 1]}
            </Option>
          ))}
        </Dropdown>
        <Label style={{ gridRow: 1, gridColumn: 5, textAlign: 'right' }}>LEDC2:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3, 4, 5, 6, 7].map(opt => (
            <Option key={'led-sequence-2-key-' + opt}>
              {['NONE', 'LED1', 'LED2', 'LED3', 'LED1 + LED2', 'LED1 + LED3', 'LED2 + LED3', 'LED1 + LED2 + LED3'][opt]}
            </Option>
          ))}
        </Dropdown>
        <div /><div />

        <Label style={{ gridRow: 2, gridColumn: 1 }}>0x21</Label>
        <Label>LED Sequence Register 2</Label>
        <Label style={{ textAlign: 'right' }}>LEDC3:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3, 4, 5, 6, 7].map(opt => (
            <Option key={'led-sequence-3-key-' + opt}>
              {['NONE', 'LED1', 'LED2', 'LED3', 'LED1 + LED2', 'LED1 + LED3', 'LED2 + LED3', 'LED1 + LED2 + LED3'][opt]}
            </Option>
          ))}
        </Dropdown>
        <Label style={{ textAlign: 'right' }}>LEDC4:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3, 4, 5, 6, 7].map(opt => (
            <Option key={'led-sequence-3-key-' + opt}>
              {['NONE', 'LED1', 'LED2', 'LED3', 'LED1 + LED2', 'LED1 + LED3', 'LED2 + LED3', 'LED1 + LED2 + LED3'][opt]}
            </Option>
          ))}
        </Dropdown>
        <div /><div />

        <Label>0x22</Label>
        <Label>LED Sequence Register 3</Label>
        <Label style={{ textAlign: 'right' }}>LEDC4:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3, 4, 5, 6, 7].map(opt => (
            <Option key={'led-sequence-3-key-' + opt}>
              {['NONE', 'LED1', 'LED2', 'LED3', 'LED1 + LED2', 'LED1 + LED3', 'LED2 + LED3', 'LED1 + LED2 + LED3'][opt]}
            </Option>
          ))}
        </Dropdown>
        <Label style={{ textAlign: 'right' }}>LEDC5:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3, 4, 5, 6, 7].map(opt => (
            <Option key={'led-sequence-3-key-' + opt}>
              {['NONE', 'LED1', 'LED2', 'LED3', 'LED1 + LED2', 'LED1 + LED3', 'LED2 + LED3', 'LED1 + LED2 + LED3'][opt]}
            </Option>
          ))}
        </Dropdown>
        <div /><div />

        <Label style={{ gridRow: 4 }}>0x23</Label>
        <Label>LED1 PA</Label>
        <Label style={{ textAlign: 'right' }}>LED1_DRV:</Label>
        <Input style={{ minWidth, width }} appearance='underline' type='number' />
        <div /><div /><div /><div />

        <Label style={{ gridRow: 5 }}>0x24</Label>
        <Label>LED2 PA</Label>
        <Label style={{ textAlign: 'right' }}>LED2_DRV:</Label>
        <Input style={{ minWidth, width }} appearance='underline' type='number' />
        <div /><div /><div /><div />

        <Label style={{ gridRow: 6 }}>0x25</Label>
        <Label>LED3 PA</Label>
        <Label style={{ textAlign: 'right' }}>LED3_DRV:</Label>
        <Input style={{ minWidth, width }} appearance='underline' type='number' />
        <div /><div /><div /><div />

        <Label style={{ gridRow: 7 }}>0x26</Label>
        <Label>LED4 PA</Label>
        <Label style={{ textAlign: 'right' }}>LED4_DRV:</Label>
        <Input style={{ minWidth, width }} appearance='underline' type='number' />
        <div /><div /><div /><div />

        <Label style={{ gridRow: 8 }}>0x27</Label>
        <Label>LED5 PA</Label>
        <Label style={{ textAlign: 'right' }}>LED5_DRV:</Label>
        <Input style={{ minWidth, width }} appearance='underline' type='number' />
        <div /><div /><div /><div />

        <Label style={{ gridRow: 9 }}>0x28</Label>
        <Label>LED6 PA</Label>
        <Label style={{ textAlign: 'right' }}>LED6_DRV:</Label>
        <Input style={{ minWidth, width }} appearance='underline' type='number' />
        <div /><div /><div /><div />

        <Label style={{ gridRow: 10 }}>0x29</Label>
        <Label>LED PILOT PA</Label>
        <Label style={{ textAlign: 'right' }}>PILOT_PA:</Label>
        <Input style={{ minWidth, width }} appearance='underline' type='number' />
        <div /><div /><div /><div />

        <Label style={{ gridRow: 11 }}>0x2A</Label>
        <Label>LED Range 1</Label>
        <Label style={{ textAlign: 'right' }}>LED1_RGE:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'led1-range-key-' + opt}>
              {['31mA', '62mA', '93mA', '124mA'][opt]}
            </Option>
          ))}
        </Dropdown>
        <Label style={{ textAlign: 'right' }}>LED2_RGE:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'led2-range-key-' + opt}>
              {['31mA', '62mA', '93mA', '124mA'][opt]}
            </Option>
          ))}
        </Dropdown>
        <Label style={{ textAlign: 'right' }}>LED3_RGE:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'led3-range-key-' + opt}>
              {['31mA', '62mA', '93mA', '124mA'][opt]}
            </Option>
          ))}
        </Dropdown>

        <Label style={{ gridRow: 12 }}>0x2B</Label>
        <Label>LED Range 2</Label>
        <Label style={{ textAlign: 'right' }}>LED4_RGE:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'led1-range-key-' + opt}>
              {['31mA', '62mA', '93mA', '124mA'][opt]}
            </Option>
          ))}
        </Dropdown>
        <Label style={{ textAlign: 'right' }}>LED5_RGE:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'led2-range-key-' + opt}>
              {['31mA', '62mA', '93mA', '124mA'][opt]}
            </Option>
          ))}
        </Dropdown>
        <Label style={{ textAlign: 'right' }}>LED6_RGE:</Label>
        <Dropdown style={{ minWidth, width }} listbox={{ className: styles.listbox }} appearance='underline'>
          { [0, 1, 2, 3].map(opt => (
            <Option key={'led3-range-key-' + opt}>
              {['31mA', '62mA', '93mA', '124mA'][opt]}
            </Option>
          ))}
        </Dropdown>
      </div>
    </div>
  )
}

Max86141ConfigPanel.propTypes = {
  editing: PropTypes.bool
}

Max86141ConfigPanel.defaultProps = {
  editing: false
}

export default Max86141ConfigPanel
