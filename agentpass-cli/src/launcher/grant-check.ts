// Grant e2e: multi-agent hiring on a standalone local devnet, asserted.
// Covers the app's core promises: two agents with distinct keys and mandates,
// cross-agent theft impossible, limits enforced at proof time, firing one
// agent locks it out while the other keeps working.
//
// SPDX-License-Identifier: Apache-2.0

import { WebSocket } from 'ws';
import { createLogger } from '../logger-utils.js';
import { StandaloneConfig } from '../config.js';
import { MidnightWalletProvider } from '../midnight-wallet-provider.js';
import { waitForUnshieldedFunds } from '../wallet-utils.js';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import {
  AgentPassAPI,
  type AgentPassProviders,
  type AgentPassPrivateStateId,
  agentPrivateStateKey,
  makeTerms,
  derivePublicKey,
} from '../../../api/src/index';
import { AgentPass, type AgentPassPrivateState } from '../../../contract/src/index';
import { randomBytes } from '../../../api/src/utils';

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
const HOUR = 3_600_000;

const check = (cond: boolean, label: string): void => {
  if (!cond) throw new Error(`GRANT CHECK FAILED: ${label}`);
  console.log(`✔ ${label}`);
};

const expectRejection = async (p: Promise<unknown>, needle: string, label: string): Promise<void> => {
  try {
    await p;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    check(msg.includes(needle), `${label} (rejected with '${needle}')`);
    return;
  }
  throw new Error(`GRANT CHECK FAILED: ${label} — expected rejection, call succeeded`);
};

const config = new StandaloneConfig();
const logger = await createLogger(config.logDir);
const testEnv = config.getEnvironment(logger);

