import { describe, it, expect } from 'vitest'
import { codenames, type CnPub, type CnSecret } from './module'

const words = Array.from({ length: 40 }, (_, i) => 'mot' + String.fromCharCode(97 + (i % 26)) + Math.floor(i / 26))
const ctx = {
  players: ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id })), sober: false, hostId: 'a',
  packs: { codenames: { categories: [{ enabled: true, items: words.map((text) => ({ text })) }] } },
}
const run = (pub: CnPub, sec: CnSecret, who: string, action: object) => {
  const r = codenames.reduce(pub, sec, action, who, ctx)
  if ('error' in r) throw new Error(r.error)
  return r
}
function started() {
  const i = codenames.init(ctx)
  const r = run(i.pub, i.secret, 'a', { type: 'begin' })
  return { pub: r.pub, secret: r.secret, priv: r.priv }
}
const guesserOf = (pub: CnPub, team: 'red' | 'blue') => Object.keys(pub.teams).find((id) => pub.teams[id] === team && id !== pub.spies[team])!

describe('partie Codenames', () => {
  it('commence avec clé privée aux deux espions', () => {
    const { pub, secret, priv } = started()
    expect(pub.words.length).toBe(25)
    expect(Object.keys(priv!).sort()).toEqual([pub.spies.red, pub.spies.blue].sort())
    expect(pub.remaining[pub.start]).toBe(9)
    expect(secret.key.length).toBe(25)
  })
  it('seul l’hôte commence, et il faut un indice avant de désigner', () => {
    const i = codenames.init(ctx)
    expect(() => run(i.pub, i.secret, 'b', { type: 'begin' })).toThrow(/hôte/)
    const s = started()
    expect(() => run(s.pub, s.secret, guesserOf(s.pub, s.pub.turn), { type: 'reveal', index: 0 })).toThrow()
  })
  it('un mot de son équipe : le tour continue ; un mot adverse : il s’arrête', () => {
    let { pub, secret } = started()
    const team = pub.turn
    let r = run(pub, secret, pub.spies[team]!, { type: 'clue', word: 'animal', n: 2 }); pub = r.pub
    expect(pub.guessesLeft).toBe(3)
    const g = guesserOf(pub, team)
    const own = secret.key.findIndex((c) => c === team)
    r = run(pub, secret, g, { type: 'reveal', index: own }); pub = r.pub
    expect(pub.turn).toBe(team)
    expect(pub.remaining[team]).toBe(pub.start === team ? 8 : 7)
    const opp = secret.key.findIndex((c) => c !== team && c !== 'neutral' && c !== 'assassin')
    r = run(pub, secret, g, { type: 'reveal', index: opp }); pub = r.pub
    expect(pub.phase).toBe('clue')
    expect(pub.turn).not.toBe(team)
  })
  it('l’assassin fait perdre : l’équipe perdante boit 10', () => {
    let { pub, secret } = started()
    const team = pub.turn
    let r = run(pub, secret, pub.spies[team]!, { type: 'clue', word: 'noir', n: 1 }); pub = r.pub
    r = run(pub, secret, guesserOf(pub, team), { type: 'reveal', index: secret.key.indexOf('assassin') })
    expect(r.pub.phase).toBe('end')
    expect(r.pub.winner).not.toBe(team)
    expect(r.pub.reason).toBe('assassin')
    expect(r.sips?.length).toBe(2)
    expect(r.sips?.every((s) => s.kind === 'drink' && s.n === 10)).toBe(true)
  })
  it('trouver tous ses mots gagne', () => {
    let { pub, secret } = started()
    const team = pub.turn
    const g = guesserOf(pub, team)
    let r = run(pub, secret, pub.spies[team]!, { type: 'clue', word: 'tout', n: 0 }); pub = r.pub
    expect(pub.guessesLeft).toBeGreaterThan(50)
    const idx = secret.key.map((c, i) => (c === team ? i : -1)).filter((i) => i >= 0)
    for (const i of idx) { r = run(pub, secret, g, { type: 'reveal', index: i }); pub = r.pub }
    expect(pub.phase).toBe('end')
    expect(pub.winner).toBe(team)
  })
  it('passer exige au moins un mot', () => {
    const { pub, secret } = started()
    const team = pub.turn
    const r = run(pub, secret, pub.spies[team]!, { type: 'clue', word: 'x1y', n: 1 })
    expect(() => run(r.pub, secret, guesserOf(r.pub, team), { type: 'pass' })).toThrow(/au moins un/)
  })
})
