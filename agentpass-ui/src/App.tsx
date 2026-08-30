// Grant — the wallet-connected dApp, wearing the product design.
// Views live in views.tsx; this file owns state and the real credential
// logic: any Midnight wallet (Lace / Gero / 1AM) balances, signs, and
// submits every transaction; secrets stay in this browser.
//
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { type Logger } from 'pino';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import {
  AgentPassAPI,
  agentPrivateStateKey,
  makeTerms,
  derivePublicKey,
  type AgentPassProviders,
} from '../../api/src/index';
import { ACTION_LABELS, agentById } from './grant/agents';
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
import {
  Nav,
  Toast,
  Landing,
  Directory,
  AgentDetail,
  Dashboard,
  ReceiptDetail,
  Onboarding,
  PermissionSheet,
  FireModal,
  type View,
  type BlockedInfo,
} from './views';

const HOUR = 3_600_000;
const timeBound = (): bigint => BigInt(Math.ceil((Date.now() + 1) / HOUR) * HOUR);

const App: React.FC<{ logger: Logger }> = ({ logger }) => {
  const [view, setView] = useState<View>('landing');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');

  const [session, setSession] = useState<StoredSession>(() => loadSession());
  const [wallet, setWallet] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connStatus, setConnStatus] = useState('');
  const [connError, setConnError] = useState('');

  const [sheetAgent, setSheetAgent] = useState<string | null>(null);
  const [sheetCap, setSheetCap] = useState<bigint>(0n);
  const [sheetCount, setSheetCount] = useState(0);
  const [proving, setProving] = useState(false);
  const [busyAgent, setBusyAgent] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Record<string, BlockedInfo | undefined>>({});
  const [fireId, setFireId] = useState<string | null>(null);
  const [firing, setFiring] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pendingHire = useRef<string | null>(null);

  const providersRef = useRef<AgentPassProviders | null>(null);
  const principalRef = useRef<AgentPassAPI | null>(null);
  const agentRef = useRef<AgentPassAPI | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((v: View) => {
    setView(v);
    window.scrollTo(0, 0);
  }, []);

  const showToast = useCallback((text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const persist = useCallback((next: StoredSession) => {
    saveSession(next);
    setSession({ ...next, employments: { ...next.employments } });
  }, []);

  // ---------------------------------------------------------------- connect
  const connect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    setConnError('');
    try {
      setConnStatus('Waiting for your wallet to approve this app…');
      const networkId = import.meta.env.VITE_NETWORK_ID as string;
      const connectedAPI = await connectToWallet(logger, networkId);
      providersRef.current = await buildProviders(logger, connectedAPI);

      const current = loadSession();
      const principalState = { principalSecretKey: fromHexStr(current.principalSkHex) };
      const sharedRegistry = import.meta.env.VITE_REGISTRY_ADDRESS as string | undefined;
      if (!current.contractAddress && sharedRegistry) {
        current.contractAddress = sharedRegistry;
      }
      if (current.contractAddress) {
        setConnStatus('Joining your Grant registry…');
        principalRef.current = await AgentPassAPI.join(
          providersRef.current,
          current.contractAddress,
          'agentPassPrincipal',
          principalState,
          logger,
        );
      } else {
        setConnStatus('First run: publishing your registry — your wallet will ask to approve one transaction…');
        principalRef.current = await AgentPassAPI.deploy(providersRef.current, principalState, logger);
        current.contractAddress = principalRef.current.deployedContractAddress;
      }
      agentRef.current = await AgentPassAPI.join(
        providersRef.current,
        principalRef.current.deployedContractAddress,
        agentPrivateStateKey,
        {},
        logger,
      );
      persist(current);
      setWallet('wallet');
      showToast('Wallet connected. Your keys stay yours — it only signs permissions.');
      if (pendingHire.current) {
        const id = pendingHire.current;
        pendingHire.current = null;
        setAgentId(id);
        go('agent');
        openSheet(id);
      } else {
        go('directory');
      }
    } catch (e) {
      setConnError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
      setConnStatus('');
    }
  }, [connecting, logger, persist, showToast, go]);

  // ------------------------------------------------------------ hire flow
  const openSheet = useCallback((id: string) => {
    const a = agentById(id);
    setSheetAgent(id);
    setSheetCap(a.wants.cap);
    setProving(false);
    setSheetCount((n) => n + 1);
  }, []);

  const requestHire = useCallback(
    (id: string) => {
      if (!wallet) {
        pendingHire.current = id;
        go('onboarding');
        return;
      }
      openSheet(id);
    },
    [wallet, go, openSheet],
  );

  const allow = useCallback(async () => {
    const id = sheetAgent;
    if (!id || proving) return;
    const a = agentById(id);
    setProving(true);
    try {
      const principal = principalRef.current!;
      const current = loadSession();
      const agentSk = randomBytes(32);
      const nonce = randomBytes(32);
      const salt = randomBytes(32);
      const expiry = BigInt(Date.now() + a.wants.days * 86_400_000);
      const terms = makeTerms(sheetCap, expiry, derivePublicKey(agentSk), a.wants.actions);
      await principal.setPrivateState({
        principalSecretKey: fromHexStr(current.principalSkHex),
        mandateNonce: nonce,
        terms,
        mandateSalt: salt,
      });
      const { mandateId } = await principal.issueMandate();
      current.employments[id] = {
        agentId: id,
        agentSkHex: toHexStr(agentSk),
        nonceHex: toHexStr(nonce),
        saltHex: toHexStr(salt),
        mandateIdHex: toHex(mandateId),
        cap: sheetCap.toString(),
        expiry: expiry.toString(),
        scope: a.wants.actions,
        receipts: [],
        taskCursor: 0,
        status: 'active',
        lastResult: '',
      };
      persist(current);
      setSheetAgent(null);
      go('dashboard');
      showToast(`${a.name} is working for you. Credential issued — private, capped, revocable.`);
    } catch (e) {
      setSheetAgent(null);
      showToast(`Hiring failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setProving(false);
    }
  }, [sheetAgent, sheetCap, proving, persist, go, showToast]);

  // ------------------------------------------------------------ agent state
  const agentState = (e: StoredEmployment) => ({
    agentSecretKey: fromHexStr(e.agentSkHex),
    terms: makeTerms(BigInt(e.cap), BigInt(e.expiry), derivePublicKey(fromHexStr(e.agentSkHex)), e.scope),
    mandateSalt: fromHexStr(e.saltHex),
    timeBound: timeBound(),
  });

  const run = useCallback(
    async (id: string) => {
      if (busyAgent) return;
      const a = agentById(id);
      const current = loadSession();
      const e = current.employments[id];
      if (!e || e.status === 'fired') return;
      setBusyAgent(id);
      try {
        const task = a.tasks[e.taskCursor % a.tasks.length];
        await agentRef.current!.setPrivateState(agentState(e));
        const result = await agentRef.current!.proveAuthorized(
          fromHexStr(e.mandateIdHex),
          BigInt(task.action),
          task.amount,
        );
        e.taskCursor += 1;
        e.receipts.push({
          label: task.label,
          action: task.action,
          amount: task.amount.toString(),
          requestId: toHex(result.requestId),
          txHash: result.txHash,
          agentId: id,
          mandateIdHex: e.mandateIdHex,
          at: Date.now(),
        });
        persist(current);
        showToast(`Done: ${task.label} · receipt rcpt_${toHex(result.requestId).slice(0, 6)} posted.`);
      } catch (err) {
        showToast(`${a.name} could not prove that: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setBusyAgent(null);
      }
    },
    [busyAgent, persist, showToast],
  );

  const test = useCallback(
    async (id: string) => {
      if (busyAgent) return;
      const a = agentById(id);
      const current = loadSession();
      const e = current.employments[id];
      if (!e || e.status === 'fired') return;
      setBusyAgent(id);
      const forbidden = ACTION_LABELS.findIndex((_, i) => !e.scope.includes(i));
      try {
        await agentRef.current!.setPrivateState(agentState(e));
        await agentRef.current!.proveAuthorized(fromHexStr(e.mandateIdHex), BigInt(forbidden), 1n);
        showToast('UNEXPECTED: the forbidden action was accepted!');
      } catch {
        setBlocked((b) => ({ ...b, [id]: { action: ACTION_LABELS[forbidden] } }));
        showToast(`Rejected at proof time — the chain never saw ${a.name}'s attempt.`);
      } finally {
        setBusyAgent(null);
      }
    },
    [busyAgent, showToast],
  );

  const confirmFire = useCallback(async () => {
    const id = fireId;
    if (!id || firing) return;
    const a = agentById(id);
    setFiring(true);
    try {
      const current = loadSession();
      const e = current.employments[id];
      await principalRef.current!.setPrivateState({
        principalSecretKey: fromHexStr(current.principalSkHex),
        mandateNonce: fromHexStr(e.nonceHex),
        terms: makeTerms(BigInt(e.cap), BigInt(e.expiry), derivePublicKey(fromHexStr(e.agentSkHex)), e.scope),
        mandateSalt: fromHexStr(e.saltHex),
      });
      await principalRef.current!.revokeMandate(fromHexStr(e.mandateIdHex));
      e.status = 'fired';
      e.revokedAt = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      persist(current);
      setFireId(null);
      showToast(`${a.name} fired. Credential revoked on-chain — locked out everywhere, forever.`);
    } catch (e) {
      showToast(`Revocation failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setFiring(false);
    }
  }, [fireId, firing, persist, showToast]);

  // ---------------------------------------------------------------- derive
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const employments = Object.values(session.employments);
  const hiredCount = employments.filter((e) => e.status === 'active').length;
  const allReceipts = employments.flatMap((e) => e.receipts).sort((a, b) => b.at - a.at);
  const currentAgent = agentId ? agentById(agentId) : null;
  const currentReceipt = receiptId ? allReceipts.find((r) => r.requestId === receiptId) : null;
  const sheetA = sheetAgent ? agentById(sheetAgent) : null;

  return (
    <div>
      <Nav view={view} hiredCount={hiredCount} wallet={wallet} go={go} />

      {view === 'landing' && (
        <Landing
          seeItWork={() => {
            setAgentId('submanager');
            go('agent');
          }}
          goDirectory={() => go('directory')}
        />
      )}
      {view === 'directory' && (
        <Directory
          cat={cat}
          q={q}
          setCat={setCat}
          setQ={setQ}
          employments={session.employments}
          openAgent={(id) => {
            setAgentId(id);
            go('agent');
          }}
        />
      )}
      {view === 'agent' && currentAgent && (
        <AgentDetail
          agent={currentAgent}
          employment={session.employments[currentAgent.id]}
          latestReceipt={allReceipts.find((r) => r.agentId === currentAgent.id)}
          goDirectory={() => go('directory')}
          hire={() => requestHire(currentAgent.id)}
        />
      )}
      {view === 'dashboard' && (
        <Dashboard
          employments={employments}
          receipts={allReceipts}
          busyAgent={busyAgent}
          blocked={blocked}
          dismissBlocked={(id) => setBlocked((b) => ({ ...b, [id]: undefined }))}
          goDirectory={() => go('directory')}
          run={(id) => void run(id)}
          test={(id) => void test(id)}
          askFire={setFireId}
          openReceipt={(id) => {
            setReceiptId(id);
            go('receipt');
          }}
        />
      )}
      {view === 'receipt' && currentReceipt && (
        <ReceiptDetail receipt={currentReceipt} goDashboard={() => go('dashboard')} />
      )}
      {view === 'onboarding' && (
        <Onboarding connecting={connecting} status={connStatus} error={connError} connect={() => void connect()} />
      )}

      {sheetA && (
        <PermissionSheet
          agent={sheetA}
          cap={sheetCap}
          sheetNo={sheetCount}
          proving={proving}
          provingText={`Your wallet approves, then a zero-knowledge proof is generated. ${sheetA.name} will get a leash — never your keys.`}
          capDown={() => setSheetCap((c) => (c > 5n ? c - 5n : c))}
          capUp={() => setSheetCap((c) => (sheetA && c + 5n <= sheetA.wants.cap ? c + 5n : c))}
          deny={() => setSheetAgent(null)}
          allow={() => void allow()}
        />
      )}
      {fireId && (
        <FireModal
          agent={agentById(fireId)}
          firing={firing}
          cancel={() => setFireId(null)}
          confirm={() => void confirmFire()}
        />
      )}
      {toast && <Toast text={toast} />}
    </div>
  );
};

export default App;
