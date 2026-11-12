// Catalogue des « looks » d'avatar 3D : un même modèle (RobotExpressive, CC0) décliné en expression
// et en pose, teinté à la couleur du joueur. Pur (sans Three.js) : utilisable partout sans le charger.
export type Expression = 'Angry' | 'Surprised' | 'Sad' | null
export interface Look { id: string; expression: Expression; pose: string; time: number }

export const MODEL_URL = 'avatars/RobotExpressive.glb'

export const LOOKS: Look[] = [
  { id: 'idle', expression: null, pose: 'Idle', time: 0.4 },
  { id: 'wave', expression: null, pose: 'Wave', time: 0.5 },
  { id: 'thumbs', expression: null, pose: 'ThumbsUp', time: 0.6 },
  { id: 'dance', expression: null, pose: 'Dance', time: 0.7 },
  { id: 'yes', expression: null, pose: 'Yes', time: 0.5 },
  { id: 'grr', expression: 'Angry', pose: 'No', time: 0.5 },
  { id: 'punch', expression: 'Angry', pose: 'Punch', time: 0.4 },
  { id: 'wow', expression: 'Surprised', pose: 'Idle', time: 0.8 },
  { id: 'jump', expression: 'Surprised', pose: 'Jump', time: 0.5 },
  { id: 'hello', expression: 'Surprised', pose: 'Wave', time: 0.3 },
  { id: 'sit', expression: 'Sad', pose: 'Sitting', time: 0.6 },
  { id: 'stand', expression: 'Sad', pose: 'Standing', time: 0.5 },
]

export const lookById = (id: string): Look | undefined => LOOKS.find((l) => l.id === id)

/** Look stable pour une graine (identifiant de joueur) : même graine, même look. */
export function assignLook(seed: string): string {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
  return LOOKS[(h >>> 0) % LOOKS.length].id
}

/** Looks pas encore pris par les autres joueurs en priorité, pour éviter les doublons. */
export function assignDistinct(seed: string, taken: string[]): string {
  const first = assignLook(seed)
  if (!taken.includes(first)) return first
  const start = LOOKS.findIndex((l) => l.id === first)
  for (let k = 1; k < LOOKS.length; k++) {
    const id = LOOKS[(start + k) % LOOKS.length].id
    if (!taken.includes(id)) return id
  }
  return first
}
