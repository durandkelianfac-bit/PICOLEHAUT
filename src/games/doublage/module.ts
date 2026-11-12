import type { GameModule } from '../types'
import { give, type SipEvent } from '../../lib/sips'
import { sipsConfig } from '../../config/sips.config'
import { type Clip, assignLines, parseClip, tally } from './logic'

export type Phase = 'setup' | 'watch' | 'record' | 'replay' | 'vote' | 'result'
export interface DoublagePub {
  phase: Phase
  order: string[]
  clip: Clip | null
  assignees: string[] // joueur de chaque réplique
  words: Record<number, string[]> // mots des trous, par réplique (publics : ils servent aux sous-titres)
  submitted: number[] // répliques dont l'audio a été envoyé
  replayN: number // incrémenté à chaque lancement du montage
  voted: string[]
  result: { counts: Record<string, number>; winners: string[] } | null
}
export interface DoublageSecret { votes: Record<string, string> }

const blank = (order: string[]): DoublagePub => ({ phase: 'setup', order, clip: null, assignees: [], words: {}, submitted: [], replayN: 0, voted: [], result: null })

export const doublage: GameModule<DoublagePub, DoublageSecret> = {
  id: 'doublage',
  min: 2,
  max: 10,

  init({ players }) {
    return { pub: blank(players.map((p) => p.id)), secret: { votes: {} } }
  },

  reduce(pub, secret, a, pid, ctx) {
    const isHost = pid === ctx.hostId
    const sips: SipEvent[] = []
    const out = (p: DoublagePub, s: DoublageSecret = secret) => ({ pub: p, secret: s, sips: sips.length ? sips : undefined })
    const err = (error: string) => ({ error })

    switch (a.type) {
      case 'begin': {
        if (pub.phase !== 'setup' || !isHost) return err('Seul l’hôte peut commencer.')
        const clips = (ctx.packs.doublage?.categories ?? [])
          .filter((c) => c.enabled).flatMap((c) => c.items.map((i) => parseClip(i.text))).filter((c): c is Clip => !!c)
        if (!clips.length) return err('Aucun extrait valide dans le pack « Doublage » (voir « Packs »).')
        // un extrait précis peut être demandé (index dans la liste valide), sinon au hasard
        const clip = clips[Number.isInteger(a.index) && a.index >= 0 && a.index < clips.length ? a.index : Math.floor(Math.random() * clips.length)]
        return out({ ...blank(pub.order), phase: 'watch', clip, assignees: assignLines(clip.lines.length, pub.order) }, { votes: {} })
      }
      case 'record': {
        if (pub.phase !== 'watch' || !isHost) return err('Action impossible.')
        return out({ ...pub, phase: 'record' })
      }
      case 'submit': {
        if (pub.phase !== 'record' || !pub.clip) return err('Action impossible.')
        const i = Number(a.line)
        if (!Number.isInteger(i) || pub.assignees[i] !== pid) return err('Ce n’est pas ta réplique.')
        const need = pub.clip.lines[i].blanks
        const words = (Array.isArray(a.words) ? a.words : []).map((w: unknown) => String(w ?? '').trim().slice(0, 40)).slice(0, need)
        if (need > 0 && words.filter(Boolean).length < need) return err('Remplis tous les trous.')
        return out({ ...pub, words: { ...pub.words, [i]: words }, submitted: pub.submitted.includes(i) ? pub.submitted : [...pub.submitted, i] })
      }
      case 'replay': {
        if (!['record', 'replay', 'vote'].includes(pub.phase) || !isHost || !pub.clip) return err('Action impossible.')
        if (pub.submitted.length < pub.clip.lines.length) return err('Toutes les répliques ne sont pas enregistrées.')
        return out({ ...pub, phase: pub.phase === 'vote' ? 'vote' : 'replay', replayN: pub.replayN + 1 })
      }
      case 'tovote': {
        if (pub.phase !== 'replay' || !isHost) return err('Action impossible.')
        return out({ ...pub, phase: 'vote' })
      }
      case 'vote': {
        if (pub.phase !== 'vote' || !pub.order.includes(pid)) return err('Action impossible.')
        if (pub.voted.includes(pid)) return err('Tu as déjà voté.')
        const target = String(a.for ?? '')
        if (!pub.order.includes(target) || target === pid) return err('Vote invalide.')
        const votes = { ...secret.votes, [pid]: target }
        const voted = [...pub.voted, pid]
        if (voted.length < pub.order.length) return out({ ...pub, voted }, { votes })
        const result = tally(votes, pub.order)
        // le plus drôle (élu en secret) distribue les gorgées
        for (const w of result.winners) sips.push(give(w, sipsConfig.doublage.funniestGives, 'doublage', 'Le plus drôle'))
        return out({ ...pub, voted, phase: 'result', result }, { votes })
      }
      case 'again': {
        if (pub.phase !== 'result' || !isHost) return err('Seul l’hôte peut relancer.')
        return out(blank(pub.order), { votes: {} })
      }
      default:
        return err('Action inconnue.')
    }
  },
}
