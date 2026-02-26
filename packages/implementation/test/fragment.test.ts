import { fragment, colimitFragments, canonicalInjection, mediatingMorphism } from '../src/fragment'

describe('Fragment — Category of Keyed Fragments', () => {
  const ehrFrag = fragment([
    { key: 'NPI-001', value: { name: 'Dr. Jane Doe', address: '100 Downtown Ave' } },
    { key: 'NPI-002', value: { name: 'Dr. John Smith', address: '200 Main St' } }
  ])

  const credFrag = fragment([
    { key: 'NPI-001', value: { name: 'Dr. Jane Doe', license: 'MD-12345' } }
  ])

  const contractFrag = fragment([
    { key: 'NPI-001', value: { name: 'Dr. Jane Doe', network: 'BlueCross' } },
    { key: 'NPI-003', value: { name: 'Dr. Alice Wong', network: 'Aetna' } }
  ])

  const mergeValues = (a: Record<string, unknown>, b: Record<string, unknown>) => ({
    ...a,
    ...b
  })

  describe('colimitFragments', () => {
    it('merges records with the same key', () => {
      const colimit = colimitFragments([ehrFrag, credFrag], mergeValues)
      const npi001 = colimit.records.find((r) => r.key === 'NPI-001')

      expect(npi001).toBeDefined()
      expect(npi001!.value).toEqual({
        name: 'Dr. Jane Doe',
        address: '100 Downtown Ave',
        license: 'MD-12345'
      })
    })

    it('preserves records with distinct keys', () => {
      const colimit = colimitFragments([ehrFrag, credFrag], mergeValues)
      expect(colimit.records).toHaveLength(2) // NPI-001 + NPI-002
    })

    it('handles three-way merge', () => {
      const colimit = colimitFragments([ehrFrag, credFrag, contractFrag], mergeValues)
      // NPI-001, NPI-002, NPI-003
      expect(colimit.records).toHaveLength(3)

      const npi001 = colimit.records.find((r) => r.key === 'NPI-001')
      expect(npi001!.value).toEqual({
        name: 'Dr. Jane Doe',
        address: '100 Downtown Ave',
        license: 'MD-12345',
        network: 'BlueCross'
      })
    })

    it('returns empty fragment for empty input', () => {
      const colimit = colimitFragments([], mergeValues)
      expect(colimit.records).toHaveLength(0)
    })

    it('returns identity for single fragment', () => {
      const colimit = colimitFragments([ehrFrag], mergeValues)
      expect(colimit.records).toHaveLength(2)
      expect(colimit.records.find((r) => r.key === 'NPI-001')!.value).toEqual(
        ehrFrag.records[0].value
      )
    })
  })

  describe('Universal property of colimits', () => {
    it('canonical injection maps source indices to colimit indices', () => {
      const colimit = colimitFragments([ehrFrag, credFrag], mergeValues)
      const injection = canonicalInjection(credFrag, colimit)

      // credFrag[0] (NPI-001) should map to the NPI-001 index in colimit
      const colimitIdx = injection.get(0)
      expect(colimitIdx).toBeDefined()
      expect(colimit.records[colimitIdx!].key).toBe('NPI-001')
    })

    it('mediating morphism exists and is unique', () => {
      const colimit = colimitFragments([ehrFrag, credFrag], mergeValues)

      // Construct a cocone target with all three keys (same value type)
      const target = fragment([
        { key: 'NPI-001', value: { merged: true } as Record<string, unknown> },
        { key: 'NPI-002', value: { merged: true } as Record<string, unknown> },
        { key: 'NPI-003', value: { merged: true } as Record<string, unknown> }
      ])

      const inj1 = canonicalInjection(ehrFrag, colimit)
      const inj2 = canonicalInjection(credFrag, colimit)

      const med = mediatingMorphism(colimit, target, [inj1, inj2])

      // Every colimit record should map to a target record with the same key
      for (const [colIdx, targetIdx] of med) {
        expect(colimit.records[colIdx].key).toBe(target.records[targetIdx].key)
      }
    })

    it('mediating morphism makes the triangle commute', () => {
      const colimit = colimitFragments([ehrFrag, credFrag], mergeValues)

      // Target with same value type as colimit
      const target = fragment([
        { key: 'NPI-001', value: { forwarded: true } as Record<string, unknown> },
        { key: 'NPI-002', value: { forwarded: true } as Record<string, unknown> }
      ])

      const injEhr = canonicalInjection(ehrFrag, colimit)
      const med = mediatingMorphism(colimit, target, [injEhr])

      // For each record in ehrFrag, going through the colimit and then
      // the mediating morphism should land on the same target record
      // as going directly to the target.
      const directEhr = canonicalInjection(ehrFrag, target)

      for (const [srcIdx, colIdx] of injEhr) {
        const targetViaColimit = med.get(colIdx)
        const targetDirect = directEhr.get(srcIdx)
        expect(targetViaColimit).toBe(targetDirect)
      }
    })
  })
})
