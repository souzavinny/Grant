// The Grant agent directory: the three real scripted agents, carrying the
// product metadata (permissions manifest, nevers, task examples) surfaced in
// the directory, agent-detail, and permission-sheet views. In Wave 2 this
// becomes third-party listings with an SDK; the credentials and proofs behind
// every hire are real today.
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
  tint: string;
  cat: 'Money' | 'Home' | 'Travel' | 'Work';
  pub: string;
  since: string;
  line: string;
  wants: { cap: bigint; actions: number[]; days: number };
  perms: string[];
  nevers: string[];
  tasks: AgentTask[];
  listedReceipts: number; // directory listing stat (publisher-claimed history)
};

export const CATS = ['All', 'Money', 'Home', 'Travel', 'Work'] as const;

export const AGENTS: DirectoryAgent[] = [
  {
    id: 'submanager',
    name: 'SubManager',
    emoji: '💳',
    tint: '#E6E9F8',
    cat: 'Money',
    pub: 'Loop Labs',
    since: '2025',
    line: 'Trims and cancels subscriptions you forgot about.',
    wants: { cap: 30n, actions: [2], days: 30 },
    perms: ['subscribe & cancel on your behalf'],
    nevers: ['See your card number', 'Exceed your cap', 'Know who you are', 'Act after day 30'],
    tasks: [
      { label: 'Renewed: news subscription', action: 2, amount: 8n },
      { label: 'Renewed: music streaming', action: 2, amount: 11n },
      { label: 'Renewed: cloud storage', action: 2, amount: 5n },
    ],
    listedReceipts: 1284,
  },
  {
    id: 'travelbooker',
    name: 'TravelBooker',
    emoji: '✈️',
    tint: '#F6E3D3',
    cat: 'Travel',
    pub: 'Terminal 2',
    since: '2025',
    line: 'Watches routes you care about and books when fares dip.',
    wants: { cap: 250n, actions: [0, 6], days: 60 },
    perms: ['book trains and hotels on your watched routes', 'purchase seat upgrades'],
    nevers: ['See your passport or name', 'Change or cancel existing trips', 'Book above your cap'],
    tasks: [
      { label: 'Booked: train to the coast', action: 6, amount: 32n },
      { label: 'Booked: one hotel night', action: 6, amount: 89n },
      { label: 'Purchased: seat upgrade', action: 0, amount: 18n },
    ],
    listedReceipts: 862,
  },
  {
    id: 'grocerier',
    name: 'GroceryRunner',
    emoji: '🥕',
    tint: '#E2EDE4',
    cat: 'Home',
    pub: 'Homerow',
    since: '2024',
    line: 'Restocks your pantry before you run out.',
    wants: { cap: 80n, actions: [0], days: 14 },
    perms: ['order groceries from your list'],
    nevers: [
      'Order anything outside your list',
      'See your address — it ships to a locker code',
      'Exceed the weekly cap',
    ],
    tasks: [
      { label: 'Ordered: weekly groceries', action: 0, amount: 24n },
      { label: 'Ordered: coffee beans', action: 0, amount: 12n },
      { label: 'Ordered: fresh produce', action: 0, amount: 19n },
    ],
    listedReceipts: 2310,
  },
];

export const agentById = (id: string): DirectoryAgent => {
  const agent = AGENTS.find((a) => a.id === id);
  if (!agent) throw new Error(`unknown agent '${id}'`);
  return agent;
};

export const fmt = (n: number | bigint): string => `$${n.toLocaleString('en-US')}`;
