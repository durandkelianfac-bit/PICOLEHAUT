import { describe, it, expect } from 'vitest'
import { floorOf, floorSips, buildDeck, defaultOptions, handSize, holds, normalizeOptions, rbCorrect, validAlloc, cardLabel, type Card } from './logic'

const c = (v: number, s: Card['s'] = 'S'): Card => ({ v, s })
const perFloor = [1, 2, 3, 4, 5]

describe('pyramide', () => {
  it('étages : 5-4-3-2-1', () => {
    expect([0, 4, 5, 8, 9, 11, 12, 13, 14].map(floorOf)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5])
  })
  it('pénalités par étage, intense et horizontale', () => {
    const none = Array(15).fill(false)
    expect(floorSips(0, perFloor, defaultOptions, none)).toBe(1)
    expect(floorSips(14, perFloor, defaultOptions, none)).toBe(5)
    expect(floorSips(9, perFloor, { ...defaultOptions, intense: true }, none)).toBe(6)
    const h = none.map((_, i) => i === 9)
    expect(floorSips(9, perFloor, { ...defaultOptions, horizontal: true }, h)).toBe(6)
    expect(floorSips(9, perFloor, { ...defaultOptions, horizontal: true }, none)).toBe(3)
  })
})
describe('jeu de cartes', () => {
  it('52 cartes, 54 avec jokers', () => {
    expect(buildDeck(4, defaultOptions).length).toBe(52)
    expect(buildDeck(4, { ...defaultOptions, jokers: true }).length).toBe(54)
  })
  it('deux jeux quand 10 joueurs ne tiennent pas dans un seul', () => {
    expect(buildDeck(9, defaultOptions).length).toBe(52) // 9×4 + 15 = 51
    expect(buildDeck(10, defaultOptions).length).toBe(104) // 55 > 52
  })
  it('méthode B : 4 cartes, ni 6 cartes ni jokers', () => {
    const o = normalizeOptions({ ...defaultOptions, method: 'B', sixCards: true, jokers: true })
    expect([handSize(o), o.sixCards, o.jokers]).toEqual([4, false, false])
    expect(handSize({ ...defaultOptions, sixCards: true })).toBe(6)
  })
  it('seule la valeur compte ; le joker vaut tout', () => {
    expect(holds([c(8, 'H'), c(3)], 8, false)).toBe(true)
    expect(holds([c(8), c(3)], 9, false)).toBe(false)
    expect(holds([c(0, 'J')], 9, true)).toBe(true)
    expect(holds([c(0, 'J')], 9, false)).toBe(false)
  })
  it('libellés', () => expect([c(1, 'H'), c(11), c(13, 'D'), c(10, 'C')].map(cardLabel)).toEqual(['A♥', 'V♠', 'R♦', '10♣']))
})
describe('rouge ou noir', () => {
  it('Q1 couleur', () => {
    expect(rbCorrect(0, 'red', [c(5, 'H')])).toBe(true)
    expect(rbCorrect(0, 'red', [c(5, 'C')])).toBe(false)
  })
  it('Q2 plus/moins, égalité = faux', () => {
    expect(rbCorrect(1, 'more', [c(5), c(9)])).toBe(true)
    expect(rbCorrect(1, 'less', [c(5), c(9)])).toBe(false)
    expect(rbCorrect(1, 'more', [c(5), c(5)])).toBe(false)
    expect(rbCorrect(1, 'less', [c(5), c(5)])).toBe(false)
  })
  it('Q3 intérieur/extérieur, bornes = faux', () => {
    expect(rbCorrect(2, 'inside', [c(3), c(9), c(6)])).toBe(true)
    expect(rbCorrect(2, 'outside', [c(3), c(9), c(12)])).toBe(true)
    expect(rbCorrect(2, 'inside', [c(3), c(9), c(9)])).toBe(false)
    expect(rbCorrect(2, 'outside', [c(3), c(9), c(3)])).toBe(false)
  })
  it('Q4 enseigne', () => {
    expect(rbCorrect(3, 'D', [c(1), c(2), c(3), c(4, 'D')])).toBe(true)
    expect(rbCorrect(3, 'H', [c(1), c(2), c(3), c(4, 'D')])).toBe(false)
  })
})
describe('répartition', () => {
  it('somme exacte, entiers, joueurs autorisés', () => {
    expect(validAlloc({ a: 2, b: 1 }, 3, ['a', 'b'])).toBe(true)
    expect(validAlloc({ a: 2 }, 3, ['a', 'b'])).toBe(false)
    expect(validAlloc({ a: 3, z: 0 }, 3, ['a', 'b'])).toBe(false)
    expect(validAlloc({ a: -1, b: 4 }, 3, ['a', 'b'])).toBe(false)
    expect(validAlloc({ a: 1.5, b: 1.5 }, 3, ['a', 'b'])).toBe(false)
  })
})
