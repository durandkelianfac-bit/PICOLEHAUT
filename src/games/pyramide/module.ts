import type { GameModule } from '../types'
import { drink, give, type SipEvent } from '../../lib/sips'
import { sipsConfig } from '../../config/sips.config'
import {
  type Card, type Options, type RbAnswer, PYRAMID_SIZE, buildDeck, defaultOptions, floorSips, handSize, holds,
  normalizeOptions, pickHorizontal, rbCorrect, shuffle, validAlloc,
} from './logic'

export type Phase = 'setup' | 'rb' | 'memo' | 'flip' | 'claim' | 'distribute' | 'accuse' | 'declare' | 'end'
export interface Shown { i: number; card: Card }
export interface PyPub {
  phase: Phase
  opts: Options
  order: string[]
  pyramid: (Card | null)[] // cartes déjà retournées
  horizontal: boolean[]
  cursor: number // prochaine carte à retourner
  current: number // carte en jeu (-1 si aucune)
  shown: Record<string, Shown[]> // cartes montrées publiquement
  ready: string[]
  peeked: string[]
  deadline: number | null
  claim: { by: string; value: number } | null
  dist: { from: string; total: number; kind: 'rb' | 'claim' } | null
  accuse: { claimer: string; value: number; alloc: Record<string, number>; pending: string[] } | null
  declare: { target: string } | null
  rb: { idx: number; q: number; cards: Card[] } | null
  message: string
  finalHands: Record<string, Card[]> | null
}
export interface PySecret { hands: Record<string, Card[]>; pyramid: Card[]; deck: Card[] }

const cfg = sipsConfig.pyramide
const MEMO_MS = 25000
const SPEED_MS = 5000

const emptyPub = (opts: Options, order: string[]): PyPub => ({
  phase: 'setup', opts, order, pyramid: Array(PYRAMID_SIZE).fill(null), horizontal: [], cursor: 0, current: -1, shown: {},
  ready: [], peeked: [], deadline: null, claim: null, dist: null, accuse: null, declare: null, rb: null, message: '', finalHands: null,
})

