// Doublage de film — logique pure.
// Ligne de pack : « lien ou id YouTube | début (s) | fin (s) | titre | at:réplique ## at:réplique … »
// - « at » = instant de la réplique dans l'extrait, en secondes depuis le début de l'extrait.
// - « ___ » marque un trou que le joueur remplit avec ses propres mots.
export interface DubLine { at: number; text: string; blanks: number }
export interface Clip { id: string; start: number; end: number; title: string; lines: DubLine[] }

export const BLANK = '___'

/** Extrait l'identifiant YouTube (11 caractères) d'un lien ou d'un identifiant. */
export function youtubeId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/)
  return m ? m[1] : null
}

export const countBlanks = (text: string) => text.split(BLANK).length - 1

export function parseClip(line: string): Clip | null {
  const parts = line.split('|').map((x) => x.trim())
  if (parts.length < 5) return null
  const [rawId, rawStart, rawEnd, title, ...rest] = parts
  const id = youtubeId(rawId)
  const start = Number(rawStart.replace(',', '.')), end = Number(rawEnd.replace(',', '.'))
  if (!id || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || !title) return null
  const lines: DubLine[] = []
  for (const chunk of rest.join('|').split('##')) {
    const m = chunk.trim().match(/^(\d+(?:[.,]\d+)?)\s*:\s*([\s\S]+)$/)
    if (!m) return null
    const at = Number(m[1].replace(',', '.'))
    if (at < 0 || at > end - start) return null
    lines.push({ at, text: m[2].trim(), blanks: countBlanks(m[2]) })
  }
  if (!lines.length) return null
  return { id, start, end, title, lines: lines.sort((a, b) => a.at - b.at) }
}

/** Répartit les répliques entre les joueurs (tour de rôle). */
export function assignLines(lines: number, players: string[]): string[] {
  return Array.from({ length: lines }, (_, i) => players[i % players.length])
}

/** Texte final : chaque « ___ » remplacé par les mots du joueur (ou laissé tel quel si non rempli). */
export function fillLine(text: string, words: string[]): string {
  let i = 0
  return text.replace(/___/g, () => (words[i++]?.trim() || '…'))
}

/** Dépouillement du vote : le plus de voix gagne ; égalité = plusieurs gagnants. */
export function tally(votes: Record<string, string>, players: string[]): { counts: Record<string, number>; winners: string[] } {
  const counts = Object.fromEntries(players.map((p) => [p, 0]))
  for (const target of Object.values(votes)) if (target in counts) counts[target]++
  const max = Math.max(0, ...Object.values(counts))
  return { counts, winners: max > 0 ? players.filter((p) => counts[p] === max) : [] }
}

/** Format audio pris en charge par ce navigateur (webm/opus sur Android, mp4 sur iOS). */
export function pickMime(isSupported: (m: string) => boolean): string {
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find(isSupported) ?? ''
}
