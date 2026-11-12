import { describe, it, expect } from 'vitest'
import { palmier, SPREAD, type PalPub, type PalSecret } from './module'
import { effectOf, tenResult, effectTitle } from './logic'
import type { Card } from '../pyramide/logic'
import type { SipEvent } from '../../lib/sips'

const ctx = { players: ['a', 'b', 'c'].map((id) => ({ id, name: id })), sober: false, hostId: 'a', packs: {} }
type Res = { pub: PalPub; secret: PalSecret; sips?: SipEvent[] }
const run = (pub: PalPub, sec: PalSecret, who: string, action: object): Res => {
  const r = palmier.reduce(pub, sec, action, who, ctx)
  if ('error' in r) throw new Error(r.error)
  return r as Res
}
/** Démarre avec un paquet truqué : la première carte tirée est `top`. */
function startWith(top: Card[], tower = false): Res {
  const i = palmier.init(ctx)
  let r = run(i.pub, i.secret, 'a', { type: 'opt', tower })
  r = run(r.pub, r.secret, 'a', { type: 'begin' })
  const rest = r.secret.deck.filter((c) => !top.some((t) => t.v === c.v && t.s === c.s))
  return { ...r, secret: { ...r.secret, deck: [...top, ...rest] } }
}
const c = (v: number, s: Card['s'] = 'S'): Card => ({ v, s })

describe('effets', () => {
  it('classement des effets', () => {
    expect([c(4, 'H'), c(4), c(7), c(8), c(9), c(10), c(11), c(12), c(13), c(1, 'D'), c(1)].map(effectOf)).toEqual([
      'low-red', 'low-black', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace-red', 'ace-black',
    ])
    expect(effectTitle(c(5, 'H'))).toMatch(/donnes 5/)
  })
  it('10 : la minorité boit, égalité = personne', () => {
    expect(tenResult(5, 2).drinkers).toBe(2)
    expect(tenResult(3, 3).drinkers).toBe(0)
  })
})

describe('Palmier', () => {
  it('2 à 6 noir : le joueur boit la valeur', () => {
    let r = startWith([c(5, 'C')])
    r = run(r.pub, r.secret, 'a', { type: 'draw' })
    expect(r.sips).toHaveLength(1)
    expect(r.sips![0]).toMatchObject({ kind: 'drink', playerId: 'a', n: 5 })
    expect(r.pub.step).toBe('done')
  })
  it('2 à 6 rouge : distribue exactement la valeur', () => {
    let r = startWith([c(4, 'H')])
    r = run(r.pub, r.secret, 'a', { type: 'draw' })
    expect(r.pub.need).toBe('give')
    expect(() => run(r.pub, r.secret, 'a', { type: 'distribute', alloc: { b: 1 } })).toThrow(/exactement/)
    expect(() => run(r.pub, r.secret, 'b', { type: 'distribute', alloc: { c: 4 } })).toThrow()
    r = run(r.pub, r.secret, 'a', { type: 'distribute', alloc: { b: 3, c: 1 } })
    expect(r.sips!.filter((s) => s.kind === 'drink').map((s) => [s.playerId, s.n])).toEqual([['b', 3], ['c', 1]])
    expect(r.pub.step).toBe('done')
  })
  it('seul le joueur courant tire', () => {
    const r = startWith([c(7)])
    expect(() => run(r.pub, r.secret, 'b', { type: 'draw' })).toThrow(/tour/)
  })
  it('9 : règle en bandeau jusqu’à remplacement', () => {
    let r = startWith([c(9), c(9, 'H')])
    r = run(r.pub, r.secret, 'a', { type: 'draw' })
    expect(() => run(r.pub, r.secret, 'a', { type: 'rule', text: '  ' })).toThrow()
    r = run(r.pub, r.secret, 'a', { type: 'rule', text: 'On parle en rimes' })
    expect(r.pub.rule).toEqual({ by: 'a', text: 'On parle en rimes' })
    r = run(r.pub, r.secret, 'a', { type: 'next' })
    r = run(r.pub, r.secret, 'b', { type: 'draw' })
    r = run(r.pub, r.secret, 'b', { type: 'rule', text: 'Interdit de dire non' })
    expect(r.pub.rule).toEqual({ by: 'b', text: 'Interdit de dire non' })
  })
  it('10 : applique la règle de la minorité', () => {
    let r = startWith([c(10)])
    r = run(r.pub, r.secret, 'a', { type: 'draw' })
    expect(() => run(r.pub, r.secret, 'a', { type: 'ten', majority: 3, minority: 1 })).toThrow(/invalides/)
    r = run(r.pub, r.secret, 'a', { type: 'ten', majority: 2, minority: 1 })
    expect(r.pub.banner).toMatch(/Minorité \(1\)/)
  })
  it('dame : tout le monde boit', () => {
    let r = startWith([c(12)])
    r = run(r.pub, r.secret, 'a', { type: 'draw' })
    expect(r.sips!.map((s) => s.playerId).sort()).toEqual(['a', 'b', 'c'])
  })
  it('as noir : cul sec pour soi ; as rouge : cul sec pour quelqu’un', () => {
    let r = startWith([c(1, 'C'), c(1, 'H')])
    r = run(r.pub, r.secret, 'a', { type: 'draw' })
    expect(r.sips![0]).toMatchObject({ playerId: 'a', n: 10 })
    r = run(r.pub, r.secret, 'a', { type: 'next' })
    r = run(r.pub, r.secret, 'b', { type: 'draw' })
    expect(() => run(r.pub, r.secret, 'b', { type: 'target', id: 'b' })).toThrow()
    r = run(r.pub, r.secret, 'b', { type: 'target', id: 'c' })
    expect(r.sips!.find((s) => s.kind === 'drink')).toMatchObject({ playerId: 'c', n: 10 })
  })
  it('valet gardé jusqu’à ce qu’un autre valet sorte ; indépendant du roi', () => {
    let r = startWith([c(11), c(13), c(11, 'H')])
    r = run(r.pub, r.secret, 'a', { type: 'draw' })
    expect(r.pub.held).toEqual({ jack: 'a', king: null })
    r = run(r.pub, r.secret, 'a', { type: 'next' })
    r = run(r.pub, r.secret, 'b', { type: 'draw' }) // roi de b
    expect(r.pub.held).toEqual({ jack: 'a', king: 'b' })
    r = run(r.pub, r.secret, 'b', { type: 'next' })
    // a peut jouer son valet quand il veut
    expect(run(r.pub, r.secret, 'a', { type: 'use', card: 'jack' }).pub.banner).toMatch(/FREEZE/)
    expect(() => run(r.pub, r.secret, 'c', { type: 'use', card: 'jack' })).toThrow(/pas cette carte/)
    r = run(r.pub, r.secret, 'c', { type: 'draw' }) // nouveau valet : reprend à a
    expect(r.pub.held).toEqual({ jack: 'c', king: 'b' })
    expect(() => run(r.pub, r.secret, 'a', { type: 'use', card: 'jack' })).toThrow()
  })
  it('roi : règle libre', () => {
    let r = startWith([c(13)])
    r = run(r.pub, r.secret, 'a', { type: 'draw' })
    expect(() => run(r.pub, r.secret, 'a', { type: 'use', card: 'king', text: '' })).toThrow()
    expect(run(r.pub, r.secret, 'a', { type: 'use', card: 'king', text: 'tout le monde chante' }).pub.banner).toMatch(/chante/)
  })
  it('tour : effondrement = 7 gorgées, puis tour suivant', () => {
    let r = startWith([c(7)], true)
    r = run(r.pub, r.secret, 'a', { type: 'draw' })
    expect(r.pub.step).toBe('place')
    r = run(r.pub, r.secret, 'a', { type: 'collapsed' })
    expect(r.sips![0]).toMatchObject({ playerId: 'a', n: 7 })
    expect(r.pub.turn).toBe(1)
    expect(r.pub.collapses).toBe(1)
  })
  it('fin quand le paquet est vide', () => {
    let r = startWith([c(7)])
    r = { ...r, secret: { ...r.secret, deck: [c(7)] } }
    r = run(r.pub, r.secret, 'a', { type: 'draw' })
    r = run(r.pub, r.secret, 'a', { type: 'next' })
    expect(r.pub.phase).toBe('end')
  })
})

