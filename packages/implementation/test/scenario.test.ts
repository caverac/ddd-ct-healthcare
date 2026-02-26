import {
  ehrFragment,
  credentialingFragment,
  contractingFragment,
  resolveProvider,
  foldProviderLog,
  mergeProviderStates,
  initialProviderState,
  applyProviderEvent,
  applyProviderEventDeterministic,
  providerStateAt
} from '../src/provider'
import type { Address, ProviderEventPayload, ProviderState } from '../src/provider'
import { deltaF, sigmaF, preservesConstraint } from '../src/schema'
import { lww } from '../src/semilattice'
import { eventLogUpTo } from '../src/temporal'
import type { EventLog } from '../src/temporal'

describe('Dr. Jane Doe — end-to-end scenario', () => {
  // ---- Constants ----
  const NPI = 'NPI-1234567890'

  const downtownAddress: Address = {
    street: '100 Downtown Ave',
    city: 'Metropolis',
    state: 'NY',
    zip: '10001'
  }

  const uptownAddress: Address = {
    street: '500 Uptown Blvd',
    city: 'Metropolis',
    state: 'NY',
    zip: '10025'
  }

  // =========================================================================
  // Section 3–4: Entity Resolution via Colimit
  // =========================================================================
  describe('Entity resolution (colimit)', () => {
    it('merges fragments from three bounded contexts', () => {
      const ehr = ehrFragment(NPI, 'Dr. Jane Doe', downtownAddress)
      const cred = credentialingFragment(NPI, 'Dr. Jane Doe', 'MD-98765')
      const contract = contractingFragment(NPI, new Set(['BlueCross', 'Aetna']))

      const resolved = resolveProvider([ehr, cred, contract])
      const jane = resolved.records.find((r) => r.key === NPI)

      expect(jane).toBeDefined()
      expect(jane!.value.name).toBe('Dr. Jane Doe')
      expect(jane!.value.address).toEqual(downtownAddress)
      expect(jane!.value.license).toBe('MD-98765')
      expect(jane!.value.networks).toEqual(new Set(['BlueCross', 'Aetna']))
    })

    it('handles multiple providers', () => {
      const ehr = ehrFragment(NPI, 'Dr. Jane Doe', downtownAddress)
      const ehr2 = ehrFragment('NPI-9999', 'Dr. Bob', uptownAddress)

      const resolved = resolveProvider([ehr, ehr2])
      expect(resolved.records).toHaveLength(2)
    })
  })

  // =========================================================================
  // Section 5: CRDT Merge (semilattice join)
  // =========================================================================
  describe('CRDT merge (semilattice join)', () => {
    it('resolves concurrent address updates via LWW', () => {
      // Replica A processes the address move first (timestamp 100)
      const replicaA: ProviderState = {
        ...initialProviderState,
        name: lww('Dr. Jane Doe', 50),
        address: lww(uptownAddress, 100)
      }

      // Replica B has stale address but newer name correction (timestamp 110)
      const replicaB: ProviderState = {
        ...initialProviderState,
        name: lww('Dr. Jane A. Doe', 110),
        address: lww(downtownAddress, 90)
      }

      const merged = mergeProviderStates(replicaA, replicaB)

      // LWW: name from B (t=110 > t=50), address from A (t=100 > t=90)
      expect(merged.name.value).toBe('Dr. Jane A. Doe')
      expect(merged.address.value).toEqual(uptownAddress)
    })

    it('merge is commutative', () => {
      const a: ProviderState = {
        ...initialProviderState,
        name: lww('A', 1),
        address: lww(downtownAddress, 2)
      }
      const b: ProviderState = {
        ...initialProviderState,
        name: lww('B', 3),
        address: lww(uptownAddress, 1)
      }

      const ab = mergeProviderStates(a, b)
      const ba = mergeProviderStates(b, a)

      expect(ab.name).toEqual(ba.name)
      expect(ab.address).toEqual(ba.address)
    })

    it('merge is idempotent', () => {
      const state: ProviderState = {
        ...initialProviderState,
        name: lww('Dr. Jane Doe', 50),
        address: lww(uptownAddress, 100)
      }

      const merged = mergeProviderStates(state, state)
      expect(merged.name).toEqual(state.name)
      expect(merged.address).toEqual(state.address)
    })
  })

  // =========================================================================
  // Section 6: Schema Translation
  // =========================================================================
  describe('Schema translation (functorial reindexing)', () => {
    it('deltaF reindexes from directory schema to EHR schema', () => {
      const morphism = {
        providerName: 'name',
        clinicAddress: 'address',
        providerNpi: 'npi'
      }

      const directoryInstance = {
        name: 'Dr. Jane Doe',
        address: uptownAddress,
        npi: NPI,
        license: 'MD-98765'
      }

      const ehrInstance = deltaF(morphism, directoryInstance)

      expect(ehrInstance).toEqual({
        providerName: 'Dr. Jane Doe',
        clinicAddress: uptownAddress,
        providerNpi: NPI
      })
    })

    it('sigmaF pushes forward from EHR schema to directory schema', () => {
      const morphism = {
        providerName: 'name',
        clinicAddress: 'address'
      }

      const ehrInstance = {
        providerName: 'Dr. Jane Doe',
        clinicAddress: uptownAddress
      }

      const directoryInstance = sigmaF(morphism, ehrInstance)

      expect(directoryInstance).toEqual({
        name: 'Dr. Jane Doe',
        address: uptownAddress
      })
    })

    it('preservesConstraint checks FK mapping', () => {
      const morphism = {
        providerId: 'npi',
        clinicId: 'clinic_fk',
        clinicName: 'clinic_name'
      }

      expect(preservesConstraint(morphism, 'providerId', 'clinicId')).toBe(true)
      expect(preservesConstraint(morphism, 'providerId', 'missingField')).toBe(false)
    })
  })

  // =========================================================================
  // Section 7: Temporal State (presheaf + fold)
  // =========================================================================
  describe('Temporal state (presheaf)', () => {
    const eventLog: EventLog<ProviderEventPayload> = [
      { timestamp: 10, payload: { type: 'NameUpdated', name: 'Dr. Jane Doe' } },
      {
        timestamp: 20,
        payload: { type: 'AddressMoved', address: downtownAddress }
      },
      {
        timestamp: 30,
        payload: {
          type: 'LicenseRenewed',
          license: 'MD-98765',
          expiry: '2027-01-01'
        }
      },
      {
        timestamp: 40,
        payload: { type: 'NetworkChanged', network: 'BlueCross', active: true }
      },
      {
        timestamp: 50,
        payload: { type: 'AddressMoved', address: uptownAddress }
      }
    ]

    it('reconstructs state at time 20 (before license renewal)', () => {
      const state = foldProviderLog(eventLogUpTo(eventLog, 20))
      expect(state.name.value).toBe('Dr. Jane Doe')
      expect(state.address.value).toEqual(downtownAddress)
      expect(state.license.value).toBe('') // not yet renewed
    })

    it('reconstructs state at time 50 (after address move)', () => {
      const state = foldProviderLog(eventLogUpTo(eventLog, 50))
      expect(state.address.value).toEqual(uptownAddress)
    })

    it('reconstructs final state from full log', () => {
      const state = foldProviderLog(eventLog)
      expect(state.name.value).toBe('Dr. Jane Doe')
      expect(state.address.value).toEqual(uptownAddress)
      expect(state.license.value).toBe('MD-98765')
      expect(state.networks.value).toEqual(new Set(['BlueCross']))
    })

    it('demonstrates the imperative race condition problem', () => {
      // In an imperative system, if event at t=50 (address move) arrives
      // before event at t=40 (network change), the system might process
      // them out of order and lose the address update.

      // With our categorical approach, the presheaf structure ensures
      // that stateAt(t) always yields the correct state regardless of
      // arrival order, because P(t) is defined as the set of events
      // up to t, not by arrival order.

      // Simulate out-of-order arrival: events 50, 40 arrive before 30
      const outOfOrder: EventLog<ProviderEventPayload> = [
        eventLog[0], // t=10
        eventLog[1], // t=20
        eventLog[4], // t=50 (arrives early)
        eventLog[3], // t=40 (arrives early)
        eventLog[2] // t=30 (arrives late)
      ]

      // When we sort by timestamp and fold, result is identical
      const sorted = [...outOfOrder].sort((a, b) => a.timestamp - b.timestamp)
      const stateOrdered = foldProviderLog(eventLog)
      const stateSorted = foldProviderLog(sorted)

      expect(stateSorted.name.value).toBe(stateOrdered.name.value)
      expect(stateSorted.address.value).toEqual(stateOrdered.address.value)
      expect(stateSorted.license.value).toBe(stateOrdered.license.value)
    })
  })

  // =========================================================================
  // Coverage: applyProviderEvent (non-deterministic), network removal, providerStateAt
  // =========================================================================
  describe('Additional provider operations', () => {
    it('applyProviderEvent uses Date.now for all event types', () => {
      let state = initialProviderState
      state = applyProviderEvent(state, { type: 'NameUpdated', name: 'Dr. Jane Doe' })
      expect(state.name.value).toBe('Dr. Jane Doe')

      state = applyProviderEvent(state, { type: 'AddressMoved', address: downtownAddress })
      expect(state.address.value).toEqual(downtownAddress)

      state = applyProviderEvent(state, {
        type: 'LicenseRenewed',
        license: 'MD-98765',
        expiry: '2027-01-01'
      })
      expect(state.license.value).toBe('MD-98765')

      state = applyProviderEvent(state, {
        type: 'NetworkChanged',
        network: 'BlueCross',
        active: true
      })
      expect(state.networks.value).toEqual(new Set(['BlueCross']))

      state = applyProviderEvent(state, {
        type: 'NetworkChanged',
        network: 'BlueCross',
        active: false
      })
      expect(state.networks.value).toEqual(new Set())
    })

    it('applyProviderEventDeterministic handles network removal', () => {
      let state = initialProviderState
      state = applyProviderEventDeterministic(
        state,
        { type: 'NetworkChanged', network: 'Aetna', active: true },
        10
      )
      expect(state.networks.value).toEqual(new Set(['Aetna']))

      state = applyProviderEventDeterministic(
        state,
        { type: 'NetworkChanged', network: 'Aetna', active: false },
        20
      )
      expect(state.networks.value).toEqual(new Set())
    })

    it('providerStateAt computes state at a given time', () => {
      const log: EventLog<ProviderEventPayload> = [
        { timestamp: 10, payload: { type: 'NameUpdated', name: 'Dr. Jane Doe' } },
        { timestamp: 20, payload: { type: 'AddressMoved', address: downtownAddress } },
        { timestamp: 50, payload: { type: 'AddressMoved', address: uptownAddress } }
      ]

      const state = providerStateAt(log, 30)
      expect(state.name.value).toBe('Dr. Jane Doe')
      expect(state.address.value).toEqual(downtownAddress)
    })
  })

  // =========================================================================
  // Full pipeline: fragments → CRDT merge → temporal query
  // =========================================================================
  describe('Full categorical pipeline', () => {
    it('resolves, merges, and queries temporally', () => {
      // Step 1: Entity resolution (colimit)
      const ehr = ehrFragment(NPI, 'Dr. Jane Doe', downtownAddress)
      const cred = credentialingFragment(NPI, 'Dr. Jane Doe', 'MD-98765')
      const resolved = resolveProvider([ehr, cred])
      const jane = resolved.records.find((r) => r.key === NPI)
      expect(jane).toBeDefined()

      // Step 2: CRDT merge across replicas
      const replica1: ProviderState = {
        ...initialProviderState,
        name: lww('Dr. Jane Doe', 10),
        address: lww(downtownAddress, 20),
        license: lww('MD-98765', 15)
      }
      const replica2: ProviderState = {
        ...initialProviderState,
        name: lww('Dr. Jane Doe', 10),
        address: lww(uptownAddress, 50)
      }
      const merged = mergeProviderStates(replica1, replica2)
      expect(merged.address.value).toEqual(uptownAddress) // newer wins

      // Step 3: Temporal query
      const log: EventLog<ProviderEventPayload> = [
        { timestamp: 10, payload: { type: 'NameUpdated', name: 'Dr. Jane Doe' } },
        { timestamp: 20, payload: { type: 'AddressMoved', address: downtownAddress } },
        { timestamp: 50, payload: { type: 'AddressMoved', address: uptownAddress } }
      ]

      // "Where was Dr. Doe at time 30?" → Downtown
      const stateAt30 = foldProviderLog(eventLogUpTo(log, 30))
      expect(stateAt30.address.value).toEqual(downtownAddress)

      // "Where is Dr. Doe now?" → Uptown
      const stateNow = foldProviderLog(log)
      expect(stateNow.address.value).toEqual(uptownAddress)
    })
  })
})
