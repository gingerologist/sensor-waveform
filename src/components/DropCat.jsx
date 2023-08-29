import * as React from 'react'
import {
  Dropdown,
  makeStyles,
  Option,
  shorthands,
  useId
} from '@fluentui/react-components'

const useStyles = makeStyles({
  root: {
    // Stack the label above the field with a gap
    display: 'grid',
    gridTemplateRows: 'repeat(1fr)',
    justifyItems: 'start',
    ...shorthands.gap('2px'),
    minWidth: '100px',
    width: '100px',
    maxWidth: '100px'
  }
})

export const DropCat = (props) => {
  const dropdownId = useId('dropdown-default')
  const options = [
    'Cat',
    'Caterpillar',
    'Corgi',
    'Chupacabra',
    'Dog',
    'Ferret',
    'Fish',
    'Fox',
    'Hamster',
    'Snake'
  ]
  const styles = useStyles()
  return (
    <div className={styles.root}>
      <Dropdown
        aria-labelledby={dropdownId}
        placeholder="Select an animal"
        // style={{ minWidth: 100, width: 100 }}
        {...props}
      >
        {options.map((option) => (
          <Option key={option} disabled={option === 'Ferret'}>
            {option}
          </Option>
        ))}
      </Dropdown>
    </div>
  )
}
