// Grant documentation — sidebar structure (mirrors the docs plan).
// SPDX-License-Identifier: Apache-2.0
// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    { type: 'doc', id: 'index', label: 'Home' },
    {
      type: 'category',
      label: 'Project overview',
      items: ['overview/value-proposition', 'overview/market-analysis', 'overview/target-audience'],
    },
    {
      type: 'category',
      label: 'Midnight & ZK integration',
      items: [
        'midnight/overview',
        'midnight/zk-implementation',
        'midnight/onboarding',
        'midnight/advanced-integration',
      ],
    },
    {
      type: 'category',
      label: 'Technical architecture',
      items: [
        'architecture/system-architecture',
        'architecture/smart-contracts',
        'architecture/credential-design',
        'architecture/security',
      ],
    },
    {
      type: 'category',
      label: 'User experience',
      items: ['ux/personas', 'ux/user-journey', 'ux/interface-design', 'ux/onboarding', 'ux/accessibility'],
    },
    {
      type: 'category',
      label: 'Business model',
      items: [
        'business/revenue-model',
        'business/economic-sustainability',
        'business/market-strategy',
        'business/growth-strategy',
      ],
    },
    {
      type: 'category',
      label: 'Roadmap',
      items: ['roadmap/development-phases', 'roadmap/milestones', 'roadmap/hackathon-waves', 'roadmap/vision'],
    },
    { type: 'doc', id: 'deep-dives/privacy-design', label: 'Privacy design (deep dive)' },
  ],
};

export default sidebars;
