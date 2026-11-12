import { describe, it, expect } from 'vitest'
import { CHEEKY, cheekyLine, sipHeadline } from './cheeky'

describe('messages taquins', () => {
  it('une vingtaine de messages uniques', () => {
    expect(CHEEKY.length).toBeGreaterThanOrEqual(20)
    expect(new Set(CHEEKY).size).toBe(CHEEKY.length)
  })
  it('choix stable pour un même événement, varié sur plusieurs', () => {
    expect(cheekyLine('abc-1')).toBe(cheekyLine('abc-1'))
    const seen = new Set(Array.from({ length: 200 }, (_, i) => cheekyLine('ev' + i)))
    expect(seen.size).toBeGreaterThan(CHEEKY.length * 0.8)
  })
  it('titre au singulier / pluriel, gorgées ou points', () => {
    expect(sipHeadline(1, false)).toBe('1 gorgée')
    expect(sipHeadline(3, false)).toBe('3 gorgées')
    expect(sipHeadline(1, true)).toBe('1 point')
    expect(sipHeadline(2, true)).toBe('2 points')
  })
})
