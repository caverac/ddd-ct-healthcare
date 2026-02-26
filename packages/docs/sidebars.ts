import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started/installation', 'getting-started/project-structure']
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/domain-driven-design',
        'concepts/category-theory',
        'concepts/provider-directory'
      ]
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/entity-resolution',
        'architecture/crdt-merge',
        'architecture/schema-translation',
        'architecture/event-sourcing',
        'architecture/sheaf-condition'
      ]
    },
    {
      type: 'category',
      label: 'Library',
      items: ['library/api-reference', 'library/worked-example']
    },
    {
      type: 'category',
      label: 'Development',
      items: ['development/contributing']
    }
  ]
}

export default sidebars
