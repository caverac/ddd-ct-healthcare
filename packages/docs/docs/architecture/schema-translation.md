---
sidebar_position: 3
title: Schema Translation (Adjunction)
---

# Schema Translation via Adjoint Triple

## The Problem

Different bounded contexts use different schemas. The EHR system has fields `(npi, full_name, office_address)` while the directory uses `(provider_id, name, address, license)`. How do you safely move data between these schemas without creating dangling references or losing information?

## The Adjoint Triple

A schema morphism $F: C \to D$ (mapping field names from source schema $C$ to target schema $D$) induces three functors between database instances:

- $\Sigma_F$ (left adjoint / pushforward) — pushes data forward along $F$
- $\Delta_F$ (pullback / reindexing) — pulls data back along $F$
- $\Pi_F$ (right adjoint) — right Kan extension (not implemented here)

The adjunction $\Sigma_F \dashv \Delta_F \dashv \Pi_F$ governs the trade-offs:

| Direction    | Functor    | Safety                                                              | Data Coverage                   |
| ------------ | ---------- | ------------------------------------------------------------------- | ------------------------------- |
| Pull back    | $\Delta_F$ | Safe — never creates dangling references                            | Only fields in the image of $F$ |
| Push forward | $\Sigma_F$ | Potentially unsafe — target fields not in $F$'s image are undefined | All source data transferred     |

## $\Delta_F$: The Safe Direction

`deltaF` reindexes a target instance along a schema morphism. It only reads existing data through the morphism, so it can never produce values that don't exist in the source:

```typescript
import { deltaF } from '@ddt-ct/implementation'

const morphism = {
  npi: 'provider_id',
  full_name: 'name',
  office_address: 'address'
}

const directoryRecord = {
  provider_id: 'NPI-123',
  name: 'Dr. Jane Doe',
  address: '100 Downtown Ave',
  license: 'MD-98765'
}

const ehrView = deltaF(morphism, directoryRecord)
// ehrView = { npi: 'NPI-123', full_name: 'Dr. Jane Doe', office_address: '100 Downtown Ave' }
```

## $\Sigma_F$: The Forward Direction

`sigmaF` pushes data forward. Fields in the target schema that aren't in the morphism's image get `undefined`:

```typescript
import { sigmaF } from '@ddt-ct/implementation'

const ehrRecord = {
  npi: 'NPI-123',
  full_name: 'Dr. Jane Doe',
  office_address: '100 Downtown Ave'
}

const directoryView = sigmaF(morphism, ehrRecord)
// directoryView = { provider_id: 'NPI-123', name: 'Dr. Jane Doe', address: '100 Downtown Ave' }
// Note: 'license' is undefined — not in the morphism's image
```

## Constraint Preservation

`preservesConstraint` verifies that a morphism preserves referential integrity constraints — if the source schema has a foreign key from field A to field B, the morphism must map both fields:

```typescript
import { preservesConstraint } from '@ddt-ct/implementation'

preservesConstraint(morphism, 'npi', 'full_name') // true — both mapped
preservesConstraint(morphism, 'npi', 'license') // false — 'license' not in morphism
```

## Key Takeaway

Schema translation isn't string replacement — it's a **functorial operation** with formal safety guarantees. $\Delta_F$ (pullback) is always safe; $\Sigma_F$ (pushforward) requires checking that unmapped fields are acceptable.
