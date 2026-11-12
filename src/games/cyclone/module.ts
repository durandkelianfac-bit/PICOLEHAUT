import type { GameModule } from '../types'
import { drink, give, type SipEvent } from '../../lib/sips'
import { type CycloneCard, type Level, collectCards, fillText, shuffle } from './logic'

export interface CyclonePub {
  phase: 'setup' | 'play' | 'end'
  levels: Level[]
  order: string[]
  turn: number
  card: CycloneCard | null // carte tirée (texte déjà complété)
  left: number
  count: number // cartes jouées
}
export interface CycloneSecret { deck: CycloneCard[] }

const blank = (order: string[], levels: Level[] = [1, 2]): CyclonePub => ({ phase: 'setup', levels, order, turn: 0, card: null, left: 0, count: 0 })

export const cyclone: GameModule<CyclonePub, CycloneSecret> = {
  id: 'cyclone',
  min: 2,
  max: 12,

  init({ players }) {
    return { pub: blank(players.map((p) => p.id)), secret: { deck: [] } }
  },

  reduce(pub, secret, a, pid, ctx) {
    const isHost = pid === ctx.hostId
    const cur = pub.order[pub.turn]
    const sips: SipEvent[] = []
    const out = (p: CyclonePub, s: CycloneSecret = secret) => ({ pub: p, secret: s, sips: sips.length ? sips : undefined })
    const err = (error: string) => ({ error })
    const nextTurn = (p: CyclonePub): ReturnType<typeof out> =>
      secret.deck.length === 0
        ? out({ ...p, phase: 'end', card: null, left: 0 })
        : out({ ...p, turn: (p.turn + 1) % p.order.length, card: null, left: secret.deck.length })

    switch (a.type) {
      case 'level': {
        if (pub.phase !== 'setup' || !isHost) return err('Seul l’hôte règle l’intensité.')
        const lv = Number(a.level) as Level
        if (![1, 2, 3].includes(lv)) return err('Intensité inconnue.')
        const levels = (a.on ? [...new Set([...pub.levels, lv])] : pub.levels.filter((l) => l !== lv)).sort() as Level[]
        return out({ ...pub, levels })
      }
      case 'begin': {
        if (pub.phase !== 'setup' || !isHost) return err('Seul l’hôte peut commencer.')
        if (!pub.levels.length) return err('Choisis au moins une intensité.')
        const cards = collectCards((ctx.packs.cyclone?.categories ?? []).map((c) => ({ ...c, name: c.name ?? '' })), pub.levels)
        if (cards.length < 1) return err('Aucune carte disponible avec ces réglages (voir « Packs »).')
        const deck = shuffle(cards)
        return out({ ...blank(pub.order, pub.levels), phase: 'play', left: deck.length }, { deck })
      }
      case 'draw': {
        if (pub.phase !== 'play' || pub.card || pid !== cur) return err('Ce n’est pas ton tour.')
        const deck = [...secret.deck]
        const card = deck.shift()!
        const names = ctx.players.map((p) => p.name)
        const me = ctx.players.find((p) => p.id === cur)?.name ?? ''
        return out({ ...pub, card: { ...card, text: fillText(card.text, me, names) }, left: deck.length, count: pub.count + 1 }, { deck })
      }
      case 'done': {
        if (pub.phase !== 'play' || !pub.card || (pid !== cur && !isHost)) return err('Action impossible.')
        // Action : le joueur distribue ; Gage et Vérité : fait sans gorgée
        if (pub.card.type === 'action' && pub.card.sips > 0) sips.push(give(cur, pub.card.sips, 'cyclone', 'Action'))
        return nextTurn(pub)
      }
      case 'pass': {
        if (pub.phase !== 'play' || !pub.card || pub.card.type === 'action' || (pid !== cur && !isHost)) return err('Action impossible.')
        if (pub.card.sips > 0) sips.push(drink(cur, pub.card.sips, 'cyclone', pub.card.type === 'gage' ? 'Gage refusé' : 'Vérité refusée'))
        return nextTurn(pub)
      }
      case 'again': {
        if (pub.phase !== 'end' || !isHost) return err('Seul l’hôte peut relancer.')
        return out(blank(pub.order, pub.levels), { deck: [] })
      }
      default:
        return err('Action inconnue.')
    }
  },
}
