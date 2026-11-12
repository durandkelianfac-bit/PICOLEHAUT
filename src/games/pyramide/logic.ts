// Pyramide — logique pure. Règles : docs/regles/pyramide.txt
export type Suit = 'S' | 'H' | 'D' | 'C' // pique, cœur, carreau, trèfle
export interface Card { v: number; s: Suit | 'J' } // v : 1 (as) → 13 (roi) ; v = 0 : joker
export const JOKER: Card = { v: 0, s: 'J' }

export interface Options {
  method: 'A' | 'B' // A : cartes données ; B : « Rouge ou noir »
  intense: boolean // pénalités ×2
  horizontal: boolean // 2-3 cartes horizontales : étage ×2
  bluffTotal: boolean // personne ne montre ses cartes
  sixCards: boolean // 6 cartes par joueur
  jokers: boolean // 2 jokers = n'importe quelle valeur
  speed: boolean // 5 s pour revendiquer
  consult: boolean // une consultation contre 2 gorgées
}
export const defaultOptions: Options = { method: 'A', intense: false, horizontal: false, bluffTotal: false, sixCards: false, jokers: false, speed: false, consult: false }

/** La méthode B donne exactement 4 cartes sans joker. */
export function normalizeOptions(o: Options): Options {
  return o.method === 'B' ? { ...o, sixCards: false, jokers: false } : o
}

export const FLOORS = [5, 4, 3, 2, 1] // étage 1 = base
export const PYRAMID_SIZE = 15
/** Étage (1 à 5) d'une carte de la pyramide (index 0 à 14, base d'abord, de gauche à droite). */
export function floorOf(index: number): number {
  let acc = 0
  for (let f = 0; f < FLOORS.length; f++) { acc += FLOORS[f]; if (index < acc) return f + 1 }
  return FLOORS.length
}

export const handSize = (o: Options) => (o.method === 'B' ? 4 : o.sixCards ? 6 : 4)

export function makeDeck(withJokers: boolean, copies = 1): Card[] {
  const out: Card[] = []
  for (let c = 0; c < copies; c++) {
    for (const s of ['S', 'H', 'D', 'C'] as Suit[]) for (let v = 1; v <= 13; v++) out.push({ v, s })
    if (withJokers) out.push({ ...JOKER }, { ...JOKER })
  }
  return out
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/** Deck mélangé assez grand pour distribuer les mains et la pyramide (2 jeux si besoin : 10 joueurs). */
export function buildDeck(players: number, o: Options, rand: () => number = Math.random): Card[] {
  const need = players * handSize(o) + PYRAMID_SIZE
  const single = makeDeck(o.jokers).length
  return shuffle(makeDeck(o.jokers, need > single ? 2 : 1), rand)
}

/** Tire des positions « horizontales » (2 ou 3) parmi les 14 premières cartes. */
export function pickHorizontal(rand: () => number = Math.random): number[] {
  const count = 2 + Math.floor(rand() * 2)
  return shuffle(Array.from({ length: PYRAMID_SIZE }, (_, i) => i), rand).slice(0, count).sort((a, b) => a - b)
}

export const holds = (hand: Card[], value: number, jokers: boolean) => hand.some((c) => c.v === value || (jokers && c.v === 0))

/** Pénalités de base d'une carte de la pyramide. */
export function floorSips(index: number, perFloor: readonly number[], o: Options, horizontal: boolean[]): number {
  let n = perFloor[floorOf(index) - 1]
  if (o.intense) n *= 2
  if (o.horizontal && horizontal[index]) n *= 2
  return n
}

export const VALUE_NAMES = ['', 'As', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Valet', 'Dame', 'Roi']
export const valueName = (v: number) => (v === 0 ? 'Joker' : VALUE_NAMES[v])
export const SUIT_SYMBOL: Record<Suit | 'J', string> = { S: '♠', H: '♥', D: '♦', C: '♣', J: '★' }
export const isRed = (c: Card) => c.s === 'H' || c.s === 'D'
export const cardLabel = (c: Card) => (c.v === 0 ? '★' : `${c.v === 1 ? 'A' : c.v === 11 ? 'V' : c.v === 12 ? 'D' : c.v === 13 ? 'R' : c.v}${SUIT_SYMBOL[c.s]}`)

/** « Rouge ou noir » : 4 questions (1/2/3/4 gorgées). Égalité = mauvaise réponse. */
export type RbAnswer = 'red' | 'black' | 'more' | 'less' | 'inside' | 'outside' | Suit
export function rbCorrect(q: number, answer: RbAnswer, cards: Card[]): boolean {
  const c = cards[q]
  if (q === 0) return answer === (isRed(c) ? 'red' : 'black')
  if (q === 1) return (answer === 'more' && c.v > cards[0].v) || (answer === 'less' && c.v < cards[0].v)
  if (q === 2) {
    const lo = Math.min(cards[0].v, cards[1].v), hi = Math.max(cards[0].v, cards[1].v)
    return (answer === 'inside' && c.v > lo && c.v < hi) || (answer === 'outside' && (c.v < lo || c.v > hi))
  }
  return answer === c.s
}
export const RB_QUESTIONS = ['Rouge ou noir ?', 'Plus ou moins ?', 'Intérieur ou extérieur ?', 'Quelle couleur de carte ?']

/** Répartition valide : somme exacte, entiers positifs, uniquement entre les joueurs autorisés. */
export function validAlloc(alloc: Record<string, number>, total: number, allowed: string[]): boolean {
  const entries = Object.entries(alloc)
  if (entries.some(([id, n]) => !allowed.includes(id) || !Number.isInteger(n) || n < 0)) return false
  return entries.reduce((s, [, n]) => s + n, 0) === total
}
