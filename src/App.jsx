import * as React from 'react'
import '@ionic/react/css/core.css'
import { setupIonicReact } from '@ionic/react'

import MagusView from './components/MagusView'
// import MagusTabs from './components/MagusTabs'

setupIonicReact()

const App = () => <MagusView />

// const App = () => <MagusTabs />

export default App
