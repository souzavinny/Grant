// AgentPass CLI — demo driver for private AI-agent delegation on Midnight.
// Based on the midnightntwrk/example-bboard template (Apache-2.0).
// SPDX-License-Identifier: Apache-2.0
//
// One process plays all three roles so the whole protocol can be watched
// end-to-end: the PRINCIPAL (issues and revokes mandates), the AGENT (proves
// authorization for actions in zero knowledge), and the VERIFIER (checks
// receipts on the public ledger). In production each role runs on its own
// device with only its own private state.

import { createInterface, type Interface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { WebSocket } from 'ws';
import {
  AgentPassAPI,
  type AgentPassProviders,
  type AgentPassPrivateStateId,
  agentPrivateStateKey,
  makeTerms,
  derivePublicKey,
} from '../../api/src/index';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { AgentPass, type AgentPassPrivateState } from '../../contract/src/index';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { type Logger } from 'pino';
import { type Config, StandaloneConfig } from './config.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { MidnightWalletProvider } from './midnight-wallet-provider';
import { randomBytes } from '../../api/src/utils';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils';
import { generateDust } from './generate-dust';

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

export const ACTION_LABELS = [
  'purchase',
  'transfer',
  'subscribe',
  'data-access',
  'trade',
  'message',
  'book',
  'custom',
] as const;

const fromHex = (hex: string): Uint8Array => Uint8Array.from(Buffer.from(hex.replace(/^0x/, ''), 'hex'));

/** The agent's public time bound: the next full hour (coarse, so the exact
 * proof time leaks as little as possible — see docs/PRIVACY-DESIGN.md). */
const nextHourMs = (): bigint => {
  const HOUR = 3_600_000;
  return BigInt(Math.ceil((Date.now() + 1) / HOUR) * HOUR);
};

/** Everything the demo keeps in memory to play both parties. */
type DemoParties = {
  principalSecretKey: Uint8Array;
  agentSecretKey: Uint8Array;
  mandateNonce: Uint8Array;
  mandateSalt: Uint8Array;
  terms?: AgentPass.MandateTerms;
  mandateId?: Uint8Array;
  lastRequestId?: Uint8Array;
};

/* **********************************************************************
 * Ledger helpers — the VERIFIER/observer view.
 */

export const getAgentPassLedgerState = async (
  providers: AgentPassProviders,
  contractAddress: ContractAddress,
): Promise<AgentPass.Ledger | null> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null ? AgentPass.ledger(contractState.data) : null;
};

const displayLedgerState = async (providers: AgentPassProviders, api: AgentPassAPI, logger: Logger): Promise<void> => {
  const ledgerState = await getAgentPassLedgerState(providers, api.deployedContractAddress);
  if (ledgerState === null) {
    logger.info(`No AgentPass contract deployed at ${api.deployedContractAddress}`);
    return;
  }
  logger.info(`— PUBLIC LEDGER (what any observer sees) —`);
  logger.info(`Registered mandates: ${ledgerState.mandateCommitments.size()}`);
  logger.info(`Total authorizations: ${ledgerState.authorizations}`);
  for (const [mandateId, commitment] of ledgerState.mandateCommitments) {
    const spent = ledgerState.spentAmounts.member(mandateId) ? ledgerState.spentAmounts.lookup(mandateId) : 0n;
    const revoked = ledgerState.revokedMandates.member(mandateId);
    logger.info(
      `mandate ${toHex(mandateId).slice(0, 16)}… commitment=${toHex(commitment).slice(0, 16)}… spent=${spent} revoked=${revoked}`,
    );
  }
  for (const [requestId, receipt] of ledgerState.receipts) {
    logger.info(
      `receipt ${toHex(requestId).slice(0, 16)}… action=${ACTION_LABELS[Number(receipt.action)]} amount=${receipt.amount}`,
    );
  }
  logger.info(`Note: no principal identity, no agent identity, no caps, no scopes, no expiries appear above.`);
};

