import type { GameModule } from '../types'
import { drink } from '../../lib/sips'
import { sipsConfig } from '../../config/sips.config'
import { type Color, type Team, UNLIMITED, autoTeams, makeKey, other, pickWords, remaining, validTeams, validateClue } from './logic'

export type Phase = 'teams' | 'clue' | 'guess' | 'end'
export interface CnPub {
  phase: Phase
  teams: Record<string, Team>
  spies: Record<Team, string | null>
  words: string[]
  revealed: (Color | null)[]
  start: Team
  turn: Team
  clue: { word: string; n: number } | null // n = UNLIMITED pour « illimité »
  history: { team: Team; word: string; n: number }[]
  guessesLeft: number
  guessed: number // mots désignés ce tour
  remaining: Record<Team, number>
  winner: Team | null
  reason: 'all' | 'assassin' | null
}
export interface CnSecret { key: Color[] }

export const codenames: GameModule<CnPub, CnSecret> = {
  id: 'codenames',
  min: 4,
  max: 16,

  init({ players }) {
    const { teams, spies } = autoTeams(players.map((p) => p.id))
    const pub: CnPub = {
      phase: 'teams', teams, spies, words: [], revealed: [], start: 'red', turn: 'red', clue: null, history: [],
      guessesLeft: 0, guessed: 0, remaining: { red: 0, blue: 0 }, winner: null, reason: null,
    }
    return { pub, secret: { key: [] } }
  },

  privFor(pub, secret, pid) {
    return pub.phase !== 'teams' && (pid === pub.spies.red || pid === pub.spies.blue) ? { key: secret.key } : undefined
  },

  reduce(pub, secret, a, pid, ctx) {
    const isSpy = pid === pub.spies.red || pid === pub.spies.blue
    const myTeam = pub.teams[pid]

    switch (a.type) {
      case 'team': {
        if (pub.phase !== 'teams' || (a.team !== 'red' && a.team !== 'blue')) return { error: 'Action impossible.' }
        const spies = { ...pub.spies }
        if (spies.red === pid) spies.red = null
        if (spies.blue === pid) spies.blue = null
        return { pub: { ...pub, teams: { ...pub.teams, [pid]: a.team }, spies }, secret }
      }
      case 'spy': {
        if (pub.phase !== 'teams' || !myTeam) return { error: 'Action impossible.' }
        return { pub: { ...pub, spies: { ...pub.spies, [myTeam]: pid } }, secret }
      }
      case 'begin': {
        if (pub.phase !== 'teams' || pid !== ctx.hostId) return { error: 'Seul l’hôte peut commencer.' }
        const err = validTeams(pub.teams, pub.spies)
        if (err) return { error: err }
        const pool = (ctx.packs.codenames?.categories ?? [])
          .filter((c) => c.enabled).flatMap((c) => c.items.map((i) => i.text))
        const words = pickWords(pool)
        if (!words) return { error: 'Il faut au moins 25 mots actifs dans le pack Codenames.' }
        const start: Team = Math.random() < 0.5 ? 'red' : 'blue'
        const key = makeKey(start)
        const revealed = Array(25).fill(null)
        const next: CnPub = { ...pub, phase: 'clue', words, revealed, start, turn: start, clue: null, history: [], guessesLeft: 0, guessed: 0, remaining: remaining(key, revealed), winner: null, reason: null }
        return { pub: next, secret: { key }, priv: { [pub.spies.red!]: { key }, [pub.spies.blue!]: { key } } }
      }
      case 'clue': {
        if (pub.phase !== 'clue' || pid !== pub.spies[pub.turn]) return { error: 'Ce n’est pas ton tour d’espion.' }
        const n = a.n === 'inf' ? UNLIMITED : Number(a.n)
        if (!Number.isInteger(n) || n < 0 || (n > 9 && n !== UNLIMITED)) return { error: 'Nombre invalide.' }
        const visible = pub.words.filter((_, i) => !pub.revealed[i])
        const err = validateClue(String(a.word ?? ''), visible)
        if (err) return { error: err }
        const word = String(a.word).trim()
        // 0 ou illimité : autant de mots qu'on veut (au moins un) ; sinon chiffre + 1
        const guessesLeft = n === 0 || n === UNLIMITED ? UNLIMITED : n + 1
        return { pub: { ...pub, phase: 'guess', clue: { word, n }, history: [...pub.history, { team: pub.turn, word, n }], guessesLeft, guessed: 0 }, secret }
      }
      case 'reveal': {
        if (pub.phase !== 'guess') return { error: 'Action impossible.' }
        if (myTeam !== pub.turn || isSpy) return { error: 'Ce n’est pas ton équipe.' }
        const i = Number(a.index)
        if (!Number.isInteger(i) || i < 0 || i > 24 || pub.revealed[i]) return { error: 'Carte invalide.' }
        const color = secret.key[i]
        const revealed = [...pub.revealed]
        revealed[i] = color
        const rem = remaining(secret.key, revealed)
        const base: CnPub = { ...pub, revealed, remaining: rem, guessed: pub.guessed + 1, guessesLeft: pub.guessesLeft - 1 }
        if (color === 'assassin') return finish(base, secret, other(pub.turn), 'assassin', ctx)
        if (rem.red === 0) return finish(base, secret, 'red', 'all', ctx)
        if (rem.blue === 0) return finish(base, secret, 'blue', 'all', ctx)
        if (color === pub.turn && base.guessesLeft > 0) return { pub: base, secret }
        return { pub: endTurn(base), secret }
      }
      case 'pass': {
        if (pub.phase !== 'guess' || myTeam !== pub.turn || isSpy) return { error: 'Action impossible.' }
        if (pub.guessed < 1) return { error: 'Désignez au moins un mot.' }
        return { pub: endTurn(pub), secret }
      }
      case 'again': {
        if (pub.phase !== 'end' || pid !== ctx.hostId) return { error: 'Seul l’hôte peut relancer.' }
        return { pub: { ...pub, phase: 'teams', words: [], revealed: [], clue: null, history: [], winner: null, reason: null }, secret: { key: [] } }
      }
      default:
        return { error: 'Action inconnue.' }
    }
  },
}

const endTurn = (p: CnPub): CnPub => ({ ...p, phase: 'clue', turn: other(p.turn), clue: null, guessesLeft: 0, guessed: 0 })

function finish(pub: CnPub, secret: CnSecret, winner: Team, reason: 'all' | 'assassin', ctx: { players: { id: string }[] }) {
  const loser = other(winner)
  // L'assassin coûte un nombre fixe ; sinon, mots restants (équipe perdante par défaut, voir config).
  const n = reason === 'assassin'
    ? sipsConfig.codenames.assassinSips
    : pub.remaining[sipsConfig.codenames.remainingOf === 'winner' ? winner : loser] * sipsConfig.codenames.perRemainingWord
  const sips = n > 0
    ? ctx.players.filter((p) => pub.teams[p.id] === loser).map((p) => drink(p.id, n, 'codenames', reason === 'assassin' ? 'Assassin !' : `${pub.remaining[loser]} mot(s) restant(s)`))
    : []
  return { pub: { ...pub, phase: 'end' as Phase, winner, reason, revealed: secret.key.map((c) => c) }, secret, sips }
}
