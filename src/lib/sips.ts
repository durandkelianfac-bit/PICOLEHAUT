// Moteur de gorgées : produit des événements "X distribue N" / "Y boit N"
// et leur libellé, en mode gorgées ou en mode "sans alcool" (points).
export type SipKind = 'give' | 'drink'
export interface SipEvent {
  id: string
  ts: number
  kind: SipKind
  playerId: string
  n: number
  game: string
  reason?: string
}
export type Mode = 'sips' | 'points'

let counter = 0
export function makeEvent(kind: SipKind, playerId: string, n: number, game: string, reason?: string): SipEvent {
  counter += 1
  return { id: `${Date.now().toString(36)}-${counter}`, ts: Date.now(), kind, playerId, n: Math.max(0, Math.round(n)), game, reason }
}

export const give = (playerId: string, n: number, game: string, reason?: string) => makeEvent('give', playerId, n, game, reason)
export const drink = (playerId: string, n: number, game: string, reason?: string) => makeEvent('drink', playerId, n, game, reason)

function unit(n: number, mode: Mode) {
  return mode === 'sips' ? (n > 1 ? 'gorgées' : 'gorgée') : (n > 1 ? 'points' : 'point')
}

export function formatEvent(e: SipEvent, name: string, sober: boolean): string {
  const u = unit(e.n, sober ? 'points' : 'sips')
  if (sober) return e.kind === 'give' ? `${name} distribue ${e.n} ${u}` : `${name} prend ${e.n} ${u}`
  return e.kind === 'give' ? `${name} distribue ${e.n} ${u}` : `${name} boit ${e.n} ${u}`
}

/** Historique : les plus récents d'abord, borné. */
export function pushHistory(history: SipEvent[], e: SipEvent, max = 100): SipEvent[] {
  return [e, ...history].slice(0, max)
}

/** Totaux par joueur (reçues / distribuées). */
export function totals(history: SipEvent[]) {
  const t: Record<string, { drunk: number; given: number }> = {}
  for (const e of history) {
    const r = (t[e.playerId] ??= { drunk: 0, given: 0 })
    if (e.kind === 'drink') r.drunk += e.n
    else r.given += e.n
  }
  return t
}
