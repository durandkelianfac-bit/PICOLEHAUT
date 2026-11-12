import { describe, it, expect } from 'vitest'
import { youtubeId, parseClip, assignLines, fillLine, tally, pickMime, countBlanks } from './logic'
import { doublage, type DoublagePub, type DoublageSecret } from './module'
import type { SipEvent } from '../../lib/sips'

const LINE = 'dQw4w9WgXcQ | 10 | 20 | Scène test | 1:Le héros: Je suis ___ ! ## 5.5:Le méchant: Tu ne passeras ___ ___'

describe('lecture d’un extrait', () => {
  it('identifiant YouTube depuis un lien ou un id', () => {
    expect(youtubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('pas un lien')).toBeNull()
  })
  it('extrait valide avec répliques triées et trous comptés', () => {
    const c = parseClip(LINE)!
    expect(c).toMatchObject({ id: 'dQw4w9WgXcQ', start: 10, end: 20, title: 'Scène test' })
    expect(c.lines.map((l) => [l.at, l.blanks])).toEqual([[1, 1], [5.5, 2]])
    expect(countBlanks('a ___ b ___ c ___')).toBe(3)
  })
  it('refuse les lignes invalides', () => {
    for (const bad of [
      'trop | court', 'xx | 10 | 20 | T | 1:a', 'dQw4w9WgXcQ | 20 | 10 | T | 1:a', 'dQw4w9WgXcQ | 0 | 10 | | 1:a',
      'dQw4w9WgXcQ | 0 | 10 | T | pas de temps', 'dQw4w9WgXcQ | 0 | 10 | T | 30:après la fin', 'dQw4w9WgXcQ | 0 | 10 | T | 1:ok ## mal formé',
    ]) expect(parseClip(bad), bad).toBeNull()
  })
})
describe('outils', () => {
  it('répartition des répliques en tour de rôle', () => expect(assignLines(5, ['a', 'b'])).toEqual(['a', 'b', 'a', 'b', 'a']))
  it('sous-titre avec les mots des joueurs', () => {
    expect(fillLine('Je suis ___ et ___ !', ['grand', 'beau'])).toBe('Je suis grand et beau !')
    expect(fillLine('Je suis ___ et ___ !', ['grand'])).toBe('Je suis grand et … !')
  })
  it('dépouillement du vote', () => {
    expect(tally({ a: 'b', b: 'c', c: 'b' }, ['a', 'b', 'c'])).toEqual({ counts: { a: 0, b: 2, c: 1 }, winners: ['b'] })
    expect(tally({ a: 'b', b: 'a' }, ['a', 'b']).winners).toEqual(['a', 'b'])
    expect(tally({}, ['a', 'b']).winners).toEqual([])
  })
  it('format audio : premier format pris en charge', () => {
    expect(pickMime((m) => m === 'audio/mp4')).toBe('audio/mp4')
    expect(pickMime(() => false)).toBe('')
  })
})

describe('partie', () => {
  const ctx = {
    players: ['a', 'b', 'c'].map((id) => ({ id, name: id })), sober: false, hostId: 'a',
    packs: { doublage: { categories: [{ enabled: true, items: [{ text: LINE }, { text: 'ligne invalide' }] }] } },
  }
  type Res = { pub: DoublagePub; secret: DoublageSecret; sips?: SipEvent[] }
  const run = (pub: DoublagePub, sec: DoublageSecret, who: string, action: object): Res => {
    const r = doublage.reduce(pub, sec, action, who, ctx)
    if ('error' in r) throw new Error(r.error)
    return r as Res
  }
  const toRecord = () => {
    const i = doublage.init(ctx)
    let r: Res = run(i.pub, i.secret, 'a', { type: 'begin' })
    r = run(r.pub, r.secret, 'a', { type: 'record' })
    return r
  }
  it('refuse de commencer sans extrait valide', () => {
    const empty = { ...ctx, packs: { doublage: { categories: [{ enabled: true, items: [{ text: 'x' }] }] } } }
    const i = doublage.init(empty)
    const r = doublage.reduce(i.pub, i.secret, { type: 'begin' }, 'a', empty)
    expect('error' in r && r.error).toMatch(/Aucun extrait/)
  })
  it('chaque joueur ne soumet que sa réplique, et remplit les trous', () => {
    let r = toRecord()
    expect(r.pub.assignees).toEqual(['a', 'b'])
    expect(() => run(r.pub, r.secret, 'b', { type: 'submit', line: 0, words: ['x'] })).toThrow(/pas ta réplique/)
    expect(() => run(r.pub, r.secret, 'a', { type: 'submit', line: 0, words: [''] })).toThrow(/trous/)
    r = run(r.pub, r.secret, 'a', { type: 'submit', line: 0, words: ['grand'] })
    expect(r.pub.words[0]).toEqual(['grand'])
    expect(() => run(r.pub, r.secret, 'a', { type: 'replay' })).toThrow(/ne sont pas/)
  })
  it('montage → vote secret → le plus drôle distribue', () => {
    let r = toRecord()
    r = run(r.pub, r.secret, 'a', { type: 'submit', line: 0, words: ['grand'] })
    r = run(r.pub, r.secret, 'b', { type: 'submit', line: 1, words: ['ici', 'jamais'] })
    r = run(r.pub, r.secret, 'a', { type: 'replay' })
    expect([r.pub.phase, r.pub.replayN]).toEqual(['replay', 1])
    r = run(r.pub, r.secret, 'a', { type: 'tovote' })
    expect(() => run(r.pub, r.secret, 'a', { type: 'vote', for: 'a' })).toThrow(/invalide/)
    r = run(r.pub, r.secret, 'a', { type: 'vote', for: 'b' })
    expect(() => run(r.pub, r.secret, 'a', { type: 'vote', for: 'c' })).toThrow(/déjà/)
    expect(JSON.stringify(r.pub)).not.toContain('"votes"') // le détail des votes reste secret
    r = run(r.pub, r.secret, 'b', { type: 'vote', for: 'c' })
    r = run(r.pub, r.secret, 'c', { type: 'vote', for: 'b' })
    expect(r.pub.phase).toBe('result')
    expect(r.pub.result!.winners).toEqual(['b'])
    expect(r.sips).toHaveLength(1)
    expect(r.sips![0]).toMatchObject({ kind: 'give', playerId: 'b', n: 5 })
  })
})
