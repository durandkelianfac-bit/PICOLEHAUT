import { describe, it, expect } from 'vitest'
import { parseCard, typeOfCategory, collectCards, fillText } from './logic'
import { cyclone, type CyclonePub, type CycloneSecret } from './module'
import { cycloneCards } from '../../config/cards.cyclone'

const categories = Object.entries(cycloneCards).map(([name, items]) => ({ name, enabled: true, items: items.map((text) => ({ text })) }))

describe('pack Cyclone', () => {
  const all = collectCards(categories, [1, 2, 3])
  it('80 cartes valides, réparties dans les trois types', () => {
    expect(Object.values(cycloneCards).flat().length).toBe(80)
    expect(all.length).toBe(80)
    for (const t of ['gage', 'action', 'verite']) expect(all.filter((c) => c.type === t).length).toBeGreaterThanOrEqual(25)
  })
  it('les trois intensités sont représentées pour chaque type', () => {
    for (const t of ['gage', 'action', 'verite']) for (const l of [1, 2, 3]) expect(all.filter((c) => c.type === t && c.level === l).length).toBeGreaterThanOrEqual(8)
  })
  it('textes uniques', () => expect(new Set(all.map((c) => c.text)).size).toBe(80))
  it('filtre par intensité', () => expect(collectCards(categories, [1]).every((c) => c.level === 1)).toBe(true))
})
describe('lecture des cartes', () => {
  it('type selon la catégorie', () => {
    expect([typeOfCategory('Gage'), typeOfCategory('Action'), typeOfCategory('Vérité'), typeOfCategory('Défis')]).toEqual(['gage', 'action', 'verite', 'gage'])
  })
  it('lignes valides et invalides', () => {
    expect(parseCard('2 | Chante | 3', 'gage')).toEqual({ type: 'gage', level: 2, text: 'Chante', sips: 3 })
    expect(parseCard('1 | Sans gorgées', 'gage')?.sips).toBe(0)
    expect(parseCard('4 | niveau inconnu | 1', 'gage')).toBeNull()
    expect(parseCard('1 |  | 1', 'gage')).toBeNull()
    expect(parseCard('1 | trop | 99', 'gage')).toBeNull()
  })
  it('{autre} ne désigne jamais le joueur lui-même', () => {
    for (let i = 0; i < 20; i++) expect(fillText('Imite {autre}', 'Léa', ['Léa', 'Tom', 'Sam'])).toMatch(/Tom|Sam/)
    expect(fillText('Imite {autre}', 'Léa', ['Léa'])).toBe('Imite quelqu’un')
  })
})
describe('partie', () => {
  const ctx = { players: ['a', 'b'].map((id) => ({ id, name: id.toUpperCase() })), sober: false, hostId: 'a', packs: { cyclone: { categories } } }
  const run = (pub: CyclonePub, sec: CycloneSecret, who: string, action: object) => {
    const r = cyclone.reduce(pub, sec, action, who, ctx)
    if ('error' in r) throw new Error(r.error)
    return r
  }
  const start = (extra: object[] = []) => {
    const i = cyclone.init(ctx)
    let r = { pub: i.pub, secret: i.secret }
    for (const a of extra) r = run(r.pub, r.secret, 'a', a)
    return run(r.pub, r.secret, 'a', { type: 'begin' })
  }
  it('intensités réglables par l’hôte, soft + moyen par défaut', () => {
    const i = cyclone.init(ctx)
    expect(i.pub.levels).toEqual([1, 2])
    expect(() => run(i.pub, i.secret, 'b', { type: 'level', level: 3, on: true })).toThrow(/hôte/)
    const r = run(i.pub, i.secret, 'a', { type: 'level', level: 3, on: true })
    expect(r.pub.levels).toEqual([1, 2, 3])
    let none = run(r.pub, r.secret, 'a', { type: 'level', level: 1, on: false })
    none = run(none.pub, none.secret, 'a', { type: 'level', level: 2, on: false })
    none = run(none.pub, none.secret, 'a', { type: 'level', level: 3, on: false })
    expect(() => run(none.pub, none.secret, 'a', { type: 'begin' })).toThrow(/intensité/)
  })
  it('seul le joueur courant tire ; le deck ne contient que les intensités choisies', () => {
    const r = start()
    expect(r.secret.deck.every((c) => c.level <= 2)).toBe(true)
    expect(() => run(r.pub, r.secret, 'b', { type: 'draw' })).toThrow(/tour/)
    const d = run(r.pub, r.secret, 'a', { type: 'draw' })
    expect(d.pub.card).not.toBeNull()
    expect(() => run(d.pub, d.secret, 'a', { type: 'draw' })).toThrow()
  })
  it('refuser un gage ou une vérité fait boire ; une action fait distribuer', () => {
    let r = start()
    for (let k = 0; k < 50; k++) {
      r = run(r.pub, r.secret, r.pub.order[r.pub.turn], { type: 'draw' })
      const c = r.pub.card!
      const who = r.pub.order[r.pub.turn]
      if (c.type === 'action') {
        const done = run(r.pub, r.secret, who, { type: 'done' })
        expect(done.sips?.[0]).toMatchObject({ kind: 'give', playerId: who, n: c.sips })
        expect(() => run(r.pub, r.secret, who, { type: 'pass' })).toThrow()
        r = done
      } else {
        const passed = run(r.pub, r.secret, who, { type: 'pass' })
        expect(passed.sips?.[0]).toMatchObject({ kind: 'drink', playerId: who, n: c.sips })
        r = passed
      }
    }
  })
  it('fin quand le paquet est vide', () => {
    let r = start()
    r = { ...r, secret: { deck: r.secret.deck.slice(0, 1) } }
    r = run(r.pub, r.secret, 'a', { type: 'draw' }) as typeof r
    r = run(r.pub, r.secret, 'a', { type: 'done' }) as typeof r
    expect(r.pub.phase).toBe('end')
  })
})
