// AgentPass — private delegation credentials for AI agents on Midnight.
// Based on the midnightntwrk/example-bboard template (Apache-2.0).
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

// ---------------------------------------------------------------------------
// AgentPass contract (primary)
// ---------------------------------------------------------------------------

export * as AgentPass from "./managed/agentpass/contract/index.js";
export {
  type AgentPassPrivateState,
  createPrincipalPrivateState,
  createAgentPrivateState,
} from "./agentpass-witnesses";
export * as AgentPassWitnesses from "./agentpass-witnesses";

import * as CompiledAgentPass from "./managed/agentpass/contract/index.js";
import * as AgentPassWitnessesImpl from "./agentpass-witnesses";

export const CompiledAgentPassContractContract = CompiledContract.make<
  CompiledAgentPass.Contract<AgentPassWitnessesImpl.AgentPassPrivateState>
>(
  "AgentPass",
  CompiledAgentPass.Contract<AgentPassWitnessesImpl.AgentPassPrivateState>,
).pipe(
  CompiledContract.withWitnesses(AgentPassWitnessesImpl.witnesses),
  CompiledContract.withCompiledFileAssets("./managed/agentpass"),
);

// ---------------------------------------------------------------------------
// Bulletin board example contract (retained from the template; still used by
// the UI workspace until it is ported to AgentPass)
// ---------------------------------------------------------------------------

export * from "./managed/bboard/contract/index.js";
export * from "./witnesses";

import * as CompiledBBoardContract from "./managed/bboard/contract/index.js";
import * as Witnesses from "./witnesses";

export const CompiledBBoardContractContract = CompiledContract.make<
  CompiledBBoardContract.Contract<Witnesses.BBoardPrivateState>
>("BBoard", CompiledBBoardContract.Contract<Witnesses.BBoardPrivateState>).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets("./managed/bboard"),
);
