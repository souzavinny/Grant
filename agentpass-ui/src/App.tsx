// Grant — hire AI agents with permissions, not passwords.
// Wallet-connected dApp: the user's own Midnight wallet (Lace / Gero / 1AM)
// balances, signs, and submits every transaction; credentials and receipts
// live on-chain; all secrets stay in this browser.
//
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { type Logger } from 'pino';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import {
  AgentPassAPI,
  type AgentPassProviders,
  agentPrivateStateKey,
  makeTerms,
  derivePublicKey,
} from '../../api/src/index';
import { AgentPass } from 'agentpass-contract';
import { ACTION_LABELS, AGENTS, agentById, type DirectoryAgent } from './grant/agents';
import {
  loadSession,
  saveSession,
  toHexStr,
  fromHexStr,
  randomBytes,
  type StoredEmployment,
  type StoredSession,
} from './grant/session';
import { connectToWallet, buildProviders } from './grant/wallet';

const HOUR = 3_600_000;

type Phase = 'connect' | 'connecting' | 'setup' | 'ready';

type LedgerView = {
  mandates: Array<{ id: string; spent: string; revoked: boolean }>;
  authorizations: string;
  receiptCount: number;
};

type SheetState = { agent: DirectoryAgent; cap: string } | null;

const employmentTerms = (e: StoredEmployment): AgentPass.MandateTerms =>
  makeTerms(BigInt(e.cap), BigInt(e.expiry), derivePublicKey(fromHexStr(e.agentSkHex)), e.scope);

const timeBound = (): bigint => BigInt(Math.ceil((Date.now() + 1) / HOUR) * HOUR);

