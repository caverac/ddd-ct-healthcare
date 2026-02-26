---
sidebar_position: 2
title: Project Structure
---

# Project Structure

This is a Yarn workspaces monorepo with three packages.

```
ddd-ct-healthcare/
├── packages/
│   ├── implementation/        # TypeScript library
│   │   ├── src/
│   │   │   ├── index.ts       # Public API re-exports
│   │   │   ├── fragment.ts    # Entity resolution (colimit)
│   │   │   ├── semilattice.ts # Join-semilattice + LWW registers
│   │   │   ├── crdt.ts        # State-based CRDT merge
│   │   │   ├── schema.ts      # Functorial schema translation
│   │   │   ├── temporal.ts    # Event log presheaf
│   │   │   ├── snapshot.ts    # Snapshot-accelerated queries
│   │   │   ├── provider.ts    # Healthcare domain types
│   │   │   └── logger.ts      # Structured logging
│   │   ├── test/              # Jest + fast-check tests
│   │   └── examples/
│   │       └── dr-jane-doe.ts # Complete worked example
│   ├── pre-print/             # LaTeX manuscript
│   │   ├── ms.tex             # Main paper source
│   │   ├── refs.bib           # Bibliography
│   │   └── ms.pdf             # Compiled PDF
│   └── docs/                  # This documentation site
├── package.json               # Root workspace config
├── tsconfig.json              # Root TypeScript config
└── eslint.config.mjs          # Shared ESLint config
```

## Module-to-Paper Mapping

Each source module corresponds to a section of the formal paper:

| Module           | Paper Section | Categorical Construction                       |
| ---------------- | ------------- | ---------------------------------------------- |
| `fragment.ts`    | Section 3     | Colimit in $\mathbf{FinSet}/K$                 |
| `semilattice.ts` | Section 5     | Join-semilattice                               |
| `crdt.ts`        | Section 5     | Semilattice join (state-based CRDT)            |
| `schema.ts`      | Section 6     | Adjoint triple $(\Sigma_F, \Delta_F, \Pi_F)$   |
| `temporal.ts`    | Section 7     | Presheaf $P: T^{\mathrm{op}} \to \mathbf{Set}$ |
| `snapshot.ts`    | Section 7     | Mealy machine optimization                     |
| `provider.ts`    | Section 8     | Case study domain types                        |

## Compiling the Manuscript

The LaTeX paper can be compiled from the `packages/pre-print` directory:

```bash
cd packages/pre-print
pdflatex ms.tex
bibtex ms
pdflatex ms.tex
pdflatex ms.tex
```

The compiled PDF is at `packages/pre-print/ms.pdf`.