const displayPrivateState = (parties: DemoParties, logger: Logger): void => {
  logger.info(`— PRIVATE STATE (never leaves the parties' devices) —`);
  logger.info(`[principal] secret key: ${toHex(parties.principalSecretKey).slice(0, 16)}…`);
  logger.info(`[agent]     secret key: ${toHex(parties.agentSecretKey).slice(0, 16)}…`);
  if (parties.terms !== undefined) {
    const scope = parties.terms.scope
      .map((allowed, i) => (allowed ? ACTION_LABELS[i] : null))
      .filter((s): s is (typeof ACTION_LABELS)[number] => s !== null);
    logger.info(
      `[mandate]   cap=${parties.terms.cap} scope=[${scope.join(', ')}] expires=${new Date(Number(parties.terms.expiry)).toISOString()}`,
    );
  } else {
    logger.info(`[mandate]   none issued yet`);
  }
};

/* **********************************************************************
 * deployOrJoin: deploy a new AgentPass contract or join an existing one.
 * Returns handles for both parties (principal deploys; agent joins the
 * same address with its own private state).
 */

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new AgentPass contract
  2. Join an existing AgentPass contract
  3. Exit
Which would you like to do? `;

const deployOrJoin = async (
  providers: AgentPassProviders,
  parties: DemoParties,
  rli: Interface,
  logger: Logger,
): Promise<{ principal: AgentPassAPI; agent: AgentPassAPI } | null> => {
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1': {
        const principal = await AgentPassAPI.deploy(
          providers,
          { principalSecretKey: parties.principalSecretKey, mandateNonce: parties.mandateNonce },
          logger,
        );
        logger.info(`Deployed AgentPass at address: ${principal.deployedContractAddress}`);
        const agent = await AgentPassAPI.join(
          providers,
          principal.deployedContractAddress,
          agentPrivateStateKey,
          { agentSecretKey: parties.agentSecretKey },
          logger,
        );
        return { principal, agent };
      }
      case '2': {
        const contractAddress = await rli.question('What is the contract address (in hex)? ');
        const principal = await AgentPassAPI.join(
          providers,
          contractAddress,
          'agentPassPrincipal',
          { principalSecretKey: parties.principalSecretKey, mandateNonce: parties.mandateNonce },
          logger,
        );
        const agent = await AgentPassAPI.join(
          providers,
          contractAddress,
          agentPrivateStateKey,
          { agentSecretKey: parties.agentSecretKey },
          logger,
        );
        logger.info(`Joined AgentPass at address: ${principal.deployedContractAddress}`);
        return { principal, agent };
      }
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

/* **********************************************************************
 * Demo actions.
 */

const issueMandate = async (
  principal: AgentPassAPI,
  parties: DemoParties,
  rli: Interface,
  logger: Logger,
): Promise<void> => {
  const cap = BigInt((await rli.question('Spend cap for the agent (e.g. 100)? ')) || '100');
  const actionsAnswer =
    (await rli.question(
      `Allowed actions, comma-separated indices 0-7 (${ACTION_LABELS.map((l, i) => `${i}=${l}`).join(', ')})? `,
    )) || '0,2';
  const allowedActions = actionsAnswer.split(',').map((s) => Number(s.trim()));
  const days = Number((await rli.question('Valid for how many days (e.g. 30)? ')) || '30');
  const expiry = BigInt(Date.now() + days * 86_400_000);

  parties.terms = makeTerms(cap, expiry, derivePublicKey(parties.agentSecretKey), allowedActions);
  await principal.setPrivateState({
    principalSecretKey: parties.principalSecretKey,
    mandateNonce: parties.mandateNonce,
    terms: parties.terms,
    mandateSalt: parties.mandateSalt,
  });
  const { mandateId, txHash } = await principal.issueMandate();
  parties.mandateId = mandateId;
  logger.info(`Mandate issued. Pseudonymous id: ${toHex(mandateId)}`);
  logger.info(`(tx ${txHash})`);
  logger.info(`Hand-off: terms + salt shared with the agent off-chain.`);
};

const agentState = (parties: DemoParties): AgentPassPrivateState => ({
  agentSecretKey: parties.agentSecretKey,
  terms: parties.terms,
  mandateSalt: parties.mandateSalt,
  timeBound: nextHourMs(),
});

const authorize = async (agent: AgentPassAPI, parties: DemoParties, rli: Interface, logger: Logger): Promise<void> => {
  if (parties.mandateId === undefined || parties.terms === undefined) {
    logger.error('No mandate issued yet — use option 1 first.');
    return;
  }
  const action = BigInt(
    (await rli.question(`Action index 0-7 (${ACTION_LABELS.map((l, i) => `${i}=${l}`).join(', ')})? `)) || '0',
  );
  const amount = BigInt((await rli.question('Amount (e.g. 40)? ')) || '40');
  await agent.setPrivateState(agentState(parties));
  const result = await agent.proveAuthorized(parties.mandateId, action, amount);
  parties.lastRequestId = result.requestId;
  logger.info(`AUTHORIZED in zero knowledge. Receipt requestId: ${toHex(result.requestId)}`);
  logger.info(`(tx ${result.txHash}, block ${result.blockHeight})`);
};

const verifyReceipt = async (
  providers: AgentPassProviders,
  api: AgentPassAPI,
  parties: DemoParties,
  rli: Interface,
  logger: Logger,
): Promise<void> => {
  const answer = await rli.question('Receipt requestId in hex (empty = last one)? ');
  const requestId = answer.trim() === '' ? parties.lastRequestId : fromHex(answer.trim());
  if (requestId === undefined) {
    logger.error('No receipt to check yet.');
    return;
  }
  const ledgerState = await getAgentPassLedgerState(providers, api.deployedContractAddress);
  if (ledgerState !== null && ledgerState.receipts.member(requestId)) {
    const receipt = ledgerState.receipts.lookup(requestId);
    logger.info(
      `VERIFIED on-chain: action='${ACTION_LABELS[Number(receipt.action)]}' amount=${receipt.amount} — authorized by a live mandate.`,
    );
    logger.info(`The verifier learns nothing about who delegated, the cap, the scope, or the expiry.`);
  } else {
    logger.info(`NOT FOUND: no receipt for that requestId.`);
  }
};

const revoke = async (principal: AgentPassAPI, parties: DemoParties, logger: Logger): Promise<void> => {
  if (parties.mandateId === undefined) {
    logger.error('No mandate issued yet — use option 1 first.');
    return;
  }
  const { txHash } = await principal.revokeMandate(parties.mandateId);
  logger.info(`Mandate ${toHex(parties.mandateId).slice(0, 16)}… revoked by principal. (tx ${txHash})`);
};

const adversarialDemo = async (agent: AgentPassAPI, parties: DemoParties, logger: Logger): Promise<void> => {
  if (parties.mandateId === undefined || parties.terms === undefined) {
    logger.error('No mandate issued yet — use option 1 first.');
    return;
  }
  const forbidden = parties.terms.scope.findIndex((allowed) => !allowed);
  await agent.setPrivateState(agentState(parties));
  if (forbidden >= 0) {
    logger.info(`Agent attempts out-of-scope action '${ACTION_LABELS[forbidden]}'…`);
    try {
      await agent.proveAuthorized(parties.mandateId, BigInt(forbidden), 1n);
      logger.error('UNEXPECTED: authorization should have failed!');
    } catch (e) {
      logger.info(`REJECTED locally before any transaction was submitted:`);
      logger.info(`  '${e instanceof Error ? e.message : String(e)}'`);
      logger.info(`No proof can be produced for an unauthorized action — the chain never sees the attempt.`);
    }
  } else {
    logger.info(`All actions are in scope; attempting to exceed the cap instead…`);
    try {
      await agent.proveAuthorized(parties.mandateId, 0n, parties.terms.cap + 1n);
      logger.error('UNEXPECTED: authorization should have failed!');
    } catch (e) {
      logger.info(`REJECTED locally: '${e instanceof Error ? e.message : String(e)}'`);
    }
  }
};

/* **********************************************************************
 * mainLoop
 */

const MAIN_LOOP_QUESTION = `
AgentPass — private delegation credentials for AI agents
  1. [Principal] Issue a mandate (cap, scope, expiry)
  2. [Agent]     Request authorization for an action (ZK proof)
  3. [Verifier]  Check a receipt on the public ledger
  4. [Observer]  Show the public ledger state
  5. [Devices]   Show the parties' private state
  6. [Principal] Revoke the mandate
  7. [Attacker]  Adversarial demo: try an unauthorized action
  8. Exit
