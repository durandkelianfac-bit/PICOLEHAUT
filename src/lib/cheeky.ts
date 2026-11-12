// Messages taquins affichés sur le téléphone de celui qui reçoit des gorgées.
// Accords : « {masculin|féminin|neutre} » est remplacé selon le genre du joueur.
export type Gender = 'm' | 'f' | 'x' // homme, femme, genderfluid (tous les autres)
export const GENDERS: { id: Gender; label: string }[] = [
  { id: 'm', label: 'Homme' },
  { id: 'f', label: 'Femme' },
  { id: 'x', label: 'Genderfluid' },
]

/** Résout les accords « {vilain|vilaine|vilain·e} » pour un genre (neutre par défaut). */
export function gendered(text: string, gender: Gender | undefined = 'x'): string {
  const i = gender === 'm' ? 0 : gender === 'f' ? 1 : 2
  return text.replace(/\{([^{}|]*)\|([^{}|]*)\|([^{}|]*)\}/g, (_, a, b, c) => [a, b, c][i])
}

export const CHEEKY: string[] = [
  'Tiens, prends ça, {vilain|vilaine|vilain·e} !!',
  'Avale ça, {gourmand|gourmande|gourmand·e} !',
  'Ouvre grand, c’est cadeau !',
  'Ça, c’est pour tes mauvaises manières !',
  'Gloup gloup, {mon chéri|ma chérie|mon·ma chéri·e} !',
  'Tu l’as bien cherché, {coquin|coquine|coquin·e} !',
  'Bois, {petit polisson|petite polissonne|petit·e polisson·ne}, bois !',
  'Un petit cadeau de ma part, avec tout mon amour.',
  'Allez, fais pas {le timide|la timide|le·la timide}, avale !',
  'C’est cadeau ! Ne me remercie pas.',
  'Prends-en de la graine, {petit coquin|petite coquine|petit·e coquin·e} !',
  'Je te le sers bien frais, ça va te faire du bien !',
  'Prends ça et tais-toi, {bel insolent|belle insolente|bel·le insolent·e} !',
  'Ça glisse tout seul, n’est-ce pas ?',
  'Surtout n’en renverse pas une goutte, {polisson|polissonne|polisson·ne} !',
  'Régale-toi, tu l’as mérité !',
  'Hop hop hop, on ne fait pas la fine bouche !',
  'Allez, sois sage et bois sans broncher !',
  'Voilà pour toi, avec les compliments de la maison.',
  'Tu fais moins {le malin|la maligne|le·la malin·e}, maintenant, hein ?',
]

/** Cadeaux d'un roi : il envoie autant de gorgées qu'il veut, pendant son règne. */
export const ROYAL: string[] = [
  'Votre seigneur est généreux ce jour.',
  'Sa Majesté vous gratifie d’un présent.',
  'Le roi a parlé : buvez et réjouissez-vous !',
  'Courbez l’échine et levez le verre !',
  'Par décret royal, vous voilà {élu assoiffé|élue assoiffée|élu·e assoiffé·e} !',
  'Le roi vous offre ce petit cadeau, ne le faites pas attendre.',
  'Honneur à vous : le roi pense à vous !',
  'Un présent du royaume, à déguster sans modération.',
  'Le roi est de bonne humeur, profitez-en !',
  'Vous êtes dans les bonnes grâces de Sa Majesté.',
  'Le trône a décidé : {vous êtes l’heureux élu|vous êtes l’heureuse élue|vous êtes l’heureux·se élu·e} !',
  'On ne refuse pas un cadeau du roi.',
]

/** Cul sec : jusqu'à la dernière goutte. */
export const CULSEC: string[] = [
  'Jusqu’à la dernière goutte, pas de triche !',
  'Cul sec ! Et on ne fait pas {le timide|la timide|le·la timide}.',
  'Le verre se vide, la légende s’écrit.',
  'Tu as {pris|prise|pris·e} le risque, maintenant bois !',
  'Un, deux, trois… tout !',
  'Glou glou glou, tout le monde regarde !',
  'Pas de petite gorgée : on finit le verre !',
  'Courage ! Le verre t’attend.',
]

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const pick = (list: string[], seed: string, gender?: Gender) => gendered(list[hash(seed) % list.length], gender)

/** Même événement, même message (choix stable à partir de l'identifiant). */
export const cheekyLine = (seed: string, gender?: Gender) => pick(CHEEKY, seed, gender)
export const royalLine = (seed: string, gender?: Gender) => pick(ROYAL, seed, gender)
export const culSecLine = (seed: string, gender?: Gender) => pick(CULSEC, seed, gender)

export function sipHeadline(n: number, sober: boolean): string {
  return `${n} ${sober ? (n > 1 ? 'points' : 'point') : (n > 1 ? 'gorgées' : 'gorgée')}`
}
