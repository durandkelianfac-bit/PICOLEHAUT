import { describe, it, expect } from 'vitest'
import { scoreRound, tokenPoints, giverSequence, guesserOrder, leaders, validateClue, randomOptions, isValidTarget, cellLabel } from './logic'

const T: [number, number] = [5, 10]
describe('points des pions', () => {
  it('exact 3, cadre 2, couronne 1, loin 0', () => {
    expect(tokenPoints(T, [5, 10])).toBe(3)
    expect(tokenPoints(T, [4, 9])).toBe(2)
    expect(tokenPoints(T, [7, 12])).toBe(1)
    expect(tokenPoints(T, [8, 10])).toBe(0)
  })
})
describe('scoreRound', () => {
  it('donneur 1 pt par pion dans le cadre', () => {
    const r = scoreRound('g', T, { a: [[5, 10], [4, 10]], b: [[7, 10], [9, 9]] }, 3)
    expect(r.a).toBe(5)
    expect(r.b).toBe(1)
    expect(r.g).toBe(4) // 2 pions dans le cadre ×2 (3 joueurs)
  })
  it('donneur ×1 à 4 joueurs, maximum 9', () => {
    const tokens = { a: [[4, 9], [4, 10]], b: [[4, 11], [5, 9]], c: [[5, 10], [5, 11]] } as Record<string, [number, number][]>
    expect(scoreRound('g', T, tokens, 4).g).toBe(6)
  })
  it('ignore un 2e pion absent', () => {
    expect(scoreRound('g', T, { a: [[5, 10], null] }, 4).a).toBe(3)
  })
})
describe('tours', () => {
  it('2 tours chacun jusqu à 6, 1 tour à 7+', () => {
    expect(giverSequence(['a', 'b', 'c'])).toEqual(['a', 'b', 'c', 'a', 'b', 'c'])
    expect(giverSequence(['a', 'b', 'c', 'd', 'e', 'f', 'g']).length).toBe(7)
  })
  it('ordre horaire puis antihoraire', () => {
    expect(guesserOrder(['a', 'b', 'c', 'd'], 'b')).toEqual(['c', 'd', 'a'])
    expect(guesserOrder(['a', 'b', 'c', 'd'], 'b', true)).toEqual(['a', 'd', 'c'])
  })
  it('égalité', () => expect(leaders({ a: 4, b: 4, c: 1 })).toEqual(['a', 'b']))
})
describe('indices', () => {
  it('refuse noms de couleur, coordonnées, doublons, trop de mots', () => {
    expect(validateClue('Rouge', 1, [])).toMatch(/couleur/)
    expect(validateClue('M15', 1, [])).toMatch(/coordonn/)
    expect(validateClue('ciel', 1, ['Ciel'])).toMatch(/déjà/)
    expect(validateClue('deux mots', 1, [])).toMatch(/seul/)
    expect(validateClue('trois petits mots', 2, [])).toMatch(/Deux/)
  })
  it('accepte un indice valide', () => {
    expect(validateClue('lavande', 1, [])).toBeNull()
    expect(validateClue('ciel d’été', 2, [])).toBeNull()
  })
})
describe('cibles', () => {
  it('options valides et distinctes', () => {
    const o = randomOptions(4)
    expect(new Set(o.map(cellLabel)).size).toBe(4)
    expect(o.every(isValidTarget)).toBe(true)
  })
})
