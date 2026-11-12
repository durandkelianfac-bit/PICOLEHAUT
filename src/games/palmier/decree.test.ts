import { describe, it, expect } from 'vitest'
import { palmier, type PalPub, type PalSecret } from './module'
import type { Card } from '../pyramide/logic'
import type { SipEvent } from '../../lib/sips'

const ctx = { players: ['a', 'b', 'c'].map((id) => ({ id, name: id.toUpperCase() })), sober: false, hostId: 'a', packs: {} }
type Res = { pub: PalPub; secret: PalSecret; sips?: SipEvent[] }
const run = (pub: PalPub, sec: PalSecret, who: string, action: object): Res => {
  const r = palmier.reduce(pub, sec, action, who, ctx)
  if ('error' in r) throw new Error(r.error)
  return r as Res
}
const c = (v: number, s: Card['s'] = 'S'): Card => ({ v, s })
function startWith(top: Card[]): Res {
  const i = palmier.init(ctx)
  let r = run(i.pub, i.secret, 'a', { type: 'begin' })
  const rest = r.secret.deck.filter((x) => !top.some((t) => t.v === x.v && t.s === x.s))
  return { ...r, secret: { ...r.secret, deck: [...top, ...rest] } }
}
/** a tire le roi, passe son tour. */
function kingForA(): Res {
  let r = startWith([c(13)])
  r = run(r.pub, r.secret, 'a', { type: 'draw' })
  return run(r.pub, r.secret, 'a', { type: 'next' })
}

describe('décret du roi', () => {
  it('le roi envoie autant de gorgées qu’il veut, à tout moment de son règne', () => {
    const r = kingForA() // c’est maintenant le tour de b : le roi (a) agit hors de son tour
    const d = run(r.pub, r.secret, 'a', { type: 'decree', to: 'c', n: 37 })
    expect(d.sips![0]).toMatchObject({ kind: 'give', playerId: 'a', n: 37 })
    expect(d.sips![1]).toMatchObject({ kind: 'drink', playerId: 'c', n: 37, by: 'a', tag: 'royal' })
    expect(d.pub.banner).toMatch(/offre 37 à C/)
    // aucune limite : plusieurs décrets de suite, gros nombres compris
    const e = run(d.pub, d.secret, 'a', { type: 'decree', to: 'b', n: 500 })
    expect(e.sips![1]).toMatchObject({ playerId: 'b', n: 500 })
  })
  it('refuse un non-roi, un joueur invalide ou un nombre invalide', () => {
    const r = kingForA()
    expect(() => run(r.pub, r.secret, 'b', { type: 'decree', to: 'c', n: 3 })).toThrow(/pas le roi/)
    expect(() => run(r.pub, r.secret, 'a', { type: 'decree', to: 'a', n: 3 })).toThrow(/autre joueur/)
    expect(() => run(r.pub, r.secret, 'a', { type: 'decree', to: 'zzz', n: 3 })).toThrow(/autre joueur/)
    for (const n of [0, -2, 1.5, NaN, 2_000_000]) expect(() => run(r.pub, r.secret, 'a', { type: 'decree', to: 'c', n })).toThrow(/invalide/)
  })
  it('perdre la couronne : un autre roi sort, l’ancien ne peut plus décréter', () => {
    // a tire le roi de pique, puis b tire le roi de cœur : la couronne passe à b
    let t = startWith([c(13), c(13, 'H')])
    t = run(t.pub, t.secret, 'a', { type: 'draw' })
    t = run(t.pub, t.secret, 'a', { type: 'next' })
    t = run(t.pub, t.secret, 'b', { type: 'draw' })
    expect(t.pub.held.king).toBe('b')
    expect(() => run(t.pub, t.secret, 'a', { type: 'decree', to: 'c', n: 3 })).toThrow(/pas le roi/)
    expect(run(t.pub, t.secret, 'b', { type: 'decree', to: 'c', n: 3 }).sips![1]).toMatchObject({ by: 'b', tag: 'royal' })
  })
})

describe('cul sec', () => {
  it('as rouge : cul sec offert à quelqu’un, avec le donneur et le style cul sec', () => {
    let r = startWith([c(1, 'H')])
    r = run(r.pub, r.secret, 'a', { type: 'draw' })
    r = run(r.pub, r.secret, 'a', { type: 'target', id: 'b' })
    expect(r.sips!.find((s) => s.kind === 'drink')).toMatchObject({ playerId: 'b', by: 'a', tag: 'culsec' })
  })
  it('as noir : cul sec pour soi, style cul sec sans donneur', () => {
    let r = startWith([c(1, 'C')])
    r = run(r.pub, r.secret, 'a', { type: 'draw' })
    const e = r.sips![0]
    expect(e).toMatchObject({ kind: 'drink', playerId: 'a', tag: 'culsec' })
    expect(e.by).toBeUndefined()
  })
})
