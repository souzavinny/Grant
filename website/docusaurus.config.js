// Grant documentation — Docusaurus configuration.
// SPDX-License-Identifier: Apache-2.0
// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Grant',
  tagline: 'Hire AI agents with permissions, not passwords',
  favicon: 'img/favicon.ico',

  // Adjust url/baseUrl when publishing to GitHub Pages
  // (e.g. https://<user>.github.io/<repo>/).
  url: 'https://souzavinny.github.io',
  baseUrl: '/agentpass/',
  organizationName: 'souzavinny',
  projectName: 'agentpass',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/', // docs-only site
          sidebarPath: './sidebars.js',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: { defaultMode: 'light', disableSwitch: true, respectPrefersColorScheme: false },
      navbar: {
        title: 'Grant',
        logo: { alt: 'Grant seal', src: 'img/seal.svg' },
        items: [
          { type: 'docSidebar', sidebarId: 'docsSidebar', position: 'left', label: 'Documentation' },
          { href: 'https://github.com/souzavinny/agentpass', label: 'GitHub', position: 'right' },
        ],
      },
      footer: {
        style: 'light',
        links: [],
        copyright: 'Grant · built on AgentPass · open source, Apache-2.0 · Built on Midnight · Midnight Buildathon 2026',
      },
      prism: {
        // theme is resolved in the classic preset defaults; keep defaults
      },
    }),
};

export default config;
