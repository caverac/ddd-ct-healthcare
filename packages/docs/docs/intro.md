---
slug: /
sidebar_position: 1
title: Introduction
---

# DDD + Category Theory for Healthcare

Healthcare provider directories are broken. Studies consistently show **40%+ inaccuracy rates** in provider data — wrong addresses, stale credentials, phantom networks. Patients can't find doctors, claims are denied, and regulatory fines pile up.

This project attacks the root cause: provider data is scattered across multiple bounded contexts (EHR systems, credentialing databases, contracting platforms, public directories) with no principled way to merge, synchronize, or query it.

## The Five Structural Results

We prove that category theory provides **exactly the right abstractions** for healthcare data integration. Each result maps a well-known categorical construction to a concrete infrastructure problem:

| #   | Problem                                                                                  | Categorical Tool                                        | Module                       |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------- |
| 1   | **Entity Resolution** — merging partial, overlapping records into a single golden record | Colimit in $\mathbf{FinSet}/K$                          | `fragment.ts`                |
| 2   | **CRDT Merge** — reconciling concurrent updates without coordination                     | Join in a semilattice (not a colimit in $\mathbf{JSL}$) | `crdt.ts`, `semilattice.ts`  |
| 3   | **Schema Translation** — safely moving data between different schemas                    | Adjoint triple $(\Delta_F, \Sigma_F, \Pi_F)$            | `schema.ts`                  |
| 4   | **Event Sourcing** — reconstructing state at any point in time                           | Presheaf over a time poset                              | `temporal.ts`, `snapshot.ts` |
| 5   | **Consistency (Sheaf Condition)** — guaranteeing convergence across replicas             | Sheaf gluing axiom                                      | Verified via chaos tests     |

## Project Components

- **`packages/implementation`** — TypeScript + fp-ts library implementing all five results with full test coverage
- **`packages/pre-print`** — LaTeX manuscript with formal proofs and categorical diagrams
- **`packages/docs`** — This documentation site

## Quick Links

- [Installation](./getting-started/installation) — Get up and running
- [Project Structure](./getting-started/project-structure) — Navigate the monorepo
- [DDD Primer](./concepts/domain-driven-design) — Domain-Driven Design in context
- [Category Theory Primer](./concepts/category-theory) — Accessible definitions
- [API Reference](./library/api-reference) — Module-by-module exports
- [Worked Example](./library/worked-example) — The Dr. Jane Doe walkthrough
