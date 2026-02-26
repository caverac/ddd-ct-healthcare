---
sidebar_position: 1
title: API Reference
---

# API Reference

All exports are available from the `@ddt-ct/implementation` package entry point.

## fragment.ts — Entity Resolution

| Export                   | Signature                                                                                                     | Description                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `Fragment<K, V>`         | `interface`                                                                                                   | A keyed fragment: finite set of records tagged with global keys   |
| `FragmentMorphism<K, V>` | `interface`                                                                                                   | A key-preserving map between fragments                            |
| `fragment`               | `(records: Array<{key: K, value: V}>) => Fragment<K, V>`                                                      | Construct a fragment from records                                 |
| `colimitFragments`       | `(fragments: ReadonlyArray<Fragment<string, V>>, merge: (a: V, b: V) => V) => Fragment<string, V>`            | Compute the colimit (entity resolution) of a diagram of fragments |
| `canonicalInjection`     | `(source: Fragment<string, V>, colimit: Fragment<string, V>) => ReadonlyMap<number, number>`                  | Canonical injection from a fragment into its colimit              |
| `mediatingMorphism`      | `(colimit: Fragment<string, V>, target: Fragment<string, V>, coconeMaps: ...) => ReadonlyMap<number, number>` | Verify the universal property via the mediating morphism          |

## semilattice.ts — Join-Semilattice

| Export                  | Signature                                                      | Description                                   |
| ----------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| `JoinSemilattice<A>`    | `interface { join: (x: A, y: A) => A }`                        | A join-semilattice typeclass                  |
| `LWW<A>`                | `interface { value: A, timestamp: number }`                    | Last-Writer-Wins register                     |
| `lww`                   | `(value: A, timestamp: number) => LWW<A>`                      | Construct an LWW register                     |
| `maxSemilattice`        | `JoinSemilattice<number>`                                      | Max-based semilattice for numbers             |
| `setUnionSemilattice`   | `<A>() => JoinSemilattice<ReadonlySet<A>>`                     | Set-union semilattice                         |
| `lwwSemilattice`        | `<A>() => JoinSemilattice<LWW<A>>`                             | LWW semilattice with deterministic tiebreaker |
| `joinAll`               | `(S: JoinSemilattice<A>) => (values: [A, ...A[]]) => A`        | Fold a non-empty array using join             |
| `verifySemilatticeLaws` | `(S, eq, x, y, z) => { commutative, associative, idempotent }` | Verify the three semilattice laws             |

## crdt.ts — State-Based CRDT

| Export               | Signature                                                                     | Description                                          |
| -------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| `merge`              | `(S: JoinSemilattice<A>) => (local: A, remote: A) => A`                       | Merge two CRDT states via semilattice join           |
| `productSemilattice` | `(sa: JoinSemilattice<A>, sb: JoinSemilattice<B>) => JoinSemilattice<[A, B]>` | Product semilattice for tuples                       |
| `recordSemilattice`  | `(fields: { [K in keyof R]: JoinSemilattice<R[K]> }) => JoinSemilattice<R>`   | Record-level semilattice from per-field semilattices |

## schema.ts — Functorial Schema Translation

| Export                | Signature                                                                   | Description                                                      |
| --------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `Schema`              | `Record<string, string>`                                                    | A schema: field names to type names                              |
| `SchemaMorphism`      | `Record<string, string>`                                                    | A schema morphism: source fields to target fields                |
| `Instance<S>`         | `{ [K in keyof S]: unknown }`                                               | A database instance of schema S                                  |
| `deltaF`              | `(morphism: SchemaMorphism, targetInstance: Instance<T>) => Instance<S>`    | Delta_F pullback / reindexing (safe direction)                   |
| `sigmaF`              | `(morphism: SchemaMorphism, sourceInstance: Instance<S>) => Instance<T>`    | Sigma_F pushforward (left adjoint)                               |
| `preservesConstraint` | `(morphism: SchemaMorphism, fkSource: string, fkTarget: string) => boolean` | Check if a morphism preserves a referential integrity constraint |

