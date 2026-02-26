/**
 * Provider — Healthcare domain types for the case study (Section 8).
 *
 * Models the Dr. Jane Doe scenario: a provider whose profile spans
 * four bounded contexts (Credentialing, EHR, Contracting, Directory).
 */
import { recordSemilattice, merge } from './crdt'
import { fragment, colimitFragments, Fragment } from './fragment'
import { LWW, lww, lwwSemilattice } from './semilattice'
import { stateAt, EventLog } from './temporal'

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface Address {
  readonly street: string
  readonly city: string
  readonly state: string
  readonly zip: string
}

export type ProviderEventPayload =
  | { readonly type: 'NameUpdated'; readonly name: string }
  | { readonly type: 'AddressMoved'; readonly address: Address }
  | { readonly type: 'LicenseRenewed'; readonly license: string; readonly expiry: string }
  | { readonly type: 'NetworkChanged'; readonly network: string; readonly active: boolean }

export interface ProviderState {
  readonly name: LWW<string>
  readonly address: LWW<Address>
  readonly license: LWW<string>
  readonly networks: LWW<ReadonlySet<string>>
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const EPOCH = 0

export const emptyAddress: Address = { street: '', city: '', state: '', zip: '' }

export const initialProviderState: ProviderState = {
  name: lww('', EPOCH),
  address: lww(emptyAddress, EPOCH),
  license: lww('', EPOCH),
  networks: lww(new Set<string>(), EPOCH)
}

// ---------------------------------------------------------------------------
// Semilattice instance for ProviderState
// ---------------------------------------------------------------------------

export const providerSemilattice = recordSemilattice<ProviderState>({
  name: lwwSemilattice<string>(),
  address: lwwSemilattice<Address>(),
  license: lwwSemilattice<string>(),
  networks: lwwSemilattice<ReadonlySet<string>>()
})

// ---------------------------------------------------------------------------
// Event application (fold step)
// ---------------------------------------------------------------------------

export const applyProviderEvent = (
  state: ProviderState,
  event: ProviderEventPayload
): ProviderState => {
  const now = Date.now()
  switch (event.type) {
    case 'NameUpdated':
      return { ...state, name: lww(event.name, now) }
    case 'AddressMoved':
      return { ...state, address: lww(event.address, now) }
    case 'LicenseRenewed':
      return { ...state, license: lww(event.license, now) }
    case 'NetworkChanged': {
      const current = new Set(state.networks.value)
      if (event.active) {
        current.add(event.network)
      } else {
        current.delete(event.network)
      }
      return { ...state, networks: lww(current, now) }
    }
  }
}

/**
 * Deterministic event application: use the event's own timestamp
 * rather than Date.now(), for reproducible tests.
 */
export const applyProviderEventDeterministic = (
  state: ProviderState,
  event: ProviderEventPayload,
  timestamp: number
): ProviderState => {
  switch (event.type) {
    case 'NameUpdated':
      return { ...state, name: lww(event.name, timestamp) }
    case 'AddressMoved':
      return { ...state, address: lww(event.address, timestamp) }
    case 'LicenseRenewed':
      return { ...state, license: lww(event.license, timestamp) }
    case 'NetworkChanged': {
      const current = new Set(state.networks.value)
      if (event.active) {
        current.add(event.network)
      } else {
        current.delete(event.network)
      }
      return { ...state, networks: lww(current, timestamp) }
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience: state at time t
// ---------------------------------------------------------------------------

export const providerStateAt = (log: EventLog<ProviderEventPayload>, t: number): ProviderState =>
  stateAt(log, t, initialProviderState, (s, e) => applyProviderEventDeterministic(s, e, t))

/**
 * Fold using each event's own timestamp (for proper LWW semantics
 * in the deterministic fold).
 */
export const foldProviderLog = (log: EventLog<ProviderEventPayload>): ProviderState =>
  log.reduce(
    (state, event) => applyProviderEventDeterministic(state, event.payload, event.timestamp),
    initialProviderState
  )

// ---------------------------------------------------------------------------
// Entity resolution: merge fragments from different bounded contexts
// ---------------------------------------------------------------------------

export interface ProviderRecord {
  readonly name?: string
  readonly address?: Address
  readonly license?: string
  readonly networks?: ReadonlySet<string>
}

export const mergeProviderRecords = (a: ProviderRecord, b: ProviderRecord): ProviderRecord => ({
  name: b.name ?? a.name,
  address: b.address ?? a.address,
  license: b.license ?? a.license,
  networks: b.networks ?? a.networks
})

export const resolveProvider = (
  fragments: ReadonlyArray<Fragment<string, ProviderRecord>>
): Fragment<string, ProviderRecord> => colimitFragments(fragments, mergeProviderRecords)

// ---------------------------------------------------------------------------
// CRDT merge for distributed provider state
// ---------------------------------------------------------------------------

export const mergeProviderStates = merge(providerSemilattice)

// ---------------------------------------------------------------------------
// Fragment constructors for bounded contexts
// ---------------------------------------------------------------------------

export const ehrFragment = (
  npi: string,
  name: string,
  address: Address
): Fragment<string, ProviderRecord> => fragment([{ key: npi, value: { name, address } }])

export const credentialingFragment = (
  npi: string,
  name: string,
  license: string
): Fragment<string, ProviderRecord> => fragment([{ key: npi, value: { name, license } }])

export const contractingFragment = (
  npi: string,
  networks: ReadonlySet<string>
): Fragment<string, ProviderRecord> => fragment([{ key: npi, value: { networks } }])