try {
  const envConfiguration = await testEnv.start();
  const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, GENESIS_MINT_WALLET_SEED);
  await walletProvider.start();
  await waitForUnshieldedFunds(logger, walletProvider.wallet, envConfiguration, unshieldedToken());

  const zkConfigProvider = new NodeZkConfigProvider<'issueMandate' | 'proveAuthorized' | 'revokeMandate'>(
    config.zkConfigPath,
  );
  const providers: AgentPassProviders = {
    privateStateProvider: levelPrivateStateProvider<AgentPassPrivateStateId, AgentPassPrivateState>({
      privateStateStoreName: `grant-check-${config.privateStateStoreName}`,
      signingKeyStoreName: `grant-check-${config.privateStateStoreName}-signing-keys`,
      privateStoragePasswordProvider: () => 'AgentPass-Test-2026!',
      accountId: GENESIS_MINT_WALLET_SEED,
    }),
    publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  const principalSecretKey = randomBytes(32);
  const principal = await AgentPassAPI.deploy(providers, { principalSecretKey }, logger);
  const agentHandle = await AgentPassAPI.join(
    providers,
    principal.deployedContractAddress,
    agentPrivateStateKey,
    {},
    logger,
  );
  console.log(`Deployed AgentPass at ${principal.deployedContractAddress}`);

  // Two agents with their own keys — like the Grant directory
  const subManagerKey = randomBytes(32);
  const travelBookerKey = randomBytes(32);

  const timeBound = (): bigint => BigInt(Math.ceil((Date.now() + 1) / HOUR) * HOUR);

  const hire = async (agentKey: Uint8Array, cap: bigint, actions: number[], days: number) => {
    const nonce = randomBytes(32);
    const salt = randomBytes(32);
    const terms = makeTerms(cap, BigInt(Date.now() + days * 86_400_000), derivePublicKey(agentKey), actions);
    await principal.setPrivateState({ principalSecretKey, mandateNonce: nonce, terms, mandateSalt: salt });
    const { mandateId } = await principal.issueMandate();
    return { mandateId, terms, salt, nonce };
  };

  // 1. Hire SubManager (subscribe only, cap 30) and TravelBooker (purchase+book, cap 250)
  const sub = await hire(subManagerKey, 30n, [2], 30);
  check(sub.mandateId.length === 32, `SubManager hired: credential ${toHex(sub.mandateId).slice(0, 14)}…`);
  const travel = await hire(travelBookerKey, 250n, [0, 6], 60);
  check(travel.mandateId.length === 32, `TravelBooker hired: credential ${toHex(travel.mandateId).slice(0, 14)}…`);
  check(toHex(sub.mandateId) !== toHex(travel.mandateId), 'credentials are distinct and unlinkable');

  // 2. SubManager renews a subscription (8)
  await agentHandle.setPrivateState({
    agentSecretKey: subManagerKey,
    terms: sub.terms,
    mandateSalt: sub.salt,
    timeBound: timeBound(),
  });
  const renewal = await agentHandle.proveAuthorized(sub.mandateId, 2n, 8n);
  check(renewal.requestId.length === 32, 'SubManager renewed a subscription (receipt on-chain)');

  // 3. Cross-agent theft: TravelBooker tries to use SubManager's credential
  await agentHandle.setPrivateState({
    agentSecretKey: travelBookerKey,
    terms: sub.terms,
    mandateSalt: sub.salt,
    timeBound: timeBound(),
  });
  await expectRejection(
    agentHandle.proveAuthorized(sub.mandateId, 2n, 1n),
    'not the delegated agent',
    'another agent cannot use a credential that is not its own',
  );

  // 4. Limits: SubManager tries a purchase (not in its scope)
  await agentHandle.setPrivateState({
    agentSecretKey: subManagerKey,
    terms: sub.terms,
    mandateSalt: sub.salt,
    timeBound: timeBound(),
  });
  await expectRejection(
    agentHandle.proveAuthorized(sub.mandateId, 0n, 5n),
    'action not in mandate scope',
    'out-of-scope action dies at proof time',
  );

  // 5. Fire SubManager
  await principal.setPrivateState({
    principalSecretKey,
    mandateNonce: sub.nonce,
    terms: sub.terms,
    mandateSalt: sub.salt,
  });
  await principal.revokeMandate(sub.mandateId);
  console.log('SubManager fired (credential revoked on-chain)');
  await agentHandle.setPrivateState({
    agentSecretKey: subManagerKey,
    terms: sub.terms,
    mandateSalt: sub.salt,
    timeBound: timeBound(),
  });
  await expectRejection(
    agentHandle.proveAuthorized(sub.mandateId, 2n, 1n),
    'mandate revoked',
    'fired agent is locked out',
  );

  // 6. TravelBooker is unaffected and books a train (32)
  await agentHandle.setPrivateState({
    agentSecretKey: travelBookerKey,
    terms: travel.terms,
    mandateSalt: travel.salt,
    timeBound: timeBound(),
  });
  const booking = await agentHandle.proveAuthorized(travel.mandateId, 6n, 32n);
  check(booking.requestId.length === 32, 'TravelBooker still works after SubManager was fired');

  // 7. Public ledger sanity
  const contractState = await providers.publicDataProvider.queryContractState(principal.deployedContractAddress);
  const ledger = AgentPass.ledger(contractState!.data);
  check(ledger.mandateCommitments.size() === 2n, 'two credentials on the public ledger');
  check(ledger.spentAmounts.lookup(sub.mandateId) === 8n, 'SubManager spend stopped at 8');
  check(ledger.spentAmounts.lookup(travel.mandateId) === 32n, 'TravelBooker spend is 32');
  check(ledger.revokedMandates.member(sub.mandateId), 'SubManager credential shows revoked');
  check(!ledger.revokedMandates.member(travel.mandateId), 'TravelBooker credential is live');
  check(ledger.authorizations === 2n, 'exactly two authorizations succeeded');

  console.log('\nGRANT E2E: ALL CHECKS PASSED');
  await walletProvider.stop();
  await testEnv.shutdown();
  process.exit(0);
} catch (e) {
  console.error(`GRANT E2E FAILED: ${e instanceof Error ? e.message : String(e)}`);
  try {
    await testEnv.shutdown();
  } catch {
    /* best effort */
  }
  process.exit(1);
}
