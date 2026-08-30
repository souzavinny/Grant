// Wallet connection + browser providers for Grant.
//
// Finds any Midnight wallet implementing DApp connector API 4.x
// (Lace, Gero, 1AM…), connects it, and assembles the AgentPassProviders the
// contract layer needs: the wallet balances/signs/submits every transaction
// and supplies the network endpoints; ZK keys are fetched from this page's
// own origin; private state lives in-memory in this tab.
//
// Proving is delegated to the wallet's embedded prover when the connector
// exposes getProvingProvider (1AM bundles one, so no proof server is needed);
// wallets that only advertise the deprecated proverServerUri fall back to the
// HTTP proof-server client.
//
// Ported from the official example-bboard browser manager (Apache-2.0).
//
// SPDX-License-Identifier: Apache-2.0

import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { catchError, concatMap, filter, firstValueFrom, interval, map, take, tap, throwError, timeout } from 'rxjs';
import { pipe as fnPipe } from 'fp-ts/function';
import { type Logger } from 'pino';
import { ConnectedAPI, type InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import semver from 'semver';
import {
  Binding,
  FinalizedTransaction,
  Proof,
  SignatureEnabled,
  Transaction,
  TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { createProofProvider } from '@midnight-ntwrk/midnight-js-types';
import type { KeyMaterialProvider, ProofProvider, UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import type { AgentPassPrivateState } from 'agentpass-contract';
import type { AgentPassCircuitKeys, AgentPassPrivateStateId, AgentPassProviders } from '../../../api/src/index';
import { inMemoryPrivateStateProvider } from '../in-memory-private-state-provider';

const COMPATIBLE_CONNECTOR_API_VERSION = '4.x';

const getFirstCompatibleWallet = (): InitialAPI | undefined => {
  if (!window.midnight) return undefined;
  return Object.values(window.midnight).find(
    (wallet): wallet is InitialAPI =>
      !!wallet &&
      typeof wallet === 'object' &&
      'apiVersion' in wallet &&
      semver.satisfies(wallet.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION),
  );
};

/** Waits for a compatible wallet extension and asks it to authorize this app. */
export const connectToWallet = (logger: Logger, networkId: string): Promise<ConnectedAPI> => {
  return firstValueFrom(
    fnPipe(
      interval(100),
      map(() => getFirstCompatibleWallet()),
      tap((connectorAPI) => {
        logger.info(connectorAPI, 'Check for wallet connector API');
      }),
      filter((connectorAPI): connectorAPI is InitialAPI => !!connectorAPI),
      take(1),
      timeout({
        first: 3_000,
        with: () =>
          throwError(() => new Error('No Midnight wallet found. Install Lace (or Gero / 1AM) and reload this page.')),
      }),
      concatMap(async (initialAPI) => {
        const connectedAPI = await initialAPI.connect(networkId);
        const connectionStatus = await connectedAPI.getConnectionStatus();
        logger.info(connectionStatus, 'Wallet connector API enabled status');
        return connectedAPI;
      }),
      timeout({
        first: 60_000,
        with: () =>
          throwError(
            () => new Error('The wallet did not respond. Open the extension and approve the connection request.'),
          ),
      }),
      catchError((error, apis) =>
        error ? throwError(() => (error instanceof Error ? error : new Error('Wallet authorization failed'))) : apis,
      ),
    ),
  );
};

/**
 * Picks the proving path: the wallet's embedded prover when the connector
 * offers one, otherwise the deprecated proof-server URI it advertises.
 */
const selectProofProvider = async (
  logger: Logger,
  connectedAPI: ConnectedAPI,
  zkConfigProvider: FetchZkConfigProvider<AgentPassCircuitKeys>,
  proverServerUri: string | undefined,
): Promise<ProofProvider> => {
  if (typeof connectedAPI.getProvingProvider === 'function') {
    try {
      const keyMaterial: KeyMaterialProvider = {
        getZKIR: (location: string) => zkConfigProvider.getZKIR(location as AgentPassCircuitKeys),
        getProverKey: (location: string) => zkConfigProvider.getProverKey(location as AgentPassCircuitKeys),
        getVerifierKey: (location: string) => zkConfigProvider.getVerifierKey(location as AgentPassCircuitKeys),
      };
      const walletProver = await connectedAPI.getProvingProvider(keyMaterial);
      logger.info('Proving delegated to the wallet (embedded prover) — no proof server needed');
      return createProofProvider(walletProver);
    } catch (error) {
      logger.warn({ error }, 'Wallet proving provider unavailable; falling back to the proof server');
    }
  }
  if (proverServerUri) {
    logger.info({ proverServerUri }, 'Proving via the proof server advertised by the wallet');
    return httpClientProofProvider(proverServerUri, zkConfigProvider);
  }
  throw new Error(
    'This wallet offers no proving method. Configure a proof server in the wallet, or use a wallet with embedded proving (such as 1AM).',
  );
};

/** Assembles browser-side providers around the connected wallet. */
export const buildProviders = async (logger: Logger, connectedAPI: ConnectedAPI): Promise<AgentPassProviders> => {
  const zkConfigProvider = new FetchZkConfigProvider<AgentPassCircuitKeys>(window.location.origin, fetch.bind(window));
  const config = await connectedAPI.getConfiguration();
  const shieldedAddresses = await connectedAPI.getShieldedAddresses();
  return {
    privateStateProvider: inMemoryPrivateStateProvider<AgentPassPrivateStateId, AgentPassPrivateState>(),
    zkConfigProvider,
    proofProvider: await selectProofProvider(logger, connectedAPI, zkConfigProvider, config.proverServerUri),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey(): string {
        return shieldedAddresses.shieldedCoinPublicKey;
      },
      getEncryptionPublicKey(): string {
        return shieldedAddresses.shieldedEncryptionPublicKey;
      },
      balanceTx: async (tx: UnboundTransaction, ttl?: Date): Promise<FinalizedTransaction> => {
        logger.info({ ttl }, 'Balancing transaction via wallet');
        const serializedTx = toHex(tx.serialize());
        const received = await connectedAPI.balanceUnsealedTransaction(serializedTx);
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          'signature',
          'proof',
          'binding',
          fromHex(received.tx),
        );
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        await connectedAPI.submitTransaction(toHex(tx.serialize()));
        const txIdentifiers = tx.identifiers();
        logger.info({ txIdentifiers }, 'Submitted transaction via wallet');
        return txIdentifiers[0];
      },
    },
  };
};