Which would you like to do? `;

const mainLoop = async (providers: AgentPassProviders, rli: Interface, logger: Logger): Promise<void> => {
  const parties: DemoParties = {
    principalSecretKey: randomBytes(32),
    agentSecretKey: randomBytes(32),
    mandateNonce: randomBytes(32),
    mandateSalt: randomBytes(32),
  };
  logger.info('Simulating two devices: a principal (you) and an AI agent acting on your behalf.');
  const apis = await deployOrJoin(providers, parties, rli, logger);
  if (apis === null) {
    return;
  }
  const { principal, agent } = apis;
  while (true) {
    const choice = await rli.question(MAIN_LOOP_QUESTION);
    try {
      switch (choice) {
        case '1':
          await issueMandate(principal, parties, rli, logger);
          break;
        case '2':
          await authorize(agent, parties, rli, logger);
          break;
        case '3':
          await verifyReceipt(providers, principal, parties, rli, logger);
          break;
        case '4':
          await displayLedgerState(providers, principal, logger);
          break;
        case '5':
          displayPrivateState(parties, logger);
          break;
        case '6':
          await revoke(principal, parties, logger);
          break;
        case '7':
          await adversarialDemo(agent, parties, logger);
          break;
        case '8':
          logger.info('Exiting...');
          return;
        default:
          logger.error(`Invalid choice: ${choice}`);
      }
    } catch (e) {
      logError(logger, e);
      logger.info('Returning to main menu...');
    }
  }
};

/* ***********************************************************************
 * This seed gives access to tokens minted in the genesis block of a local development node - only
 * used in standalone networks to build a wallet with initial funds.
 */
const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface, logger: Logger): Promise<string | undefined> => {
  if (config instanceof StandaloneConfig) {
    return GENESIS_MINT_WALLET_SEED;
  }
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1':
        return toHex(randomBytes(32));
      case '2':
        return await rli.question('Enter your wallet seed: ');
      case '3':
        logger.info('Exiting...');
        return undefined;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

/* **********************************************************************
 * run: the main entry point of the AgentPass CLI.
 */

export const run = async (config: Config, testEnv: TestEnvironment, logger: Logger): Promise<void> => {
  const rli = createInterface({ input, output, terminal: true });
  const providersToBeStopped: MidnightWalletProvider[] = [];
  try {
    const envConfiguration = await testEnv.start();
    logger.info(`Environment started with configuration: ${JSON.stringify(envConfiguration)}`);
    const seed = await buildWallet(config, rli, logger);
    if (seed === undefined) {
      return;
    }
    const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
    providersToBeStopped.push(walletProvider);
    const walletFacade: WalletFacade = walletProvider.wallet;

    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletFacade, envConfiguration, unshieldedToken());
    const nightBalance = unshieldedState.balances[unshieldedToken().raw];
    if (nightBalance === undefined) {
      logger.info('No funds received, exiting...');
      return;
    }
    logger.info(`Your NIGHT wallet balance is: ${nightBalance}`);

    if (config.generateDust) {
      const dustGeneration = await generateDust(logger, seed, unshieldedState, walletFacade);
      if (dustGeneration) {
        logger.info(`Submitted dust generation registration transaction: ${dustGeneration}`);
        await syncWallet(logger, walletFacade);
      }
    }

    const zkConfigProvider = new NodeZkConfigProvider<'issueMandate' | 'proveAuthorized' | 'revokeMandate'>(
      config.zkConfigPath,
    );
    const providers: AgentPassProviders = {
      privateStateProvider: levelPrivateStateProvider<AgentPassPrivateStateId, AgentPassPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => {
          return 'AgentPass-Test-2026!';
        },
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
      zkConfigProvider: zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };
    await mainLoop(providers, rli, logger);
  } catch (e) {
    logError(logger, e);
    logger.info('Exiting...');
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logError(logger, e);
    } finally {
      try {
        for (const wallet of providersToBeStopped) {
          logger.info('Stopping wallet...');
          await wallet.stop();
        }
        if (testEnv) {
          logger.info('Stopping test environment...');
          await testEnv.shutdown();
        }
      } catch (e) {
        logError(logger, e);
      }
    }
  }
};

function logError(logger: Logger, e: unknown) {
  if (e instanceof Error) {
    logger.error(`Found error '${e.message}'`);
    logger.debug(`${e.stack}`);
  } else {
    logger.error(`Found error (unknown type)`);
  }
}
