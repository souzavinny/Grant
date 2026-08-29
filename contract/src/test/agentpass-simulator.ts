// Testbed that exercises the AgentPass contract in simulation, modelling the
// principal and the agent as parties with different private state.
//
// SPDX-License-Identifier: Apache-2.0

import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  type MandateTerms,
  ledger,
} from "../managed/agentpass/contract/index.js";
import {
  type AgentPassPrivateState,
  witnesses,
} from "../agentpass-witnesses.js";

export class AgentPassSimulator {
  readonly contract: Contract<AgentPassPrivateState>;
  circuitContext: CircuitContext<AgentPassPrivateState>;

  constructor(initialPrivateState: AgentPassPrivateState) {
    this.contract = new Contract<AgentPassPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext(initialPrivateState, "0".repeat(64)),
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  /** Swap in another party's private state (principal <-> agent). */
  public switchParty(privateState: AgentPassPrivateState) {
    this.circuitContext.currentPrivateState = privateState;
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public issueMandate(): Uint8Array {
    const res = this.contract.impureCircuits.issueMandate(this.circuitContext);
    this.circuitContext = res.context;
    return res.result;
  }

  public proveAuthorized(
    mandateId: Uint8Array,
    requestId: Uint8Array,
    action: bigint,
    amount: bigint,
  ): Ledger {
    this.circuitContext = this.contract.impureCircuits.proveAuthorized(
      this.circuitContext,
      mandateId,
      requestId,
      action,
      amount,
    ).context;
    return this.getLedger();
  }

  public revokeMandate(mandateId: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.revokeMandate(
      this.circuitContext,
      mandateId,
    ).context;
    return this.getLedger();
  }

  /** Same key derivation the circuits use, for building MandateTerms. */
  public agentPublicKey(sk: Uint8Array): Uint8Array {
    return this.contract.circuits.agentPublicKey(this.circuitContext, sk)
      .result;
  }
}

/** Build a MandateTerms value; scope lists the allowed action categories 0..7. */
export const makeTerms = (
  cap: bigint,
  expiry: bigint,
  agentPk: Uint8Array,
  allowedActions: number[],
): MandateTerms => ({
  cap,
  expiry,
  agentPk,
  scope: Array.from({ length: 8 }, (_, i) => allowedActions.includes(i)),
});
