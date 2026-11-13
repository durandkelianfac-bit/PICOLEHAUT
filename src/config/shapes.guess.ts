// Images détourées (public/shapes/) pour « Guess the size », par nom d'objet (avant la parenthèse, en minuscules).
// Un objet sans image garde la silhouette de son emoji. Pour en ajouter : déposer un PNG ou SVG à fond transparent
// dans public/shapes/ et l'ajouter ici. 'w' = la taille de l'objet est sa largeur/longueur (sinon sa hauteur).
const files: Record<string, string | [string, 'w']> = {
  'cd': 'cd.png',
  'balle de ping-pong': 'pingpong.png',
  'pièce de 1 €': 'piece1.svg',
  'pièce de 2 €': 'piece2.svg',
  'carte bancaire': ['carte.svg', 'w'],
  'feuille a4': 'a4.svg',
  'panier de basket': 'panier.svg',
  'but de football': ['but.svg', 'w'],
  'court de tennis': ['tennis.svg', 'w'],
  'piscine olympique': ['piscine.svg', 'w'],
  'conteneur de 40 pieds': ['conteneur.svg', 'w'],
  'concorde': ['concorde.svg', 'w'],
  'airbus a380': ['a380.svg', 'w'],
  'arc de triomphe': 'arc.svg',
  'tower bridge': 'tower_bridge.svg',
  'big ben, elizabeth tower': 'bigben.svg',
  'atomium': 'atomium.svg',
  'london eye': 'london_eye.svg',
  'washington monument': 'washington.svg',
  'space needle': 'space_needle.svg',
  'golden gate bridge': 'golden_gate.svg',
  'tour eiffel': 'eiffel.svg',
  'viaduc de millau': 'millau.svg',
  'shanghai tower': 'shanghai.svg',
  'tokyo skytree': 'skytree.svg',
}

const entry = (name: string) => {
  const e = files[name.split('(')[0].trim().toLowerCase()]
  return e ? (typeof e === 'string' ? ([e, 'h'] as const) : e) : undefined
}

/** Chemin de l'image d'un objet, ou undefined s'il n'en a pas. */
export function shapeImage(name: string): string | undefined {
  const e = entry(name)
  return e ? `${import.meta.env.BASE_URL}shapes/${e[0]}` : undefined
}

/** Dimension que représente la taille : 'w' (largeur/longueur) ou 'h' (hauteur, par défaut). */
export function shapeDim(name: string): 'w' | 'h' {
  return entry(name)?.[1] ?? 'h'
}
