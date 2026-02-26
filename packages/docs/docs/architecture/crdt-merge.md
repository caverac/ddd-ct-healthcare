---
sidebar_position: 2
title: CRDT Merge (Semilattice)
---

# CRDT Merge via Semilattice Join

## The Problem

Multiple replicas of a provider's state may be updated concurrently without coordination. Replica A updates the address; replica B corrects the name. When they sync, how do you merge without data loss or conflicts?

## Semilattice Join

A state-based CRDT resolves this by making every state a **join-semilattice**: a set with a binary join operation that is commutative, associative, and idempotent. The merge of two states is simply their join.

:::info Not a colimit
The CRDT merge is a join **within** a fixed semilattice — it is NOT a colimit in the category of join-semilattices ($\mathbf{JSL}$). The paper (Section 5) explains this distinction carefully: a colimit in $\mathbf{JSL}$ would be the free product, which is a very different (and much larger) construction.
:::

## LWW Registers

The primary semilattice instance is the **Last-Writer-Wins (LWW) register**. Each field value is paired with a timestamp. The join of two LWW values keeps the one with the later timestamp:

```typescript
import { lww, lwwSemilattice } from '@ddt-ct/implementation'

const a = lww('Dr. Jane Doe', 50)
const b = lww('Dr. Jane A. Doe', 110)

const merged = lwwSemilattice<string>().join(a, b)
// merged = { value: 'Dr. Jane A. Doe', timestamp: 110 }
```

When timestamps tie, a deterministic tiebreaker (lexicographic comparison of serialized values) ensures commutativity.

## Product and Record CRDTs

Individual LWW registers compose into larger CRDTs via `productSemilattice` (for tuples) and `recordSemilattice` (for named-field records):

```typescript
import { recordSemilattice, lwwSemilattice } from '@ddt-ct/implementation'

const providerSemilattice = recordSemilattice<ProviderState>({
  name: lwwSemilattice<string>(),
  address: lwwSemilattice<Address>(),
  license: lwwSemilattice<string>(),
  networks: lwwSemilattice<ReadonlySet<string>>()
})
```

## Code Walkthrough

`mergeProviderStates` merges two replicas field-by-field:

```typescript
import { mergeProviderStates, initialProviderState } from '@ddt-ct/implementation'
import { lww } from '@ddt-ct/implementation'

const replicaA = {
  ...initialProviderState,
  name: lww('Dr. Jane Doe', 50),
  address: lww(uptown, 100) // newer address
}

const replicaB = {
  ...initialProviderState,
  name: lww('Dr. Jane A. Doe', 110), // newer name
  address: lww(downtown, 90) // stale address
}

const merged = mergeProviderStates(replicaA, replicaB)
// merged.name.value = 'Dr. Jane A. Doe' (t=110 wins)
// merged.address.value = uptown          (t=100 wins)
```

## Property-Based Verification

The semilattice laws are verified via fast-check property tests using `verifySemilatticeLaws`:

- **Commutativity**: `join(x, y) = join(y, x)`
- **Associativity**: `join(x, join(y, z)) = join(join(x, y), z)`
- **Idempotence**: `join(x, x) = x`

## Key Takeaway

CRDT merge is algebraic, not procedural. The semilattice structure guarantees that any order of merges converges to the same result — no coordination, no locking, no conflict resolution logic.
