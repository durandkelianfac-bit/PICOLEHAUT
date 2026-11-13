// Catalogue des avatars 3D : un même modèle (RobotExpressive, CC0) décliné en expression et en pose,
// avec un accessoire optionnel, teinté à la couleur du joueur. Pur (sans Three.js).
// Un avatar s'écrit « look » ou « look+accessoire » (ex. « wave+crown »).
export type Expression = 'Angry' | 'Surprised' | 'Sad' | null
export interface Look { id: string; label: string; expression: Expression; pose: string; time: number }
export interface Accessory { id: string; label: string; icon: string }

export const MODEL_URL = 'avatars/RobotExpressive.glb'

export const LOOKS: Look[] = [
  { id: 'idle', label: 'Cool', expression: null, pose: 'Idle', time: 0.4 },
  { id: 'wave', label: 'Salut', expression: null, pose: 'Wave', time: 0.5 },
  { id: 'thumbs', label: 'Pouce', expression: null, pose: 'ThumbsUp', time: 0.6 },
  { id: 'dance', label: 'Danse', expression: null, pose: 'Dance', time: 0.7 },
  { id: 'yes', label: 'Oui', expression: null, pose: 'Yes', time: 0.5 },
  { id: 'grr', label: 'Grr', expression: 'Angry', pose: 'No', time: 0.5 },
  { id: 'punch', label: 'Poing', expression: 'Angry', pose: 'Punch', time: 0.4 },
  { id: 'wow', label: 'Wow', expression: 'Surprised', pose: 'Idle', time: 0.8 },
  { id: 'jump', label: 'Saut', expression: 'Surprised', pose: 'Jump', time: 0.5 },
  { id: 'hello', label: 'Coucou', expression: 'Surprised', pose: 'Wave', time: 0.3 },
  { id: 'sit', label: 'Triste', expression: 'Sad', pose: 'Sitting', time: 0.6 },
  { id: 'stand', label: 'Boudeur', expression: 'Sad', pose: 'No', time: 0.25 },
]

export const ACCESSORIES: Accessory[] = [
  { id: 'none', label: 'Aucun', icon: 'none' },
  { id: 'tophat', label: 'Haut-de-forme', icon: 'tophat' },
  { id: 'crown', label: 'Couronne', icon: 'crown' },
  { id: 'party', label: 'Chapeau de fête', icon: 'party' },
  { id: 'cap', label: 'Casquette', icon: 'cap' },
  { id: 'halo', label: 'Auréole', icon: 'halo' },
  { id: 'antenna', label: 'Antenne', icon: 'antenna' },
  { id: 'propeller', label: 'Hélice', icon: 'propeller' },
]

export const lookById = (id: string): Look | undefined => LOOKS.find((l) => l.id === id)

export function parseAvatar(avatar: string): { look: string; acc: string } {
  const [look, acc] = avatar.split('+')
  return { look: lookById(look) ? look : 'idle', acc: ACCESSORIES.some((a) => a.id === acc) ? acc : 'none' }
}
export const composeAvatar = (look: string, acc: string) => (acc && acc !== 'none' ? `${look}+${acc}` : look)

const hash = (seed: string) => {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** Avatar stable pour une graine (identifiant de joueur) : même graine, même avatar. */
export function assignLook(seed: string): string {
  const h = hash(seed)
  return composeAvatar(LOOKS[h % LOOKS.length].id, ACCESSORIES[Math.floor(h / LOOKS.length) % ACCESSORIES.length].id)
}

/** Premier avatar libre à partir de celui de la graine : deux joueurs d'un salon n'ont pas le même. */
export function assignDistinct(seed: string, taken: string[]): string {
  const all = LOOKS.flatMap((l) => ACCESSORIES.map((a) => composeAvatar(l.id, a.id)))
  const first = assignLook(seed)
  const start = all.indexOf(first)
  for (let k = 0; k < all.length; k++) {
    const id = all[(start + k) % all.length]
    if (!taken.includes(id)) return id
  }
  return first
}