## temporal.ts — Event Log Presheaf

| Export                | Signature                                                        | Description                                  |
| --------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| `DomainEvent<E>`      | `interface { timestamp: number, payload: E }`                    | A timestamped domain event                   |
| `EventLog<E>`         | `ReadonlyArray<DomainEvent<E>>`                                  | An ordered event log                         |
| `eventLogUpTo`        | `(log: EventLog<E>, t: number) => EventLog<E>`                   | Presheaf P(t): events up to time t           |
| `restrictLog`         | `(log: EventLog<E>, s: number) => EventLog<E>`                   | Restriction map P(t) -> P(s)                 |
| `foldEvents`          | `(log: EventLog<E>, initial: S, apply: (s: S, e: E) => S) => S`  | State reconstruction: fold events into state |
| `stateAt`             | `(fullLog: EventLog<E>, t: number, initial: S, apply: ...) => S` | State at time t: compose presheaf with fold  |
| `verifyFunctoriality` | `(log: EventLog<E>, s: number, t: number) => boolean`            | Verify presheaf functoriality for s ≤ t      |

## snapshot.ts — Snapshot-Accelerated Queries

| Export                      | Signature                                                 | Description                                          |
| --------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| `Snapshot<S>`               | `interface { timestamp: number, state: S }`               | A state snapshot at a timestamp                      |
| `SnapshotLog<E, S>`         | `interface`                                               | Event log augmented with periodic snapshots          |
| `createSnapshotLog`         | `(events, initial, apply, interval) => SnapshotLog<E, S>` | Build a snapshot log with snapshots at each interval |
| `snapshotStateAt`           | `(slog: SnapshotLog<E, S>, t: number) => S`               | Reconstruct state from nearest snapshot              |
| `verifySnapshotEquivalence` | `(slog, t, eq) => boolean`                                | Verify snapshot optimization correctness             |

## provider.ts — Healthcare Domain Types

| Export                            | Signature                                                  | Description                                           |
| --------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| `Address`                         | `interface`                                                | Street address                                        |
| `ProviderEventPayload`            | `union type`                                               | Discriminated union of provider events                |
| `ProviderState`                   | `interface`                                                | Full provider state with LWW fields                   |
| `ProviderRecord`                  | `interface`                                                | Partial provider record (from one context)            |
| `emptyAddress`                    | `Address`                                                  | Zero-value address                                    |
| `initialProviderState`            | `ProviderState`                                            | Zero-value provider state                             |
| `providerSemilattice`             | `JoinSemilattice<ProviderState>`                           | Record-level semilattice for provider state           |
| `applyProviderEvent`              | `(state, event) => ProviderState`                          | Apply event using Date.now() timestamps               |
| `applyProviderEventDeterministic` | `(state, event, timestamp) => ProviderState`               | Apply event with explicit timestamp                   |
| `providerStateAt`                 | `(log, t) => ProviderState`                                | Provider state at time t                              |
| `foldProviderLog`                 | `(log) => ProviderState`                                   | Fold provider event log with deterministic timestamps |
| `mergeProviderRecords`            | `(a, b) => ProviderRecord`                                 | Merge two partial records (last-defined-wins)         |
| `resolveProvider`                 | `(fragments) => Fragment<string, ProviderRecord>`          | Entity resolution: colimit of provider fragments      |
| `mergeProviderStates`             | `(local, remote) => ProviderState`                         | CRDT merge for distributed provider state             |
| `ehrFragment`                     | `(npi, name, address) => Fragment<string, ProviderRecord>` | Create an EHR bounded-context fragment                |
| `credentialingFragment`           | `(npi, name, license) => Fragment<string, ProviderRecord>` | Create a credentialing fragment                       |
| `contractingFragment`             | `(npi, networks) => Fragment<string, ProviderRecord>`      | Create a contracting fragment                         |

## logger.ts

| Export   | Signature        | Description                                              |
| -------- | ---------------- | -------------------------------------------------------- |
| `logger` | `winston.Logger` | Shared structured logger (level via `LOG_LEVEL` env var) |
