// Grant views — the product design as presentational React components.
// All real behavior arrives via props from App.tsx.
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { ACTION_LABELS, AGENTS, CATS, agentById, fmt, type DirectoryAgent } from './grant/agents';
import type { StoredEmployment, StoredReceipt } from './grant/session';

// ---------------------------------------------------------------- icons

export const Seal: React.FC<{ size?: number }> = ({ size = 29 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <circle
      cx="16"
      cy="16"
      r="14.5"
      style={{
        fill: 'none',
        stroke: '#201D16',
        strokeWidth: 1.6,
        strokeDasharray: '3.2 3',
        transformOrigin: '16px 16px',
        animation: 'spinSlow 24s linear infinite',
      }}
    />
    <circle cx="16" cy="16" r="10" style={{ fill: '#201D16' }} />
    <path d="M11.6 16.4l3 3 5.8-6.6" style={{ fill: 'none', stroke: '#F3EFE6', strokeWidth: 2.4 }} />
  </svg>
);

const Check: React.FC<{ size?: number; color?: string }> = ({ size = 15, color = '#2440D4' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.6}
    strokeLinecap="square"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const Cross: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#C6402C' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.4}
    strokeLinecap="square"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const ShieldCheck: React.FC<{ size?: number; color?: string }> = ({ size = 13, color = '#2F6B4F' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.2}
    strokeLinecap="square"
  >
    <path d="M12 3l7 3v5c0 4.6-3 7.7-7 9.2C8 18.7 5 15.6 5 11V6z" />
    <path d="M9.5 12l1.8 1.8L15 10" />
  </svg>
);

const ShieldPlain: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="square"
    style={{ flex: 'none' }}
  >
    <path d="M12 3l7 3v5c0 4.6-3 7.7-7 9.2C8 18.7 5 15.6 5 11V6z" />
  </svg>
);

const Slash: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#C6402C"
    strokeWidth={2.2}
    strokeLinecap="square"
    style={{ flex: 'none', marginTop: 1 }}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M5.8 5.8l12.4 12.4" />
  </svg>
);

const Lock: React.FC<{ dashedShackle?: boolean }> = ({ dashedShackle }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="square"
    style={{ flex: 'none' }}
  >
    <rect x="5" y="11" width="14" height="9" rx="1" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeDasharray={dashedShackle ? '3 2.4' : undefined} />
  </svg>
);

const BackChevron: React.FC = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="square"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const Avatar: React.FC<{ agent: DirectoryAgent; size: number; grayscale?: boolean }> = ({ agent, size, grayscale }) => (
  <span
    className="avatar-tile"
    style={{
      width: size,
      height: size,
      background: agent.tint,
      fontSize: size / 2,
      filter: grayscale ? 'grayscale(1)' : 'none',
    }}
  >
    {agent.emoji}
  </span>
);

// ---------------------------------------------------------------- shared

export type View = 'landing' | 'directory' | 'agent' | 'dashboard' | 'receipt' | 'onboarding';

export const Nav: React.FC<{
  view: View;
  hiredCount: number;
  wallet: string | null;
  go: (v: View) => void;
}> = ({ view, hiredCount, wallet, go }) => (
  <div className="nav-bar">
    <div className="nav-inner">
      <button className="nav-logo" onClick={() => go('landing')} aria-label="Grant home">
        <span style={{ display: 'inline-flex', transform: 'translateY(6px)' }}>
          <Seal />
        </span>
        <span className="word">Grant</span>
      </button>
      <button
        className={`nav-link ${view === 'directory' || view === 'agent' ? 'active' : ''}`}
        onClick={() => go('directory')}
      >
        Agents
      </button>
      <button
        className={`nav-link ${view === 'dashboard' || view === 'receipt' ? 'active' : ''}`}
        onClick={() => go('dashboard')}
      >
        Working for you
        {hiredCount > 0 && <span className="nav-badge">{hiredCount}</span>}
      </button>
      <span style={{ flex: 1 }} />
      {wallet ? (
        <span className="wallet-pill">
          <span className="dot" />
          {wallet.toUpperCase()} CONNECTED
        </span>
      ) : (
        <button className="btn-outline" onClick={() => go('onboarding')}>
          Connect wallet
        </button>
      )}
    </div>
  </div>
);

