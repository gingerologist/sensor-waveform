/**
 * Stopwatch has one prop, true, false to true transition start the watch, true to false transition stop it
 */
import * as React from 'react'
import { useState, useEffect } from 'react'
import { Button, Label, Spinner, ToolbarButton } from '@fluentui/react-components'
import { ArrowReset24Regular } from '@fluentui/react-icons'

const displayTime = total => {
  const sec = (total % 60)
  const min = Math.floor(total / 60) % 60
  const hour = Math.floor(total / 3600)

  return String(hour).padStart(2, '0') + ':' + String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0')
}

const StopWatch = ({ onStart, onStop, started }) => {
  const [counting, setCounting] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  if ((started === true && counting === false) || (started === false && counting === true && elapsed > 0)) {
    setCounting(started)
  }

  useEffect(() => {
    console.log(`stop watch effect, counting: ${counting}`)
    if (counting) {
      const timer = setInterval(() => {
        setElapsed(elapsed + 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [counting, elapsed])

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <ToolbarButton
        style={{ width: 160 }}
        appearance='primary'
        onClick={() => {
          if (counting) {
            setCounting(false)
            onStop()
          } else {
            setElapsed(0)
            setCounting(true)
            onStart()
          }
        }}>
        {counting ? 'STOP RECORDING' : 'START RECORDING'}
      </ToolbarButton>

      <div style={{ display: 'flex', marginLeft: 16, width: 80, height: 32, alignItems: 'center', justifyContent: 'center' }}>
        <Label><code>{displayTime(elapsed)}</code></Label>
      </div>

      <div style={{ display: 'flex', width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginRight: 8 }}>
      { counting
        ? <Spinner size='tiny'/>
        : <ToolbarButton shape='circular' disabled={counting || !elapsed} onClick={() => setElapsed(0)} icon={<ArrowReset24Regular />} />
      }

        {/* <ToolbarButton disabled={counting || !elapsed} onClick={() => setElapsed(0)} icon={<ArrowReset24Regular />} /> */}
      </div>

    </div>
  )
}

export default StopWatch
