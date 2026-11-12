import { describe, it, expect } from 'vitest'
import { hues, type HuesPub, type HuesSecret } from './module'

const ctx = { players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }], sober: false, hostId: 'a', packs: {} }
const run = (pub: HuesPub, sec: HuesSecret, who: string, action: object) => {
  const r = hues.reduce(pub, sec, action, who, ctx)
  if ('error' in r) throw new Error(r.error)
  return r
}

describe('manche complète à 3 joueurs', () => {
  it('pick → indices → pions → score → manche suivante', () => {
    let { pub, secret } = hues.init(ctx)
    expect(pub.giverId).toBe('a')
    let r = run(pub, secret, 'a', { type: 'pick', index: 0 }); pub = r.pub; secret = r.secret
    const t = secret.target!
    r = run(pub, secret, 'a', { type: 'clue', text: 'lavande' }); pub = r.pub
    expect(pub.guessers).toEqual(['b', 'c'])
    r = run(pub, secret, 'b', { type: 'place', cell: t }); pub = r.pub
    expect(() => run(pub, secret, 'c', { type: 'place', cell: t })).toThrow(/déjà/)
    expect(() => run(pub, secret, 'b', { type: 'place', cell: [0, 0] })).toThrow(/tour/)
    r = run(pub, secret, 'c', { type: 'place', cell: [t[0], t[1] + 1] }); pub = r.pub
    expect(pub.phase).toBe('clue2')
    r = run(pub, secret, 'a', { type: 'clue', text: 'ciel doux' }); pub = r.pub
    expect(pub.guessers).toEqual(['c', 'b'])
    r = run(pub, secret, 'c', { type: 'place', cell: [t[0] + 1, t[1]] }); pub = r.pub
    r = run(pub, secret, 'b', { type: 'place', cell: [0, 0] }); pub = r.pub
    expect(pub.phase).toBe('score')
    expect(pub.roundPts).toEqual({ a: 6, b: 3, c: 4 }) // donneur: 3 pions dans le cadre ×2
    expect(r.sips?.length).toBe(3)
    r = run(pub, secret, 'a', { type: 'next' }); pub = r.pub; secret = r.secret
    expect(pub.phase).toBe('pick')
    expect(pub.giverId).toBe('b')
    expect(pub.target).toBeNull()
  })
  it('le donneur peut sauter le 2e indice', () => {
    let { pub, secret } = hues.init(ctx)
    let r = run(pub, secret, 'a', { type: 'pick', index: 1 }); pub = r.pub; secret = r.secret
    r = run(pub, secret, 'a', { type: 'clue', text: 'mousse' }); pub = r.pub
    r = run(pub, secret, 'b', { type: 'place', cell: secret.target! }); pub = r.pub
    r = run(pub, secret, 'c', { type: 'place', cell: [0, 0] }); pub = r.pub
    r = run(pub, secret, 'a', { type: 'skip' }); pub = r.pub
    expect(pub.phase).toBe('score')
    expect(pub.roundPts!.b).toBe(3)
  })
})
