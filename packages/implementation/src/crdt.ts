/**
 * CRDT — State-based CRDT merge using join-semilattice structure
 * (Section 5 of the paper).
 *
 * A state-based CRDT is a join-semilattice whose merge operation is the
 * semilattice join.  This module provides a generic merge combinator and
 * product CRDT construction.
 */
import { JoinSemilattice } from './semilattice'

// ---------------------------------------------------------------------------
// State-based CRDT merge
// ---------------------------------------------------------------------------

/**
 * Merge two CRDT states using the underlying semilattice join.
 * By the semilattice laws this is commutative, associative, and
 * idempotent — making it safe for uncoordinated concurrent use.
 */
export const merge =
  <A>(S: JoinSemilattice<A>) =>
  (local: A, remote: A): A =>
    S.join(local, remote)

// ---------------------------------------------------------------------------
// Product CRDT
// ---------------------------------------------------------------------------

/** Construct a product semilattice from component semilattices. */
export const productSemilattice = <A, B>(
  sa: JoinSemilattice<A>,
  sb: JoinSemilattice<B>
): JoinSemilattice<readonly [A, B]> => ({
  join: ([a1, b1], [a2, b2]) => [sa.join(a1, a2), sb.join(b1, b2)] as const
})

/** Construct a record-level semilattice from a schema of semilattices. */
export const recordSemilattice = <R extends object>(fields: {
  [K in keyof R]: JoinSemilattice<R[K]>
}): JoinSemilattice<R> => ({
  join: (x, y) => {
    const result = {} as Record<string, unknown>
    for (const key of Object.keys(fields)) {
      const fieldSl = fields[key as keyof R] as JoinSemilattice<unknown>
      result[key] = fieldSl.join(
        (x as Record<string, unknown>)[key],
        (y as Record<string, unknown>)[key]
      )
    }
    return result as R
  }
})
