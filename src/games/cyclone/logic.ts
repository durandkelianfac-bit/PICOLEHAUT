// Cyclone — logique pure.
export type CardType = 'gage' | 'action' | 'verite'
export type Level = 1 | 2 | 3 // soft, moyen, épicé
export interface CycloneCard { type: CardType; level: Level; text: string; sips: number }

export const LEVEL_NAMES: Record<Level, string> = { 1: 'Soft', 2: 'Moyen', 3: 'Épicé' }
export const TYPE_NAMES: Record<CardType, string> = { gage: 'GAGE', action: 'ACTION', verite: 'VÉRITÉ' }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Le type vient du nom de la catégorie (Gage, Action, Vérité) ; une catégorie perso compte comme Gage. */
export function typeOfCategory(name: string): CardType {
  const n = norm(name)
  return n.includes('action') ? 'action' : n.includes('verite') ? 'verite' : 'gage'
}

/** Une ligne de pack « intensité | texte | gorgées ». Retourne null si invalide. */
export function parseCard(line: string, type: CardType): CycloneCard | null {
  const [lv, text, sips] = line.split('|').map((x) => x.trim())
  const level = Number(lv)
  if (![1, 2, 3].includes(level) || !text) return null
  const n = sips === undefined || sips === '' ? 0 : Number(sips)
  if (!Number.isInteger(n) || n < 0 || n > 20) return null
  return { type, level: level as Level, text, sips: n }
}

export interface CategoryLike { name: string; enabled: boolean; items: { text: string }[] }

/** Cartes des catégories actives, filtrées par intensité. */
export function collectCards(categories: CategoryLike[], levels: Level[]): CycloneCard[] {
  return categories
    .filter((c) => c.enabled)
    .flatMap((c) => c.items.map((i) => parseCard(i.text, typeOfCategory(c.name))))
    .filter((c): c is CycloneCard => !!c && levels.includes(c.level))
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/** Remplace {autre} par le nom d'un autre joueur que `me`. */
export function fillText(text: string, me: string, others: string[], rand: () => number = Math.random): string {
  const pool = others.filter((n) => n !== me)
  return text.replace(/\{autre\}/g, () => pool[Math.floor(rand() * pool.length)] ?? 'quelqu’un')
}
