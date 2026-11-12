// Messages taquins affichés sur le téléphone de celui qui reçoit des gorgées.
// {n} et {from} sont remplacés ; « ·e » reste neutre pour tous les joueurs.
export const CHEEKY: string[] = [
  'Tiens, prends ça, vilain·e !!',
  'Avale ça, gourmand·e !',
  'Ouvre grand, c’est cadeau !',
  'Ça, c’est pour tes mauvaises manières !',
  'Gloup gloup, mon·ma chéri·e !',
  'Tu l’as bien cherché, coquin·e !',
  'Bois, petit·e chenapan·e, bois !',
  'Un petit cadeau de ma part, avec tout mon amour.',
  'Allez, fais pas le·la timide, avale !',
  'C’est cadeau ! Ne me remercie pas.',
  'Prends-en de la graine, petit·e coquin·e !',
  'Je te le sers bien frais, ça va te faire du bien !',
  'Prends ça et tais-toi, bel·le insolent·e !',
  'Ça glisse tout seul, n’est-ce pas ?',
  'Surtout n’en renverse pas une goutte, polisson·ne !',
  'Régale-toi, tu l’as mérité !',
  'Hop hop hop, on ne fait pas la fine bouche !',
  'Allez, sois sage et bois sans broncher !',
  'Voilà pour toi, avec les compliments de la maison.',
  'Tu fais moins le·la malin·e, maintenant, hein ?',
]

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

/** Même événement, même message (choix stable à partir de l'identifiant). */
export function cheekyLine(seed: string): string { return CHEEKY[hash(seed) % CHEEKY.length] }

export function sipHeadline(n: number, sober: boolean): string {
  return `${n} ${sober ? (n > 1 ? 'points' : 'point') : (n > 1 ? 'gorgées' : 'gorgée')}`
}
