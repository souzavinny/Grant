// AgentPass API: adapts the deployed AgentPass contract for the two parties.
//
// The principal deploys (or joins) the contract with the principal private
// state; the agent joins the same contract address with its own private state.
// All mandate terms travel off-chain between the parties — only commitments,
// pseudonymous ids, receipts, and revocations touch the ledger.
//
// SPDX-License-Identifier: Apache-2.0

import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { AgentPass, CompiledAgentPassContractContract, type AgentPassPrivateState } from '../../contract/src/index';
import {
  type AgentPassContract,
  type AgentPassProviders,
  type AgentPassPrivateStateId,
  type DeployedAgentPassContract,
  type AuthorizationResult,
  principalPrivateStateKey,
  agentPrivateStateKey,
} from './agentpass-types.js';
import * as utils from './utils/index.js';

/** Compute a party's public key exactly as the circuits derive it (local evaluation only). */
export const derivePublicKey = (secretKey: Uint8Array): Uint8Array => AgentPass.pureCircuits.agentPublicKey(secretKey);

/** Compute a mandate id exactly as the circuits derive it (local evaluation only). */
export const deriveMandateId = (principalPk: Uint8Array, nonce: Uint8Array): Uint8Array =>
  AgentPass.pureCircuits.mandateIdFor(principalPk, nonce);

/** Build MandateTerms; `allowedActions` lists the permitted categories 0..7. */
export const makeTerms = (
  cap: bigint,
  expiry: bigint,
  agentPk: Uint8Array,
  allowedActions: number[],
): AgentPass.MandateTerms => ({
  cap,
  expiry,
  agentPk,
  scope: Array.from({ length: 8 }, (_, i) => allowedActions.includes(i)),
});

/**
 * One party's handle on a deployed AgentPass contract. Create with
 * {@link AgentPassAPI.deploy} (principal) or {@link AgentPassAPI.join} (either party).
 */
export class AgentPassAPI {
  private constructor(
    public readonly deployedContract: DeployedAgentPassContract,
    private readonly providers: AgentPassProviders,
    private readonly privateStateId: AgentPassPrivateStateId,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
  }

  readonly deployedContractAddress: ContractAddress;

  /** Replace this party's stored private state (e.g. handing new mandate terms to a party). */
  async setPrivateState(state: AgentPassPrivateState): Promise<void> {
    await this.providers.privateStateProvider.set(this.privateStateId, state);
  }

  async getPrivateState(): Promise<AgentPassPrivateState | null> {
    return await this.providers.privateStateProvider.get(this.privateStateId);
  }

  /**
   * Principal: register the mandate currently described by the principal's
   * private state. Returns the pseudonymous mandate id (derived locally with
   * the same hash the circuit uses).
   */
  async issueMandate(): Promise<{ mandateId: Uint8Array; txHash: string }> {
    const state = await this.getPrivateState();
    if (state?.principalSecretKey === undefined || state.mandateNonce === undefined) {
      throw new Error('principal private state (secret key + nonce) is required to issue');
    }
    const txData = await this.deployedContract.callTx.issueMandate();
    const mandateId = deriveMandateId(derivePublicKey(state.principalSecretKey), state.mandateNonce);
    this.logger?.trace({
      transactionAdded: { circuit: 'issueMandate', txHash: txData.public.txHash },
    });
    return { mandateId, txHash: txData.public.txHash };
  }

  /**
   * Agent: prove the action is authorized under the mandate. Generates a fresh
   * requestId (the verifier's receipt key).
   */
  async proveAuthorized(mandateId: Uint8Array, action: bigint, amount: bigint): Promise<AuthorizationResult> {
    const requestId = utils.randomBytes(32);
    const txData = await this.deployedContract.callTx.proveAuthorized(mandateId, requestId, action, amount);
    this.logger?.trace({
      transactionAdded: { circuit: 'proveAuthorized', txHash: txData.public.txHash },
    });
    return {
      requestId,
      txHash: txData.public.txHash,
      blockHeight: txData.public.blockHeight,
    };
  }

  /** Principal: kill the mandate. Only the issuer can produce this proof. */
  async revokeMandate(mandateId: Uint8Array): Promise<{ txHash: string }> {
    const txData = await this.deployedContract.callTx.revokeMandate(mandateId);
    this.logger?.trace({
      transactionAdded: { circuit: 'revokeMandate', txHash: txData.public.txHash },
    });
    return { txHash: txData.public.txHash };
  }

  /** Principal deploys a fresh AgentPass contract. */
  static async deploy(
    providers: AgentPassProviders,
    initialPrivateState: AgentPassPrivateState,
    logger?: Logger,
  ): Promise<AgentPassAPI> {
    logger?.info('deploying AgentPass contract');
    const deployed = await deployContract(providers, {
      compiledContract: CompiledAgentPassContractContract,
      privateStateId: principalPrivateStateKey,
      initialPrivateState,
    });
    logger?.trace({
      contractDeployed: { finalizedDeployTxData: deployed.deployTxData.public },
    });
    return new AgentPassAPI(deployed, providers, principalPrivateStateKey, logger);
  }

  /** Either party joins an existing contract with its own private state. */
  static async join(
    providers: AgentPassProviders,
    contractAddress: ContractAddress,
    privateStateId: AgentPassPrivateStateId,
    initialPrivateState: AgentPassPrivateState,
    logger?: Logger,
  ): Promise<AgentPassAPI> {
    logger?.info({ joinContract: { contractAddress, as: privateStateId } });
    const deployed = await findDeployedContract<AgentPassContract>(providers, {
      contractAddress,
      compiledContract: CompiledAgentPassContractContract,
      privateStateId,
      initialPrivateState,
    });
    return new AgentPassAPI(deployed, providers, privateStateId, logger);
  }
}

export { principalPrivateStateKey, agentPrivateStateKey };
