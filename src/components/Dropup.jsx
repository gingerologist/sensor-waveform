import * as React from 'react'
import {
  Dropdown,
  makeStyles,
  Option,
  OptionGroup,
  shorthands,
  useId
} from '@fluentui/react-components'

import {
  AnimalCat24Filled,
  AnimalDog24Filled,
  AnimalRabbit24Filled,
  AnimalTurtle24Filled,
  FoodFish24Filled,
  CheckboxChecked24Regular
} from '@fluentui/react-icons'

const animalIcons = {
  Cat: AnimalCat24Filled,
  Dog: AnimalDog24Filled,
  Rabbit: AnimalRabbit24Filled,
  Turtle: AnimalTurtle24Filled,
  Fish: FoodFish24Filled
}

const useCustomOptionStyles = makeStyles({
  option: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('5px'),
    width: 80,
    maxWidth: 80,
  },
  icon: {
    ...shorthands.flex(0, 0, 'auto')
  },
  text: {
    ...shorthands.flex(1, 1, 'auto')
  }
})

const CustomOption = (props) => {
  const { animal, ...optionProps } = props
  const Icon = animalIcons[animal]
  const styles = useCustomOptionStyles()
  return (
    <Option
      text={animal}
      className={styles.option}
      checkIcon={<CheckboxChecked24Regular />}
      {...optionProps}
    >
      <Icon className={styles.icon} />
      <span className={styles.text}>{animal}</span>
    </Option>
  )
}

const CustomOptionGroup = (
  props
) => {
  const { label, options, ...optionGroupProps } = props
  const labelSlot = typeof label === 'object' ? label : { children: label }

  return (
    <OptionGroup
      style={{width: 80, maxWidth: 80}}
      label={{ style: { fontStyle: 'italic', width: 100, maxWidth: 100 }, ...labelSlot }}
      {...optionGroupProps}
    >
      {options.map((option) => (
        <CustomOption style={{width: 80, maxWidth: 80}} key={option} animal={option} />
      ))}
    </OptionGroup>
  )
}

const useStyles = makeStyles({
  root: {
    // Stack the label above the field with a gap
    display: 'grid',
    gridTemplateRows: 'repeat(1fr)',
    justifyItems: 'start',
    ...shorthands.gap('2px'),
    width: '100px',
    maxWidth: '100px'
  },
  listbox: {
    width: '100px',
    maxHeight: '200px'
  }
})

export const CustomOptions = (props) => {
  const dropdownId = useId('dropdown')
  const land = ['Cat', 'Dog', 'Rabbit']
  const water = ['Fish', 'Turtle']
  const styles = useStyles()
  return (
    <div style={{width: 80, maxWidth: 80}} className={styles.root}>
      <label id={dropdownId}>Best pet</label>
      <Dropdown
        style={{width: 80, maxWidth: 80}}
        aria-labelledby={dropdownId}
        listbox={{ className: styles.listbox }}
        placeholder="Select an animal"
        {...props}
      >
        <CustomOptionGroup style={{width: 80, maxWidth: 80}} label="Land" options={land} />
        <CustomOptionGroup style={{width: 80, maxWidth: 80}} label="Sea" options={water} />
      </Dropdown>
    </div>
  )
}
