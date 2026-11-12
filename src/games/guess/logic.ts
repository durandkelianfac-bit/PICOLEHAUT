// Guess the size — logique pure.
export interface SizeItem { name: string; size: number; emoji: string } // size en mètres
export const ROUNDS = 5
export const MAX_ROUND_SCORE = 100
export const RATIO_MIN = 0.02 // le curseur couvre de 0,02× à 50× la référence (échelle logarithmique)
export const RATIO_MAX = 50

/** Une ligne de pack « Nom | taille en m | emoji ». Retourne null si la ligne est invalide. */
export function parseItem(text: string): SizeItem | null {
  const [name, size, emoji] = text.split('|').map((x) => x.trim())
  const n = Number(size?.replace(',', '.'))
  if (!name || !Number.isFinite(n) || n <= 0) return null
  return { name, size: n, emoji: emoji || '❓' }
}

export const fmtSize = (m: number): string => {
  if (m < 0.1) return `${+(m * 100).toFixed(2)} cm`.replace('.', ',')
  if (m < 1) return `${+(m * 100).toFixed(1)} cm`.replace('.', ',')
  return `${+m.toFixed(2)} m`.replace('.', ',')
}

/** Score : écart relatif e = |estimé − réel| / réel ; 100 × e^(−3e) (courbe dégressive), arrondi. */
export function scoreGuess(guess: number, real: number): number {
  const e = Math.abs(guess - real) / real
  return Math.round(MAX_ROUND_SCORE * Math.exp(-3 * e))
}

/** Curseur 0-1 → ratio (échelle logarithmique) et inversement. */
export const sliderToRatio = (t: number) => RATIO_MIN * Math.pow(RATIO_MAX / RATIO_MIN, t)
export const ratioToSlider = (r: number) => Math.log(r / RATIO_MIN) / Math.log(RATIO_MAX / RATIO_MIN)

export interface Round { target: SizeItem; ref: SizeItem }

/** Tire `n` manches : une cible et une référence de taille voisine (entre 1/10× et 10×). */
export function pickRounds(items: SizeItem[], n = ROUNDS, rand: () => number = Math.random): Round[] | null {
  const shuffled = [...items].sort(() => rand() - 0.5)
  if (shuffled.length < n) return null
  const rounds: Round[] = []
  for (const target of shuffled.slice(0, n)) {
    const near = items.filter((i) => i !== target && i.size / target.size <= 10 && i.size / target.size >= 0.1)
    const pool = near.length ? near : items.filter((i) => i !== target)
    if (!pool.length) return null
    rounds.push({ target, ref: pool[Math.floor(rand() * pool.length)] })
  }
  return rounds
}

/** Le plus proche (écart relatif minimal) et le plus éloigné ; vide si tout le monde est à égalité. */
export function extremes(errors: Record<string, number>): { closest: string[]; farthest: string[] } {
  const vals = Object.values(errors)
  if (vals.length < 2) return { closest: [], farthest: [] }
  const min = Math.min(...vals), max = Math.max(...vals)
  if (min === max) return { closest: [], farthest: [] }
  const ids = Object.keys(errors)
  return { closest: ids.filter((i) => errors[i] === min), farthest: ids.filter((i) => errors[i] === max) }
}
