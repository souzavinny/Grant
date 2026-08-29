// AgentPass Control Room server: hosts the browser demo on a local devnet.
// Reuses the exact provider/wallet stack of the verified scripted demo; the
// browser page (public/control-room.html) drives the protocol over JSON
// endpoints while all wallet + proof machinery runs here, server-side —
// mirroring production, where the agent is a headless service.
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

const PORT = Number(process.env.AGENTPASS_DEMO_PORT ?? 8790);
const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
const HOUR = 3_600_000;
const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');
const PAGE_PATH = path.resolve(currentDir, '..', '..', 'public', 'control-room.html');

type LogEntry = { at: string; who: 'principal' | 'agent' | 'verifier' | 'system'; text: string };

const state = {
  status: 'starting' as 'starting' | 'ready' | 'failed',
  bootMessage: 'Starting local devnet containers…',
  contractAddress: '',
  busy: false,
  log: [] as LogEntry[],
};

const say = (who: LogEntry['who'], text: string): void => {
  state.log.push({ at: new Date().toISOString(), who, text });
  if (state.log.length > 200) state.log.shift();
  console.log(`[${who}] ${text}`);
};

// --- parties (in production: two devices; the agent side is a headless service) ---
const principalSecretKey = randomBytes(32);
const agentSecretKey = randomBytes(32);
let mandateNonce = randomBytes(32);
let mandateSalt = randomBytes(32);
let terms: AgentPass.MandateTerms | undefined;
let mandateId: Uint8Array | undefined;

let principal: AgentPassAPI | undefined;
let agent: AgentPassAPI | undefined;
let providers: AgentPassProviders | undefined;

const agentState = (): AgentPassPrivateState => ({
  agentSecretKey,
  terms,
  mandateSalt,
  timeBound: BigInt(Math.ceil((Date.now() + 1) / HOUR) * HOUR),
});

const ledgerSnapshot = async () => {
  if (!providers || !principal) return null;
  const contractState = await providers.publicDataProvider.queryContractState(principal.deployedContractAddress);
  if (contractState == null) return null;
  const ledger = AgentPass.ledger(contractState.data);
  const mandates: Array<{ id: string; commitment: string; spent: string; revoked: boolean }> = [];
  for (const [id, commitment] of ledger.mandateCommitments) {
    mandates.push({
      id: toHex(id),
      commitment: toHex(commitment),
      spent: (ledger.spentAmounts.member(id) ? ledger.spentAmounts.lookup(id) : 0n).toString(),
      revoked: ledger.revokedMandates.member(id),
    });
  }
  const receipts: Array<{ requestId: string; action: number; amount: string }> = [];
  for (const [requestId, receipt] of ledger.receipts) {
    receipts.push({
      requestId: toHex(requestId),
      action: Number(receipt.action),
      amount: receipt.amount.toString(),
    });
  }
  return { mandates, receipts, authorizations: ledger.authorizations.toString() };
};

const privateSnapshot = () => ({
  principal: {
    secretKey: `${toHex(principalSecretKey).slice(0, 12)}…`,
  },
  agent: {
    secretKey: `${toHex(agentSecretKey).slice(0, 12)}…`,
    publicKey: `${toHex(derivePublicKey(agentSecretKey)).slice(0, 12)}…`,
  },
  mandate: terms
    ? {
        id: mandateId ? toHex(mandateId) : null,
        cap: terms.cap.toString(),
        scope: terms.scope.map((allowed, i) => (allowed ? i : -1)).filter((i) => i >= 0),
        expiry: Number(terms.expiry),
      }
    : null,
});

// --- boot ---------------------------------------------------------------

const boot = async (): Promise<void> => {
  const config = new StandaloneConfig();
  const logger = await createLogger(config.logDir);
  const testEnv = config.getEnvironment(logger);
  say('system', 'Starting local devnet (node + indexer + proof server)…');
  const envConfiguration = await testEnv.start();
  state.bootMessage = 'Syncing genesis wallet…';
  say('system', `Devnet up: node ${envConfiguration.node}, proof server ${envConfiguration.proofServer}`);
  const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, GENESIS_MINT_WALLET_SEED);
  await walletProvider.start();
  await waitForUnshieldedFunds(logger, walletProvider.wallet, envConfiguration, unshieldedToken());
  say('system', 'Wallet funded from genesis.');
  state.bootMessage = 'Deploying the AgentPass contract…';
  const zkConfigProvider = new NodeZkConfigProvider<'issueMandate' | 'proveAuthorized' | 'revokeMandate'>(
    config.zkConfigPath,
  );
  providers = {
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
  principal = await AgentPassAPI.deploy(providers, { principalSecretKey, mandateNonce }, logger);
  agent = await AgentPassAPI.join(
    providers,
    principal.deployedContractAddress,
    agentPrivateStateKey,
    { agentSecretKey },
    logger,
  );
  state.contractAddress = principal.deployedContractAddress;
  state.status = 'ready';
  say('system', `AgentPass contract deployed at ${principal.deployedContractAddress}`);
};

// --- request handling ---------------------------------------------------

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

const fromHexStr = (hex: string): Uint8Array => Uint8Array.from(Buffer.from(hex.replace(/^0x/, ''), 'hex'));

