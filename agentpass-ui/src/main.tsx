// Grant — wallet-connected dApp entry point.
// Based on the midnightntwrk/example-bboard template (Apache-2.0).
// SPDX-License-Identifier: Apache-2.0

import './globals';
import './grant.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { setNetworkId, NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import App from './App';
import '@midnight-ntwrk/dapp-connector-api';
import * as pino from 'pino';

const networkId = import.meta.env.VITE_NETWORK_ID as NetworkId;
setNetworkId(networkId);

export const logger = pino.pino({
  level: (import.meta.env.VITE_LOGGING_LEVEL as string) ?? 'info',
});

logger.trace(`networkId = ${networkId}`);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App logger={logger} />
  </React.StrictMode>,
);
