/**
 * Snapshot — Efficient state reconstruction via periodic snapshots.
 *
 * The presheaf fold Q(t) = fold(P(t)) is O(n) over the full event log.
 * By maintaining periodic snapshots of the folded state, reconstruction
 * from the nearest snapshot reduces to O(k) where k <= snapshot interval.
 *
 * This corresponds to a Mealy machine interpretation: state transitions
 * with periodic output (snapshots) at fixed intervals.
 */
import { eventLogUpTo, foldEvents } from './temporal'
import type { EventLog } from './temporal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A snapshot of state at a particular timestamp. */
export interface Snapshot<S> {
  readonly timestamp: number
  readonly state: S
}

/** A log augmented with periodic snapshots for efficient state queries. */
export interface SnapshotLog<E, S> {
  readonly events: EventLog<E>
  readonly snapshots: ReadonlyArray<Snapshot<S>>
  readonly initial: S
  readonly apply: (s: S, e: E) => S
  readonly interval: number
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/**
 * Build a SnapshotLog by folding events and creating snapshots at each
 * multiple of `interval`. Snapshots are created incrementally in a
 * single pass over the sorted event log.
 */
export const createSnapshotLog = <E, S>(
  events: EventLog<E>,
  initial: S,
  apply: (s: S, e: E) => S,
  interval: number
): SnapshotLog<E, S> => {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  const snapshots: Array<Snapshot<S>> = []
  const maxTime = sorted.length > 0 ? sorted[sorted.length - 1].timestamp : 0

  let state = initial
  let eventIdx = 0

  for (let t = interval; t <= maxTime; t += interval) {
    // Apply all events with timestamp <= t before recording snapshot
    while (eventIdx < sorted.length && sorted[eventIdx].timestamp <= t) {
      state = apply(state, sorted[eventIdx].payload)
      eventIdx++
    }
    snapshots.push({ timestamp: t, state })
  }

  return { events: sorted, snapshots, initial, apply, interval }
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Reconstruct state at time t by finding the nearest snapshot at or
 * before t and folding only the remaining events. Falls back to
 * folding from the initial state if no snapshot precedes t.
 */
export const snapshotStateAt = <E, S>(slog: SnapshotLog<E, S>, t: number): S => {
  // Find nearest snapshot <= t
  let baseState = slog.initial
  let baseTime = -Infinity

  for (let i = slog.snapshots.length - 1; i >= 0; i--) {
    if (slog.snapshots[i].timestamp <= t) {
      baseState = slog.snapshots[i].state
      baseTime = slog.snapshots[i].timestamp
      break
    }
  }

  // Fold only events after the snapshot and up to t
  const remaining = slog.events.filter((e) => e.timestamp > baseTime && e.timestamp <= t)

  return foldEvents(remaining, baseState, slog.apply)
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Verify that snapshotStateAt(t) produces the same state as a naive
 * full fold up to t. This proves the snapshot optimization is correct.
 */
export const verifySnapshotEquivalence = <E, S>(
  slog: SnapshotLog<E, S>,
  t: number,
  eq: (a: S, b: S) => boolean
): boolean => {
  const snapshotResult = snapshotStateAt(slog, t)
  const naiveResult = foldEvents(eventLogUpTo(slog.events, t), slog.initial, slog.apply)
  return eq(snapshotResult, naiveResult)
}