const App: React.FC<{ logger: Logger }> = ({ logger }) => {
  const [phase, setPhase] = useState<Phase>('connect');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [session, setSession] = useState<StoredSession>(() => loadSession());
  const [ledger, setLedger] = useState<LedgerView | null>(null);

  const providersRef = useRef<AgentPassProviders | null>(null);
  const principalRef = useRef<AgentPassAPI | null>(null);
  const agentRef = useRef<AgentPassAPI | null>(null);

  const persist = useCallback((next: StoredSession) => {
    saveSession(next);
    setSession({ ...next, employments: { ...next.employments } });
  }, []);

  // ------------------------------------------------------------------ connect
  const connect = useCallback(async () => {
    setPhase('connecting');
    setError('');
    try {
      setStatus('Waiting for your wallet to approve this app…');
      const networkId = import.meta.env.VITE_NETWORK_ID as string;
      const connectedAPI = await connectToWallet(logger, networkId);
      const providers = await buildProviders(logger, connectedAPI);
      providersRef.current = providers;

      setPhase('setup');
      const current = loadSession();
      const principalState = { principalSecretKey: fromHexStr(current.principalSkHex) };
      if (current.contractAddress) {
        setStatus('Joining your Grant registry…');
        principalRef.current = await AgentPassAPI.join(
          providers,
          current.contractAddress,
          'agentPassPrincipal',
          principalState,
          logger,
        );
      } else {
        setStatus('First run: publishing your Grant registry (your wallet will ask to approve one transaction)…');
        principalRef.current = await AgentPassAPI.deploy(providers, principalState, logger);
        current.contractAddress = principalRef.current.deployedContractAddress;
      }
      agentRef.current = await AgentPassAPI.join(
        providers,
        principalRef.current.deployedContractAddress,
        agentPrivateStateKey,
        {},
        logger,
      );
      persist(current);
      setPhase('ready');
      setStatus('');
    } catch (e) {
      setPhase('connect');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [logger, persist]);

  // ------------------------------------------------------------- ledger poll
  const refreshLedger = useCallback(async () => {
    const providers = providersRef.current;
    const principal = principalRef.current;
    if (!providers || !principal) return;
    try {
      const contractState = await providers.publicDataProvider.queryContractState(principal.deployedContractAddress);
      if (contractState == null) return;
      const l = AgentPass.ledger(contractState.data);
      const mandates: LedgerView['mandates'] = [];
      for (const [id] of l.mandateCommitments) {
        mandates.push({
          id: toHex(id),
          spent: (l.spentAmounts.member(id) ? l.spentAmounts.lookup(id) : 0n).toString(),
          revoked: l.revokedMandates.member(id),
        });
      }
      setLedger({
        mandates,
        authorizations: l.authorizations.toString(),
        receiptCount: [...l.receipts].length,
      });
    } catch (e) {
      logger.warn(e, 'ledger refresh failed');
    }
  }, [logger]);

  useEffect(() => {
    if (phase !== 'ready') return;
    void refreshLedger();
    const timer = setInterval(() => void refreshLedger(), 6_000);
    return () => clearInterval(timer);
  }, [phase, refreshLedger]);

  // ---------------------------------------------------------------- actions
  const withEmployment = (agentId: string): StoredEmployment => {
    const employment = session.employments[agentId];
    if (!employment) throw new Error('not hired');
    return employment;
  };

  const setResult = (agentId: string, lastResult: string) => {
    const current = loadSession();
    if (current.employments[agentId]) {
      current.employments[agentId].lastResult = lastResult;
      persist(current);
    }
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setStatus(label);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setStatus('');
      void refreshLedger();
    }
  };

  const hire = (agent: DirectoryAgent, cap: bigint) =>
    run(`Issuing ${agent.name}'s credential — approve in your wallet, then the proof is generated…`, async () => {
      const principal = principalRef.current!;
      const current = loadSession();
      const agentSk = randomBytes(32);
      const nonce = randomBytes(32);
      const salt = randomBytes(32);
      const expiry = BigInt(Date.now() + agent.wants.days * 86_400_000);
      const terms = makeTerms(cap, expiry, derivePublicKey(agentSk), agent.wants.actions);
      await principal.setPrivateState({
        principalSecretKey: fromHexStr(current.principalSkHex),
        mandateNonce: nonce,
        terms,
        mandateSalt: salt,
      });
      const { mandateId } = await principal.issueMandate();
      current.employments[agent.id] = {
        agentId: agent.id,
        agentSkHex: toHexStr(agentSk),
        nonceHex: toHexStr(nonce),
        saltHex: toHexStr(salt),
        mandateIdHex: toHex(mandateId),
        cap: cap.toString(),
        expiry: expiry.toString(),
        scope: agent.wants.actions,
        receipts: [],
        taskCursor: 0,
        status: 'active',
        lastResult: 'Hired — credential issued by your wallet.',
      };
      persist(current);
      setSheet(null);
    });

  const work = (agentId: string) => {
    const agent = agentById(agentId);
    return run(`${agent.name} is proving authorization — approve in your wallet…`, async () => {
      const employment = withEmployment(agentId);
      if (employment.status === 'fired') throw new Error(`${agent.name} was fired`);
      const task = agent.tasks[employment.taskCursor % agent.tasks.length];
      await agentRef.current!.setPrivateState({
        agentSecretKey: fromHexStr(employment.agentSkHex),
        terms: employmentTerms(employment),
        mandateSalt: fromHexStr(employment.saltHex),
        timeBound: timeBound(),
      });
      const result = await agentRef.current!.proveAuthorized(
        fromHexStr(employment.mandateIdHex),
        BigInt(task.action),
        task.amount,
      );
      const current = loadSession();
      const stored = current.employments[agentId];
      stored.taskCursor += 1;
      stored.receipts.push({
        label: task.label,
        action: task.action,
        amount: task.amount.toString(),
        requestId: toHex(result.requestId),
        txHash: result.txHash,
      });
      stored.lastResult = `${task.label} — authorized.`;
      persist(current);
    });
  };

  const testLimits = (agentId: string) => {
    const agent = agentById(agentId);
    return run(`${agent.name} is attempting something you never allowed…`, async () => {
      const employment = withEmployment(agentId);
      const forbidden = ACTION_LABELS.findIndex((_, i) => !employment.scope.includes(i));
      await agentRef.current!.setPrivateState({
        agentSecretKey: fromHexStr(employment.agentSkHex),
        terms: employmentTerms(employment),
        mandateSalt: fromHexStr(employment.saltHex),
        timeBound: timeBound(),
      });
      try {
        await agentRef.current!.proveAuthorized(fromHexStr(employment.mandateIdHex), BigInt(forbidden), 1n);
        setResult(agentId, 'UNEXPECTED: the forbidden action was accepted!');
      } catch {
        setResult(
          agentId,
          `Blocked before it could happen: no proof exists for a '${ACTION_LABELS[forbidden]}' action you never allowed.`,
        );
      }
    });
  };

  const fire = (agentId: string) => {
    const agent = agentById(agentId);
    return run(`Revoking ${agent.name}'s credential — approve in your wallet…`, async () => {
      const employment = withEmployment(agentId);
      const current = loadSession();
      await principalRef.current!.setPrivateState({
        principalSecretKey: fromHexStr(current.principalSkHex),
        mandateNonce: fromHexStr(employment.nonceHex),
        terms: employmentTerms(employment),
        mandateSalt: fromHexStr(employment.saltHex),
      });
      await principalRef.current!.revokeMandate(fromHexStr(employment.mandateIdHex));
      const stored = current.employments[agentId];
      stored.status = 'fired';
      stored.lastResult = 'Fired — credential revoked on-chain.';
      persist(current);
    });
  };

  // ------------------------------------------------------------------ views
  if (phase !== 'ready') {
    return (
      <div className="gate">
        <div className="dot" aria-hidden="true" />
        <div className="wordmark">Grant</div>
        <p className="gate-tag">Hire AI agents with permissions, not passwords.</p>
        {phase === 'connect' && (
          <>
            <button className="btn allow" onClick={() => void connect()}>
              Connect wallet
            </button>
            <p className="gate-hint">
              Works with any Midnight wallet — Lace, Gero, or 1AM — set to this network. Your wallet signs every
              credential; your identity never leaves it.
            </p>
          </>
        )}
        {(phase === 'connecting' || phase === 'setup') && <p className="gate-status">{status}</p>}
        {error && <p className="gate-error">{error}</p>}
      </div>
    );
  }

  const employments = Object.values(session.employments);

  return (
    <div className="app">
      <header>
        <div>
          <div className="wordmark">Grant</div>
          <div className="tag">Hire AI agents with permissions, not passwords.</div>
        </div>
        <div className="grow" />
        {busy && <span className="pill busy-pill">{status || 'working…'}</span>}
        <span className="pill">wallet connected ●</span>
        <span className="pill" title={session.contractAddress}>
          registry {session.contractAddress?.slice(0, 10)}…
        </span>
      </header>

      <main>
        {error && <div className="error-bar">{error}</div>}

        <h2 className="sec">Agents for hire</h2>
        <div className="grid">
          {AGENTS.map((agent) => {
            const employment = session.employments[agent.id];
            return (
              <div className="agent-card" key={agent.id}>
                <div className="agent-head">
                  <div className="avatar">{agent.emoji}</div>
                  <h3>{agent.name}</h3>
                </div>
                <p>{agent.blurb}</p>
                <div className="wants">
                  {agent.wants.actions.map((i) => (
                    <span className="want" key={i}>
                      {ACTION_LABELS[i]}
                    </span>
                  ))}
                  <span className="want">up to {agent.wants.cap.toString()}</span>
                  <span className="want">{agent.wants.days} days</span>
                </div>
                {employment?.status === 'active' ? (
                  <div className="hired-note">Working for you ✓</div>
                ) : (
                  <button
                    className="hire-btn"
                    disabled={busy}
                    onClick={() => setSheet({ agent, cap: agent.wants.cap.toString() })}
                  >
                    Hire {agent.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <h2 className="sec">Working for you</h2>
        {employments.length === 0 ? (
          <div className="empty-emps">Nobody yet. Hire an agent above — you stay anonymous, it gets a leash.</div>
        ) : (
          employments.map((e) => {
            const agent = agentById(e.agentId);
            const spent = e.receipts.reduce((sum, r) => sum + Number(r.amount), 0);
            const frac = Math.min(1, spent / Number(e.cap));
            const circumference = 2 * Math.PI * 32;
            return (
              <div className={`emp-card ${e.status}`} key={e.agentId}>
                <div className="ringwrap">
                  <div className="ring">
                    <svg width="74" height="74">
                      <circle cx="37" cy="37" r="32" fill="none" stroke="#edf1f6" strokeWidth="7" />
                      <circle
                        cx="37"
                        cy="37"
                        r="32"
                        fill="none"
                        stroke={frac < 1 ? '#2f6bff' : '#d64545'}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - frac)}
                      />
                    </svg>
                    <div className="emoji">{agent.emoji}</div>
                  </div>
                  <span className="ring-label">
                    {spent} / {e.cap}
                  </span>
                </div>
                <div className="emp-main">
                  <h3>
                    {agent.name}{' '}
                    <span className={`badge ${e.status}`}>{e.status === 'active' ? 'working' : 'fired'}</span>
                  </h3>
                  <div className="emp-scope">
                    may {e.scope.map((i) => ACTION_LABELS[i]).join(' + ')} · until{' '}
                    {new Date(Number(e.expiry)).toISOString().slice(0, 10)} · credential {e.mandateIdHex.slice(0, 12)}…
                  </div>
                  <div className="receipts">
                    {e.receipts.length === 0 ? (
                      <div className="none">No tasks yet — press “Run a task”.</div>
                    ) : (
                      e.receipts
                        .slice(-6)
                        .reverse()
                        .map((r) => (
                          <div className="receipt" key={r.requestId}>
                            <span>{r.label}</span>
                            <span className="amt">{r.amount}</span>
                            <span className="rid">receipt {r.requestId.slice(0, 12)}…</span>
                          </div>
                        ))
                    )}
                  </div>
                  <div className="lastline">{e.lastResult}</div>
                </div>
                <div className="emp-actions">
                  {e.status === 'active' ? (
                    <>
                      <button className="act-btn" disabled={busy} onClick={() => void work(e.agentId)}>
                        Run a task
                      </button>
                      <button className="act-btn" disabled={busy} onClick={() => void testLimits(e.agentId)}>
                        Test the limits
                      </button>
                      <button className="act-btn fire" disabled={busy} onClick={() => void fire(e.agentId)}>
                        Fire
                      </button>
                    </>
                  ) : (
                    <div className="locked">Credential revoked on-chain — it can’t prove anything anymore.</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {sheet && (
        <div
          className="sheet-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget && !busy) setSheet(null);
          }}
        >
          <div className="sheet">
            <div className="avatar big">{sheet.agent.emoji}</div>
            <h3>
              “<span className="name">{sheet.agent.name}</span>” wants to:
            </h3>
            <div className="grants">
              <div className="grant-row">
                <span className="ic">✓</span>
                <span>{sheet.agent.wants.actions.map((i) => ACTION_LABELS[i]).join(' and ')} on your behalf</span>
              </div>
              <div className="grant-row">
                <span className="ic">✓</span>
                <span>spend up to</span>
                <input
                  type="number"
                  min={1}
                  value={sheet.cap}
                  aria-label="spend cap"
                  onChange={(event) => setSheet({ ...sheet, cap: event.target.value })}
                />
                <span className="hint">you can lower this</span>
              </div>
              <div className="grant-row">
                <span className="ic">✓</span>
                <span>for {sheet.agent.wants.days} days, unless you fire it first</span>
              </div>
            </div>
            <p className="fine">
              Allowing issues a private credential on Midnight, signed by <b>your wallet</b>. <b>{sheet.agent.name}</b>{' '}
              can act only inside these limits — and never learns who you are. You can fire it anytime.
            </p>
            {busy ? (
              <div className="prog">{status}</div>
            ) : (
              <div className="sheet-btns">
                <button className="deny" onClick={() => setSheet(null)}>
                  Don&apos;t allow
                </button>
                <button className="allow" onClick={() => void hire(sheet.agent, BigInt(sheet.cap || '1'))}>
                  Allow
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer>
        <div className="strip-head">
          <h3>What the rest of the world sees</h3>
          <span className="exp">pseudonymous credentials and receipts — no identities, caps, scopes, or expiries</span>
        </div>
        <div className="strip">
          {ledger
            ? `${ledger.mandates.length} credential(s) · ${ledger.authorizations} authorization(s) · ${ledger.receiptCount} receipt(s)   ` +
              ledger.mandates
                .map((m) => `[${m.id.slice(0, 10)}… spent ${m.spent}${m.revoked ? ' REVOKED' : ''}]`)
                .join(' ')
            : '—'}
        </div>
      </footer>
    </div>
  );
};

export default App;
