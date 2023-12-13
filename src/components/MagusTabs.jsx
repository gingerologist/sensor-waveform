import React from 'react'
import { IonTabs, IonTabBar, IonTabButton, IonRouterOutlet, IonLabel } from '@ionic/react'
import { Route, Redirect } from 'react-router'
import { IonReactRouter, IonReactHashRouter } from '@ionic/react-router'

import MagusEcg from './MagusEcg'

const worker = new Worker(new URL('../workers/magus-worker.js', import.meta.url))

const MagusTabs = () => {
  return (
    <IonReactHashRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Redirect exact path="" to="/ecg" />
          <Redirect exact path="/" to="/ecg" />
          <Route path="/ecg" exact={true}>
            <MagusEcg worker={worker} />
          </Route>
        </IonRouterOutlet>
        <IonTabBar slot="bottom" mode="ios">
          <IonTabButton tab="ecg" href="/ecg">
            <IonLabel>ECG</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactHashRouter>
  )
}

export default MagusTabs
