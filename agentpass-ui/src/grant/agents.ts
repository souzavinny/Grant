// The Grant agent directory. In Wave 2 this becomes real third-party
// listings with an SDK; for Wave 1 the agents are scripted, but every
// credential and proof they carry is real.
//
// SPDX-License-Identifier: Apache-2.0

export const ACTION_LABELS = [
  'purchase',
  'transfer',
  'subscribe',
  'data-access',
  'trade',
  'message',
  'book',
  'custom',
] as const;

export type AgentTask = { label: string; action: number; amount: bigint };

export type DirectoryAgent = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  wants: { cap: bigint; actions: number[]; days: number };
  tasks: AgentTask[];
};

export const AGENTS: DirectoryAgent[] = [
  {
    id: 'submanager',
    name: 'SubManager',
    emoji: '🧾',
    blurb: 'Keeps your subscriptions tidy — renews the ones you use, drops the ones you don’t.',
    wants: { cap: 30n, actions: [2], days: 30 },
    tasks: [
      { label: 'Renewed: news subscription', action: 2, amount: 8n },
      { label: 'Renewed: music streaming', action: 2, amount: 11n },
      { label: 'Renewed: cloud storage', action: 2, amount: 5n },
    ],
  },
  {
    id: 'travelbooker',
    name: 'TravelBooker',
    emoji: '✈️',
    blurb: 'Books trains, hotels, and flights when prices drop — inside the budget you set.',
    wants: { cap: 250n, actions: [0, 6], days: 60 },
    tasks: [
      { label: 'Booked: train to the coast', action: 6, amount: 32n },
      { label: 'Booked: one hotel night', action: 6, amount: 89n },
      { label: 'Purchased: seat upgrade', action: 0, amount: 18n },
    ],
  },
  {
    id: 'grocerier',
    name: 'GroceryRunner',
    emoji: '🛒',
    blurb: 'Restocks your pantry every week from your usual list.',
    wants: { cap: 80n, actions: [0], days: 14 },
    tasks: [
      { label: 'Ordered: weekly groceries', action: 0, amount: 24n },
      { label: 'Ordered: coffee beans', action: 0, amount: 12n },
      { label: 'Ordered: fresh produce', action: 0, amount: 19n },
    ],
  },
];

export const agentById = (id: string): DirectoryAgent => {
  const agent = AGENTS.find((a) => a.id === id);
  if (!agent) throw new Error(`unknown agent '${id}'`);
  return agent;
};
