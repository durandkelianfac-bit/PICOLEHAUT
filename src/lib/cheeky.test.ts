import { describe, it, expect } from 'vitest'
import { CHEEKY, ROYAL, CULSEC, cheekyLine, royalLine, culSecLine, sipHeadline, gendered, GENDERS } from './cheeky'

describe('accords selon le genre', () => {
  it('masculin, féminin, neutre', () => {
    const t = 'Tiens, prends ça, {vilain|vilaine|vilain·e} !!'
    expect(gendered(t, 'm')).toBe('Tiens, prends ça, vilain !!')
    expect(gendered(t, 'f')).toBe('Tiens, prends ça, vilaine !!')
    expect(gendered(t, 'x')).toBe('Tiens, prends ça, vilain·e !!')
    expect(gendered(t)).toBe('Tiens, prends ça, vilain·e !!') // neutre par défaut
  })
  it('plusieurs accords dans une phrase, sans accord = inchangé', () => {
    expect(gendered('{a|b|c} et {d|e|f}', 'f')).toBe('b et e')
    expect(gendered('rien à accorder', 'm')).toBe('rien à accorder')
  })
  it('trois genres proposés', () => expect(GENDERS.map((g) => g.id)).toEqual(['m', 'f', 'x']))
})
describe('messages', () => {
  it('assez de messages, tous uniques', () => {
    expect(CHEEKY.length).toBeGreaterThanOrEqual(20)
    expect(ROYAL.length).toBeGreaterThanOrEqual(10)
    expect(CULSEC.length).toBeGreaterThanOrEqual(8)
    for (const l of [CHEEKY, ROYAL, CULSEC]) expect(new Set(l).size).toBe(l.length)
  })
  it('aucun accord laissé tel quel, quel que soit le genre', () => {
    for (const g of ['m', 'f', 'x'] as const)
      for (const l of [...CHEEKY, ...ROYAL, ...CULSEC]) expect(gendered(l, g)).not.toMatch(/[{}|]/)
  })
  it('le roi est généreux', () => expect(ROYAL).toContain('Votre seigneur est généreux ce jour.'))
  it('choix stable pour un même événement, varié sur plusieurs', () => {
    expect(cheekyLine('abc-1', 'f')).toBe(cheekyLine('abc-1', 'f'))
    expect(royalLine('r1')).toBe(royalLine('r1'))
    expect(culSecLine('c1', 'm')).toBe(culSecLine('c1', 'm'))
    expect(new Set(Array.from({ length: 200 }, (_, i) => cheekyLine('ev' + i))).size).toBeGreaterThan(CHEEKY.length * 0.8)
  })
  it('titre au singulier / pluriel, gorgées ou points', () => {
    expect(sipHeadline(1, false)).toBe('1 gorgée')
    expect(sipHeadline(3, false)).toBe('3 gorgées')
    expect(sipHeadline(1, true)).toBe('1 point')
    expect(sipHeadline(2, true)).toBe('2 points')
  })
})
