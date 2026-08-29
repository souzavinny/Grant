// Scripted, non-interactive AgentPass demo: runs the full protocol end-to-end
// against a standalone local devnet and asserts every step. Used for CI-style
// verification (`npm run demo`); the interactive tour lives in `npm run standalone`.
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

const check = (cond: boolean, label: string): void => {
  if (!cond) {
    throw new Error(`DEMO CHECK FAILED: ${label}`);
  }
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
  throw new Error(`DEMO CHECK FAILED: ${label} — expected rejection, but the call succeeded`);
};

const HOUR = 3_600_000;

const config = new StandaloneConfig();
const logger = await createLogger(config.logDir);
const testEnv = config.getEnvironment(logger);

try {
  const envConfiguration = await testEnv.start();
  logger.info(`Environment started: ${JSON.stringify(envConfiguration)}`);

  const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, GENESIS_MINT_WALLET_SEED);
  await walletProvider.start();
  const unshieldedState = await waitForUnshieldedFunds(
    logger,
    walletProvider.wallet,
    envConfiguration,
    unshieldedToken(),
  );
  check(unshieldedState.balances[unshieldedToken().raw] !== undefined, 'wallet funded from genesis');

  const zkConfigProvider = new NodeZkConfigProvider<'issueMandate' | 'proveAuthorized' | 'revokeMandate'>(
    config.zkConfigPath,
  );
  const providers: AgentPassProviders = {
    privateStateProvider: levelPrivateStateProvider<AgentPassPrivateStateId, AgentPassPrivateState>({
      privateStateStoreName: config.privateStateStoreName,
      signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
      privateStoragePasswordProvider: () => 'AgentPass-Test-2026!',
      accountId: GENESIS_MINT_WALLET_SEED,
    }),
    publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  // The two parties (in production: two devices, two private states)
  const principalSecretKey = randomBytes(32);
  const agentSecretKey = randomBytes(32);
  const mandateNonce = randomBytes(32);
  const mandateSalt = randomBytes(32);

  // 1. Principal deploys the contract
  const principal = await AgentPassAPI.deploy(providers, { principalSecretKey, mandateNonce }, logger);
  console.log(`Deployed AgentPass at ${principal.deployedContractAddress}`);

  // 2. Agent joins the same contract with its own private state
  const agent = await AgentPassAPI.join(
    providers,
    principal.deployedContractAddress,
    agentPrivateStateKey,
    { agentSecretKey },
    logger,
  );

  // 3. Principal issues a mandate: cap 100, actions {purchase, subscribe}, 30 days
  const terms = makeTerms(100n, BigInt(Date.now() + 30 * 86_400_000), derivePublicKey(agentSecretKey), [0, 2]);
  await principal.setPrivateState({ principalSecretKey, mandateNonce, terms, mandateSalt });
  const { mandateId } = await principal.issueMandate();
  check(mandateId.length === 32, `mandate issued: ${toHex(mandateId).slice(0, 18)}…`);

  // Off-chain hand-off of terms + salt to the agent
  const agentState = (): AgentPassPrivateState => ({
    agentSecretKey,
    terms,
    mandateSalt,
    timeBound: BigInt(Math.ceil((Date.now() + 1) / HOUR) * HOUR),
  });

  // 4. Agent proves authorization for purchase(40) — real ZK proof via the proof server
  await agent.setPrivateState(agentState());
  const auth = await agent.proveAuthorized(mandateId, 0n, 40n);
  console.log(`Authorized purchase(40): receipt ${toHex(auth.requestId).slice(0, 18)}… tx ${auth.txHash}`);

  // 5. Verifier checks the receipt on the public ledger
  const contractState = await providers.publicDataProvider.queryContractState(principal.deployedContractAddress);
  check(contractState !== null, 'contract state readable from indexer');
  const ledgerState = AgentPass.ledger(contractState!.data);
  check(ledgerState.receipts.member(auth.requestId), 'receipt found on public ledger');
  const receipt = ledgerState.receipts.lookup(auth.requestId);
  check(receipt.action === 0n && receipt.amount === 40n, 'receipt discloses only action + amount');
  check(ledgerState.spentAmounts.lookup(mandateId) === 40n, 'cumulative spend updated to 40');
  check(ledgerState.authorizations === 1n, 'authorization counter incremented');

  // 6. Adversarial: out-of-scope action must fail locally (no proof can exist)
  await agent.setPrivateState(agentState());
  await expectRejection(
    agent.proveAuthorized(mandateId, 1n, 1n),
    'action not in mandate scope',
    'out-of-scope action rejected at proof time',
  );

  // 7. Adversarial: over-cap cumulative spend must fail locally
  await agent.setPrivateState(agentState());
  await expectRejection(
    agent.proveAuthorized(mandateId, 0n, 61n),
    'would exceed mandate cap',
    'over-cap amount rejected at proof time',
  );

  // 8. Principal revokes; further authorizations must fail
  await principal.setPrivateState({ principalSecretKey, mandateNonce, terms, mandateSalt });
  const { txHash: revokeTx } = await principal.revokeMandate(mandateId);
  console.log(`Mandate revoked (tx ${revokeTx})`);
  await agent.setPrivateState(agentState());
  await expectRejection(
    agent.proveAuthorized(mandateId, 0n, 10n),
    'mandate revoked',
    'post-revocation authorization rejected',
  );

  console.log('\nAGENTPASS E2E DEMO: ALL CHECKS PASSED');
  await walletProvider.stop();
  await testEnv.shutdown();
  process.exit(0);
} catch (e) {
  console.error(`AGENTPASS E2E DEMO FAILED: ${e instanceof Error ? e.message : String(e)}`);
  logger.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
  try {
    await testEnv.shutdown();
  } catch {
    /* best effort */
  }
  process.exit(1);
}
