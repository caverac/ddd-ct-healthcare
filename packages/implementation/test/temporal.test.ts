import {
  eventLogUpTo,
  restrictLog,
  foldEvents,
  stateAt,
  verifyFunctoriality
} from '../src/temporal'
import type { EventLog } from '../src/temporal'

describe('Temporal — Event log presheaf', () => {
  type CounterEvent = 'increment' | 'decrement'

  const log: EventLog<CounterEvent> = [
    { timestamp: 1, payload: 'increment' },
    { timestamp: 3, payload: 'increment' },
    { timestamp: 5, payload: 'decrement' },
    { timestamp: 7, payload: 'increment' },
    { timestamp: 10, payload: 'increment' }
  ]

  const applyCounter = (state: number, event: CounterEvent): number =>
    event === 'increment' ? state + 1 : state - 1

  describe('eventLogUpTo (presheaf P(t))', () => {
    it('returns empty log for time before any events', () => {
      expect(eventLogUpTo(log, 0)).toEqual([])
    })

    it('returns events up to and including time t', () => {
      const result = eventLogUpTo(log, 5)
      expect(result).toHaveLength(3)
      expect(result.map((e) => e.timestamp)).toEqual([1, 3, 5])
    })

    it('returns all events for time after last event', () => {
      expect(eventLogUpTo(log, 100)).toHaveLength(5)
    })

    it('returns events exactly at time t', () => {
      const result = eventLogUpTo(log, 1)
      expect(result).toHaveLength(1)
      expect(result[0].timestamp).toBe(1)
    })
  })

  describe('restrictLog (restriction map P(t) → P(s))', () => {
    it('truncates the log at time s', () => {
      const pT = eventLogUpTo(log, 7)
      const restricted = restrictLog(pT, 3)
      expect(restricted).toHaveLength(2)
      expect(restricted.map((e) => e.timestamp)).toEqual([1, 3])
    })

    it('returns empty for s before all events', () => {
      const pT = eventLogUpTo(log, 10)
      expect(restrictLog(pT, 0)).toEqual([])
    })
  })

  describe('foldEvents (state reconstruction)', () => {
    it('reconstructs state from event log', () => {
      expect(foldEvents(log, 0, applyCounter)).toBe(3) // +1+1-1+1+1
    })

    it('returns initial state for empty log', () => {
      expect(foldEvents([], 0, applyCounter)).toBe(0)
    })
  })

  describe('stateAt (η_t composed with P(t))', () => {
    it('computes state at a specific time', () => {
      expect(stateAt(log, 5, 0, applyCounter)).toBe(1) // +1+1-1
    })

    it('returns initial state for time before any events', () => {
      expect(stateAt(log, 0, 0, applyCounter)).toBe(0)
    })

    it('computes final state for time after all events', () => {
      expect(stateAt(log, 100, 0, applyCounter)).toBe(3)
    })
  })

  describe('verifyFunctoriality', () => {
    it('holds for s ≤ t: restrict(P(t), s) = P(s)', () => {
      expect(verifyFunctoriality(log, 3, 7)).toBe(true)
    })

    it('holds for all pairs s ≤ t', () => {
      const times = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      for (const s of times) {
        for (const t of times) {
          if (s <= t) {
            expect(verifyFunctoriality(log, s, t)).toBe(true)
          }
        }
      }
    })

    it('returns false for s > t', () => {
      expect(verifyFunctoriality(log, 7, 3)).toBe(false)
    })
  })
})
