// Grant faucet: funds wallets on the local fixed-port devnet from the genesis
// wallet so external users (Lace / Gero / 1AM) can transact.
//
// Wallets need two things before they can pay fees:
//   1. NIGHT — sent by this faucet to the wallet's unshielded address
//      (mn_addr_undeployed1…)
//   2. DUST — the fee resource. It is generated FROM your NIGHT after your
//      wallet registers it (dust registration must be signed by the NIGHT
//      owner, so only your wallet can do it — look for a dust/fee generation
//      action in the wallet UI after the NIGHT arrives).
//
//   npm run faucet -- <mn_addr_undeployed1...> [amount]
//   npm run faucet -- --self-test    # funds a fresh wallet AND walks the full
//                                    # owner-side dust registration, asserting
//                                    # dust actually accrues
//
// Requires the fixed-port devnet: docker compose -f ../devnet/devnet.yml up -d
//
// SPDX-License-Identifier: Apache-2.0

import { WebSocket } from 'ws';
import * as Rx from 'rxjs';
import { createLogger } from '../logger-utils.js';
import { MidnightWalletProvider } from '../midnight-wallet-provider.js';
import { waitForUnshieldedFunds } from '../wallet-utils.js';
import { generateDust } from '../generate-dust.js';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { MidnightBech32m, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import path from 'node:path';

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
const DEFAULT_AMOUNT = 10_000_000_000_000n;

setNetworkId('undeployed');

const env: EnvironmentConfiguration = {
  walletNetworkId: 'undeployed',
  networkId: 'undeployed',
  indexer: 'http://127.0.0.1:8088/api/v4/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  node: 'http://127.0.0.1:9944',
  nodeWS: 'ws://127.0.0.1:9944',
  proofServer: 'http://127.0.0.1:6300',
  faucet: undefined, // no faucet service on a local devnet — this script IS the faucet
};

const args = process.argv.slice(2).filter((a) => a !== '--');
const selfTest = args.includes('--self-test');
const nightAddressArg = args.find((a) => a.startsWith('mn_addr'));
const dustAddressArg = args.find((a) => a.startsWith('mn_dust'));
const shieldedArg = args.find((a) => a.startsWith('mn_shield'));
const amountArg = args.find((a) => /^\d+$/.test(a));
const amount = amountArg ? BigInt(amountArg) : DEFAULT_AMOUNT;

if (shieldedArg) {
  console.error(`That looks like a SHIELDED address (${shieldedArg.slice(0, 24)}…).`);
  console.error('The faucet funds the unshielded side: copy the address starting mn_addr_undeployed1…');
  console.error('and, for fees, the dust address starting mn_dust_undeployed1… from your wallet.');
  process.exit(2);
}
if (dustAddressArg && !nightAddressArg && !selfTest) {
  console.error(`That is your DUST address (${dustAddressArg.slice(0, 24)}…) — dust cannot be sent, only generated.`);
  console.error('1. Give the faucet your NIGHT address instead:  npm run faucet -- <mn_addr_undeployed1…>');
  console.error("2. After the NIGHT arrives, use your wallet's dust/fee generation action — dust accrues from your");
  console.error('   NIGHT within a minute or two, then transactions work.');
  process.exit(2);
}
if (!selfTest && !nightAddressArg) {
  console.error('Usage: npm run faucet -- <mn_addr_undeployed1…> [amount]   |   npm run faucet -- --self-test');
  console.error('Copy the address starting mn_addr_undeployed1… from your wallet (its NIGHT / unshielded address).');
  process.exit(2);
}

const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');
const logger = await createLogger(
  path.resolve(currentDir, '..', '..', 'logs', 'faucet', `${new Date().toISOString()}.log`),
);

const sendNight = async (genesis: MidnightWalletProvider, receiverAddress: UnshieldedAddress): Promise<string> => {
  const recipe = await genesis.wallet.transferTransaction(
    [{ type: 'unshielded', outputs: [{ type: unshieldedToken().raw, receiverAddress, amount }] }],
    { shieldedSecretKeys: genesis.zswapSecretKeys, dustSecretKey: genesis.dustSecretKey },
    { ttl: ttlOneHour() },
  );
  const signed = await genesis.wallet.signRecipe(recipe, (payload) => genesis.unshieldedKeystore.signData(payload));
  const finalized = await genesis.wallet.finalizeRecipe(signed);
  return await genesis.wallet.submitTransaction(finalized);
};

try {
  console.log('Starting genesis wallet (devnet must be up: docker compose -f devnet/devnet.yml up -d)…');
  const genesis = await MidnightWalletProvider.build(logger, env, GENESIS_MINT_WALLET_SEED);
  await genesis.start();
  await waitForUnshieldedFunds(logger, genesis.wallet, env, unshieldedToken());

  if (selfTest) {
    console.log('Self-test: creating a fresh random wallet…');
    const freshSeed = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
    const fresh = await MidnightWalletProvider.build(logger, env, freshSeed);
    await fresh.start();
    const freshUnshielded = await Rx.firstValueFrom(fresh.wallet.unshielded.state);
    const encoded = UnshieldedAddress.codec.encode(getNetworkId(), freshUnshielded.address).asString();
    console.log(`Fresh wallet NIGHT address: ${encoded}`);

    const nightTx = await sendNight(genesis, freshUnshielded.address);
    console.log(`Sent ${amount} NIGHT (tx ${nightTx}); waiting for it to arrive…`);
    const funded = await waitForUnshieldedFunds(logger, fresh.wallet, env, unshieldedToken());
    const balance = funded.balances[unshieldedToken().raw] ?? 0n;
    if (balance <= 0n) throw new Error('self-test failed: NIGHT balance did not arrive');
    console.log(`NIGHT arrived — balance ${balance}.`);

    console.log('Registering the fresh NIGHT for dust generation (what your wallet does when you generate dust)…');
    const dustTx = await generateDust(logger, freshSeed, funded, fresh.wallet);
    if (!dustTx) throw new Error('self-test failed: no unregistered UTXO found to register');
    const dustBalance = await Rx.firstValueFrom(
      fresh.wallet.state().pipe(
        Rx.map((state) => state.dust.balance(new Date())),
        Rx.filter((b) => b > 0n),
        Rx.timeout({ first: 240_000 }),
      ),
    );
    console.log(`FAUCET SELF-TEST PASSED — fresh wallet NIGHT: ${balance}, DUST: ${dustBalance}`);
    await fresh.stop();
  } else {
    const receiver = UnshieldedAddress.codec.decode(getNetworkId(), MidnightBech32m.parse(nightAddressArg!));
    const txId = await sendNight(genesis, receiver);
    console.log(`Sent ${amount} NIGHT to ${nightAddressArg!.slice(0, 32)}… (tx ${txId}).`);
    console.log('');
    console.log('NEXT STEP — fees are paid in DUST, which your wallet generates from this NIGHT:');
    console.log("  once the NIGHT shows up (next wallet sync), use your wallet's dust/fee generation");
    console.log('  action, wait a minute or two for dust to accrue, then retry your transaction.');
  }

  await genesis.stop();
  process.exit(0);
} catch (e) {
  console.error(`FAUCET FAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
