// Grant session persistence. The user's principal key, hired-agent material
// (terms, salts, agent keys), and the registry address live in localStorage so
// a refresh keeps identities and credentials. Everything here stays on the
// user's device — none of it ever reaches a server or the chain in the clear.
//
// SPDX-License-Identifier: Apache-2.0

export const toHexStr = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export const fromHexStr = (hex: string): Uint8Array =>
  Uint8Array.from((hex.match(/.{1,2}/g) ?? []).map((b) => parseInt(b, 16)));

export const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

export type StoredReceipt = {
  label: string;
  action: number;
  amount: string;
  requestId: string;
  txHash: string;
  agentId: string;
  mandateIdHex: string;
  at: number;
};

export type StoredEmployment = {
  agentId: string;
  agentSkHex: string;
  nonceHex: string;
  saltHex: string;
  mandateIdHex: string;
  cap: string;
  expiry: string;
  scope: number[];
  receipts: StoredReceipt[];
  taskCursor: number;
  status: 'active' | 'fired';
  lastResult: string;
  revokedAt?: string;
};

export type StoredSession = {
  principalSkHex: string;
  contractAddress?: string;
  employments: Record<string, StoredEmployment>;
};

const KEY = 'grant-session-v1';

/** Fill fields that older sessions (pre-redesign schema) didn't store. */
const migrate = (session: StoredSession): { session: StoredSession; changed: boolean } => {
  let changed = false;
  for (const [agentId, employment] of Object.entries(session.employments ?? {})) {
    if (employment.agentId === undefined) {
      employment.agentId = agentId;
      changed = true;
    }
    employment.receipts = (employment.receipts ?? []).map((receipt) => {
      if (receipt.agentId !== undefined && receipt.at !== undefined) return receipt;
      changed = true;
      return {
        ...receipt,
        agentId: receipt.agentId ?? agentId,
        mandateIdHex: receipt.mandateIdHex ?? employment.mandateIdHex,
        at: receipt.at ?? Date.now(),
      };
    });
  }
  return { session, changed };
};

export const loadSession = (): StoredSession => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const { session, changed } = migrate(JSON.parse(raw) as StoredSession);
      if (changed) saveSession(session);
      return session;
    }
  } catch {
    /* corrupted session — start fresh */
  }
  return { principalSkHex: toHexStr(randomBytes(32)), employments: {} };
};

export const saveSession = (session: StoredSession): void => {
  localStorage.setItem(KEY, JSON.stringify(session));
};

export const resetSession = (): void => {
  localStorage.removeItem(KEY);
};
