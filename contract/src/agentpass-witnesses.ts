// AgentPass private state and witness implementations.
//
// Two parties use this contract with different private state:
//  - the principal holds principalSecretKey, mandateNonce, terms, mandateSalt
//  - the agent holds agentSecretKey, terms, mandateSalt (received off-chain
//    from the principal when the mandate is granted) and picks timeBound
//
// SPDX-License-Identifier: Apache-2.0

import { Ledger, MandateTerms } from "./managed/agentpass/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type AgentPassPrivateState = {
  readonly principalSecretKey?: Uint8Array;
  readonly mandateNonce?: Uint8Array;
  readonly terms?: MandateTerms;
  readonly mandateSalt?: Uint8Array;
  readonly agentSecretKey?: Uint8Array;
  readonly timeBound?: bigint;
};

export const createPrincipalPrivateState = (
  principalSecretKey: Uint8Array,
  mandateNonce: Uint8Array,
  terms: MandateTerms,
  mandateSalt: Uint8Array,
): AgentPassPrivateState => ({
  principalSecretKey,
  mandateNonce,
  terms,
  mandateSalt,
});

export const createAgentPrivateState = (
  agentSecretKey: Uint8Array,
  terms: MandateTerms,
  mandateSalt: Uint8Array,
  timeBound: bigint,
): AgentPassPrivateState => ({
  agentSecretKey,
  terms,
  mandateSalt,
  timeBound,
});

type Ctx = WitnessContext<Ledger, AgentPassPrivateState>;

const required = <T>(value: T | undefined, name: string): T => {
  if (value === undefined) {
    throw new Error(
      `witness ${name} not available in this party's private state`,
    );
  }
  return value;
};

export const witnesses = {
  principalSecretKey: ({
    privateState,
  }: Ctx): [AgentPassPrivateState, Uint8Array] => [
    privateState,
    required(privateState.principalSecretKey, "principalSecretKey"),
  ],
  mandateNonce: ({
    privateState,
  }: Ctx): [AgentPassPrivateState, Uint8Array] => [
    privateState,
    required(privateState.mandateNonce, "mandateNonce"),
  ],
  mandateTerms: ({
    privateState,
  }: Ctx): [AgentPassPrivateState, MandateTerms] => [
    privateState,
    required(privateState.terms, "mandateTerms"),
  ],
  mandateSalt: ({ privateState }: Ctx): [AgentPassPrivateState, Uint8Array] => [
    privateState,
    required(privateState.mandateSalt, "mandateSalt"),
  ],
  agentSecretKey: ({
    privateState,
  }: Ctx): [AgentPassPrivateState, Uint8Array] => [
    privateState,
    required(privateState.agentSecretKey, "agentSecretKey"),
  ],
  timeBound: ({ privateState }: Ctx): [AgentPassPrivateState, bigint] => [
    privateState,
    required(privateState.timeBound, "timeBound"),
  ],
};
