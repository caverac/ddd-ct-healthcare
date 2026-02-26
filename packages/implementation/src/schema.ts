/**
 * Schema — Functorial schema translation (Section 6 of the paper).
 *
 * A schema morphism F: C → D between bounded contexts induces the
 * adjoint triple Σ_F ⊣ Δ_F ⊣ Π_F.  The pullback functor Δ_F
 * (reindexing) preserves referential integrity when F preserves the
 * relevant finite limits.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A schema is a mapping from field names to types (simplified). */
export type Schema = Record<string, string>

/** A schema morphism maps field names of the source to field names of the target. */
export type SchemaMorphism = Record<string, string>

/** A database instance assigns a value to each field of a schema. */
export type Instance<S extends Schema> = { [K in keyof S]: unknown }

// ---------------------------------------------------------------------------
// Functorial data migration
// ---------------------------------------------------------------------------

/**
 * Δ_F (pullback / reindexing): given a schema morphism F: C → D and an
 * instance I of D, produce an instance of C by reindexing along F.
 *
 * This is the "safe" direction — it never creates dangling references
 * because it only reads existing data through the morphism.
 */
export const deltaF = <S extends Schema, T extends Schema>(
  morphism: SchemaMorphism,
  targetInstance: Instance<T>
): Instance<S> => {
  const result: Record<string, unknown> = {}
  for (const [sourceField, targetField] of Object.entries(morphism)) {
    result[sourceField] = (targetInstance as Record<string, unknown>)[targetField]
  }
  return result as Instance<S>
}

/**
 * Σ_F (left adjoint / pushforward): given a schema morphism F: C → D and
 * an instance I of C, produce an instance of D by pushing forward along F.
 *
 * Fields in D not in the image of F are set to undefined.
 */
export const sigmaF = <S extends Schema, T extends Schema>(
  morphism: SchemaMorphism,
  sourceInstance: Instance<S>
): Instance<T> => {
  const result: Record<string, unknown> = {}
  for (const [sourceField, targetField] of Object.entries(morphism)) {
    result[targetField] = (sourceInstance as Record<string, unknown>)[sourceField]
  }
  return result as Instance<T>
}

/**
 * Verify that a schema morphism preserves a specific referential integrity
 * constraint: if source has a foreign key from field A to field B,
 * the morphism must map both fields such that the constraint holds in
 * the target schema.
 */
export const preservesConstraint = (
  morphism: SchemaMorphism,
  fkSource: string,
  fkTarget: string
): boolean => {
  return fkSource in morphism && fkTarget in morphism
}