const withBusy = async <T>(res: http.ServerResponse, fn: () => Promise<T>): Promise<void> => {
  if (state.status !== 'ready') {
    json(res, 503, { error: 'devnet still starting' });
    return;
  }
  if (state.busy) {
    json(res, 409, { error: 'another proof is being generated — one at a time' });
    return;
  }
  state.busy = true;
  try {
    const result = await fn();
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
      const page = await readFile(PAGE_PATH);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page);
      return;
    }
    if (req.method === 'GET' && url === '/api/state') {
      json(res, 200, {
        status: state.status,
        bootMessage: state.bootMessage,
        busy: state.busy,
        contractAddress: state.contractAddress,
        private: privateSnapshot(),
        ledger: state.status === 'ready' ? await ledgerSnapshot() : null,
        log: state.log.slice(-60),
      });
      return;
    }
    if (req.method === 'POST' && url === '/api/issue') {
      const body = await readBody(req);
      await withBusy(res, async () => {
        const cap = typeof body.cap === 'string' || typeof body.cap === 'number' ? BigInt(body.cap) : 100n;
        const actions = (body.actions as number[] | undefined) ?? [0, 2];
        const days = Number(body.days ?? 30);
        // a fresh mandate id per issuance
        mandateNonce = randomBytes(32);
        mandateSalt = randomBytes(32);
        terms = makeTerms(cap, BigInt(Date.now() + days * 86_400_000), derivePublicKey(agentSecretKey), actions);
        await principal!.setPrivateState({ principalSecretKey, mandateNonce, terms, mandateSalt });
        say('principal', `Issuing mandate: cap ${cap}, actions [${actions.join(',')}], ${days} days…`);
        const issued = await principal!.issueMandate();
        mandateId = issued.mandateId;
        say(
          'principal',
          `Mandate issued. Pseudonymous id ${toHex(issued.mandateId).slice(0, 18)}… (tx ${issued.txHash.slice(0, 16)}…)`,
        );
        say('principal', 'Terms + salt handed to the agent off-chain.');
        return { mandateId: toHex(issued.mandateId), txHash: issued.txHash };
      });
      return;
    }
    if (req.method === 'POST' && url === '/api/authorize') {
      const body = await readBody(req);
      await withBusy(res, async () => {
        if (!mandateId || !terms) throw new Error('no mandate issued yet');
        const action = BigInt(Number(body.action ?? 0));
        const amount = typeof body.amount === 'string' || typeof body.amount === 'number' ? BigInt(body.amount) : 40n;
        await agent!.setPrivateState(agentState());
        say('agent', `Requesting authorization: action ${action}, amount ${amount} — generating ZK proof…`);
        const result = await agent!.proveAuthorized(mandateId, action, amount);
        say(
          'agent',
          `Authorized. Receipt ${toHex(result.requestId).slice(0, 18)}… (tx ${result.txHash.slice(0, 16)}…)`,
        );
        return { requestId: toHex(result.requestId), txHash: result.txHash };
      });
      return;
    }
    if (req.method === 'POST' && url === '/api/verify') {
      const body = await readBody(req);
      await withBusy(res, async () => {
        const requestId = fromHexStr(typeof body.requestId === 'string' ? body.requestId : '');
        const snapshot = await ledgerSnapshot();
        const receipt = snapshot?.receipts.find((r) => r.requestId === toHex(requestId));
        if (receipt) {
          say(
            'verifier',
            `Receipt ${toHex(requestId).slice(0, 18)}… VERIFIED: action ${receipt.action}, amount ${receipt.amount}.`,
          );
          return { found: true, receipt };
        }
        say('verifier', `Receipt ${toHex(requestId).slice(0, 18)}… not found on the ledger.`);
        return { found: false };
      });
      return;
    }
    if (req.method === 'POST' && url === '/api/revoke') {
      await withBusy(res, async () => {
        if (!mandateId || !terms) throw new Error('no mandate issued yet');
        await principal!.setPrivateState({ principalSecretKey, mandateNonce, terms, mandateSalt });
        say('principal', 'Revoking the mandate…');
        const { txHash } = await principal!.revokeMandate(mandateId);
        say('principal', `Mandate revoked on-chain. (tx ${txHash.slice(0, 16)}…)`);
        return { txHash };
      });
      return;
    }
    if (req.method === 'POST' && url === '/api/adversarial') {
      const body = await readBody(req);
      await withBusy(res, async () => {
        if (!mandateId || !terms) throw new Error('no mandate issued yet');
        await agent!.setPrivateState(agentState());
        const kind = typeof body.kind === 'string' ? body.kind : 'scope';
        const forbidden = terms.scope.findIndex((allowed) => !allowed);
        const [action, amount, label] =
          kind === 'scope' && forbidden >= 0
            ? [BigInt(forbidden), 1n, `out-of-scope action ${forbidden}`]
            : [0n, terms.cap + 1n, `over-cap amount ${terms.cap + 1n}`];
        say('agent', `(adversarial) Attempting ${label}…`);
        try {
          await agent!.proveAuthorized(mandateId, action, amount);
          say('agent', 'UNEXPECTED: the unauthorized action was accepted!');
          return { rejected: false };
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          say('agent', `Rejected at proof time — no transaction ever reached the chain: '${message}'`);
          return { rejected: true, message };
        }
      });
      return;
    }
    json(res, 404, { error: 'not found' });
  })().catch((e) => {
    json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  });
});

server.listen(PORT, () => {
  console.log(`AgentPass Control Room: http://localhost:${PORT}`);
});

boot().catch((e) => {
  state.status = 'failed';
  state.bootMessage = e instanceof Error ? e.message : String(e);
  say('system', `Boot failed: ${state.bootMessage}`);
});