export const Toast: React.FC<{ text: string }> = ({ text }) => (
  <div role="status" className="toast">
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#8FD3B0"
      strokeWidth={2.6}
      strokeLinecap="square"
      style={{ flex: 'none' }}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
    {text}
  </div>
);

// ---------------------------------------------------------------- landing

export const Landing: React.FC<{ seeItWork: () => void; goDirectory: () => void }> = ({ seeItWork, goDirectory }) => (
  <div>
    <div className="hero-band">
      <div className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Secured by zero-knowledge proofs on Midnight</div>
          <h1>
            Hire AI agents with <em>permissions</em>,<br />
            not passwords.
          </h1>
          <p className="lede">
            Handing an agent your passwords means total access, no limits, no undo. Grant issues it a private, revocable
            credential instead — it can only do what you allowed, and one tap fires it forever.
          </p>
          <div className="hero-ctas">
            <button className="btn btn-primary" onClick={seeItWork}>
              See it work
            </button>
            <button className="btn btn-secondary" onClick={goDirectory}>
              Browse agents
            </button>
          </div>
        </div>
        <div className="hero-ticket-wrap">
          <div className="ticket">
            <div className="ticket-head">
              <span>Permission request</span>
              <span>№ 0001</span>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 18 }}>
                <Avatar agent={AGENTS[0]} size={46} />
                <div>
                  <div className="serif" style={{ fontSize: 22 }}>
                    SubManager wants to:
                  </div>
                  <div className="mono-s">from Loop Labs</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 20 }}>
                <div className="check-row">
                  <Check />
                  subscribe on your behalf
                </div>
                <div className="check-row">
                  <Check />
                  <span>
                    spend up to <strong>$30</strong> <span style={{ color: 'var(--mut)' }}>— you can lower this</span>
                  </span>
                </div>
                <div className="check-row">
                  <Check />
                  <span>
                    for <strong>30 days</strong>, unless you fire it first
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <span
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                    padding: 12,
                    fontWeight: 600,
                    fontSize: 14.5,
                    color: 'var(--mut)',
                  }}
                >
                  Don't allow
                </span>
                <span
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    background: 'var(--blue)',
                    padding: 12,
                    fontWeight: 600,
                    fontSize: 14.5,
                    color: '#fff',
                    boxShadow: '3px 3px 0 var(--ink)',
                  }}
                >
                  Allow
                </span>
              </div>
            </div>
            <div className="ticket-stamp">NEVER LEARNS WHO YOU ARE</div>
          </div>
        </div>
      </div>
    </div>

    <div className="section">
      <div className="eyebrow">The whole idea</div>
      <h2 className="serif">Hire. It works. Fire.</h2>
      <div className="steps">
        <div className="step">
          <div className="num">1</div>
          <div className="t">Hire</div>
          <p>
            Pick an agent. A permission sheet shows exactly what it wants — nothing more. Tap Allow and it gets a
            private credential, not your passwords.
          </p>
        </div>
        <div className="step">
          <div className="num">2</div>
          <div className="t">It works</div>
          <p>
            Every task posts a verifiable public receipt. Anything outside its limits is blocked before it happens — no
            proof can exist for an action you never allowed.
          </p>
        </div>
        <div className="step">
          <div className="num">3</div>
          <div className="t">Fire</div>
          <p>
            One tap revokes the credential on-chain. Locked out everywhere, forever. Revoking is math, not a support
            ticket.
          </p>
        </div>
      </div>
    </div>

    <div className="section" style={{ paddingTop: 56 }}>
      <div className="feature-grid">
        <div className="feature">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2440D4"
            strokeWidth={2}
            strokeLinecap="square"
          >
            <circle cx="12" cy="12" r="9" strokeDasharray="3 2.6" />
            <circle cx="12" cy="9.6" r="2.6" />
            <path d="M7.4 17.2c.9-2.1 2.6-3.2 4.6-3.2s3.7 1.1 4.6 3.2" />
          </svg>
          <div className="t">Private by design</div>
          <p>The agent never learns who you are. It works for a pseudonym, cryptographically yours.</p>
        </div>
        <div className="feature">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2440D4"
            strokeWidth={2}
            strokeLinecap="square"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M5.8 5.8l12.4 12.4" />
          </svg>
          <div className="t">Blocked before it happens</div>
          <p>
            Limits are enforced by cryptography, not promises. Over-cap actions can't even be proven — so they can't
            happen.
          </p>
        </div>
        <div className="feature">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2440D4"
            strokeWidth={2}
            strokeLinecap="square"
          >
            <path d="M6.5 3.5h11v17l-2.75-2-2.75 2-2.75-2-2.75 2z" />
            <path d="M9.5 8.5h5M9.5 12h5" />
          </svg>
          <div className="t">Receipts, not reviews</div>
          <p>Every task posts a verifiable public receipt. An agent's track record is math you can check.</p>
        </div>
        <div className="feature">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2440D4"
            strokeWidth={2}
            strokeLinecap="square"
          >
            <rect x="5" y="11" width="14" height="9" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeDasharray="3 2.4" />
          </svg>
          <div className="t">One tap to fire</div>
          <p>Revoked on-chain, locked out everywhere, forever. No password resets, no cleanup.</p>
        </div>
      </div>
    </div>

    <div className="section">
      <div className="eyebrow">Privacy, legible</div>
      <h2 className="serif" style={{ marginBottom: 10 }}>
        What the rest of the world sees
      </h2>
      <p className="sub" style={{ margin: '0 0 26px', fontSize: 15, color: 'var(--mut)', maxWidth: '60ch' }}>
        Receipts are public so anyone can verify an agent's record. You are not in them.
      </p>
      <div className="two-col" style={{ marginBottom: 0 }}>
        <div className="card-ink" style={{ padding: 24 }}>
          <div className="dash-head" style={{ color: 'var(--grn)' }}>
            On the public ledger
          </div>
          <div className="ledger-demo">
            <div className="row">
              <span style={{ color: 'var(--mut)' }}>task</span>
              <span>subscribe · $11</span>
            </div>
            <div className="row">
              <span style={{ color: 'var(--mut)' }}>credential</span>
              <span>cred:mn1_7c…e2</span>
            </div>
            <div className="row">
              <span style={{ color: 'var(--mut)' }}>receipt</span>
              <span>rcpt:zk_a4…91</span>
            </div>
            <div className="row">
              <span style={{ color: 'var(--mut)' }}>proof</span>
              <span style={{ color: 'var(--grn)' }}>π valid ✓</span>
            </div>
          </div>
        </div>
        <div className="panel" style={{ padding: 24 }}>
          <div className="dash-head">Deliberately absent</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontSize: 14, color: 'var(--mut)' }}>
            <div className="omit-row">
              <Cross />
              who you are
            </div>
            <div className="omit-row">
              <Cross />
              your spending caps
            </div>
            <div className="omit-row">
              <Cross />
              what else you allowed
            </div>
            <div className="omit-row">
              <Cross />
              when your credentials expire
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="closing">
      <h2>
        Delegation <em>without</em> surrender.
      </h2>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={seeItWork}>
          See it work
        </button>
        <button className="btn btn-secondary" onClick={goDirectory}>
          Browse agents
        </button>
      </div>
    </div>
    <div className="footer-band">
      <div className="footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Seal size={18} />
          <span className="serif" style={{ fontSize: 19, color: 'var(--ink)' }}>
            Grant
          </span>
        </span>
        <span>open source · Apache-2.0</span>
        <a href="https://github.com" onClick={(e) => e.preventDefault()}>
          GitHub
        </a>
        <span style={{ flex: 1 }} />
        <span>Built on Midnight · Midnight Buildathon 2026</span>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------- directory

