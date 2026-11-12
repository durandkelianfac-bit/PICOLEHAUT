import { describe, it, expect } from 'vitest'
import { makeKey, pickWords, validateClue, remaining, autoTeams, validTeams, other } from './logic'

describe('carte clé', () => {
  it('9/8/7/1 selon l’équipe qui commence', () => {
    const key = makeKey('blue')
    const c = (x: string) => key.filter((k) => k === x).length
    expect([key.length, c('blue'), c('red'), c('neutral'), c('assassin')]).toEqual([25, 9, 8, 7, 1])
  })
})
describe('mots', () => {
  it('25 mots distincts, null si pas assez', () => {
    const pool = Array.from({ length: 30 }, (_, i) => 'mot' + String.fromCharCode(97 + i))
    expect(new Set(pickWords(pool)).size).toBe(25)
    expect(pickWords(pool.slice(0, 24))).toBeNull()
    expect(pickWords([...pool.slice(0, 24), 'MOTA', 'Mota'])).toBeNull() // doublons ignorés
  })
})
describe('indices', () => {
  const visible = ['PRINCESSE', 'chat', 'glace']
  it('refuse mot visible, partie de mot visible, plusieurs mots', () => {
    expect(validateClue('chat', visible)).toMatch(/visible/)
    expect(validateClue('Prince', visible)).toMatch(/proche/)
    expect(validateClue('deux mots', visible)).toMatch(/seul/)
    expect(validateClue('', visible)).toMatch(/vide/)
  })
  it('accepte un indice valide', () => expect(validateClue('animal', visible)).toBeNull())
})
describe('équipes', () => {
  it('auto : alternance et un espion par équipe', () => {
    const { teams, spies } = autoTeams(['a', 'b', 'c', 'd'])
    expect(teams).toEqual({ a: 'red', b: 'blue', c: 'red', d: 'blue' })
    expect(spies).toEqual({ red: 'a', blue: 'b' })
    expect(validTeams(teams, spies)).toBeNull()
  })
  it('refuse une équipe sans espion ou trop petite', () => {
    expect(validTeams({ a: 'red', b: 'blue', c: 'red' }, { red: 'a', blue: 'b' })).toMatch(/au moins un joueur/)
    expect(validTeams({ a: 'red', b: 'red', c: 'blue', d: 'blue' }, { red: null, blue: 'c' })).toMatch(/espion/)
  })
  it('other', () => expect(other('red')).toBe('blue'))
})
describe('restants', () => {
  it('compte les mots non révélés par équipe', () => {
    const key = ['red', 'blue', 'neutral', 'assassin', 'red'] as const
    expect(remaining([...key], [null, 'blue', null, null, null])).toEqual({ red: 2, blue: 0 })
  })
})