describe('éventail de cartes', () => {
  it('on choisit une carte parmi l’éventail : seule celle-là quitte le paquet', () => {
    const r = startWith([c(2, 'C'), c(3, 'C'), c(4, 'C')])
    const before = r.secret.deck.map((x) => `${x.v}${x.s}`)
    const d = run(r.pub, r.secret, 'a', { type: 'draw', index: 2 })
    expect(d.pub.card).toEqual(c(4, 'C'))
    expect(d.secret.deck.length).toBe(before.length - 1)
    expect(d.secret.deck.map((x) => `${x.v}${x.s}`)).toEqual(before.filter((_, i) => i !== 2))
    expect(d.pub.deckLeft).toBe(before.length - 1)
  })
  it('refuse un index hors de l’éventail', () => {
    const r = startWith([c(7)])
    expect(SPREAD).toBe(8)
    expect(() => run(r.pub, r.secret, 'a', { type: 'draw', index: SPREAD })).toThrow(/éventail/)
    expect(() => run(r.pub, r.secret, 'a', { type: 'draw', index: -1 })).toThrow(/éventail/)
    expect(() => run(r.pub, r.secret, 'a', { type: 'draw', index: 1.5 })).toThrow(/éventail/)
  })
  it('l’éventail se réduit quand le paquet est presque vide', () => {
    let r = startWith([c(7)])
    r = { ...r, secret: { ...r.secret, deck: [c(7), c(8)] } }
    expect(() => run(r.pub, r.secret, 'a', { type: 'draw', index: 2 })).toThrow(/éventail/)
    expect(run(r.pub, r.secret, 'a', { type: 'draw', index: 1 }).pub.card).toEqual(c(8))
  })
  it('les gorgées données portent le nom du donneur (message taquin)', () => {
    let r = startWith([c(4, 'H')])
    r = run(r.pub, r.secret, 'a', { type: 'draw' })
    r = run(r.pub, r.secret, 'a', { type: 'distribute', alloc: { b: 3, c: 1 } })
    expect(r.sips!.filter((s) => s.kind === 'drink').every((s) => s.by === 'a')).toBe(true)
    let t = startWith([c(1, 'H')])
    t = run(t.pub, t.secret, 'a', { type: 'draw' })
    t = run(t.pub, t.secret, 'a', { type: 'target', id: 'c' })
    expect(t.sips!.find((s) => s.kind === 'drink')).toMatchObject({ playerId: 'c', by: 'a' })
  })
})
