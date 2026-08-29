// AgentPass common types: two parties (principal, agent) interact with the
// same deployed contract through separate private states.
//
// SPDX-License-Identifier: Apache-2.0

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { AgentPass, AgentPassPrivateState } from '../../contract/src/index';

/** Private-state storage key for the principal's device. */
export const principalPrivateStateKey = 'agentPassPrincipal';
/** Private-state storage key for the agent's device. */
export const agentPrivateStateKey = 'agentPassAgent';

export type AgentPassPrivateStateId = typeof principalPrivateStateKey | typeof agentPrivateStateKey;

export type AgentPassContract = AgentPass.Contract<AgentPassPrivateState, AgentPass.Witnesses<AgentPassPrivateState>>;

export type AgentPassCircuitKeys = Exclude<keyof AgentPassContract['impureCircuits'], number | symbol>;

export type AgentPassProviders = MidnightProviders<
  AgentPassCircuitKeys,
  AgentPassPrivateStateId,
  AgentPassPrivateState
>;

export type DeployedAgentPassContract = FoundContract<AgentPassContract>;

/** Result of authorizing one action. */
export type AuthorizationResult = {
  readonly requestId: Uint8Array;
  readonly txHash: string;
  readonly blockHeight: number;
};
