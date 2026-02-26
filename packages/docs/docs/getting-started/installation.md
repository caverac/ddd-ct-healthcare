---
sidebar_position: 1
title: Installation
---

# Installation

## Prerequisites

- **Node.js** >= 20.0.0
- **Yarn 4** via Corepack (ships with Node 20+)

Enable Corepack if you haven't already:

```bash
corepack enable
```

## Clone & Install

```bash
git clone https://github.com/caverac/ddd-ct-healthcare.git
cd ddd-ct-healthcare
yarn install
```

## Build

```bash
yarn workspaces foreach -Apt run build
```

## Test

Run the full test suite (73 tests, 100% coverage):

```bash
yarn test
```

This runs Jest across all workspace packages, including:

- Unit tests for every module (fragment, semilattice, CRDT, schema, temporal, snapshot)
- Property-based tests via fast-check (semilattice laws, presheaf functoriality)
- Chaos tests (sheaf condition verification)
- Integration scenario tests (Dr. Jane Doe end-to-end)

## Lint & Format

```bash
yarn lint        # ESLint with zero-warning policy
yarn format      # Prettier check
yarn lint:fix    # Auto-fix lint issues
yarn format:fix  # Auto-fix formatting
```

## Typecheck

```bash
yarn typecheck
```

Runs `tsc --noEmit` across all workspace packages.

## Run the Documentation Site

```bash
yarn docs:start
```

Opens the documentation site at [http://localhost:3000](http://localhost:3000).

To build for production:

```bash
yarn docs:build
```