export const pyramide: GameModule<PyPub, PySecret> = {
  id: 'pyramide',
  min: 3,
  max: 10,

  init({ players }) {
    return { pub: emptyPub(defaultOptions, players.map((p) => p.id)), secret: { hands: {}, pyramid: [], deck: [] } }
  },

  privFor(pub, secret, pid) {
    const hand = secret.hands[pid]
    return hand?.length ? { hand } : undefined
  },

  reduce(pub, secret, a, pid, ctx) {
    const isHost = pid === ctx.hostId
    const sips: SipEvent[] = []
    const out = (p: PyPub, s: PySecret = secret, priv?: Record<string, unknown>) => ({ pub: p, secret: s, sips: sips.length ? sips : undefined, priv })
    const err = (error: string) => ({ error })
    const others = (id: string) => pub.order.filter((x) => x !== id)

    /** Passe à la carte suivante, ou termine la partie. */
    const advance = (p: PyPub, message: string): PyPub => {
      const base = { ...p, claim: null, dist: null, accuse: null, declare: null, deadline: null, message }
      return p.cursor >= PYRAMID_SIZE ? { ...base, phase: 'end', finalHands: secret.hands } : { ...base, phase: 'flip' }
    }
    const nameOf = (id: string) => ctx.players.find((p) => p.id === id)?.name ?? '?'

    switch (a.type) {
      case 'opt': {
        if (pub.phase !== 'setup' || !isHost) return err('Seul l’hôte règle les options.')
        if (!(a.key in defaultOptions)) return err('Option inconnue.')
        const opts = normalizeOptions({ ...pub.opts, [a.key]: a.value } as Options)
        return out({ ...pub, opts })
      }
      case 'begin': {
        if (pub.phase !== 'setup' || !isHost) return err('Seul l’hôte peut commencer.')
        const opts = normalizeOptions(pub.opts)
        const order = ctx.players.map((p) => p.id)
        if (order.length < 3 || order.length > 10) return err('La Pyramide se joue de 3 à 10 joueurs.')
        const deck = buildDeck(order.length, opts)
        // la pyramide ne contient pas de joker
        const pyramid = deck.filter((c) => c.v !== 0).slice(0, PYRAMID_SIZE)
        const rest = [...deck]
        for (const c of pyramid) rest.splice(rest.indexOf(c), 1)
        const hands: Record<string, Card[]> = {}
        const h = opts.horizontal ? pickHorizontal() : []
        let next: PyPub = { ...emptyPub(opts, order), horizontal: Array.from({ length: PYRAMID_SIZE }, (_, i) => h.includes(i)) }
        if (opts.method === 'A') {
          const n = handSize(opts)
          for (const id of order) hands[id] = rest.splice(0, n)
          next = { ...next, phase: 'memo', deadline: Date.now() + MEMO_MS }
          return out(next, { hands, pyramid, deck: rest }, Object.fromEntries(order.map((id) => [id, { hand: hands[id] }])))
        }
        for (const id of order) hands[id] = []
        next = { ...next, phase: 'rb', rb: { idx: 0, q: 0, cards: [] } }
        return out(next, { hands, pyramid, deck: rest })
      }
      case 'rb': {
        if (pub.phase !== 'rb' || !pub.rb) return err('Action impossible.')
        const who = pub.order[pub.rb.idx]
        if (pid !== who) return err('Ce n’est pas ton tour.')
        const valid = [['red', 'black'], ['more', 'less'], ['inside', 'outside'], ['S', 'H', 'D', 'C']][pub.rb.q]
        if (!valid.includes(a.answer)) return err('Réponse invalide.')
        const deck = [...secret.deck]
        const card = deck.shift()!
        const cards = [...pub.rb.cards, card]
        const q = pub.rb.q
        const ok = rbCorrect(q, a.answer as RbAnswer, cards)
        const stake = q + 1 // 1 / 2 / 3 / 4
        const hands = { ...secret.hands, [who]: cards }
        const shown = { ...pub.shown }
        const s2 = { ...secret, deck, hands }
        const last = q === 3
        if (!ok) {
          sips.push(drink(who, stake, 'pyramide', `Rouge ou noir, question ${q + 1} ratée`))
          const adv = advanceRb({ ...pub, shown }, cards, last, ctx.players.length)
          return out(adv.pub, s2, adv.priv ? { [who]: { hand: cards } } : undefined)
        }
        // bonne réponse : distribuer
        const base: PyPub = { ...pub, rb: { ...pub.rb, cards }, phase: 'distribute', dist: { from: who, total: stake, kind: 'rb' }, message: `${nameOf(who)} a bon (${stake})`, }
        return out(base, s2)
      }
      case 'distribute': {
        if (pub.phase !== 'distribute' || !pub.dist || pid !== pub.dist.from) return err('Action impossible.')
        const alloc = (a.alloc ?? {}) as Record<string, number>
        if (!validAlloc(alloc, pub.dist.total, others(pid))) return err(`Répartis exactement ${pub.dist.total}.`)
        sips.push(give(pid, pub.dist.total, 'pyramide', pub.dist.kind === 'rb' ? 'Rouge ou noir' : 'Pyramide'))
        if (pub.dist.kind === 'rb') {
          for (const [id, n] of Object.entries(alloc)) if (n > 0) sips.push(drink(id, n, 'pyramide', 'Rouge ou noir'))
          const cards = pub.rb!.cards
          const adv = advanceRb({ ...pub, phase: 'rb', dist: null }, cards, cards.length === 4, ctx.players.length)
          return out(adv.pub, secret, adv.priv ? { [pid]: { hand: cards } } : undefined)
        }
        const targets = Object.keys(alloc).filter((id) => alloc[id] > 0)
        return out({ ...pub, phase: 'accuse', dist: null, accuse: { claimer: pid, value: pub.claim!.value, alloc, pending: targets }, message: `${nameOf(pid)} distribue ${pub.dist.total}` })
      }
      case 'ready': {
        if (pub.phase !== 'memo') return err('Action impossible.')
        const ready = pub.ready.includes(pid) ? pub.ready : [...pub.ready, pid]
        return out(ready.length >= pub.order.length ? { ...pub, ready, phase: 'flip', deadline: null, message: 'Tout le monde est prêt.' } : { ...pub, ready })
      }
      case 'endmemo': {
        if (pub.phase !== 'memo' || (!isHost && Date.now() < (pub.deadline ?? 0))) return err('Action impossible.')
        return out({ ...pub, phase: 'flip', deadline: null })
      }
      case 'flip': {
        if (pub.phase !== 'flip' || !isHost) return err('Seul l’hôte retourne la carte.')
        const index = pub.cursor
        const card = secret.pyramid[index]
        const pyr = [...pub.pyramid]
        pyr[index] = card
        return out({
          ...pub, pyramid: pyr, cursor: index + 1, current: index, phase: 'claim', claim: null, message: '',
          deadline: pub.opts.speed ? Date.now() + SPEED_MS : null,
        })
      }
      case 'claim': {
        if (pub.phase !== 'claim' || pub.claim) return err('Trop tard !')
        if (pub.deadline && Date.now() > pub.deadline + 800) return err('Trop tard !')
        const value = pub.pyramid[pub.current]!.v
        const total = floorSips(pub.current, cfg.perFloor, pub.opts, pub.horizontal)
        return out({ ...pub, claim: { by: pid, value }, phase: 'distribute', dist: { from: pid, total, kind: 'claim' }, deadline: null, message: `${nameOf(pid)} a la carte` })
      }
      case 'burn': {
        if (pub.phase !== 'claim' || pub.claim) return err('Action impossible.')
        const late = pub.deadline !== null && Date.now() >= pub.deadline - 100
        if (!isHost && !late) return err('Action impossible.')
        return out(advance(pub, 'Carte brûlée : personne ne la revendique.'))
      }
      case 'respond': {
        const ac = pub.accuse
        if (pub.phase !== 'accuse' || !ac || !ac.pending.includes(pid)) return err('Action impossible.')
        const pending = ac.pending.filter((x) => x !== pid)
        const n = ac.alloc[pid]
        if (a.choice === 'accept') {
          sips.push(drink(pid, n, 'pyramide', 'Accepté'))
          const next = { ...pub, accuse: { ...ac, pending } }
          return out(pending.length ? next : advance(next, `${nameOf(pid)} accepte`))
        }
        if (a.choice !== 'liar') return err('Choix invalide.')
        if (pub.opts.bluffTotal) return out({ ...pub, phase: 'declare', declare: { target: pid }, message: `${nameOf(pid)} crie « Menteur ! »` })
        const hand = secret.hands[ac.claimer] ?? []
        const had = holds(hand, ac.value, pub.opts.jokers)
        // révéler UNE carte : une carte qui prouve, sinon une carte cachée au hasard
        const shownIdx = (pub.shown[ac.claimer] ?? []).map((s) => s.i)
        const alreadyProves = (pub.shown[ac.claimer] ?? []).some((s) => s.card.v === ac.value || (pub.opts.jokers && s.card.v === 0))
        let shown = pub.shown
        if (!(had && alreadyProves)) {
          const hidden = hand.map((c, i) => i).filter((i) => !shownIdx.includes(i))
          const proving = hidden.filter((i) => hand[i].v === ac.value || (pub.opts.jokers && hand[i].v === 0))
          const pick = (had ? proving : shuffle(hidden))[0]
          if (pick !== undefined) shown = { ...shown, [ac.claimer]: [...(shown[ac.claimer] ?? []), { i: pick, card: hand[pick] }] }
        }
        return out(resolve({ ...pub, shown }, pid, had), secret)
      }
      case 'declare': {
        if (pub.phase !== 'declare' || !pub.declare || !pub.accuse || pid !== pub.accuse.claimer) return err('Action impossible.')
        return out(resolve({ ...pub }, pub.declare.target, !!a.had), secret)
      }
      case 'peek': {
        if (!pub.opts.consult || pub.phase === 'setup' || pub.phase === 'rb' || pub.phase === 'end') return err('Consultation impossible.')
        if (pub.peeked.includes(pid)) return err('Tu as déjà consulté tes cartes.')
        const hand = secret.hands[pid]
        if (!hand?.length) return err('Pas de cartes.')
        sips.push(drink(pid, cfg.consultationCost, 'pyramide', 'Consultation'))
        return out({ ...pub, peeked: [...pub.peeked, pid] }, secret, { [pid]: { hand, peekAt: Date.now() } })
      }
      case 'again': {
        if (pub.phase !== 'end' || !isHost) return err('Seul l’hôte peut relancer.')
        return out(emptyPub(pub.opts, pub.order), { hands: {}, pyramid: [], deck: [] })
      }
      default:
        return err('Action inconnue.')
    }

    /** Résout une accusation : celui qui a tort prend le double des pénalités de la part concernée. */
    function resolve(p: PyPub, target: string, had: boolean): PyPub {
      const ac = p.accuse!
      const n = ac.alloc[target] * cfg.accusationMultiplier
      const loser = had ? target : ac.claimer
      sips.push(drink(loser, n, 'pyramide', had ? 'Accusation à tort' : 'Menteur !'))
      const pending = ac.pending.filter((x) => x !== target)
      const msg = had ? `${nameOf(ac.claimer)} avait la carte : ${nameOf(target)} boit ${n}` : `${nameOf(ac.claimer)} a menti : il boit ${n}`
      const next: PyPub = { ...p, phase: 'accuse', declare: null, accuse: { ...ac, pending }, message: msg }
      return pending.length ? next : advance(next, msg)
    }
  },
}

/** Fin d'une question « Rouge ou noir » : question suivante, joueur suivant, ou début du jeu. */
function advanceRb(pub: PyPub, cards: Card[], lastQuestion: boolean, players: number): { pub: PyPub; priv: boolean } {
  const rb = pub.rb!
  if (!lastQuestion) return { pub: { ...pub, phase: 'rb', dist: null, rb: { ...rb, q: rb.q + 1, cards } }, priv: false }
  const who = pub.order[rb.idx]
  const shown = { ...pub.shown, [who]: [] }
  if (rb.idx + 1 < players) return { pub: { ...pub, phase: 'rb', dist: null, shown, rb: { idx: rb.idx + 1, q: 0, cards: [] } }, priv: true }
  return { pub: { ...pub, phase: 'memo', dist: null, rb: null, shown, deadline: Date.now() + MEMO_MS, message: '' }, priv: true }
}
