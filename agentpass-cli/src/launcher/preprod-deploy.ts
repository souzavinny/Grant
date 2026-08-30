// Deploys the AgentPass contract to the Midnight preprod network and smoke-tests
// it end-to-end (issue a mandate, prove one authorization, read the receipt back
// from the remote indexer). The deployer wallet seed comes from
// AGENTPASS_DEPLOY_SEED; a fresh seed is generated and saved to
// .deploy-seed-preprod (gitignored) on first run. Funding is automatic: preprod
// faucet for NIGHT, then owner-signed dust registration for fees.
//
// Usage: npm run deploy:preprod   (requires Docker for the local proof server)
//
// SPDX-License-Identifier: Apache-2.0

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { WebSocket } from 'ws';
import { createLogger } from '../logger-utils.js';
import { PreprodRemoteConfig, currentDir } from '../config.js';
import { MidnightWalletProvider } from '../midnight-wallet-provider.js';
import { waitForUnshieldedFunds } from '../wallet-utils.js';
import { generateDust } from '../generate-dust.js';
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

const HOUR = 3_600_000;
const SEED_FILE = path.resolve(currentDir, '..', '.deploy-seed-preprod');
const DEPLOYMENTS_FILE = path.resolve(currentDir, '..', '..', 'deployments', 'preprod.json');

const check = (cond: boolean, label: string): void => {
  if (!cond) {
    throw new Error(`DEPLOY CHECK FAILED: ${label}`);
  }
  console.log(`✔ ${label}`);
};

const loadOrCreateSeed = (): string => {
  const fromEnv = process.env.AGENTPASS_DEPLOY_SEED;
  if (fromEnv !== undefined && fromEnv !== '') {
    return fromEnv;
  }
  if (existsSync(SEED_FILE)) {
    return readFileSync(SEED_FILE, 'utf8').trim();
  }
  const seed = toHex(randomBytes(32));
  writeFileSync(SEED_FILE, `${seed}\n`, { mode: 0o600 });
  console.log(`Generated a new deployer seed and saved it to ${SEED_FILE} (keep it private).`);
  return seed;
};

const config = new PreprodRemoteConfig();
const logger = await createLogger(config.logDir);
const testEnv = config.getEnvironment(logger);

try {
  const envConfiguration = await testEnv.start();
  logger.info(`Preprod environment ready: ${JSON.stringify({ ...envConfiguration, proofServer: 'local' })}`);

  const seed = loadOrCreateSeed();
  const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
  await walletProvider.start();

  const unshieldedState = await waitForUnshieldedFunds(
    logger,
    walletProvider.wallet,
    envConfiguration,
    unshieldedToken(),
    true, // request from the preprod faucet when the balance is zero
  );
  check((unshieldedState.balances[unshieldedToken().raw] ?? 0n) > 0n, 'deployer wallet holds NIGHT');

  const dustBalance = (await walletProvider.wallet.dust.waitForSyncedState()).balance?.(new Date()) ?? 0n;
  if (dustBalance === 0n) {
    await generateDust(logger, seed, unshieldedState, walletProvider.wallet);
  }
  console.log('✔ deployer wallet has dust for fees');

  const zkConfigProvider = new NodeZkConfigProvider<'issueMandate' | 'proveAuthorized' | 'revokeMandate'>(
    config.zkConfigPath,
  );
  const providers: AgentPassProviders = {
    privateStateProvider: levelPrivateStateProvider<AgentPassPrivateStateId, AgentPassPrivateState>({
      privateStateStoreName: config.privateStateStoreName,
      signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
      privateStoragePasswordProvider: () => 'AgentPass-Test-2026!',
      accountId: seed,
    }),
    publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  const principalSecretKey = randomBytes(32);
  const agentSecretKey = randomBytes(32);
  const mandateNonce = randomBytes(32);
  const mandateSalt = randomBytes(32);

  const principal = await AgentPassAPI.deploy(providers, { principalSecretKey, mandateNonce }, logger);
  const address = principal.deployedContractAddress;
  console.log(`✔ AgentPass deployed on preprod at ${address}`);

  // Smoke test: the full authorization loop against the live network
  const terms = makeTerms(100n, BigInt(Date.now() + 30 * 86_400_000), derivePublicKey(agentSecretKey), [0, 2]);
  await principal.setPrivateState({ principalSecretKey, mandateNonce, terms, mandateSalt });
  const { mandateId } = await principal.issueMandate();
  check(mandateId.length === 32, `mandate issued: ${toHex(mandateId).slice(0, 18)}…`);

  const agent = await AgentPassAPI.join(providers, address, agentPrivateStateKey, { agentSecretKey }, logger);
  await agent.setPrivateState({
    agentSecretKey,
    terms,
    mandateSalt,
    timeBound: BigInt(Math.ceil((Date.now() + 1) / HOUR) * HOUR),
  });
  const auth = await agent.proveAuthorized(mandateId, 0n, 40n);
  check(auth.requestId.length === 32, `authorization proven on preprod: tx ${auth.txHash}`);

  const contractState = await providers.publicDataProvider.queryContractState(address);
  check(contractState !== null, 'contract state readable from the preprod indexer');
  const ledgerState = AgentPass.ledger(contractState!.data);
  check(ledgerState.receipts.member(auth.requestId), 'receipt found on the preprod ledger');

  mkdirSync(path.dirname(DEPLOYMENTS_FILE), { recursive: true });
  writeFileSync(
    DEPLOYMENTS_FILE,
    `${JSON.stringify(
      {
        network: 'preprod',
        contractAddress: address,
        deployedAt: new Date().toISOString(),
        smokeTest: { mandateId: toHex(mandateId), authorizationTx: auth.txHash },
      },
      null,
      2,
    )}\n`,
  );
  console.log(`✔ deployment recorded in ${DEPLOYMENTS_FILE}`);
  console.log('\nALL CHECKS PASSED — AgentPass is live on Midnight preprod.');
} finally {
  await testEnv.shutdown();
}
