// Grant — hire AI agents with permissions, not passwords.
//
// Server for the Grant app (public/grant.html): a directory of agents that a
// user hires through an OS-style permission sheet. Every "Allow" issues an
// AgentPass mandate on the local Midnight devnet; every task the agent
// performs is a zero-knowledge authorization producing an on-chain receipt;
// "Fire" revokes on-chain. Each agent holds its own secret key, so a mandate
// is cryptographically bound to the one agent it was granted to.
//
// SPDX-License-Identifier: Apache-2.0

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
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

const PORT = Number(process.env.GRANT_PORT ?? 8791);
const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
const HOUR = 3_600_000;
const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');
const PAGE_PATH = path.resolve(currentDir, '..', '..', 'public', 'grant.html');

export const ACTION_LABELS = ['purchase', 'transfer', 'subscribe', 'data-access', 'trade', 'message', 'book', 'custom'];

// ---------------------------------------------------------------------------
// The agent directory. In Wave 2 this becomes real third-party listings; for
// Wave 1 the agents are scripted, but every credential and proof is real.
// ---------------------------------------------------------------------------

type AgentTask = { label: string; action: number; amount: bigint };

type DirectoryAgent = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  wants: { cap: bigint; actions: number[]; days: number };
  tasks: AgentTask[];
  secretKey: Uint8Array;
};

const AGENTS: DirectoryAgent[] = [
  {
    id: 'submanager',
    name: 'SubManager',
    emoji: '🧾',
    blurb: 'Keeps your subscriptions tidy — renews the ones you use, drops the ones you don’t.',
    wants: { cap: 30n, actions: [2], days: 30 },
    tasks: [
      { label: 'Renewed: news subscription', action: 2, amount: 8n },
      { label: 'Renewed: music streaming', action: 2, amount: 11n },
      { label: 'Renewed: cloud storage', action: 2, amount: 5n },
    ],
    secretKey: randomBytes(32),
  },
  {
    id: 'travelbooker',
    name: 'TravelBooker',
    emoji: '✈️',
    blurb: 'Books trains, hotels, and flights when prices drop — inside the budget you set.',
    wants: { cap: 250n, actions: [0, 6], days: 60 },
    tasks: [
      { label: 'Booked: train to the coast', action: 6, amount: 32n },
      { label: 'Booked: one hotel night', action: 6, amount: 89n },
      { label: 'Purchased: seat upgrade', action: 0, amount: 18n },
    ],
    secretKey: randomBytes(32),
  },
  {
    id: 'grocerier',
    name: 'GroceryRunner',
    emoji: '🛒',
    blurb: 'Restocks your pantry every week from your usual list.',
    wants: { cap: 80n, actions: [0], days: 14 },
    tasks: [
      { label: 'Ordered: weekly groceries', action: 0, amount: 24n },
      { label: 'Ordered: coffee beans', action: 0, amount: 12n },
      { label: 'Ordered: fresh produce', action: 0, amount: 19n },
    ],
    secretKey: randomBytes(32),
  },
];

type Employment = {
  agentId: string;
  mandateId: Uint8Array;
  terms: AgentPass.MandateTerms;
  salt: Uint8Array;
  nonce: Uint8Array;
  receipts: Array<{ label: string; action: number; amount: string; requestId: string; txHash: string }>;
  taskCursor: number;
  status: 'active' | 'fired';
  lastResult: string;
};

type LogEntry = { at: string; who: string; text: string };

const state = {
  status: 'starting' as 'starting' | 'ready' | 'failed',
  bootMessage: 'Starting local devnet containers…',
  contractAddress: '',
  busy: false,
  log: [] as LogEntry[],
};

const employments = new Map<string, Employment>();
const principalSecretKey = randomBytes(32);

let principal: AgentPassAPI | undefined;
let agentApi: AgentPassAPI | undefined; // shared handle; per-action private state selects the acting agent
let providers: AgentPassProviders | undefined;

const say = (who: string, text: string): void => {
  state.log.push({ at: new Date().toISOString(), who, text });
  if (state.log.length > 200) state.log.shift();
  console.log(`[${who}] ${text}`);
};

