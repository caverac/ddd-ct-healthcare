import * as fc from 'fast-check'

import { logger } from '../src/logger'
import {
  foldProviderLog,
  mergeProviderStates,
  applyProviderEventDeterministic,
  initialProviderState
} from '../src/provider'
import type { ProviderEventPayload, ProviderState } from '../src/provider'
import type { EventLog } from '../src/temporal'

/**
 * Chaos tests — quantified convergence comparison.
 *
 * These tests provide empirical evidence for Table 2 (imperative vs
 * categorical). Random permutations of a fixed event set are used to
 * measure convergence rates under both approaches.
 */
describe('Chaos — convergence under message reordering', () => {
  // Fixed canonical event set
  const canonicalEvents: EventLog<ProviderEventPayload> = [
    { timestamp: 10, payload: { type: 'NameUpdated', name: 'Dr. Jane Doe' } },
    {
      timestamp: 20,
      payload: {
        type: 'AddressMoved',
        address: { street: '100 Downtown Ave', city: 'Metropolis', state: 'NY', zip: '10001' }
      }
    },
    {
      timestamp: 30,
      payload: { type: 'LicenseRenewed', license: 'MD-98765', expiry: '2027-01-01' }
    },
    { timestamp: 40, payload: { type: 'NetworkChanged', network: 'BlueCross', active: true } },
    {
      timestamp: 50,
      payload: {
        type: 'AddressMoved',
        address: { street: '500 Uptown Blvd', city: 'Metropolis', state: 'NY', zip: '10025' }
      }
    },
    { timestamp: 60, payload: { type: 'NetworkChanged', network: 'Aetna', active: true } },
    { timestamp: 70, payload: { type: 'NetworkChanged', network: 'BlueCross', active: false } },
    {
      timestamp: 80,
      payload: { type: 'LicenseRenewed', license: 'MD-98765-R', expiry: '2029-01-01' }
    }
  ]

  // Canonical state: sort by timestamp, then fold
  const canonicalState = foldProviderLog(
    [...canonicalEvents].sort((a, b) => a.timestamp - b.timestamp)
  )

  const statesEqual = (a: ProviderState, b: ProviderState): boolean =>
    a.name.value === b.name.value &&
    a.name.timestamp === b.name.timestamp &&
    a.address.value.street === b.address.value.street &&
    a.address.timestamp === b.address.timestamp &&
    a.license.value === b.license.value &&
    a.license.timestamp === b.license.timestamp &&
    a.networks.timestamp === b.networks.timestamp &&
    [...a.networks.value].sort().join(',') === [...b.networks.value].sort().join(',')

  // -------------------------------------------------------------------------
  // Test 1: Categorical convergence — sort by timestamp before fold
  // -------------------------------------------------------------------------
  describe('Categorical convergence', () => {
    it('100% convergence: all random orderings produce identical state after sorting', () => {
      const N = 200
      let converged = 0

      fc.assert(
        fc.property(
          fc.shuffledSubarray([...canonicalEvents], {
            minLength: canonicalEvents.length,
            maxLength: canonicalEvents.length
          }),
          (permuted) => {
            // Categorical approach: sort by causal timestamp before fold
            const sorted = [...permuted].sort((a, b) => a.timestamp - b.timestamp)
            const state = foldProviderLog(sorted)
            const match = statesEqual(state, canonicalState)
            if (match) converged++
            expect(match).toBe(true)
          }
        ),
        { numRuns: N }
      )

      expect(converged).toBe(N)
    })
  })

  // -------------------------------------------------------------------------
  // Test 2: Imperative divergence — fold in arrival order with wall-clock
  // -------------------------------------------------------------------------
  describe('Imperative divergence', () => {
    it('divergence > 0: arrival-order fold with wall-clock timestamps diverges', () => {
      const N = 200
      let diverged = 0

      fc.assert(
        fc.property(
          fc.shuffledSubarray([...canonicalEvents], {
            minLength: canonicalEvents.length,
            maxLength: canonicalEvents.length
          }),
          (permuted) => {
            // Imperative approach: fold in arrival order, using arrival
            // position as wall-clock timestamp (simulating clock skew)
            let state = initialProviderState
            permuted.forEach((event, arrivalIdx) => {
              state = applyProviderEventDeterministic(
                state,
                event.payload,
                (arrivalIdx + 1) * 10 // wall-clock = arrival position
              )
            })

            if (!statesEqual(state, canonicalState)) {
              diverged++
            }
          }
        ),
        { numRuns: N }
      )

      // At least some orderings must diverge from canonical
      expect(diverged).toBeGreaterThan(0)

      // Report for inclusion in the paper
      const convergenceRate = (((N - diverged) / N) * 100).toFixed(1)
      const divergenceRate = ((diverged / N) * 100).toFixed(1)
      logger.info(`Imperative divergence: ${diverged}/${N} runs diverged (${divergenceRate}%)`)
      logger.info(
        `Imperative convergence: ${N - diverged}/${N} runs converged (${convergenceRate}%)`
      )
    })
  })

  // -------------------------------------------------------------------------
  // Test 3: Multi-replica CRDT merge convergence
  // -------------------------------------------------------------------------
  describe('Multi-replica CRDT merge', () => {
    it('5 replicas with different orderings converge after pairwise merge', () => {
      const REPLICAS = 5

      fc.assert(
        fc.property(
          // Generate REPLICAS independent shuffles
          fc.tuple(
            ...Array.from({ length: REPLICAS }, () =>
              fc.shuffledSubarray([...canonicalEvents], {
                minLength: canonicalEvents.length,
                maxLength: canonicalEvents.length
              })
            )
          ),
          (shuffles) => {
            // Each replica sorts by timestamp and folds independently
            const replicaStates = shuffles.map((perm) => {
              const sorted = [...perm].sort((a, b) => a.timestamp - b.timestamp)
              return foldProviderLog(sorted)
            })

            // Pairwise merge all replicas
            let merged = replicaStates[0]
            for (let i = 1; i < replicaStates.length; i++) {
              merged = mergeProviderStates(merged, replicaStates[i])
            }

            // All replicas should already be identical (since sorting
            // produces the same log), and merge should preserve that
            for (const replica of replicaStates) {
              expect(statesEqual(replica, canonicalState)).toBe(true)
            }
            expect(statesEqual(merged, canonicalState)).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