export const Directory: React.FC<{
  cat: string;
  q: string;
  setCat: (c: string) => void;
  setQ: (q: string) => void;
  employments: Record<string, StoredEmployment>;
  openAgent: (id: string) => void;
}> = ({ cat, q, setCat, setQ, employments, openAgent }) => {
  const list = AGENTS.filter(
    (a) => (cat === 'All' || a.cat === cat) && `${a.name} ${a.line} ${a.cat}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="page">
      <div className="eyebrow">Directory</div>
      <h1>Agents for hire</h1>
      <p className="sub">Every agent works on a leash you set. Records below are receipts, not reviews.</p>
      <div className="filter-bar">
        {CATS.map((c) => (
          <button key={c} className={`cat-btn ${c === cat ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <input
          className="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search agents"
          aria-label="Search agents"
        />
      </div>
      {list.length === 0 && (
        <div className="empty-box">
          <div className="serif" style={{ fontSize: 26, color: 'var(--ink)', marginBottom: 6 }}>
            No agents match
          </div>
          <div style={{ fontSize: 14 }}>Try another word, or clear the filter.</div>
        </div>
      )}
      <div className="agent-grid">
        {list.map((a) => {
          const e = employments[a.id];
          const badge = e ? (e.status === 'fired' ? 'Fired' : 'Hired') : null;
          const badgeColor = e?.status === 'fired' ? 'var(--red)' : 'var(--grn)';
          const chips = [...a.perms, `up to ${fmt(a.wants.cap)}`, `${a.wants.days}-day expiry`];
          return (
            <button key={a.id} className="agent-card" onClick={() => openAgent(a.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <Avatar agent={a} size={46} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span className="name">{a.name}</span>
                    {badge && (
                      <span className="badge-hired" style={{ color: badgeColor }}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <div className="mono-s">
                    {a.cat} · by {a.pub}
                  </div>
                </div>
              </div>
              <p>{a.line}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {chips.map((c) => (
                  <span key={c} className="chip">
                    {c}
                  </span>
                ))}
              </div>
              <div className="receipts-line">
                <ShieldCheck />
                {a.listedReceipts.toLocaleString()} receipts · all verifiable
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- agent detail

export const AgentDetail: React.FC<{
  agent: DirectoryAgent;
  employment: StoredEmployment | undefined;
  latestReceipt: StoredReceipt | undefined;
  goDirectory: () => void;
  hire: () => void;
}> = ({ agent, employment, latestReceipt, goDirectory, hire }) => {
  const working = employment?.status === 'active';
  const rcptSample = latestReceipt
    ? `rcpt_${latestReceipt.requestId.slice(0, 6)} · ${fmt(BigInt(latestReceipt.amount))}`
    : `rcpt_k3x9f2 · ${fmt(agent.tasks[0].amount)}`;
  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <button className="back-btn" onClick={goDirectory}>
        <BackChevron />
        All agents
      </button>
      <div className="detail-hero">
        <Avatar agent={agent} size={70} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1>{agent.name}</h1>
          <div style={{ fontSize: 14.5, color: 'var(--mut)' }}>{agent.line}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10 }} className="mono-s">
            <span>{agent.cat}</span>
            <span>by {agent.pub}</span>
            <span>publishing since {agent.since}</span>
          </div>
        </div>
        {working ? (
          <span className="hired-label">✓ Working for you</span>
        ) : (
          <button className="btn btn-primary" style={{ padding: '15px 30px' }} onClick={hire}>
            Hire {agent.name}
          </button>
        )}
      </div>
      <div className="two-col">
        <div className="panel">
          <h2 className="dash-head">What it does</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {agent.tasks.map((t) => (
              <div key={t.label} className="check-row" style={{ fontSize: 14 }}>
                <Check size={14} color="#2F6B4F" />
                {t.label}
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2 className="dash-head">Track record</h2>
          <div className="stat-row">
            <div className="stat">
              <div className="n">{agent.listedReceipts.toLocaleString()}</div>
              <div className="l">tasks completed</div>
            </div>
            <div className="stat">
              <div className="n" style={{ color: 'var(--grn)' }}>
                100%
              </div>
              <div className="l">receipts verifiable</div>
            </div>
            <div className="stat">
              <div className="n">0</div>
              <div className="l">blocked attempts</div>
            </div>
          </div>
          <div className="rcpt-sample">
            latest {rcptSample}
            <br />
            proof <span style={{ color: 'var(--grn)' }}>π valid ✓</span> · on the public ledger
          </div>
          <p className="footnote">
            Ratings here are backed by receipts anyone can verify — not reviews anyone can write.
          </p>
        </div>
      </div>
      <div className="two-col" style={{ marginBottom: 0 }}>
        <div className="panel">
          <h2 className="dash-head" style={{ color: 'var(--blue)' }}>
            What it asks for
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {agent.perms.map((p) => (
              <div key={p} className="check-row" style={{ fontSize: 14 }}>
                <Check size={14} />
                {p}
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px dashed var(--line)',
              display: 'flex',
              gap: 18,
              flexWrap: 'wrap',
            }}
            className="mono-s"
          >
            <span>
              default cap <strong style={{ color: 'var(--ink)' }}>{fmt(agent.wants.cap)}</strong>
            </span>
            <span>
              expires in <strong style={{ color: 'var(--ink)' }}>{agent.wants.days} days</strong>
            </span>
          </div>
        </div>
        <div className="panel">
          <h2 className="dash-head" style={{ color: 'var(--red)' }}>
            What it can never do
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {agent.nevers.map((n) => (
              <div key={n} className="never-row">
                <Cross />
                {n}
              </div>
            ))}
          </div>
          <p className="footnote rule">
            "Never" is enforced at proof time — an action outside these limits cannot produce a valid proof, so it
            cannot execute.
          </p>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- dashboard

export type BlockedInfo = { action: string };

export const Dashboard: React.FC<{
  employments: StoredEmployment[];
  receipts: StoredReceipt[];
  busyAgent: string | null;
  blocked: Record<string, BlockedInfo | undefined>;
  dismissBlocked: (id: string) => void;
  goDirectory: () => void;
  run: (id: string) => void;
  test: (id: string) => void;
  askFire: (id: string) => void;
  openReceipt: (requestId: string) => void;
}> = ({ employments, receipts, busyAgent, blocked, dismissBlocked, goDirectory, run, test, askFire, openReceipt }) => (
  <div className="page">
    <div className="eyebrow">Dashboard</div>
    <h1>Working for you</h1>
    <p className="sub">Each agent runs on its own credential — capped, expiring, and revocable in one tap.</p>
    {employments.length === 0 && (
      <div className="empty-dash">
        <div className="serif" style={{ fontSize: 30, marginBottom: 10 }}>
          Nobody's working for you yet
        </div>
        <p style={{ margin: '0 auto 24px', fontSize: 14.5, color: 'var(--mut)', maxWidth: '44ch', lineHeight: 1.6 }}>
          Hire your first agent. It gets a permission, not a password — and you can fire it any time.
        </p>
        <button className="btn btn-primary" style={{ padding: '14px 24px', fontSize: 15 }} onClick={goDirectory}>
          Browse agents
        </button>
      </div>
    )}
    <div className="emp-grid">
      {employments.map((e) => {
        const a = agentById(e.agentId);
        const spent = e.receipts.reduce((sum, r) => sum + Number(r.amount), 0);
        const cap = Number(e.cap);
        const pct = Math.min(100, Math.round((spent / cap) * 100));
        const C = 176;
        const revoked = e.status === 'fired';
        const busy = busyAgent === e.agentId;
        const daysLeft = Math.max(0, Math.ceil((Number(e.expiry) - Date.now()) / 86_400_000));
        const blockedInfo = blocked[e.agentId];
        return (
          <div key={e.agentId} className={`emp-card ${revoked ? 'revoked' : ''}`}>
            {revoked && <div className="revoked-stamp">REVOKED</div>}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
              <Avatar agent={a} size={48} grayscale={revoked} />
              <div style={{ flex: 1 }}>
                <div className="serif" style={{ fontSize: 24 }}>
                  {a.name}
                </div>
                <div className="mono-s" style={{ fontSize: 10.5 }}>
                  {revoked ? 'credential revoked' : `expires in ${daysLeft} days · ${a.pub}`}
                </div>
              </div>
              <div className="ring-wrap">
                <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                  <circle cx="32" cy="32" r="28" style={{ fill: 'none', stroke: '#E7E1D2', strokeWidth: 6 }} />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    transform="rotate(-90 32 32)"
                    style={{
                      fill: 'none',
                      stroke: revoked ? '#C4BCAA' : pct >= 80 ? '#C6402C' : '#2440D4',
                      strokeWidth: 6,
                      strokeDasharray: C,
                      strokeDashoffset: C * (1 - Math.min(1, spent / cap)),
                      transition: 'stroke-dashoffset .6s',
                    }}
                  />
                </svg>
                <div className="pct">{pct}%</div>
              </div>
            </div>
            <div className="cap-line">
              <span>
                <strong style={{ color: 'var(--ink)' }}>{fmt(spent)}</strong> of {fmt(cap)} cap
              </span>
              <span className="mono-s" style={{ fontSize: 11 }}>
                cred_{e.mandateIdHex.slice(0, 6)}
              </span>
            </div>
            {blockedInfo && (
              <div className="blocked-box">
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Slash />
                  <div style={{ flex: 1 }}>
                    <div className="t">Blocked before it happened</div>
                    <p>
                      {a.name} tried a <strong>'{blockedInfo.action}'</strong> action you never allowed. No valid proof
                      can exist for it, so it never executed. Nothing to undo.
                    </p>
                    <div className="mono-s" style={{ fontSize: 10.5 }}>
                      proof π rejected · out of scope · $0 spent
                    </div>
                  </div>
                  <button
                    onClick={() => dismissBlocked(e.agentId)}
                    aria-label="Dismiss"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mut)', padding: 2 }}
                  >
                    <Cross size={14} color="currentColor" />
                  </button>
                </div>
              </div>
            )}
            {revoked ? (
              <div className="revoked-note">
                <Lock />
                <span>Fired {e.revokedAt ?? ''} — credential revoked on-chain. Locked out everywhere, forever.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary btn-small"
                  style={{
                    flex: 1,
                    minWidth: 104,
                    boxShadow: '3px 3px 0 var(--ink)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                  }}
                  disabled={busy}
                  onClick={() => run(e.agentId)}
                >
                  {busy && <span className="spinner" />}
                  {busy ? 'Proving…' : 'Run a task'}
                </button>
                <button
                  className="btn btn-secondary btn-small"
                  style={{ flex: 1, minWidth: 104 }}
                  disabled={busy}
                  onClick={() => test(e.agentId)}
                >
                  Test the limits
                </button>
                <button className="btn-fire" disabled={busy} onClick={() => askFire(e.agentId)}>
                  Fire
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
    {receipts.length > 0 && (
      <>
        <h2 className="serif" style={{ fontSize: 30, margin: '0 0 4px' }}>
          Receipts
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--mut)' }}>
          Public, verifiable, and pseudonymous. Tap one to see exactly what the world can read.
        </p>
        <div className="receipt-list">
          {receipts.map((r) => {
            const a = agentById(r.agentId);
            return (
              <button key={r.requestId} className="receipt-row" onClick={() => openReceipt(r.requestId)}>
                <Avatar agent={a} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="task">{r.label}</div>
                  <div className="meta">
                    rcpt_{r.requestId.slice(0, 6)} ·{' '}
                    {new Date(r.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
                <span className="amt">{fmt(BigInt(r.amount))}</span>
                <ShieldCheck size={15} />
              </button>
            );
          })}
        </div>
      </>
    )}
  </div>
);

// ---------------------------------------------------------------- receipt detail

export const ReceiptDetail: React.FC<{ receipt: StoredReceipt; goDashboard: () => void }> = ({
  receipt,
  goDashboard,
}) => {
  const a = agentById(receipt.agentId);
  return (
    <div className="page" style={{ maxWidth: 840 }}>
      <button className="back-btn" onClick={goDashboard}>
        <BackChevron />
        Back to dashboard
      </button>
      <div className="receipt-doc">
        <div className="receipt-doc-head">
          <span>Public receipt</span>
          <span>rcpt_{receipt.requestId.slice(0, 8)}</span>
        </div>
        <div className="receipt-title-band">
          <Avatar agent={a} size={44} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="serif" style={{ fontSize: 26 }}>
              {receipt.label}
            </div>
            <div className="mono-s">
              posted{' '}
              {new Date(receipt.at).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
          </div>
          <span className="proof-stamp">
            <Check size={13} color="currentColor" />
            proof verified
          </span>
        </div>
        <div className="receipt-cols">
          <div>
            <div className="dash-head" style={{ color: 'var(--grn)', border: 'none', padding: 0 }}>
              What this receipt contains
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div className="kv">
                <div className="k">task</div>
                <div className="v">{receipt.label}</div>
              </div>
              <div className="kv">
                <div className="k">amount</div>
                <div className="v">{fmt(BigInt(receipt.amount))}</div>
              </div>
              <div className="kv">
                <div className="k">credential (pseudonymous)</div>
                <div className="v mono">cred:mn1_{receipt.mandateIdHex.slice(0, 12)}…</div>
              </div>
              <div className="kv">
                <div className="k">receipt id</div>
                <div className="v mono">rcpt:zk_{receipt.requestId.slice(0, 12)}…</div>
              </div>
              <div className="kv">
                <div className="k">transaction</div>
                <div className="v mono">{receipt.txHash.slice(0, 18)}…</div>
              </div>
              <div className="kv">
                <div className="k">proof</div>
                <div className="v mono" style={{ color: 'var(--grn)' }}>
                  π ✓ verified on-chain
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="dash-head" style={{ border: 'none', padding: 0 }}>
              What it deliberately omits
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div className="omit-row">
                <Cross />
                who you are — name, email, wallet, anything
              </div>
              <div className="omit-row">
                <Cross />
                your spending cap
              </div>
              <div className="omit-row">
                <Cross />
                what else the agent may do
              </div>
              <div className="omit-row">
                <Cross />
                when the credential expires
              </div>
              <div className="omit-row">
                <Cross />
                your other agents' credentials
              </div>
            </div>
            <p className="zk-note">
              The proof shows the task was <em>within limits</em> without revealing the limits. That's the
              zero-knowledge part.
            </p>
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center' }} className="mono-s">
        Secured by zero-knowledge proofs on Midnight
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- onboarding

const WALLET_ROWS = [
  { name: 'Lace', desc: 'The most popular Midnight wallet', tint: '#E6E9F8', fg: '#2440D4' },
  { name: 'Gero', desc: 'Mobile-first, biometric unlock', tint: '#E2EDE4', fg: '#2F6B4F' },
  { name: '1AM', desc: 'Minimal, keyboard-friendly', tint: '#F6E3D3', fg: '#9A5B22' },
];

export const Onboarding: React.FC<{
  connecting: boolean;
  status: string;
  error: string;
  connect: () => void;
}> = ({ connecting, status, error, connect }) => (
  <div className="onboard">
    <div className="onboard-card">
      <div className="eyebrow" style={{ marginBottom: 14 }}>
        Step one of one
      </div>
      <h1>Bring your own keys</h1>
      <p style={{ margin: '0 0 24px', fontSize: 14.5, lineHeight: 1.6, color: 'var(--mut)' }}>
        Grant never holds your money or your identity. Your wallet signs the permissions; agents only ever see the
        credential. Works with any Midnight wallet.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {WALLET_ROWS.map((w) => (
          <button key={w.name} className="wallet-row" onClick={connect} disabled={connecting}>
            <span
              className="avatar-tile serif"
              style={{ width: 38, height: 38, background: w.tint, fontSize: 19, color: w.fg }}
            >
              {w.name[0]}
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 15 }}>{w.name}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--mut)' }}>{w.desc}</span>
            </span>
            {connecting ? (
              <span className="spinner-line" />
            ) : (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="square"
                style={{ color: 'var(--mut)' }}
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            )}
          </button>
        ))}
      </div>
      {connecting && status && (
        <p className="mono-s" style={{ marginTop: 16, fontSize: 12, lineHeight: 1.6, color: 'var(--blue)' }}>
          {status}
        </p>
      )}
      {error && <div className="onboard-err">{error}</div>}
      <div className="or-rule">OR</div>
      <button className="demo-btn" onClick={() => window.open('http://localhost:8791', '_blank')}>
        Try the demo without a wallet
      </button>
      <p style={{ margin: '16px 0 0', fontSize: 12, color: 'var(--mut)', textAlign: 'center', lineHeight: 1.55 }}>
        The walletless demo runs everything server-side (
        <span className="mono-s" style={{ fontSize: 11 }}>
          npm run app
        </span>
        ) — you just can't take credentials with you.
      </p>
    </div>
  </div>
);

// ---------------------------------------------------------------- permission sheet

export const PermissionSheet: React.FC<{
  agent: DirectoryAgent;
  cap: bigint;
  sheetNo: number;
  proving: boolean;
  provingText: string;
  capDown: () => void;
  capUp: () => void;
  deny: () => void;
  allow: () => void;
}> = ({ agent, cap, sheetNo, proving, provingText, capDown, capUp, deny, allow }) => (
  <div
    className="backdrop bottom"
    onClick={() => {
      if (!proving) deny();
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Permission request"
      className="sheet"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="ticket-head" style={{ padding: '12px 26px' }}>
        <span>Permission request</span>
        <span>№ {String(sheetNo).padStart(4, '0')}</span>
      </div>
      {proving ? (
        <div style={{ textAlign: 'center', padding: '44px 26px 26px' }}>
          <div style={{ position: 'relative', width: 74, height: 74, margin: '0 auto 22px' }}>
            <span
              style={{
                position: 'absolute',
                inset: 0,
                border: '2.5px solid var(--line)',
                borderTopColor: 'var(--blue)',
                borderRadius: '50%',
                animation: 'spin 1.1s linear infinite',
              }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              {agent.emoji}
            </span>
          </div>
          <div className="serif" style={{ fontSize: 26, marginBottom: 8 }}>
            Issuing private credential…
          </div>
          <p
            style={{
              margin: '0 auto',
              fontSize: 13.5,
              color: 'var(--mut)',
              maxWidth: '38ch',
              lineHeight: 1.6,
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            {provingText}
          </p>
          <div className="mono-s" style={{ marginTop: 18, fontSize: 10.5, letterSpacing: '.08em', opacity: 0.7 }}>
            midnight · zk-snark · your wallet signs
          </div>
        </div>
      ) : (
        <div style={{ padding: '24px 26px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 20 }}>
            <Avatar agent={agent} size={48} />
            <div>
              <div className="serif" style={{ fontSize: 24 }}>
                {agent.name} wants to:
              </div>
              <div className="mono-s" style={{ fontSize: 10.5 }}>
                from {agent.pub} · you can change your mind any time
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
            {agent.perms.map((p) => (
              <div key={p} className="check-row">
                <Check />
                {p}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 11, alignItems: 'center', fontSize: 14.5, flexWrap: 'wrap' }}>
              <Check />
              <span>spend up to</span>
              <span className="cap-stepper">
                <button onClick={capDown} aria-label="Lower cap">
                  −
                </button>
                <span className="val">{fmt(cap)}</span>
                <button onClick={capUp} aria-label="Raise cap">
                  +
                </button>
              </span>
              <span style={{ fontSize: 12, color: 'var(--mut)' }}>you can lower this</span>
            </div>
            <div className="check-row">
              <Check />
              <span>
                for <strong>{agent.wants.days} days</strong>, unless you fire it first
              </span>
            </div>
          </div>
          <div className="pseud-note" style={{ marginBottom: 20 }}>
            <ShieldPlain />
            <span>{agent.name} never learns who you are. It works for a pseudonym.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={deny}
              style={{
                flex: 1,
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                padding: 14,
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                color: 'var(--mut)',
              }}
            >
              Don't allow
            </button>
            <button className="btn btn-primary" style={{ flex: 1, padding: 14, fontSize: 15 }} onClick={allow}>
              Allow
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------- fire modal

export const FireModal: React.FC<{
  agent: DirectoryAgent;
  firing: boolean;
  cancel: () => void;
  confirm: () => void;
}> = ({ agent, firing, cancel, confirm }) => (
  <div
    className="backdrop center"
    onClick={() => {
      if (!firing) cancel();
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fire agent"
      className="fire-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="eyebrow" style={{ color: 'var(--red)', marginBottom: 14 }}>
        Revocation
      </div>
      <h2 className="serif" style={{ fontSize: 32, margin: '0 0 12px' }}>
        Fire {agent.name}?
      </h2>
      <p style={{ margin: '0 0 6px', fontSize: 14.5, lineHeight: 1.6 }}>
        Its credential is revoked on-chain the moment you tap. Locked out everywhere, instantly, forever.
      </p>
      <p style={{ margin: '0 0 24px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--mut)' }}>
        Revoking is math, not a support ticket. Its receipts stay on the ledger.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={cancel}
          disabled={firing}
          style={{
            flex: 1,
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            padding: 13,
            fontWeight: 600,
            fontSize: 14.5,
            cursor: 'pointer',
            color: 'var(--mut)',
          }}
        >
          Keep it
        </button>
        <button
          onClick={confirm}
          disabled={firing}
          style={{
            flex: 1,
            background: 'var(--red)',
            border: 'none',
            padding: 13,
            fontWeight: 600,
            fontSize: 14.5,
            cursor: firing ? 'wait' : 'pointer',
            color: '#fff',
            boxShadow: '4px 4px 0 var(--ink)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {firing && <span className="spinner" />}
          {firing ? 'Revoking on-chain…' : 'Fire it'}
        </button>
      </div>
    </div>
  </div>
);

export { ACTION_LABELS };
