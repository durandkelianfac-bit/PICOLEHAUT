import type { GameModule } from '../types'
import { drink, give, type SipEvent } from '../../lib/sips'
import { sipsConfig } from '../../config/sips.config'
import { type Card, shuffle, validAlloc } from '../pyramide/logic'
import { EIGHT_TEXTS, effectOf, newDeck, tenResult } from './logic'

export type Step = 'draw' | 'resolve' | 'place' | 'done'
export type Need = 'give' | 'rule' | 'ten' | 'target' | null
export interface PalPub {
  phase: 'setup' | 'play' | 'end'
  tower: boolean // mini-jeu de la tour (écran table)
  order: string[]
  turn: number
  step: Step
  card: Card | null
  need: Need
  eight: string | null
  held: { jack: string | null; king: string | null } // valet et roi gardés
  rule: { by: string; text: string } | null // règle du 9, jusqu'à remplacement
  banner: string
  deckLeft: number
  collapses: number
  towerHeight: number
}
export interface PalSecret { deck: Card[]; returned: Card[] }

const cfg = sipsConfig.palmier
/** Nombre de cartes face cachée proposées au tirage. */
export const SPREAD = 8
const empty = (order: string[], tower = false): PalPub => ({
  phase: 'setup', tower, order, turn: 0, step: 'draw', card: null, need: null, eight: null,
  held: { jack: null, king: null }, rule: null, banner: '', deckLeft: 52, collapses: 0, towerHeight: 0,
})

