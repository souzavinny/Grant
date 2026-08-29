// AgentPass contract tests: mandate issuance, ZK authorization, scope/cap/
// expiry enforcement, replay protection, and principal-only revocation.
//
// SPDX-License-Identifier: Apache-2.0

import { AgentPassSimulator, makeTerms } from "./agentpass-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect, beforeEach } from "vitest";
import { randomBytes } from "./utils.js";
import {
  createAgentPrivateState,
  createPrincipalPrivateState,
  type AgentPassPrivateState,
} from "../agentpass-witnesses.js";
import type { MandateTerms } from "../managed/agentpass/contract/index.js";

setNetworkId("undeployed");

const FAR_FUTURE = 4102444800000n; // 2100-01-01 in ms
const NEAR_BOUND = 1735689600000n; // an agent-chosen public time bound

describe("AgentPass smart contract", () => {
  let principalSk: Uint8Array;
  let agentSk: Uint8Array;
  let nonce: Uint8Array;
  let salt: Uint8Array;
  let terms: MandateTerms;
  let principal: AgentPassPrivateState;
  let agent: AgentPassPrivateState;
  let simulator: AgentPassSimulator;
  let mandateId: Uint8Array;

  // cap 100, actions 0 (purchase) and 2 (subscribe) allowed
  beforeEach(() => {
    principalSk = randomBytes(32);
    agentSk = randomBytes(32);
    nonce = randomBytes(32);
    salt = randomBytes(32);
    simulator = new AgentPassSimulator({});
    terms = makeTerms(
      100n,
      FAR_FUTURE,
      simulator.agentPublicKey(agentSk),
      [0, 2],
    );
    principal = createPrincipalPrivateState(principalSk, nonce, terms, salt);
    agent = createAgentPrivateState(agentSk, terms, salt, NEAR_BOUND);
    simulator.switchParty(principal);
    mandateId = simulator.issueMandate();
  });

  it("issues a mandate: pseudonymous id, hiding commitment, zero spend", () => {
    expect(mandateId).toHaveLength(32);
    const ledgerState = simulator.getLedger();
    expect(ledgerState.mandateCommitments.member(mandateId)).toBe(true);
    expect(ledgerState.spentAmounts.lookup(mandateId)).toEqual(0n);
    expect(ledgerState.revokedMandates.member(mandateId)).toBe(false);
    expect(ledgerState.authorizations).toEqual(0n);
    // the commitment on-chain is not the terms themselves
    const commitment = ledgerState.mandateCommitments.lookup(mandateId);
    expect(commitment).toHaveLength(32);
  });

  it("derives the mandate id deterministically from principal key and nonce", () => {
    const other = new AgentPassSimulator({});
    other.switchParty(
      createPrincipalPrivateState(principalSk, nonce, terms, salt),
    );
    expect(other.issueMandate()).toEqual(mandateId);
  });

  it("rejects issuing the same mandate twice", () => {
    expect(() => simulator.issueMandate()).toThrow(
      "failed assert: mandate already exists",
    );
  });

  it("authorizes an in-scope action under the cap and records a receipt", () => {
    simulator.switchParty(agent);
    const requestId = randomBytes(32);
    const ledgerState = simulator.proveAuthorized(
      mandateId,
      requestId,
      0n,
      40n,
    );
    expect(ledgerState.receipts.member(requestId)).toBe(true);
    expect(ledgerState.receipts.lookup(requestId)).toEqual({
      action: 0n,
      amount: 40n,
    });
    expect(ledgerState.spentAmounts.lookup(mandateId)).toEqual(40n);
    expect(ledgerState.authorizations).toEqual(1n);
  });

  it("accumulates spend across authorizations up to the cap", () => {
    simulator.switchParty(agent);
    simulator.proveAuthorized(mandateId, randomBytes(32), 0n, 60n);
    const ledgerState = simulator.proveAuthorized(
      mandateId,
      randomBytes(32),
      2n,
      40n,
    );
    expect(ledgerState.spentAmounts.lookup(mandateId)).toEqual(100n);
    expect(ledgerState.authorizations).toEqual(2n);
  });

  it("rejects an action outside the mandate scope", () => {
    simulator.switchParty(agent);
    expect(() =>
      simulator.proveAuthorized(mandateId, randomBytes(32), 1n, 10n),
    ).toThrow("failed assert: action not in mandate scope");
  });

  it("rejects a single amount over the cap", () => {
    simulator.switchParty(agent);
    expect(() =>
      simulator.proveAuthorized(mandateId, randomBytes(32), 0n, 101n),
    ).toThrow("failed assert: would exceed mandate cap");
  });

  it("rejects cumulative spend over the cap", () => {
    simulator.switchParty(agent);
    simulator.proveAuthorized(mandateId, randomBytes(32), 0n, 60n);
    expect(() =>
      simulator.proveAuthorized(mandateId, randomBytes(32), 0n, 50n),
    ).toThrow("failed assert: would exceed mandate cap");
  });

  it("rejects a replayed requestId", () => {
    simulator.switchParty(agent);
    const requestId = randomBytes(32);
    simulator.proveAuthorized(mandateId, requestId, 0n, 10n);
    expect(() =>
      simulator.proveAuthorized(mandateId, requestId, 0n, 10n),
    ).toThrow("failed assert: request already authorized");
  });

  it("rejects an agent that was not delegated", () => {
    simulator.switchParty(
      createAgentPrivateState(randomBytes(32), terms, salt, NEAR_BOUND),
    );
    expect(() =>
      simulator.proveAuthorized(mandateId, randomBytes(32), 0n, 10n),
    ).toThrow("failed assert: not the delegated agent");
  });

  it("rejects tampered terms (agent inflating its own cap)", () => {
    const inflated: MandateTerms = { ...terms, cap: 1000000n };
    simulator.switchParty(
      createAgentPrivateState(agentSk, inflated, salt, NEAR_BOUND),
    );
    expect(() =>
      simulator.proveAuthorized(mandateId, randomBytes(32), 0n, 500n),
    ).toThrow("failed assert: terms do not match commitment");
  });

  it("rejects an unknown mandate", () => {
    simulator.switchParty(agent);
    expect(() =>
      simulator.proveAuthorized(randomBytes(32), randomBytes(32), 0n, 10n),
    ).toThrow("failed assert: unknown mandate");
  });

  it("rejects a time bound past the mandate expiry", () => {
    simulator.switchParty(
      createAgentPrivateState(agentSk, terms, salt, FAR_FUTURE + 1n),
    );
    expect(() =>
      simulator.proveAuthorized(mandateId, randomBytes(32), 0n, 10n),
    ).toThrow("failed assert: time bound past expiry");
  });

  it("lets the principal revoke, blocking further authorizations", () => {
    const ledgerState = simulator.revokeMandate(mandateId);
    expect(ledgerState.revokedMandates.member(mandateId)).toBe(true);
    simulator.switchParty(agent);
    expect(() =>
      simulator.proveAuthorized(mandateId, randomBytes(32), 0n, 10n),
    ).toThrow("failed assert: mandate revoked");
  });

  it("does not let anyone but the principal revoke", () => {
    simulator.switchParty(
      createPrincipalPrivateState(randomBytes(32), nonce, terms, salt),
    );
    expect(() => simulator.revokeMandate(mandateId)).toThrow(
      "failed assert: not the mandate principal",
    );
  });
});
