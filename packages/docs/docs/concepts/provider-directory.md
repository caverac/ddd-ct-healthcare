---
sidebar_position: 3
title: Provider Directory Domain
---

# Provider Directory Domain

## What Is a Provider Directory?

A provider directory is a database that maps healthcare providers (doctors, specialists, facilities) to their practice locations, credentials, and insurance network participation. It's the data that powers "find a doctor" searches, claims adjudication, and regulatory compliance.

## The Data Quality Crisis

Provider directories are notoriously inaccurate. Industry studies consistently report **40%+ error rates**: wrong addresses, disconnected phone numbers, listed providers who aren't accepting patients, missing network affiliations. These errors have real consequences:

- **Patients** drive to closed offices or see out-of-network providers
- **Payers** deny claims based on stale directory data
- **Providers** lose referrals and face credentialing delays
- **Regulators** levy fines under the No Surprises Act and CMS accuracy mandates

The root cause isn't carelessness — it's **architectural**. Provider data originates in four separate bounded contexts, each with its own schema, update cycle, and source of truth.

## The Dr. Jane Doe Scenario

Consider a single provider, Dr. Jane Doe (NPI: 1234567890):

- The **EHR system** knows her name and practice address (100 Downtown Ave)
- The **Credentialing database** knows her name and medical license (MD-98765)
- The **Contracting platform** knows her insurance networks (BlueCross, Aetna)
- The **Public directory** needs all of the above, merged into one golden record

When Dr. Doe moves to a new office, the EHR updates her address but the directory still shows the old one. When she renews her license, credentialing knows but contracting doesn't. When she drops a network, the directory may not reflect it for months.

## Domain Entities in TypeScript

The implementation models these concepts as TypeScript types:

```typescript
interface Address {
  readonly street: string
  readonly city: string
  readonly state: string
  readonly zip: string
}

// Partial record from a single bounded context
interface ProviderRecord {
  readonly name?: string
  readonly address?: Address
  readonly license?: string
  readonly networks?: ReadonlySet<string>
}

// Full CRDT state with LWW conflict resolution
interface ProviderState {
  readonly name: LWW<string>
  readonly address: LWW<Address>
  readonly license: LWW<string>
  readonly networks: LWW<ReadonlySet<string>>
}

// Domain events
type ProviderEventPayload =
  | { type: 'NameUpdated'; name: string }
  | { type: 'AddressMoved'; address: Address }
  | { type: 'LicenseRenewed'; license: string; expiry: string }
  | { type: 'NetworkChanged'; network: string; active: boolean }
```

Each `ProviderRecord` is a **fragment** — a partial view from one bounded context. The `ProviderState` is the **merged aggregate** that results from CRDT merge across replicas. The event types drive the **temporal presheaf** for historical queries.
