import * as React from 'react'

import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import './global.css'

import { setupIonicReact, IonApp } from '@ionic/react'

// import './styles/variables.scss'
import MagusView from './components/MagusView'
// import MagusTabs from './components/MagusTabs'

setupIonicReact()

const App = () => (<IonApp><MagusView /></IonApp>)

// const App = () => <MagusTabs />

export default App
