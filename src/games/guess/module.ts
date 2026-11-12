import type { GameModule } from '../types'
import { drink, give, type SipEvent } from '../../lib/sips'
import { sipsConfig } from '../../config/sips.config'
import { RATIO_MAX, RATIO_MIN, ROUNDS, type Round, type SizeItem, extremes, parseItem, pickRounds, scoreGuess } from './logic'

export interface GuessResult {
  real: number
  guesses: Record<string, { size: number; score: number }>
  closest: string[]
  farthest: string[]
}
export interface GuessPub {
  phase: 'setup' | 'guess' | 'reveal' | 'end'
  order: string[]
  round: number
  total: number
  // la taille de la cible reste secrète jusqu'à la révélation
  current: { target: { name: string; emoji: string }; ref: SizeItem } | null
  locked: string[]
  totals: Record<string, number>
  result: GuessResult | null
}
export interface GuessSecret { rounds: Round[]; ratios: Record<string, number> }

const cfg = sipsConfig.guessTheSize
const view = (r: Round) => ({ target: { name: r.target.name, emoji: r.target.emoji }, ref: r.ref })
const blank = (order: string[]): GuessPub => ({ phase: 'setup', order, round: 0, total: ROUNDS, current: null, locked: [], totals: Object.fromEntries(order.map((i) => [i, 0])), result: null })

export const guess: GameModule<GuessPub, GuessSecret> = {
  id: 'guess',
  min: 2,
  max: 10,

  init({ players }) {
    return { pub: blank(players.map((p) => p.id)), secret: { rounds: [], ratios: {} } }
  },

  reduce(pub, secret, a, pid, ctx) {
    const isHost = pid === ctx.hostId
    const sips: SipEvent[] = []
    const out = (p: GuessPub, s: GuessSecret = secret) => ({ pub: p, secret: s, sips: sips.length ? sips : undefined })
    const err = (error: string) => ({ error })

    /** Calcule les scores et les gorgées de la manche. */
    const reveal = (sec: GuessSecret): ReturnType<typeof out> => {
      const round = sec.rounds[pub.round]
      const real = round.target.size
      const guesses: GuessResult['guesses'] = {}
      const errors: Record<string, number> = {}
      const totals = { ...pub.totals }
      for (const id of pub.order) {
        const ratio = sec.ratios[id]
        if (ratio === undefined) continue // n'a pas validé : 0 point
        const size = round.ref.size * ratio
        const score = scoreGuess(size, real)
        guesses[id] = { size, score }
        errors[id] = Math.abs(size - real) / real
        totals[id] += score
      }
      const { closest, farthest } = extremes(errors)
      for (const id of closest) sips.push(give(id, cfg.closestGives, 'guess', 'Le plus proche'))
      for (const id of farthest) sips.push(drink(id, cfg.farthestDrinks, 'guess', 'Le plus éloigné'))
      return out({ ...pub, phase: 'reveal', totals, result: { real, guesses, closest, farthest } }, sec)
    }

    switch (a.type) {
      case 'begin': {
        if (pub.phase !== 'setup' || !isHost) return err('Seul l’hôte peut commencer.')
        const items = (ctx.packs.guess?.categories ?? [])
          .filter((c) => c.enabled).flatMap((c) => c.items.map((i) => parseItem(i.text))).filter((x): x is SizeItem => !!x)
        const rounds = pickRounds(items)
        if (!rounds) return err(`Il faut au moins ${ROUNDS} objets valides dans le pack « Guess the size ».`)
        return out({ ...blank(pub.order), phase: 'guess', current: view(rounds[0]) }, { rounds, ratios: {} })
      }
      case 'lock': {
        if (pub.phase !== 'guess') return err('Action impossible.')
        const ratio = Number(a.ratio)
        if (!Number.isFinite(ratio) || ratio < RATIO_MIN || ratio > RATIO_MAX) return err('Valeur invalide.')
        if (pub.locked.includes(pid) || !pub.order.includes(pid)) return err('Déjà validé.')
        const s2 = { ...secret, ratios: { ...secret.ratios, [pid]: ratio } }
        const locked = [...pub.locked, pid]
        if (locked.length >= pub.order.length) return reveal(s2)
        return out({ ...pub, locked }, s2)
      }
      case 'reveal': {
        if (pub.phase !== 'guess' || !isHost) return err('Action impossible.')
        return reveal(secret)
      }
      case 'next': {
        if (pub.phase !== 'reveal' || !isHost) return err('Seul l’hôte continue.')
        const round = pub.round + 1
        if (round >= pub.total) return out({ ...pub, phase: 'end', current: null, result: pub.result })
        return out({ ...pub, phase: 'guess', round, current: view(secret.rounds[round]), locked: [], result: null }, { ...secret, ratios: {} })
      }
      case 'again': {
        if (pub.phase !== 'end' || !isHost) return err('Seul l’hôte peut relancer.')
        return out(blank(pub.order), { rounds: [], ratios: {} })
      }
      default:
        return err('Action inconnue.')
    }
  },
}
