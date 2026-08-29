// Grant faucet: funds any wallet address on the local fixed-port devnet from
// the genesis wallet, so external users (Lace / Gero / 1AM) can pay fees.
//
//   npm run faucet -- <mn_addr_undeployed1...>   # fund an address
//   npm run faucet -- --self-test                # fund a fresh random wallet and assert arrival
//
// Requires the fixed-port devnet: docker compose -f ../devnet/devnet.yml up -d
//
// SPDX-License-Identifier: Apache-2.0

import { WebSocket } from 'ws';
import { createLogger } from '../logger-utils.js';
import { MidnightWalletProvider } from '../midnight-wallet-provider.js';
import { waitForUnshieldedFunds } from '../wallet-utils.js';
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
const addressArg = args.find((a) => a.startsWith('mn_addr'));
const amountArg = args.find((a) => /^\d+$/.test(a));
const amount = amountArg ? BigInt(amountArg) : DEFAULT_AMOUNT;

if (!selfTest && !addressArg) {
  console.error('Usage: npm run faucet -- <mn_addr_undeployed1...> [amount]   |   npm run faucet -- --self-test');
  process.exit(2);
}

const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');
const logger = await createLogger(
  path.resolve(currentDir, '..', '..', 'logs', 'faucet', `${new Date().toISOString()}.log`),
);

const sendTo = async (genesis: MidnightWalletProvider, receiverAddress: UnshieldedAddress): Promise<string> => {
  const recipe = await genesis.wallet.transferTransaction(
    [
      {
        type: 'unshielded',
        outputs: [{ type: unshieldedToken().raw, receiverAddress, amount }],
      },
    ],
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
    const fresh = await MidnightWalletProvider.build(logger, env);
    await fresh.start();
    const freshState = await import('rxjs').then((Rx) => Rx.firstValueFrom(fresh.wallet.unshielded.state));
    const freshAddress = freshState.address;
    const encoded = UnshieldedAddress.codec.encode(getNetworkId(), freshAddress).asString();
    console.log(`Fresh wallet address: ${encoded}`);
    const txId = await sendTo(genesis, freshAddress);
    console.log(`Sent ${amount} NIGHT (tx ${txId}); waiting for it to arrive…`);
    const funded = await waitForUnshieldedFunds(logger, fresh.wallet, env, unshieldedToken());
    const balance = funded.balances[unshieldedToken().raw] ?? 0n;
    if (balance <= 0n) throw new Error('self-test failed: balance did not arrive');
    console.log(`FAUCET SELF-TEST PASSED — fresh wallet balance: ${balance}`);
    await fresh.stop();
  } else {
    const parsed = MidnightBech32m.parse(addressArg!);
    const receiver = UnshieldedAddress.codec.decode(getNetworkId(), parsed);
    const txId = await sendTo(genesis, receiver);
    console.log(`Sent ${amount} NIGHT to ${addressArg} (tx ${txId}).`);
    console.log('Open your wallet — the balance appears after its next sync.');
  }

  await genesis.stop();
  process.exit(0);
} catch (e) {
  console.error(`FAUCET FAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
