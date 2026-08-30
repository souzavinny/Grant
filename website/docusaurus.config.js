// Grant documentation — Docusaurus configuration.
// SPDX-License-Identifier: Apache-2.0
// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Grant',
  tagline: 'Hire AI agents with permissions, not passwords',
  favicon: 'img/favicon.ico',

  // Served from its own domain on Azion Edge; url is set to the workload domain.
  url: 'https://glzyt5wkmia.map.azionedge.net',
  baseUrl: '/',
  organizationName: 'souzavinny',
  projectName: 'agentpass',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: { defaultLocale: 'en', locales: ['en'] },

  markdown: { mermaid: true },
  themes: ['@docusaurus/theme-mermaid'],

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
      // Mermaid diagrams wear the Grant design system: paper surfaces, hard
      // ink borders, allow-blue accents, the site's own type stack.
      mermaid: {
        theme: { light: 'base', dark: 'base' },
        options: {
          fontFamily: "'Schibsted Grotesk', system-ui, sans-serif",
          fontSize: 14,
          flowchart: { curve: 'linear', padding: 14, nodeSpacing: 46, rankSpacing: 64 },
          themeVariables: {
            fontFamily: "'Schibsted Grotesk', system-ui, sans-serif",
            fontSize: '14px',
            primaryColor: '#fcfaf4',
            primaryTextColor: '#201d16',
            primaryBorderColor: '#201d16',
            secondaryColor: '#e6e9f8',
            secondaryBorderColor: '#2440d4',
            secondaryTextColor: '#201d16',
            tertiaryColor: '#f3efe6',
            tertiaryBorderColor: '#d8d0bf',
            tertiaryTextColor: '#201d16',
            lineColor: '#201d16',
            textColor: '#201d16',
            clusterBkg: '#f3efe6',
            clusterBorder: '#6e675a',
            edgeLabelBackground: '#fcfaf4',
            noteBkgColor: '#e6e9f8',
            noteBorderColor: '#2440d4',
            noteTextColor: '#201d16',
            // state diagrams
            labelBackgroundColor: '#fcfaf4',
            stateBkg: '#fcfaf4',
            stateBorder: '#201d16',
            transitionColor: '#201d16',
            transitionLabelColor: '#201d16',
            specialStateColor: '#2440d4',
            innerEndBackground: '#2440d4',
            compositeBackground: '#f3efe6',
            compositeTitleBackground: '#f3efe6',
          },
        },
      },
    }),
};

export default config;
