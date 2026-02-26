import * as fc from 'fast-check'

import { createSnapshotLog, snapshotStateAt, verifySnapshotEquivalence } from '../src/snapshot'
import { foldEvents, eventLogUpTo } from '../src/temporal'
import type { EventLog } from '../src/temporal'

describe('Snapshot — efficient state reconstruction', () => {
  type CounterEvent = 'increment' | 'decrement'

  const applyCounter = (state: number, event: CounterEvent): number =>
    event === 'increment' ? state + 1 : state - 1

  const log: EventLog<CounterEvent> = [
    { timestamp: 5, payload: 'increment' },
    { timestamp: 10, payload: 'increment' },
    { timestamp: 15, payload: 'decrement' },
    { timestamp: 20, payload: 'increment' },
    { timestamp: 25, payload: 'increment' },
    { timestamp: 30, payload: 'increment' },
    { timestamp: 35, payload: 'decrement' },
    { timestamp: 40, payload: 'increment' },
    { timestamp: 45, payload: 'increment' },
    { timestamp: 50, payload: 'increment' }
  ]

  describe('createSnapshotLog', () => {
    it('creates the correct number of snapshots for a given interval', () => {
      const slog = createSnapshotLog(log, 0, applyCounter, 10)
      // Snapshots at multiples of 10: 10, 20, 30, 40, 50
      expect(slog.snapshots).toHaveLength(5)
      expect(slog.snapshots.map((s) => s.timestamp)).toEqual([10, 20, 30, 40, 50])
    })

    it('creates snapshots with correct state values', () => {
      const slog = createSnapshotLog(log, 0, applyCounter, 10)
      // At t=10: events at 5(+1), 10(+1) → state = 2
      expect(slog.snapshots[0].state).toBe(2)
      // At t=20: +15(-1), +20(+1) → 2-1+1 = 2
      expect(slog.snapshots[1].state).toBe(2)
      // At t=30: +25(+1), +30(+1) → 2+1+1 = 4
      expect(slog.snapshots[2].state).toBe(4)
    })

    it('handles interval larger than event range', () => {
      const slog = createSnapshotLog(log, 0, applyCounter, 100)
      expect(slog.snapshots).toHaveLength(0)
    })

    it('preserves the sorted event log', () => {
      const unsorted: EventLog<CounterEvent> = [
        { timestamp: 30, payload: 'increment' },
        { timestamp: 10, payload: 'increment' },
        { timestamp: 20, payload: 'decrement' }
      ]
      const slog = createSnapshotLog(unsorted, 0, applyCounter, 10)
      expect(slog.events.map((e) => e.timestamp)).toEqual([10, 20, 30])
    })
  })

  describe('snapshotStateAt', () => {
    const slog = createSnapshotLog(log, 0, applyCounter, 10)

    it('returns initial state for time before all events', () => {
      expect(snapshotStateAt(slog, 0)).toBe(0)
    })

    it('computes state at a snapshot boundary', () => {
      // At t=20: state = 2 (from snapshot directly)
      expect(snapshotStateAt(slog, 20)).toBe(2)
    })

    it('computes state between snapshots', () => {
      // At t=25: snapshot at 20 (state=2) + event at 25(+1) = 3
      expect(snapshotStateAt(slog, 25)).toBe(3)
    })

    it('computes state at end of log', () => {
      // Full fold: +1+1-1+1+1+1-1+1+1+1 = 6
      expect(snapshotStateAt(slog, 50)).toBe(6)
    })

    it('matches naive fold for time after all events', () => {
      const snapshotResult = snapshotStateAt(slog, 100)
      const naiveResult = foldEvents(eventLogUpTo(log, 100), 0, applyCounter)
      expect(snapshotResult).toBe(naiveResult)
    })
  })

  describe('verifySnapshotEquivalence', () => {
    const eq = (a: number, b: number) => a === b

    it('holds for all snapshot boundaries', () => {
      const slog = createSnapshotLog(log, 0, applyCounter, 10)
      for (const snap of slog.snapshots) {
        expect(verifySnapshotEquivalence(slog, snap.timestamp, eq)).toBe(true)
      }
    })

    it('holds for arbitrary times (property-based)', () => {
      const slog = createSnapshotLog(log, 0, applyCounter, 10)
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), (t) => {
          expect(verifySnapshotEquivalence(slog, t, eq)).toBe(true)
        })
      )
    })

    it('holds for random event logs and times', () => {
      const eventArb = fc.oneof(
        fc.constant<CounterEvent>('increment'),
        fc.constant<CounterEvent>('decrement')
      )
      const logArb = fc.array(
        fc.record({
          timestamp: fc.integer({ min: 1, max: 200 }),
          payload: eventArb
        }),
        { minLength: 0, maxLength: 20 }
      )

      fc.assert(
        fc.property(
          logArb,
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 0, max: 200 }),
          (randomLog, interval, t) => {
            const slog = createSnapshotLog(randomLog, 0, applyCounter, interval)
            expect(verifySnapshotEquivalence(slog, t, eq)).toBe(true)
          }
        )
      )
    })
  })

  describe('edge cases', () => {
    it('handles empty event log', () => {
      const slog = createSnapshotLog<CounterEvent, number>([], 0, applyCounter, 10)
      expect(slog.snapshots).toHaveLength(0)
      expect(snapshotStateAt(slog, 5)).toBe(0)
    })

    it('handles t before all events with snapshots present', () => {
      const slog = createSnapshotLog(log, 0, applyCounter, 10)
      expect(snapshotStateAt(slog, 2)).toBe(0)
    })

    it('handles single-event log', () => {
      const singleLog: EventLog<CounterEvent> = [{ timestamp: 10, payload: 'increment' }]
      const slog = createSnapshotLog(singleLog, 0, applyCounter, 10)
      expect(slog.snapshots).toHaveLength(1)
      expect(snapshotStateAt(slog, 10)).toBe(1)
      expect(snapshotStateAt(slog, 5)).toBe(0)
    })
  })
})
