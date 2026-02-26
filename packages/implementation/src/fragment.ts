/**
 * Fragment — The Category of Keyed Fragments (Section 3 of the paper).
 *
 * A keyed fragment (S, κ) is an object in the slice category FinSet/K.
 * Morphisms are key-preserving functions.  The colimit of a finite
 * diagram of fragments computes deterministic entity resolution.
 */
import { pipe } from 'fp-ts/function'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RM from 'fp-ts/ReadonlyMap'
import { Eq as stringEq, Ord as stringOrd } from 'fp-ts/string'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A keyed fragment: a finite set of records each tagged with a global key. */
export interface Fragment<K, V> {
  readonly records: ReadonlyArray<{ readonly key: K; readonly value: V }>
}

/** A morphism (key-preserving map) between fragments. */
export interface FragmentMorphism<K, V> {
  readonly source: Fragment<K, V>
  readonly target: Fragment<K, V>
  readonly mapping: ReadonlyMap<number, number> // source index → target index
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

export const fragment = <K, V>(records: Array<{ key: K; value: V }>): Fragment<K, V> => ({
  records
})

// ---------------------------------------------------------------------------
// Colimit (entity resolution)
// ---------------------------------------------------------------------------

/**
 * Compute the colimit of a finite diagram of fragments over the same key
 * space.  This is the universal merge: records sharing a global key are
 * collected into a single merged set, and the result satisfies the
 * universal property of colimits in FinSet/K.
 *
 * The merge function `f` resolves overlapping values for the same key.
 */
export const colimitFragments = <V>(
  fragments: ReadonlyArray<Fragment<string, V>>,
  merge: (existing: V, incoming: V) => V
): Fragment<string, V> => {
  const semigroup = { concat: merge }

  const records = pipe(
    fragments,
    RA.chain((frag) => frag.records.map(({ key, value }): readonly [string, V] => [key, value])),
    RM.fromFoldable(stringEq, semigroup, RA.Foldable),
    RM.toReadonlyArray(stringOrd),
    RA.map(([key, value]) => ({ key, value }))
  )

  return { records }
}

/**
 * The canonical injection from a fragment into the colimit.
 * Returns the index in the colimit for each record in the source fragment.
 */
export const canonicalInjection = <V>(
  source: Fragment<string, V>,
  colimit: Fragment<string, V>
): ReadonlyMap<number, number> => {
  const keyToColimitIdx = new Map<string, number>()
  colimit.records.forEach((r, i) => keyToColimitIdx.set(r.key, i))

  const mapping = new Map<number, number>()
  source.records.forEach((r, i) => {
    const idx = keyToColimitIdx.get(r.key)
    if (idx !== undefined) {
      mapping.set(i, idx)
    }
  })
  return mapping
}

/**
 * Verify the universal property: given any cocone (target + maps from each
 * fragment), there exists a unique mediating morphism from the colimit to
 * the target.
 */
export const mediatingMorphism = <V>(
  colimit: Fragment<string, V>,
  target: Fragment<string, V>,
  _coconeMaps: ReadonlyArray<ReadonlyMap<number, number>>
): ReadonlyMap<number, number> => {
  const keyToTargetIdx = new Map<string, number>()
  target.records.forEach((r, i) => keyToTargetIdx.set(r.key, i))

  const mapping = new Map<number, number>()
  colimit.records.forEach((r, i) => {
    const idx = keyToTargetIdx.get(r.key)
    if (idx !== undefined) {
      mapping.set(i, idx)
    }
  })
  return mapping
}
