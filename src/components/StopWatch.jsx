/**
 * Stopwatch has one prop, true, false to true transition start the watch, true to false transition stop it
 */
import * as React from 'react'
import { useState, useEffect } from 'react'
import { Button, Divider, Label, Spinner, ToggleButton, ToolbarButton } from '@fluentui/react-components'
import { ArrowReset24Regular, Record24Regular, Record20Regular, RecordStop24Regular, RecordStop20Regular, FolderOpen24Regular } from '@fluentui/react-icons'
import { tokens } from '@fluentui/react-theme'

const displayTime = total => {
  const sec = (total % 60)
  const min = Math.floor(total / 60) % 60
  const hour = Math.floor(total / 3600)

  return String(hour).padStart(2, '0') + ':' + String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0')
}

const StopWatch = ({ onStart, onStop, started, disabled }) => {
  const [counting, setCounting] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // if the other side does not respond, then started remains false (started is xxxRecording in MagusView)
  // and the second clause after one second (elapsed remains 0 in the very first second)
  if ((started === true && counting === false) ||
      (started === false && counting === true && elapsed > 0)) {
    setCounting(started)
  }

  useEffect(() => {
    // console.log(`stop watch effect, counting: ${counting}`)
    if (counting) {
      const timer = setInterval(() => {
        setElapsed(elapsed + 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [counting, elapsed])

  return (
    <>
      <ToggleButton
        size='medium'
        style={{ width: 96 }}
        // appearance={counting ? 'primary' : 'subtle'}
        appearance='transparent'
        checked={counting}
        onClick={() => {
          if (counting) {
            setCounting(false)
            onStop()
          } else {
            setElapsed(0)
            setCounting(true)
            onStart()
          }
        }}
        icon={counting ? <RecordStop20Regular /> : <Record20Regular />}
        disabled={disabled}
      >
        {/* counting ? 'STOP RECORDING' : 'START RECORDING' */}
        RECORD
      </ToggleButton>

      <div style={{
        width: 96,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: tokens.fontFamilyMonospace,
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: counting
          ? tokens.colorBrandForeground1
          : elapsed
            ? 'black'
            : tokens.colorNeutralForegroundDisabled
      }}>
        {displayTime(elapsed)}
      </div>

      <ToolbarButton disabled={disabled || counting || !elapsed} onClick={() => setElapsed(0)} icon={<ArrowReset24Regular />} />

    </>
  )

  // return (
  //   <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid lightgray', borderRadius: 4 }}>
  //     <div style={{ display: 'flex', height: 48, alignItems: 'center', justifyContent: 'center' }}>
  //       RECORD TO FILE
  //     </div>

  //     <Divider />

  //     <div style={{ display: 'flex', alignItems: 'center', height: 48, justifyContent: 'space-around' }}>
  //       <div style={{
  //         flex: 1,
  //         display: 'flex',
  //         alignItems: 'center',
  //         justifyContent: 'center',
  //         font: tokens.fontFamilyMonospace,
  //         fontSize: tokens.fontSizeBase400,
  //         color: counting ? tokens.colorBrandForeground1 : tokens.colorNeutralForegroundDisabled,
  //         onClick: () => !counting && setElapsed(0)
  //       }}>
  //         {displayTime(elapsed)}
  //       </div>

  //       {/* counting
  //         ? <Spinner size='tiny'/>
  //         : <ToolbarButton shape='circular' disabled={counting || !elapsed} onClick={() => setElapsed(0)} icon={<ArrowReset24Regular />} />
  //       */}
  //       <ToolbarButton
  //         onClick={() => {
  //           if (counting) {
  //             setCounting(false)
  //             onStop()
  //           } else {
  //             setElapsed(0)
  //             setCounting(true)
  //             onStart()
  //           }
  //         }}
  //         icon={counting ? <RecordStop24Regular /> : <Record24Regular />}
  //         appearance='transparent' />
  //       <ToolbarButton
  //         onClick={() => {
  //           onOpenFolder && onOpenFolder()
  //         }}
  //         icon={<FolderOpen24Regular /> }
  //         appearance='transparent' />

  //     </div>
  //   </div>
  // )
}

export default StopWatch
