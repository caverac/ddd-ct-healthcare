---
sidebar_position: 1
title: Contributing
---

# Contributing

## Branch Strategy

- `main` is the primary branch
- Feature branches follow `feat/<description>` naming
- Bug fix branches follow `fix/<description>` naming

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add sheaf verification to chaos tests
fix: correct LWW tiebreaker for equal timestamps
docs: add event sourcing architecture page
test: add property tests for presheaf functoriality
refactor: extract record semilattice from provider module
```

Commit messages are enforced by `@commitlint/cli` via a Husky `commit-msg` hook.

## Pre-Commit Hooks

The project uses [Husky](https://typicode.github.io/husky/) with [lint-staged](https://github.com/lint-staged/lint-staged):

- **Pre-commit**: runs ESLint and Prettier on staged files
- **Commit-msg**: validates the commit message format

## CI Pipeline

The CI pipeline runs:

1. `yarn install` — install dependencies
2. `yarn typecheck` — TypeScript compilation check
3. `yarn lint` — ESLint with `--max-warnings 0`
4. `yarn format` — Prettier check
5. `yarn test` — Jest test suite with coverage

## Code Style

- **No semicolons** — enforced by Prettier
- **Single quotes** — enforced by Prettier
- **2-space indentation** — enforced by Prettier
- **100-character line width** — enforced by Prettier
- **Trailing commas**: none — enforced by Prettier
- **Zero ESLint warnings** — enforced by `--max-warnings 0`

## Testing Conventions

- Tests live in `packages/implementation/test/`
- Unit tests use **Jest** with `ts-jest`
- Property-based tests use **fast-check** for algebraic law verification
- Chaos tests simulate distributed scenarios with randomized orderings
- Coverage target: **100%** (enforced in CI)

## Adding Documentation Pages

1. Create a new `.md` file in the appropriate `packages/docs/docs/` subdirectory
2. Add frontmatter with `sidebar_position` and `title`
3. Add the document ID to `packages/docs/sidebars.ts` in the correct category
4. Run `yarn docs:start` to preview locally
5. Run `yarn docs:build` to verify no broken links (`onBrokenLinks: 'throw'`)

### Frontmatter template

```markdown
---
sidebar_position: 1
title: Page Title
---

# Page Title

Content here...
```
