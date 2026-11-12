import { describe, it, expect } from 'vitest'
import { pyramide, type PyPub, type PySecret } from './module'
import type { SipEvent } from '../../lib/sips'

const ctx = { players: ['a', 'b', 'c'].map((id) => ({ id, name: id })), sober: false, hostId: 'a', packs: {} }
type Res = { pub: PyPub; secret: PySecret; sips?: SipEvent[]; priv?: Record<string, unknown> }
const run = (pub: PyPub, sec: PySecret, who: string, action: object): Res => {
  const r = pyramide.reduce(pub, sec, action, who, ctx)
  if ('error' in r) throw new Error(r.error)
  return r as Res
}
function start(opts: Record<string, unknown> = {}) {
  const i = pyramide.init(ctx)
  let pub = i.pub, secret = i.secret
  for (const [key, value] of Object.entries(opts)) ({ pub, secret } = run(pub, secret, 'a', { type: 'opt', key, value }))
  return run(pub, secret, 'a', { type: 'begin' })
}
/** Passe la phase mémo et retourne la première carte. */
function toClaim(r: Res) {
  r = run(r.pub, r.secret, 'a', { type: 'endmemo' })
  return run(r.pub, r.secret, 'a', { type: 'flip' })
}

describe('Pyramide, méthode A', () => {
  it('distribue 4 cartes privées à chacun et 15 à la pyramide', () => {
    const r = start()
    expect(r.pub.phase).toBe('memo')
    expect(Object.values(r.secret.hands).every((h) => h.length === 4)).toBe(true)
    expect(r.secret.pyramid.length).toBe(15)
    expect(r.pub.pyramid.every((c) => c === null)).toBe(true) // rien de visible avant retournement
  })
  it('seul l’hôte retourne ; la carte devient publique', () => {
    const r0 = start()
    const m = run(r0.pub, r0.secret, 'a', { type: 'endmemo' })
    expect(() => run(m.pub, m.secret, 'b', { type: 'flip' })).toThrow(/hôte/)
    const r = run(m.pub, m.secret, 'a', { type: 'flip' })
    expect(r.pub.pyramid[0]).toEqual(r.secret.pyramid[0])
    expect(r.pub.phase).toBe('claim')
  })
  it('premier arrivé : une seule revendication', () => {
    const r = toClaim(start())
    const c = run(r.pub, r.secret, 'b', { type: 'claim' })
    expect(c.pub.dist).toEqual({ from: 'b', total: 1, kind: 'claim' })
    expect(() => run(c.pub, c.secret, 'c', { type: 'claim' })).toThrow(/tard/)
  })
  it('accepter : la cible boit sa part', () => {
    let r = toClaim(start())
    r = run(r.pub, r.secret, 'b', { type: 'claim' })
    expect(() => run(r.pub, r.secret, 'b', { type: 'distribute', alloc: { c: 5 } })).toThrow(/exactement/)
    r = run(r.pub, r.secret, 'b', { type: 'distribute', alloc: { c: 1 } })
    expect(r.pub.phase).toBe('accuse')
    r = run(r.pub, r.secret, 'c', { type: 'respond', choice: 'accept' })
    expect(r.sips?.[0]).toMatchObject({ kind: 'drink', playerId: 'c', n: 1 })
    expect(r.pub.phase).toBe('flip')
  })
  it('accusation : le menteur ou l’accusateur prend le double, et une carte reste visible', () => {
    let r = toClaim(start())
    const value = r.pub.pyramid[0]!.v
    const had = r.secret.hands.b.some((c) => c.v === value)
    r = run(r.pub, r.secret, 'b', { type: 'claim' })
    r = run(r.pub, r.secret, 'b', { type: 'distribute', alloc: { c: 1 } })
    r = run(r.pub, r.secret, 'c', { type: 'respond', choice: 'liar' })
    expect(r.pub.shown.b.length).toBe(1)
    const drinkEv = r.sips!.find((s) => s.kind === 'drink')!
    expect(drinkEv.n).toBe(2)
    expect(drinkEv.playerId).toBe(had ? 'c' : 'b')
    expect(r.pub.phase).toBe('flip')
  })
  it('carte brûlée si personne ne revendique ; fin après 15 cartes', () => {
    let r = start()
    r = run(r.pub, r.secret, 'a', { type: 'endmemo' })
    for (let i = 0; i < 15; i++) {
      r = run(r.pub, r.secret, 'a', { type: 'flip' })
      r = run(r.pub, r.secret, 'a', { type: 'burn' })
    }
    expect(r.pub.phase).toBe('end')
    expect(r.pub.finalHands).not.toBeNull()
  })
  it('consultation : option requise, une fois, coûte 2', () => {
    const off = toClaim(start())
    expect(() => run(off.pub, off.secret, 'b', { type: 'peek' })).toThrow()
    const on = toClaim(start({ consult: true }))
    const p = run(on.pub, on.secret, 'b', { type: 'peek' })
    expect(p.sips?.[0]).toMatchObject({ kind: 'drink', playerId: 'b', n: 2 })
    expect(() => run(p.pub, p.secret, 'b', { type: 'peek' })).toThrow(/déjà/)
  })
  it('intense double les pénalités', () => {
    const r = toClaim(start({ intense: true }))
    expect(run(r.pub, r.secret, 'b', { type: 'claim' }).pub.dist!.total).toBe(2)
  })
  it('bluff total : le revendicateur déclare', () => {
    let r = toClaim(start({ bluffTotal: true }))
    r = run(r.pub, r.secret, 'b', { type: 'claim' })
    r = run(r.pub, r.secret, 'b', { type: 'distribute', alloc: { c: 1 } })
    r = run(r.pub, r.secret, 'c', { type: 'respond', choice: 'liar' })
    expect(r.pub.phase).toBe('declare')
    expect(r.pub.shown.b ?? []).toHaveLength(0) // aucune carte montrée
    r = run(r.pub, r.secret, 'b', { type: 'declare', had: false })
    expect(r.sips!.find((s) => s.kind === 'drink')).toMatchObject({ playerId: 'b', n: 2 })
  })
})

describe('Pyramide, méthode B « Rouge ou noir »', () => {
  it('4 questions par joueur, 1/2/3/4 gorgées', () => {
    let r = start({ method: 'B' })
    expect(r.pub.phase).toBe('rb')
    const answers = ['red', 'more', 'inside', 'S']
    let total = 0
    for (let q = 0; q < 4; q++) {
      r = run(r.pub, r.secret, 'a', { type: 'rb', answer: answers[q] })
      if (r.pub.phase === 'distribute') {
        // bonne réponse : distribuer
        r = run(r.pub, r.secret, 'a', { type: 'distribute', alloc: { b: q + 1 } })
        total += r.sips!.filter((s) => s.kind === 'drink').length
      } else total += r.sips!.filter((s) => s.kind === 'drink' && s.n === q + 1).length
    }
    expect(total).toBe(4) // une conséquence par question
    expect(r.pub.rb).toMatchObject({ idx: 1, q: 0 })
    expect(r.secret.hands.a.length).toBe(4)
  })
  it('refuse une réponse invalide ou un autre joueur', () => {
    const r = start({ method: 'B' })
    expect(() => run(r.pub, r.secret, 'b', { type: 'rb', answer: 'red' })).toThrow(/tour/)
    expect(() => run(r.pub, r.secret, 'a', { type: 'rb', answer: 'more' })).toThrow(/invalide/)
  })
})
