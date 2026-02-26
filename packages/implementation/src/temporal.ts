/**
 * Temporal — Event log presheaf and state reconstruction (Section 7).
 *
 * A temporal aggregate is a presheaf P: T^op → Set over the poset of
 * time instants.  P(t) is the event log prefix up to t (a *set* of
 * events, not a folded state).  State reconstruction is a natural
 * transformation from the log presheaf to a state presheaf.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A domain event timestamped at a particular instant. */
export interface DomainEvent<E> {
  readonly timestamp: number
  readonly payload: E
}

/** An event log: an ordered sequence of domain events. */
export type EventLog<E> = ReadonlyArray<DomainEvent<E>>

// ---------------------------------------------------------------------------
// Presheaf operations
// ---------------------------------------------------------------------------

/**
 * P(t): the event log prefix up to time t.
 * This is the presheaf applied to object t ∈ T.
 */
export const eventLogUpTo = <E>(log: EventLog<E>, t: number): EventLog<E> =>
  log.filter((e) => e.timestamp <= t)

/**
 * Restriction map P(t) → P(s) for s ≤ t: truncate the log at s.
 * This is the presheaf applied to the morphism s ≤ t in T^op.
 */
export const restrictLog = <E>(log: EventLog<E>, s: number): EventLog<E> =>
  log.filter((e) => e.timestamp <= s)

/**
 * State reconstruction: fold the event log into a state value.
 * This is a natural transformation η: P ⇒ Q where Q(t) = fold(P(t)).
 */
export const foldEvents = <E, S>(log: EventLog<E>, initial: S, apply: (s: S, e: E) => S): S =>
  log.reduce((state, event) => apply(state, event.payload), initial)

/**
 * State at time t: compose the presheaf with the fold.
 * stateAt(t) = fold(P(t)) = η_t(P(t))
 */
export const stateAt = <E, S>(
  fullLog: EventLog<E>,
  t: number,
  initial: S,
  apply: (s: S, e: E) => S
): S => foldEvents(eventLogUpTo(fullLog, t), initial, apply)

/**
 * Verify presheaf functoriality: for s ≤ t, restricting P(t) to s
 * must equal P(s).  That is, the diagram commutes.
 */
export const verifyFunctoriality = <E>(log: EventLog<E>, s: number, t: number): boolean => {
  if (s > t) return false
  const pT = eventLogUpTo(log, t)
  const restricted = restrictLog(pT, s)
  const pS = eventLogUpTo(log, s)
  // Compare by timestamps (events are the same objects)
  return (
    restricted.length === pS.length && restricted.every((e, i) => e.timestamp === pS[i].timestamp)
  )
}
