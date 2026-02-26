# Algebraic Domain-Driven Design for Healthcare Provider Directories

A categorical semantics for consistency in healthcare provider directories, with a companion TypeScript implementation and pre-print manuscript.

Healthcare provider directories integrate partially overlapping representations of the same real-world entities across multiple bounded contexts. Empirical audits report persistent inaccuracy rates exceeding 40%. This project provides a formal categorical framework addressing these systemic failures.

## Documentation

Full documentation is available at **[caverac.github.io/ddd-ct-healthcare](https://caverac.github.io/ddd-ct-healthcare)**.

## Quick Start

```sh
corepack enable
yarn install
yarn test
```

## Project Structure

| Package                                              | Description                          |
| ---------------------------------------------------- | ------------------------------------ |
| [`packages/implementation`](packages/implementation) | TypeScript + fp-ts companion library |
| [`packages/docs`](packages/docs)                     | Docusaurus documentation site        |
| [`packages/pre-print`](packages/pre-print)           | LaTeX manuscript                     |

## License

See [LICENSE](LICENSE).