const agentById = (id: string): DirectoryAgent => {
  const agent = AGENTS.find((a) => a.id === id);
  if (!agent) throw new Error(`unknown agent '${id}'`);
  return agent;
};

const agentStateFor = (agent: DirectoryAgent, employment: Employment): AgentPassPrivateState => ({
  agentSecretKey: agent.secretKey,
  terms: employment.terms,
  mandateSalt: employment.salt,
  timeBound: BigInt(Math.ceil((Date.now() + 1) / HOUR) * HOUR),
});

// ---------------------------------------------------------------------------
// Actions (single-flight: proofs are generated one at a time)
// ---------------------------------------------------------------------------

const hire = async (agentId: string, cap: bigint, days: number): Promise<Employment> => {
  const agent = agentById(agentId);
  if (employments.get(agentId)?.status === 'active') throw new Error(`${agent.name} already works for you`);
  const nonce = randomBytes(32);
  const salt = randomBytes(32);
  const terms = makeTerms(
    cap,
    BigInt(Date.now() + days * 86_400_000),
    derivePublicKey(agent.secretKey),
    agent.wants.actions,
  );
  await principal!.setPrivateState({ principalSecretKey, mandateNonce: nonce, terms, mandateSalt: salt });
  say(
    'you',
    `Hiring ${agent.name}: may ${agent.wants.actions.map((a) => ACTION_LABELS[a]).join(' + ')}, up to ${cap}, for ${days} days…`,
  );
  const { mandateId, txHash } = await principal!.issueMandate();
  const employment: Employment = {
    agentId,
    mandateId,
    terms,
    salt,
    nonce,
    receipts: [],
    taskCursor: 0,
    status: 'active',
    lastResult: 'Hired — credentials issued.',
  };
  employments.set(agentId, employment);
  say(
    'grant',
    `${agent.name} hired. Credential ${toHex(mandateId).slice(0, 14)}… on-chain (tx ${txHash.slice(0, 12)}…). ${agent.name} never learns who you are.`,
  );
  return employment;
};

const work = async (agentId: string): Promise<void> => {
  const agent = agentById(agentId);
  const employment = employments.get(agentId);
  if (!employment) throw new Error(`${agent.name} does not work for you yet`);
  if (employment.status === 'fired') throw new Error(`${agent.name} was fired — its credential is revoked`);
  const task = agent.tasks[employment.taskCursor % agent.tasks.length];
  await agentApi!.setPrivateState(agentStateFor(agent, employment));
  say(agent.name, `${task.label} — proving authorization (${ACTION_LABELS[task.action]}, ${task.amount})…`);
  const result = await agentApi!.proveAuthorized(employment.mandateId, BigInt(task.action), task.amount);
  employment.taskCursor += 1;
  employment.receipts.push({
    label: task.label,
    action: task.action,
    amount: task.amount.toString(),
    requestId: toHex(result.requestId),
    txHash: result.txHash,
  });
  employment.lastResult = `${task.label} — authorized.`;
  say(agent.name, `Done. Receipt ${toHex(result.requestId).slice(0, 14)}… on the public ledger.`);
};

const testLimits = async (agentId: string): Promise<string> => {
  const agent = agentById(agentId);
  const employment = employments.get(agentId);
  if (!employment) throw new Error(`${agent.name} does not work for you yet`);
  const forbidden = employment.terms.scope.findIndex((allowed) => !allowed);
  await agentApi!.setPrivateState(agentStateFor(agent, employment));
  const [action, amount, label] =
    forbidden >= 0
      ? [BigInt(forbidden), 1n, `a '${ACTION_LABELS[forbidden]}' action you never allowed`]
      : [BigInt(employment.terms.scope.findIndex(Boolean)), employment.terms.cap + 1n, 'an amount over your cap'];
  say(agent.name, `(limit test) Attempting ${label}…`);
  try {
    await agentApi!.proveAuthorized(employment.mandateId, action, amount);
    employment.lastResult = 'UNEXPECTED: the forbidden action was accepted!';
    say('grant', employment.lastResult);
    return employment.lastResult;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    employment.lastResult = `Blocked before it could happen: no proof exists for ${label}.`;
    say('grant', `Rejected at proof time — the chain never saw the attempt ('${message.slice(0, 90)}…').`);
    return employment.lastResult;
  }
};

