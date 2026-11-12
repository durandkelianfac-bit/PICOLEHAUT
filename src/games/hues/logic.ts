// Hues and Cues — logique pure (testable). Règles : docs/regles/Hues_and_Cues_ITA.pdf
export const ROWS = 16
export const COLS = 30
export type Cell = [number, number] // [ligne, colonne], 0-indexés

export const rowLabel = (r: number) => String.fromCharCode(65 + r)
export const cellLabel = ([r, c]: Cell) => `${rowLabel(r)}${c + 1}`
export const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1]

/** Notre propre palette : teinte selon la colonne, clair → sombre selon la ligne. */
export function cellColor([r, c]: Cell): string {
  const hue = (c / COLS) * 360
  const light = 90 - r * (76 / (ROWS - 1))
  const sat = 55 + 40 * Math.sin((Math.PI * r) / (ROWS - 1))
  return `hsl(${hue.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}%)`
}

/** Une cible doit avoir son cadre 3×3 entièrement sur le plateau. */
export const isValidTarget = ([r, c]: Cell) => r >= 1 && r <= ROWS - 2 && c >= 1 && c <= COLS - 2

export function randomOptions(n = 4, rand: () => number = Math.random): Cell[] {
  const out: Cell[] = []
  while (out.length < n) {
    const cell: Cell = [1 + Math.floor(rand() * (ROWS - 2)), 1 + Math.floor(rand() * (COLS - 2))]
    if (!out.some((o) => same(o, cell))) out.push(cell)
  }
  return out
}

/** Distance de Chebyshev : 0 = case exacte, 1 = cadre 3×3, 2 = couronne autour du cadre. */
export const dist = (a: Cell, b: Cell) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))
export const inFrame = (target: Cell, t: Cell) => dist(target, t) <= 1

export function tokenPoints(target: Cell, t: Cell): number {
  const d = dist(target, t)
  return d === 0 ? 3 : d === 1 ? 2 : d === 2 ? 1 : 0
}

/** Points d'une manche. Donneur : 1 pt par pion dans le cadre (×2 à 3 joueurs). */
export function scoreRound(giverId: string, target: Cell, tokens: Record<string, (Cell | null)[]>, playerCount: number): Record<string, number> {
  const pts: Record<string, number> = { [giverId]: 0 }
  for (const [pid, list] of Object.entries(tokens)) {
    if (pid === giverId) continue
    pts[pid] = 0
    for (const t of list) {
      if (!t) continue
      pts[pid] += tokenPoints(target, t)
      if (inFrame(target, t)) pts[giverId] += playerCount === 3 ? 2 : 1
    }
  }
  return pts
}

/** 3-6 joueurs : chacun donne 2 fois. 7+ : une fois. */
export function giverSequence(order: string[]): string[] {
  const reps = order.length >= 7 ? 1 : 2
  return Array.from({ length: reps }, () => order).flat()
}

/** Ordre des devineurs : sens horaire à partir du joueur après le donneur. */
export function guesserOrder(order: string[], giverId: string, reverse = false): string[] {
  const i = order.indexOf(giverId)
  const list = [...order.slice(i + 1), ...order.slice(0, i)]
  return reverse ? list.reverse() : list
}

/** Départage : joueurs au meilleur score. */
export function leaders(totals: Record<string, number>): string[] {
  const max = Math.max(...Object.values(totals))
  return Object.keys(totals).filter((k) => totals[k] === max)
}

const COLOR_WORDS = ['violet', 'violette', 'bleu', 'bleue', 'vert', 'verte', 'rouge', 'rose', 'jaune', 'orange', 'marron', 'blanc', 'blanche', 'noir', 'noire', 'gris', 'grise']
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

/** Valide un indice (1 mot, ou 1-2 mots pour le 2e indice). Retourne un message d'erreur ou null. */
export function validateClue(text: string, maxWords: 1 | 2, used: string[]): string | null {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'Indice vide.'
  if (words.length > maxWords) return maxWords === 1 ? 'Un seul mot.' : 'Deux mots maximum.'
  for (const w of words) {
    const n = norm(w)
    if (COLOR_WORDS.includes(n)) return `« ${w} » est un nom de couleur.`
    if (/^\d+$/.test(n) || /^[a-p]\d{1,2}$/.test(n)) return 'Pas de coordonnées.'
  }
  const full = norm(words.join(' '))
  if (used.some((u) => norm(u) === full)) return 'Indice déjà utilisé.'
  return null
}
