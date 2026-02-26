import fs from 'node:fs'
import path from 'node:path'

import type * as Preset from '@docusaurus/preset-classic'
import type { Config } from '@docusaurus/types'
import { themes as prismThemes } from 'prism-react-renderer'
import rehypeMathjax from 'rehype-mathjax'
import remarkMath from 'remark-math'

const rootPkgPath = path.resolve(__dirname, '../../package.json')
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'))
const projectVersion = rootPkg.version ?? '0.0.0'

const config: Config = {
  title: 'DDD + Category Theory for Healthcare',
  tagline: 'Categorical semantics for healthcare provider directories',
  favicon: 'img/favicon.svg',

  url: 'https://caverac.github.io',
  baseUrl: '/ddd-ct-healthcare/',

  organizationName: 'caverac',
  projectName: 'ddd-ct-healthcare',

  onBrokenLinks: 'throw',

  customFields: {
    projectVersion
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },

  markdown: {
    mermaid: true
  },

  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        docsRouteBasePath: '/',
        indexBlog: false
      }
    ]
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeMathjax]
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css'
        }
      } satisfies Preset.Options
    ]
  ],

  themeConfig: {
    navbar: {
      title: 'DDD-CT Healthcare',
      logo: {
        alt: 'DDD-CT Healthcare logo',
        src: 'img/logo.svg'
      },
      hideOnScroll: false,
      items: [
        {
          type: 'custom-projectVersionBadge',
          position: 'left'
        } as never,
        {
          to: '/',
          label: 'Home',
          position: 'left'
        },
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation'
        },
        {
          href: 'https://github.com/caverac/ddd-ct-healthcare',
          label: 'GitHub',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/getting-started/installation'
            }
          ]
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/caverac/ddd-ct-healthcare'
            }
          ]
        }
      ],
      copyright: `Copyright \u00a9 ${new Date().getFullYear()} DDD-CT Healthcare. Built with Docusaurus.`
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula
    }
  } satisfies Preset.ThemeConfig
}

export default config
