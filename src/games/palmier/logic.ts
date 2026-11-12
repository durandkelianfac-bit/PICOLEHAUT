// Palmier — logique pure (règles : prompt, section 6.5).
import { type Card, isRed, makeDeck, shuffle, valueName } from '../pyramide/logic'

export type EffectKind = 'low-red' | 'low-black' | 'seven' | 'eight' | 'nine' | 'ten' | 'jack' | 'queen' | 'king' | 'ace-red' | 'ace-black'

export function effectOf(c: Card): EffectKind {
  if (c.v >= 2 && c.v <= 6) return isRed(c) ? 'low-red' : 'low-black'
  if (c.v === 7) return 'seven'
  if (c.v === 8) return 'eight'
  if (c.v === 9) return 'nine'
  if (c.v === 10) return 'ten'
  if (c.v === 11) return 'jack'
  if (c.v === 12) return 'queen'
  if (c.v === 13) return 'king'
  return isRed(c) ? 'ace-red' : 'ace-black'
}

export const EIGHT_TEXTS = ['J’ai déjà…', 'Je n’ai jamais…']
export const newDeck = (rand?: () => number) => shuffle(makeDeck(false), rand)

/** Texte affiché pour l'effet d'une carte. */
export function effectTitle(c: Card): string {
  switch (effectOf(c)) {
    case 'low-red': return `Carte rouge : tu donnes ${c.v}`
    case 'low-black': return `Carte noire : tu reçois ${c.v}`
    case 'seven': return 'J’ai dans ma valise…'
    case 'eight': return 'J’ai déjà… ou Je n’ai jamais…'
    case 'nine': return 'Règle pour tout le monde'
    case 'ten': return 'C’est un 10 mais…'
    case 'jack': return 'Valet : roi des pouces (freeze)'
    case 'queen': return 'Dame : tout le monde boit'
    case 'king': return 'Roi : règle libre'
    case 'ace-red': return 'As rouge : cul sec pour quelqu’un'
    case 'ace-black': return 'As noir : cul sec pour toi'
  }
}
export { valueName }

/** « C'est un 10 mais… » : les personnes de la minorité boivent. Égalité = personne. */
export function tenResult(majority: number, minority: number): { drinkers: number; text: string } {
  if (minority >= majority) return { drinkers: 0, text: 'Égalité : personne ne boit.' }
  return { drinkers: minority, text: `Minorité (${minority}) : chacun boit` }
}
