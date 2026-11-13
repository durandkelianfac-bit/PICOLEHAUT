// Images détourées (public/shapes/) pour « Guess the size », par nom d'objet (avant la parenthèse, en minuscules).
// Un objet sans image garde la silhouette de son emoji. Pour en ajouter : déposer un PNG à fond transparent
// dans public/shapes/, l'ajouter ici, et créditer l'auteur dans public/shapes/CREDITS.txt.
const files: Record<string, string> = {
  'cd': 'cd.png',
  'balle de ping-pong': 'pingpong.png',
}

/** Chemin de l'image d'un objet, ou undefined s'il n'en a pas. */
export function shapeImage(name: string): string | undefined {
  const f = files[name.split('(')[0].trim().toLowerCase()]
  return f ? `${import.meta.env.BASE_URL}shapes/${f}` : undefined
}
