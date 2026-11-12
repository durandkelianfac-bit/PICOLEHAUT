import { describe, it, expect } from 'vitest'
import { parseItem, scoreGuess, pickRounds, extremes, sliderToRatio, ratioToSlider, fmtSize, RATIO_MIN, RATIO_MAX } from './logic'
import { guess, type GuessPub, type GuessSecret } from './module'
import { guessItems } from '../../config/sizes.guess'

describe('logique', () => {
  it('lit une ligne de pack', () => {
    expect(parseItem('Tour Eiffel | 330 | 🗼')).toEqual({ name: 'Tour Eiffel', size: 330, emoji: '🗼' })
    expect(parseItem('Pièce | 0,02325')).toEqual({ name: 'Pièce', size: 0.02325, emoji: '❓' })
    expect(parseItem('sans taille')).toBeNull()
    expect(parseItem('x | -3 | y')).toBeNull()
  })
  it('score : 100 à la bonne taille, dégressif, jamais négatif', () => {
    expect(scoreGuess(10, 10)).toBe(100)
    expect(scoreGuess(12, 10)).toBeGreaterThan(scoreGuess(15, 10))
    expect(scoreGuess(5, 10)).toBe(scoreGuess(15, 10)) // symétrique en écart relatif
    expect(scoreGuess(1000, 10)).toBe(0)
    expect(scoreGuess(0.0001, 10)).toBeLessThanOrEqual(5)
  })
  it('curseur logarithmique réversible', () => {
    expect(sliderToRatio(0)).toBeCloseTo(RATIO_MIN)
    expect(sliderToRatio(1)).toBeCloseTo(RATIO_MAX)
    expect(ratioToSlider(sliderToRatio(0.37))).toBeCloseTo(0.37)
  })
  it('plus proche / plus éloigné', () => {
    expect(extremes({ a: 0.1, b: 0.5, c: 0.9 })).toEqual({ closest: ['a'], farthest: ['c'] })
    expect(extremes({ a: 0.3, b: 0.3 })).toEqual({ closest: [], farthest: [] })
    expect(extremes({ a: 0.3 })).toEqual({ closest: [], farthest: [] })
  })
  it('formatage', () => {
    expect(fmtSize(0.02325)).toBe('2,33 cm')
    expect(fmtSize(330)).toBe('330 m')
  })
})

describe('pack par défaut', () => {
  const all = Object.values(guessItems).flat()
  it('toutes les lignes sont valides et uniques', () => {
    const parsed = all.map(parseItem)
    expect(parsed.every(Boolean)).toBe(true)
    expect(new Set(parsed.map((p) => p!.name)).size).toBe(all.length)
  })
  it('5 manches possibles, référence de taille voisine', () => {
    const items = all.map(parseItem).map((i) => i!)
    const rounds = pickRounds(items)!
    expect(rounds).toHaveLength(5)
    for (const r of rounds) {
      expect(r.ref).not.toBe(r.target)
      expect(r.ref.size / r.target.size).toBeLessThanOrEqual(10)
      expect(r.ref.size / r.target.size).toBeGreaterThanOrEqual(0.1)
    }
    expect(pickRounds(items.slice(0, 4))).toBeNull()
  })
})

describe('partie', () => {
  const ctx = {
    players: ['a', 'b', 'c'].map((id) => ({ id, name: id })), sober: false, hostId: 'a',
    packs: { guess: { categories: [{ enabled: true, items: Object.values(guessItems).flat().map((text) => ({ text })) }] } },
  }
  const run = (pub: GuessPub, sec: GuessSecret, who: string, action: object) => {
    const r = guess.reduce(pub, sec, action, who, ctx)
    if ('error' in r) throw new Error(r.error)
    return r
  }
  it('la taille de la cible reste secrète puis la manche se révèle quand tous ont validé', () => {
    const i = guess.init(ctx)
    let r = run(i.pub, i.secret, 'a', { type: 'begin' })
    expect((r.pub.current!.target as Record<string, unknown>).size).toBeUndefined()
    const round = r.secret.rounds[0]
    const exact = round.target.size / round.ref.size
    r = run(r.pub, r.secret, 'a', { type: 'lock', ratio: exact })
    expect(() => run(r.pub, r.secret, 'a', { type: 'lock', ratio: 1 })).toThrow(/Déjà/)
    expect(() => run(r.pub, r.secret, 'b', { type: 'lock', ratio: 9999 })).toThrow(/invalide/)
    r = run(r.pub, r.secret, 'b', { type: 'lock', ratio: exact * 1.3 })
    expect(r.pub.phase).toBe('guess')
    r = run(r.pub, r.secret, 'c', { type: 'lock', ratio: exact * 4 })
    expect(r.pub.phase).toBe('reveal')
    expect(r.pub.result!.guesses.a.score).toBe(100)
    expect(r.pub.result!.closest).toEqual(['a'])
    expect(r.pub.result!.farthest).toEqual(['c'])
    expect(r.sips!.map((s) => [s.kind, s.playerId, s.n])).toEqual([['give', 'a', 3], ['drink', 'c', 3]])
    expect(r.pub.totals.a).toBe(100)
  })
  it('5 manches puis fin ; non-validation = 0 point', () => {
    const i = guess.init(ctx)
    let r = run(i.pub, i.secret, 'a', { type: 'begin' })
    for (let k = 0; k < 5; k++) {
      r = run(r.pub, r.secret, 'a', { type: 'lock', ratio: r.secret.rounds[k].target.size / r.secret.rounds[k].ref.size })
      r = run(r.pub, r.secret, 'a', { type: 'reveal' }) // l'hôte force la révélation
      expect(r.pub.result!.guesses.b).toBeUndefined()
      r = run(r.pub, r.secret, 'a', { type: 'next' })
    }
    expect(r.pub.phase).toBe('end')
    expect(r.pub.totals.a).toBe(500)
    expect(r.pub.totals.b).toBe(0)
  })
})