export const palmier: GameModule<PalPub, PalSecret> = {
  id: 'palmier',
  min: 3,
  max: 10,

  init({ players }) {
    return { pub: empty(players.map((p) => p.id)), secret: { deck: [], returned: [] } }
  },

  reduce(pub, secret, a, pid, ctx) {
    const isHost = pid === ctx.hostId
    const cur = pub.order[pub.turn]
    const sips: SipEvent[] = []
    const name = (id: string) => ctx.players.find((p) => p.id === id)?.name ?? '?'
    const out = (p: PalPub, s: PalSecret = secret) => ({ pub: p, secret: s, sips: sips.length ? sips : undefined })
    const err = (error: string) => ({ error })
    const after = (p: PalPub): PalPub => ({ ...p, need: null, step: p.tower ? 'place' : 'done' })
    const nextTurn = (p: PalPub, s: PalSecret): ReturnType<typeof out> => {
      if (s.deck.length === 0) return out({ ...p, phase: 'end', step: 'draw', card: null, need: null, deckLeft: 0 }, s)
      return out({ ...p, turn: (p.turn + 1) % p.order.length, step: 'draw', card: null, need: null, eight: null, deckLeft: s.deck.length }, s)
    }

    switch (a.type) {
      case 'opt': {
        if (pub.phase !== 'setup' || !isHost) return err('Seul l’hôte règle les options.')
        return out({ ...pub, tower: !!a.tower })
      }
      case 'begin': {
        if (pub.phase !== 'setup' || !isHost) return err('Seul l’hôte peut commencer.')
        const order = ctx.players.map((p) => p.id)
        if (order.length < 3 || order.length > 10) return err('Le Palmier se joue de 3 à 10 joueurs.')
        const deck = newDeck()
        return out({ ...empty(order, pub.tower), phase: 'play', deckLeft: deck.length }, { deck, returned: [] })
      }
      case 'draw': {
        if (pub.phase !== 'play' || pub.step !== 'draw' || pid !== cur) return err('Ce n’est pas ton tour.')
        // le joueur choisit UNE carte parmi l'éventail de cartes face cachée posé devant tout le monde
        const idx = a.index === undefined ? 0 : Number(a.index)
        if (!Number.isInteger(idx) || idx < 0 || idx >= Math.min(SPREAD, secret.deck.length)) return err('Choisis une carte de l’éventail.')
        const deck = [...secret.deck]
        const [card] = deck.splice(idx, 1)
        let held = pub.held
        let p: PalPub = { ...pub, card, step: 'resolve', need: null, eight: null, deckLeft: deck.length, banner: '' }
        let s: PalSecret = { ...secret, deck }
        const e = effectOf(card)
        switch (e) {
          case 'low-red': p = { ...p, need: 'give' }; break
          case 'low-black': sips.push(drink(cur, card.v * cfg.lowPerValue, 'palmier', `Carte noire (${card.v})`)); p = after(p); break
          case 'seven': p = after(p); break
          case 'eight': p = after({ ...p, eight: EIGHT_TEXTS[Math.floor(Math.random() * 2)] }); break
          case 'nine': p = { ...p, need: 'rule' }; break
          case 'ten': p = { ...p, need: 'ten' }; break
          case 'queen':
            for (const id of pub.order) sips.push(drink(id, cfg.queenSips, 'palmier', 'Dame : tout le monde boit'))
            p = after(p); break
          case 'jack':
          case 'king': {
            // la carte reste devant le joueur jusqu'à ce qu'un autre valet (ou roi) sorte
            const slot = e === 'jack' ? 'jack' : 'king'
            const prev = held[slot]
            held = { ...held, [slot]: cur }
            if (prev) {
              // l'ancienne carte retourne dans le paquet
              const back = { ...card }
              s = { ...s, deck: shuffle([...deck, back]) }
              p = { ...p, deckLeft: s.deck.length }
            }
            p = after({ ...p, held, banner: `${name(cur)} garde ${slot === 'jack' ? 'le Valet' : 'le Roi'}${prev && prev !== cur ? ` (reprise à ${name(prev)})` : ''}` })
            break
          }
          case 'ace-red': p = { ...p, need: 'target' }; break
          case 'ace-black': sips.push(drink(cur, cfg.culSec, 'palmier', 'As noir : cul sec', undefined, 'culsec')); p = after(p); break
        }
        return out(p, s)
      }
      case 'distribute': {
        if (pub.phase !== 'play' || pub.need !== 'give' || pid !== cur || !pub.card) return err('Action impossible.')
        const total = pub.card.v * cfg.lowPerValue
        const alloc = (a.alloc ?? {}) as Record<string, number>
        if (!validAlloc(alloc, total, pub.order.filter((id) => id !== pid))) return err(`Répartis exactement ${total}.`)
        sips.push(give(pid, total, 'palmier', `Carte rouge (${pub.card.v})`))
        for (const [id, n] of Object.entries(alloc)) if (n > 0) sips.push(drink(id, n, 'palmier', 'Carte rouge', pid))
        return out(after(pub))
      }
      case 'target': {
        if (pub.phase !== 'play' || pub.need !== 'target' || pid !== cur) return err('Action impossible.')
        if (!pub.order.includes(a.id) || a.id === pid) return err('Choisis quelqu’un d’autre.')
        sips.push(give(pid, cfg.culSec, 'palmier', 'As rouge'), drink(a.id, cfg.culSec, 'palmier', 'Cul sec !', pid, 'culsec'))
        return out(after(pub))
      }
      case 'rule': {
        if (pub.phase !== 'play' || pub.need !== 'rule' || pid !== cur) return err('Action impossible.')
        const text = String(a.text ?? '').trim().slice(0, 140)
        if (!text) return err('Écris une règle.')
        return out(after({ ...pub, rule: { by: cur, text }, banner: `Nouvelle règle de ${name(cur)}` }))
      }
      case 'ten': {
        if (pub.phase !== 'play' || pub.need !== 'ten' || pid !== cur) return err('Action impossible.')
        const maj = Number(a.majority), min = Number(a.minority)
        if (![maj, min].every((n) => Number.isInteger(n) && n >= 0) || maj + min > pub.order.length) return err('Nombres invalides.')
        const r = tenResult(maj, min)
        const banner = r.drinkers ? `${r.text} ${cfg.tenMinorityPerPerson}` : r.text
        return out(after({ ...pub, banner }))
      }
      case 'use': {
        if (pub.phase !== 'play') return err('Action impossible.')
        if (a.card !== 'jack' && a.card !== 'king') return err('Carte inconnue.')
        if (pub.held[a.card as 'jack' | 'king'] !== pid) return err('Tu n’as pas cette carte.')
        if (a.card === 'jack') return out({ ...pub, banner: `${name(pid)} joue le Valet : FREEZE ! Le dernier à poser le pouce boit.` })
        const text = String(a.text ?? '').trim().slice(0, 140)
        if (!text) return err('Écris ta règle.')
        return out({ ...pub, banner: `${name(pid)} (Roi) : ${text}` })
      }
      case 'decree': {
        // le roi, pendant son règne, envoie autant de gorgées qu'il veut au joueur de son choix
        if (pub.phase !== 'play') return err('Action impossible.')
        if (pub.held.king !== pid) return err('Tu n’es pas le roi.')
        const n = Number(a.n)
        if (!Number.isInteger(n) || n < 1 || n > 1_000_000) return err('Nombre invalide.')
        if (!pub.order.includes(a.to) || a.to === pid) return err('Choisis un autre joueur.')
        sips.push(give(pid, n, 'palmier', 'Décret du roi'), drink(a.to, n, 'palmier', 'Cadeau du roi', pid, 'royal'))
        return out({ ...pub, banner: `${name(pid)} offre ${n} à ${name(a.to)} !` })
      }
      case 'placed': {
        if (pub.phase !== 'play' || pub.step !== 'place' || (pid !== cur && !isHost)) return err('Action impossible.')
        return nextTurn({ ...pub, towerHeight: pub.towerHeight + 1 }, secret)
      }
      case 'collapsed': {
        if (pub.phase !== 'play' || pub.step !== 'place' || (pid !== cur && !isHost)) return err('Action impossible.')
        sips.push(drink(cur, cfg.towerCollapseSips, 'palmier', 'La tour s’effondre !'))
        return nextTurn({ ...pub, towerHeight: 0, collapses: pub.collapses + 1, banner: `La tour s’effondre ! ${name(cur)} boit ${cfg.towerCollapseSips}` }, secret)
      }
      case 'next': {
        if (pub.phase !== 'play' || pub.step !== 'done' || (pid !== cur && !isHost)) return err('Action impossible.')
        return nextTurn(pub, secret)
      }
      case 'again': {
        if (pub.phase !== 'end' || !isHost) return err('Seul l’hôte peut relancer.')
        return out(empty(pub.order, pub.tower), { deck: [], returned: [] })
      }
      default:
        return err('Action inconnue.')
    }
  },
}