const fire = async (agentId: string): Promise<void> => {
  const agent = agentById(agentId);
  const employment = employments.get(agentId);
  if (!employment) throw new Error(`${agent.name} does not work for you yet`);
  if (employment.status === 'fired') throw new Error(`${agent.name} is already fired`);
  await principal!.setPrivateState({
    principalSecretKey,
    mandateNonce: employment.nonce,
    terms: employment.terms,
    mandateSalt: employment.salt,
  });
  say('you', `Firing ${agent.name}…`);
  const { txHash } = await principal!.revokeMandate(employment.mandateId);
  employment.status = 'fired';
  employment.lastResult = 'Fired — credential revoked on-chain.';
  say(
    'grant',
    `${agent.name}'s credential revoked (tx ${txHash.slice(0, 12)}…). It can no longer prove anything, anywhere.`,
  );
};

// simple single-flight queue so auto-work never collides with user actions
let chain: Promise<unknown> = Promise.resolve();
const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = chain.then(
    () => fn(),
    () => fn(),
  );
  chain = next.catch(() => undefined);
  return next;
};

const scheduleFirstTask = (agentId: string): void => {
  setTimeout(() => {
    void enqueue(async () => {
      state.busy = true;
      try {
        if (employments.get(agentId)?.status === 'active') await work(agentId);
      } catch (e) {
        say('grant', `auto-task failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        state.busy = false;
      }
    });
  }, 8_000);
};

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

const ledgerSnapshot = async () => {
  if (!providers || !principal) return null;
  const contractState = await providers.publicDataProvider.queryContractState(principal.deployedContractAddress);
  if (contractState == null) return null;
  const ledger = AgentPass.ledger(contractState.data);
  const mandates: Array<{ id: string; spent: string; revoked: boolean }> = [];
  for (const [id] of ledger.mandateCommitments) {
    mandates.push({
      id: toHex(id),
      spent: (ledger.spentAmounts.member(id) ? ledger.spentAmounts.lookup(id) : 0n).toString(),
      revoked: ledger.revokedMandates.member(id),
    });
  }
  const receiptCount = [...ledger.receipts].length;
  return { mandates, receiptCount, authorizations: ledger.authorizations.toString() };
};

const stateSnapshot = async () => ({
  status: state.status,
  bootMessage: state.bootMessage,
  busy: state.busy,
  contractAddress: state.contractAddress,
  actions: ACTION_LABELS,
  directory: AGENTS.map((a) => ({
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    blurb: a.blurb,
    wants: { cap: a.wants.cap.toString(), actions: a.wants.actions, days: a.wants.days },
    hired: employments.get(a.id)?.status === 'active',
    fired: employments.get(a.id)?.status === 'fired',
  })),
  employments: [...employments.values()].map((e) => {
    const agent = agentById(e.agentId);
    return {
      agentId: e.agentId,
      name: agent.name,
      emoji: agent.emoji,
      mandateId: toHex(e.mandateId),
      cap: e.terms.cap.toString(),
      spent: e.receipts.reduce((sum, r) => sum + Number(r.amount), 0),
      scope: e.terms.scope.map((allowed, i) => (allowed ? i : -1)).filter((i) => i >= 0),
      expiry: Number(e.terms.expiry),
      receipts: e.receipts.slice(-6).reverse(),
      status: e.status,
      lastResult: e.lastResult,
    };
  }),
  ledger: state.status === 'ready' ? await ledgerSnapshot() : null,
  log: state.log.slice(-40),
});

// ---------------------------------------------------------------------------
// Boot + HTTP
// ---------------------------------------------------------------------------

const boot = async (): Promise<void> => {
  const config = new StandaloneConfig();
  const logger = await createLogger(config.logDir);
  const testEnv = config.getEnvironment(logger);
  say('grant', 'Starting local devnet (node + indexer + proof server)…');
  const envConfiguration = await testEnv.start();
  state.bootMessage = 'Syncing wallet…';
  const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, GENESIS_MINT_WALLET_SEED);
  await walletProvider.start();
  await waitForUnshieldedFunds(logger, walletProvider.wallet, envConfiguration, unshieldedToken());
  state.bootMessage = 'Publishing the AgentPass contract…';
  const zkConfigProvider = new NodeZkConfigProvider<'issueMandate' | 'proveAuthorized' | 'revokeMandate'>(
    config.zkConfigPath,
  );
  providers = {
    privateStateProvider: levelPrivateStateProvider<AgentPassPrivateStateId, AgentPassPrivateState>({
      privateStateStoreName: `grant-${config.privateStateStoreName}`,
      signingKeyStoreName: `grant-${config.privateStateStoreName}-signing-keys`,
      privateStoragePasswordProvider: () => 'AgentPass-Test-2026!',
      accountId: GENESIS_MINT_WALLET_SEED,
    }),
    publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
  principal = await AgentPassAPI.deploy(providers, { principalSecretKey }, logger);
  agentApi = await AgentPassAPI.join(providers, principal.deployedContractAddress, agentPrivateStateKey, {}, logger);
  state.contractAddress = principal.deployedContractAddress;
  state.status = 'ready';
  say('grant', 'Ready. Hire an agent — its permissions become a private, revocable credential.');
};

const json = (res: http.ServerResponse, code: number, body: unknown): void => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = async (req: http.IncomingMessage): Promise<Record<string, unknown>> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
};

const guarded = async (res: http.ServerResponse, fn: () => Promise<unknown>): Promise<void> => {
  if (state.status !== 'ready') {
    json(res, 503, { error: 'still starting' });
    return;
  }
  if (state.busy) {
    json(res, 409, { error: 'an agent is generating a proof — try again in a moment' });
    return;
  }
  state.busy = true;
  try {
    const result = await enqueue(fn);
    json(res, 200, result ?? { ok: true });
  } catch (e) {
    json(res, 400, { error: e instanceof Error ? e.message : String(e) });
  } finally {
    state.busy = false;
  }
};

const server = http.createServer((req, res) => {
  void (async () => {
    const url = req.url ?? '/';
    if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(await readFile(PAGE_PATH));
      return;
    }
    if (req.method === 'GET' && url === '/api/state') {
      json(res, 200, await stateSnapshot());
      return;
    }
    if (req.method === 'POST' && url === '/api/hire') {
      const body = await readBody(req);
      await guarded(res, async () => {
        const agent = agentById(String(body.agentId));
        const cap = typeof body.cap === 'string' || typeof body.cap === 'number' ? BigInt(body.cap) : agent.wants.cap;
        const days = Number(body.days ?? agent.wants.days);
        const employment = await hire(agent.id, cap, days);
        scheduleFirstTask(agent.id);
        return { mandateId: toHex(employment.mandateId) };
      });
      return;
    }
    if (req.method === 'POST' && url === '/api/work') {
      const body = await readBody(req);
      await guarded(res, () => work(String(body.agentId)));
      return;
    }
    if (req.method === 'POST' && url === '/api/test-limits') {
      const body = await readBody(req);
      await guarded(res, async () => ({ result: await testLimits(String(body.agentId)) }));
      return;
    }
    if (req.method === 'POST' && url === '/api/fire') {
      const body = await readBody(req);
      await guarded(res, () => fire(String(body.agentId)));
      return;
    }
    json(res, 404, { error: 'not found' });
  })().catch((e) => {
    json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  });
});

server.listen(PORT, () => {
  console.log(`Grant: http://localhost:${PORT}`);
});

boot().catch((e) => {
  state.status = 'failed';
  state.bootMessage = e instanceof Error ? e.message : String(e);
  say('grant', `Boot failed: ${state.bootMessage}`);
});
