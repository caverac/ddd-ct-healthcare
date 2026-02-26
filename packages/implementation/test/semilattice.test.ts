import * as fc from 'fast-check'

import { productSemilattice, recordSemilattice, merge } from '../src/crdt'
import {
  maxSemilattice,
  setUnionSemilattice,
  lww,
  lwwSemilattice,
  joinAll,
  verifySemilatticeLaws
} from '../src/semilattice'

describe('Semilattice — join-semilattice laws', () => {
  describe('maxSemilattice (numbers)', () => {
    it('satisfies commutativity', () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), (x, y) => {
          expect(maxSemilattice.join(x, y)).toBe(maxSemilattice.join(y, x))
        })
      )
    })

    it('satisfies associativity', () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), fc.integer(), (x, y, z) => {
          expect(maxSemilattice.join(x, maxSemilattice.join(y, z))).toBe(
            maxSemilattice.join(maxSemilattice.join(x, y), z)
          )
        })
      )
    })

    it('satisfies idempotency', () => {
      fc.assert(
        fc.property(fc.integer(), (x) => {
          expect(maxSemilattice.join(x, x)).toBe(x)
        })
      )
    })
  })

  describe('setUnionSemilattice', () => {
    const sl = setUnionSemilattice<number>()
    const setArb = fc.array(fc.integer({ min: 0, max: 100 })).map((arr) => new Set(arr))

    const setEq = (a: ReadonlySet<number>, b: ReadonlySet<number>): boolean =>
      a.size === b.size && [...a].every((x) => b.has(x))

    it('satisfies commutativity', () => {
      fc.assert(
        fc.property(setArb, setArb, (x, y) => {
          expect(setEq(sl.join(x, y), sl.join(y, x))).toBe(true)
        })
      )
    })

    it('satisfies associativity', () => {
      fc.assert(
        fc.property(setArb, setArb, setArb, (x, y, z) => {
          expect(setEq(sl.join(x, sl.join(y, z)), sl.join(sl.join(x, y), z))).toBe(true)
        })
      )
    })

    it('satisfies idempotency', () => {
      fc.assert(
        fc.property(setArb, (x) => {
          expect(setEq(sl.join(x, x), x)).toBe(true)
        })
      )
    })
  })

  describe('LWW register semilattice', () => {
    const sl = lwwSemilattice<string>()

    it('selects the value with the higher timestamp', () => {
      const a = lww('old', 1)
      const b = lww('new', 2)
      expect(sl.join(a, b).value).toBe('new')
      expect(sl.join(b, a).value).toBe('new')
    })

    it('is commutative for equal timestamps (tiebreaker)', () => {
      const a = lww('alpha', 5)
      const b = lww('beta', 5)
      expect(sl.join(a, b)).toEqual(sl.join(b, a))
    })

    it('is idempotent', () => {
      const a = lww('value', 5)
      expect(sl.join(a, a)).toEqual(a)
    })

    it('satisfies commutativity for distinct timestamps', () => {
      fc.assert(
        fc.property(fc.string(), fc.nat(), fc.string(), fc.nat(), (v1, t1, v2, t2) => {
          const a = lww(v1, t1)
          const b = lww(v2, t2)
          expect(sl.join(a, b)).toEqual(sl.join(b, a))
        })
      )
    })
  })

  describe('verifySemilatticeLaws', () => {
    it('returns all true for maxSemilattice', () => {
      const result = verifySemilatticeLaws(maxSemilattice, (a, b) => a === b, 1, 2, 3)
      expect(result).toEqual({ commutative: true, associative: true, idempotent: true })
    })
  })

  describe('joinAll', () => {
    it('folds a non-empty array', () => {
      const result = joinAll(maxSemilattice)([1, 5, 3, 2])
      expect(result).toBe(5)
    })

    it('handles single element', () => {
      const result = joinAll(maxSemilattice)([42])
      expect(result).toBe(42)
    })
  })

  describe('productSemilattice', () => {
    const ps = productSemilattice(maxSemilattice, maxSemilattice)

    it('joins component-wise', () => {
      expect(ps.join([1, 4], [3, 2])).toEqual([3, 4])
    })

    it('satisfies semilattice laws', () => {
      fc.assert(
        fc.property(
          fc.tuple(fc.integer(), fc.integer()),
          fc.tuple(fc.integer(), fc.integer()),
          fc.tuple(fc.integer(), fc.integer()),
          (x, y, z) => {
            const laws = verifySemilatticeLaws(
              ps,
              (a, b) => a[0] === b[0] && a[1] === b[1],
              x as readonly [number, number],
              y as readonly [number, number],
              z as readonly [number, number]
            )
            expect(laws.commutative).toBe(true)
            expect(laws.associative).toBe(true)
            expect(laws.idempotent).toBe(true)
          }
        )
      )
    })
  })

  describe('recordSemilattice', () => {
    const rs = recordSemilattice({ a: maxSemilattice, b: maxSemilattice })

    it('joins field-wise', () => {
      expect(rs.join({ a: 1, b: 4 }, { a: 3, b: 2 })).toEqual({ a: 3, b: 4 })
    })
  })

  describe('merge (CRDT)', () => {
    it('delegates to semilattice join', () => {
      const result = merge(maxSemilattice)(3, 5)
      expect(result).toBe(5)
    })
  })
})
