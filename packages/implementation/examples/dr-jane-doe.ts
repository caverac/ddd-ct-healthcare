/**
 * Dr. Jane Doe — Complete worked example from the paper (Section 8.2).
 *
 * Demonstrates the full categorical pipeline:
 *   1. Entity resolution via colimit of keyed fragments
 *   2. CRDT merge via semilattice join
 *   3. Temporal state reconstruction via presheaf fold
 */
import {
  ehrFragment,
  credentialingFragment,
  contractingFragment,
  resolveProvider,
  foldProviderLog,
  mergeProviderStates,
  initialProviderState,
  type Address,
  type ProviderEventPayload
} from '../src/provider'
import { lww } from '../src/semilattice'
import { eventLogUpTo, type EventLog } from '../src/temporal'

// Constants

const NPI = 'NPI-1234567890'

const downtown: Address = {
  street: '100 Downtown Ave',
  city: 'Metropolis',
  state: 'NY',
  zip: '10001'
}

const uptown: Address = {
  street: '500 Uptown Blvd',
  city: 'Metropolis',
  state: 'NY',
  zip: '10025'
}

// 1. Entity Resolution (Colimit)

// eslint-disable-next-line no-console
console.log('=== Step 1: Entity Resolution (Colimit) ===\n')

const ehr = ehrFragment(NPI, 'Dr. Jane Doe', downtown)
const cred = credentialingFragment(NPI, 'Dr. Jane Doe', 'MD-98765')
const contract = contractingFragment(NPI, new Set(['BlueCross', 'Aetna']))

const resolved = resolveProvider([ehr, cred, contract])
// eslint-disable-next-line no-console
console.log('Resolved provider:', JSON.stringify(resolved.records[0], null, 2))

// 2. CRDT Merge (Semilattice Join)

// eslint-disable-next-line no-console
console.log('\n=== Step 2: CRDT Merge (Semilattice Join) ===\n')

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
// eslint-disable-next-line no-console
console.log('Merged name:', merged.name.value) // Dr. Jane A. Doe (t=110)
// eslint-disable-next-line no-console
console.log('Merged address:', merged.address.value) // Uptown (t=100)

// 3. Temporal Query (Presheaf Fold)

// eslint-disable-next-line no-console
console.log('\n=== Step 3: Temporal Query (Presheaf Fold) ===\n')

const eventLog: EventLog<ProviderEventPayload> = [
  { timestamp: 10, payload: { type: 'NameUpdated', name: 'Dr. Jane Doe' } },
  { timestamp: 20, payload: { type: 'AddressMoved', address: downtown } },
  { timestamp: 30, payload: { type: 'LicenseRenewed', license: 'MD-98765', expiry: '2027-01-01' } },
  { timestamp: 40, payload: { type: 'NetworkChanged', network: 'BlueCross', active: true } },
  { timestamp: 50, payload: { type: 'AddressMoved', address: uptown } }
]

const stateAt25 = foldProviderLog(eventLogUpTo(eventLog, 25))
// eslint-disable-next-line no-console
console.log('State at t=25:', {
  name: stateAt25.name.value,
  address: stateAt25.address.value,
  license: stateAt25.license.value
})

const stateFinal = foldProviderLog(eventLog)
// eslint-disable-next-line no-console
console.log('Final state:', {
  name: stateFinal.name.value,
  address: stateFinal.address.value,
  license: stateFinal.license.value,
  networks: [...stateFinal.networks.value]
})
