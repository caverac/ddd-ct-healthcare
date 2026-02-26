/**
 * Semilattice — Join-semilattice interface and Last-Writer-Wins register
 * (Section 5 of the paper).
 *
 * A join-semilattice (S, ≤) admits a binary join ∨ that is commutative,
 * associative, and idempotent.  The CRDT merge operation is the join
 * *within a fixed semilattice*, NOT a categorical colimit in JSL.
 */

// ---------------------------------------------------------------------------
// Typeclass
// ---------------------------------------------------------------------------

/** A join-semilattice: a set with a binary join satisfying the semilattice laws. */
export interface JoinSemilattice<A> {
  readonly join: (x: A, y: A) => A
}

// ---------------------------------------------------------------------------
// Instances
// ---------------------------------------------------------------------------

/** Max-based semilattice for numbers. */
export const maxSemilattice: JoinSemilattice<number> = {
  join: (x, y) => Math.max(x, y)
}

/** Set-union semilattice. */
export const setUnionSemilattice = <A>(): JoinSemilattice<ReadonlySet<A>> => ({
  join: (x, y) => new Set([...x, ...y])
})

// ---------------------------------------------------------------------------
// Last-Writer-Wins Register
// ---------------------------------------------------------------------------

/** An LWW register: a timestamped value where the latest timestamp wins. */
export interface LWW<A> {
  readonly value: A
  readonly timestamp: number
}

export const lww = <A>(value: A, timestamp: number): LWW<A> => ({ value, timestamp })

/**
 * Join-semilattice instance for LWW registers.
 * When timestamps are equal, we use a deterministic tiebreaker
 * (lexicographic comparison of JSON-serialized values) to ensure
 * commutativity.
 */
export const lwwSemilattice = <A>(): JoinSemilattice<LWW<A>> => ({
  join: (x, y) => {
    if (x.timestamp > y.timestamp) return x
    if (y.timestamp > x.timestamp) return y
    // Timestamps equal: deterministic tiebreaker for commutativity
    return JSON.stringify(x.value) >= JSON.stringify(y.value) ? x : y
  }
})

// ---------------------------------------------------------------------------
// Derived operations
// ---------------------------------------------------------------------------

/** Fold a non-empty array using the semilattice join. */
export const joinAll =
  <A>(S: JoinSemilattice<A>) =>
  (values: readonly [A, ...A[]]): A =>
    values.reduce((acc, v) => S.join(acc, v))

/** Verify semilattice laws for three given values (useful for property tests). */
export const verifySemilatticeLaws = <A>(
  S: JoinSemilattice<A>,
  eq: (a: A, b: A) => boolean,
  x: A,
  y: A,
  z: A
): { commutative: boolean; associative: boolean; idempotent: boolean } => ({
  commutative: eq(S.join(x, y), S.join(y, x)),
  associative: eq(S.join(x, S.join(y, z)), S.join(S.join(x, y), z)),
  idempotent: eq(S.join(x, x), x)
})
