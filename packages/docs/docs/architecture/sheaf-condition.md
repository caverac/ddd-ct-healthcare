---
sidebar_position: 5
title: Sheaf Condition (Consistency)
---

# Sheaf Condition and Distributed Consistency

## The Problem

When provider data is replicated across distributed nodes, concurrent updates can cause **split-brain**: different replicas hold different states, and naive merge strategies may diverge rather than converge. How do you guarantee that all replicas eventually agree?

## The Sheaf / Gluing Axiom

A **sheaf** is a presheaf that satisfies the **gluing axiom**: given compatible local data on overlapping regions, there exists a **unique** global datum that restricts to each local piece.

In our distributed setting:

- **Regions** are replicas (nodes holding copies of provider state)
- **Overlaps** are the shared NPI keys that multiple replicas track
- **Local data** is each replica's current state
- **Gluing** is the CRDT merge operation

The sheaf condition says: if you merge any subset of replicas in any order, you always get the same result. This is exactly the guarantee provided by the semilattice laws (commutativity + associativity + idempotence).

## Connection to CRDT Merge

The sheaf condition and CRDT convergence are two views of the same property:

| Sheaf Language       | CRDT Language                                      |
| -------------------- | -------------------------------------------------- |
| Gluing map           | Merge function                                     |
| Locality             | Each replica updates independently                 |
| Uniqueness of gluing | Convergence (all merge orders produce same result) |
| Compatible sections  | States reachable from a common ancestor            |

The semilattice join is the gluing map. Because it's commutative, associative, and idempotent, gluing is always unique.

## Chaos Test Results

The test suite includes **chaos tests** that simulate concurrent updates across multiple replicas with random orderings and merge schedules. Results:

| Approach                           | Convergence Rate                    |
| ---------------------------------- | ----------------------------------- |
| **Categorical (semilattice join)** | 100% convergence across all trials  |
| **Imperative (naive last-write)**  | 100% divergence — replicas disagree |

The categorical approach converges because the semilattice laws are **algebraic invariants** — they hold regardless of network ordering, message delays, or partition patterns. The imperative approach diverges because last-write-wins without proper timestamps is order-dependent.

## Key Takeaway

The sheaf condition is the formal statement of "distributed consistency without coordination." By building provider state on join-semilattices, we get the gluing axiom for free — and the chaos tests empirically verify that the categorical guarantees hold under adversarial conditions.
