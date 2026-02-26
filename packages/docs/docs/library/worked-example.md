---
sidebar_position: 2
title: Worked Example
---

# Worked Example: Dr. Jane Doe

This walkthrough follows the complete categorical pipeline from the paper's case study (Section 8.2). The full runnable code is in `packages/implementation/examples/dr-jane-doe.ts`.

## Step 1: Entity Resolution (Colimit)

Three bounded contexts each contribute a partial fragment about Dr. Jane Doe, identified by her NPI number:

```typescript
import {
  ehrFragment,
  credentialingFragment,
  contractingFragment,
  resolveProvider
} from '@ddt-ct/implementation'

const NPI = 'NPI-1234567890'

const downtown = { street: '100 Downtown Ave', city: 'Metropolis', state: 'NY', zip: '10001' }

// Each context knows different things
const ehr = ehrFragment(NPI, 'Dr. Jane Doe', downtown)
const cred = credentialingFragment(NPI, 'Dr. Jane Doe', 'MD-98765')
const contract = contractingFragment(NPI, new Set(['BlueCross', 'Aetna']))

// Compute the colimit — deterministic merge into a golden record
const resolved = resolveProvider([ehr, cred, contract])
```

The result is a single `ProviderRecord` containing all fields from all three contexts:

```json
{
  "name": "Dr. Jane Doe",
  "address": { "street": "100 Downtown Ave", "city": "Metropolis", "state": "NY", "zip": "10001" },
  "license": "MD-98765",
  "networks": ["BlueCross", "Aetna"]
}
```

## Step 2: CRDT Merge (Semilattice Join)

Two replicas have been updated concurrently. Replica A has a newer address (t=100); Replica B has a newer name correction (t=110):

```typescript
import { mergeProviderStates, initialProviderState, lww } from '@ddt-ct/implementation'

const uptown = { street: '500 Uptown Blvd', city: 'Metropolis', state: 'NY', zip: '10025' }

const replicaA = {
  ...initialProviderState,
  name: lww('Dr. Jane Doe', 50),
  address: lww(uptown, 100) // newer address
}

const replicaB = {
  ...initialProviderState,
  name: lww('Dr. Jane A. Doe', 110), // newer name correction
  address: lww(downtown, 90) // stale address
}

const merged = mergeProviderStates(replicaA, replicaB)
```

The merge picks the **latest timestamp per field**:

| Field   | Replica A             | Replica B                 | Merged                |
| ------- | --------------------- | ------------------------- | --------------------- |
| name    | "Dr. Jane Doe" (t=50) | "Dr. Jane A. Doe" (t=110) | **"Dr. Jane A. Doe"** |
| address | Uptown (t=100)        | Downtown (t=90)           | **Uptown**            |

No data is lost. No coordination is required. The semilattice laws guarantee the same result regardless of merge order.

## Step 3: Temporal Query (Presheaf Fold)

An event log records all changes over time:

```typescript
import { eventLogUpTo, foldProviderLog } from '@ddt-ct/implementation'

const eventLog = [
  { timestamp: 10, payload: { type: 'NameUpdated', name: 'Dr. Jane Doe' } },
  { timestamp: 20, payload: { type: 'AddressMoved', address: downtown } },
  { timestamp: 30, payload: { type: 'LicenseRenewed', license: 'MD-98765', expiry: '2027-01-01' } },
  { timestamp: 40, payload: { type: 'NetworkChanged', network: 'BlueCross', active: true } },
  { timestamp: 50, payload: { type: 'AddressMoved', address: uptown } }
]
```

Query the state at any point in time by applying the presheaf and folding:

```typescript
// State at t=25: only NameUpdated and AddressMoved have occurred
const stateAt25 = foldProviderLog(eventLogUpTo(eventLog, 25))
// { name: 'Dr. Jane Doe', address: downtown, license: '', networks: Set() }

// Final state: all events applied
const stateFinal = foldProviderLog(eventLog)
// { name: 'Dr. Jane Doe', address: uptown, license: 'MD-98765', networks: Set(['BlueCross']) }
```

## Running the Example

```bash
cd packages/implementation
npx ts-node examples/dr-jane-doe.ts
```

Output:

```
=== Step 1: Entity Resolution (Colimit) ===
Resolved provider: { name: 'Dr. Jane Doe', address: {...}, license: 'MD-98765', networks: ['BlueCross', 'Aetna'] }

=== Step 2: CRDT Merge (Semilattice Join) ===
Merged name: Dr. Jane A. Doe
Merged address: { street: '500 Uptown Blvd', ... }

=== Step 3: Temporal Query (Presheaf Fold) ===
State at t=25: { name: 'Dr. Jane Doe', address: { street: '100 Downtown Ave', ... }, license: '' }
Final state: { name: 'Dr. Jane Doe', address: { street: '500 Uptown Blvd', ... }, license: 'MD-98765', networks: ['BlueCross'] }
```
