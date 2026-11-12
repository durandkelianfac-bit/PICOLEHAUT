import type { GameModule } from '../types'
import { give } from '../../lib/sips'
import { sipsConfig } from '../../config/sips.config'
import { type Cell, giverSequence, guesserOrder, leaders, randomOptions, same, scoreRound, validateClue } from './logic'

export type Phase = 'pick' | 'clue1' | 'guess1' | 'clue2' | 'guess2' | 'score' | 'end'
export interface HuesPub {
  phase: Phase
  order: string[]
  givers: string[]
  round: number
  giverId: string
  clues: string[]
  used: string[]
  tokens: Record<string, (Cell | null)[]>
  guessers: string[]
  turn: number
  totals: Record<string, number>
  roundPts: Record<string, number> | null
  target: Cell | null // révélé seulement en phase score/end
  winners: string[]
}
export interface HuesSecret { options: Cell[]; target: Cell | null }

const fresh = (pub: HuesPub, giverId: string): HuesPub => ({
  ...pub, phase: 'pick', giverId, clues: [], tokens: {}, guessers: [], turn: 0, roundPts: null, target: null,
})

export const hues: GameModule<HuesPub, HuesSecret> = {
  id: 'hues',
  min: 3,
  max: 10,
  init({ players }) {
    const order = players.map((p) => p.id)
    const givers = giverSequence(order)
    const options = randomOptions(4)
    const pub: HuesPub = {
      phase: 'pick', order, givers, round: 0, giverId: givers[0], clues: [], used: [], tokens: {}, guessers: [], turn: 0,
      totals: Object.fromEntries(order.map((id) => [id, 0])), roundPts: null, target: null, winners: [],
    }
    return { pub, secret: { options, target: null }, priv: { [givers[0]]: { options } } }
  },

  reduce(pub, secret, a, pid, ctx) {
    const isGiver = pid === pub.giverId
    const taken = () => Object.values(pub.tokens).flat().filter(Boolean) as Cell[]

    switch (a.type) {
      case 'pick': {
        if (pub.phase !== 'pick' || !isGiver) return { error: 'Action impossible.' }
        const target = secret.options[a.index]
        if (!target) return { error: 'Choix invalide.' }
        return { pub: { ...pub, phase: 'clue1' }, secret: { ...secret, target }, priv: { [pid]: { target } } }
      }
      case 'clue': {
        const first = pub.phase === 'clue1'
        if ((!first && pub.phase !== 'clue2') || !isGiver) return { error: 'Action impossible.' }
        const err = validateClue(String(a.text ?? ''), first ? 1 : 2, pub.used)
        if (err) return { error: err }
        const text = String(a.text).trim()
        const guessers = guesserOrder(pub.order, pub.giverId, !first)
        return { pub: { ...pub, phase: first ? 'guess1' : 'guess2', clues: [...pub.clues, text], used: [...pub.used, text], guessers, turn: 0 }, secret }
      }
      case 'place': {
        if (pub.phase !== 'guess1' && pub.phase !== 'guess2') return { error: 'Action impossible.' }
        if (pub.guessers[pub.turn] !== pid) return { error: 'Ce n’est pas ton tour.' }
        const cell = a.cell as Cell
        if (!Array.isArray(cell) || taken().some((t) => same(t, cell))) return { error: 'Case déjà prise.' }
        const tokens = { ...pub.tokens, [pid]: [...(pub.tokens[pid] ?? []), cell] }
        let next: HuesPub = { ...pub, tokens, turn: pub.turn + 1 }
        if (next.turn >= pub.guessers.length) next = pub.phase === 'guess1' ? { ...next, phase: 'clue2' } : next
        return finishIfDone(next, secret, ctx, pub.phase === 'guess2' && next.turn >= pub.guessers.length)
      }
      case 'skip': {
        if (pub.phase !== 'clue2' || !isGiver) return { error: 'Action impossible.' }
        return finishIfDone(pub, secret, ctx, true)
      }
      case 'next': {
        if (pub.phase !== 'score') return { error: 'Action impossible.' }
        const round = pub.round + 1
        let givers = pub.givers
        const top = leaders(pub.totals)
        if (round >= pub.givers.length) {
          if (top.length === 1) return { pub: { ...pub, phase: 'end', winners: top }, secret }
          // égalité : manche supplémentaire, les joueurs à égalité ne donnent pas d'indice
          const eligible = pub.order.filter((id) => !top.includes(id))
          const pool = eligible.length ? eligible : pub.order
          givers = [...pub.givers, pool[(round - pub.givers.length) % pool.length]]
        }
        const giverId = givers[round]
        const options = randomOptions(4)
        return { pub: { ...fresh(pub, giverId), givers, round }, secret: { options, target: null }, priv: { [giverId]: { options } } }
      }
      default:
        return { error: 'Action inconnue.' }
    }
  },
}

/** Passe en phase "score" si la manche est terminée. */
function finishIfDone(pub: HuesPub, secret: HuesSecret, ctx: { players: { id: string }[] }, done: boolean) {
  if (!done || !secret.target) return { pub, secret }
  const pts = scoreRound(pub.giverId, secret.target, pub.tokens, pub.order.length)
  const totals = { ...pub.totals }
  const sips = []
  for (const [id, p] of Object.entries(pts)) {
    totals[id] = (totals[id] ?? 0) + p
    if (p > 0) sips.push(give(id, p * sipsConfig.huesAndCues.pointToSips, 'hues', `${p} pt${p > 1 ? 's' : ''}`))
  }
  return { pub: { ...pub, phase: 'score' as Phase, roundPts: pts, totals, target: secret.target }, secret, sips }
}
