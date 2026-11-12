export interface GameMeta {
  id: string
  name: string
  tagline: string
  players: string
  duration: string
  emoji: string
  ready: boolean // module jouable ? (phases suivantes)
  usesPack: boolean
}
export const games: GameMeta[] = [
  { id: 'hues', name: 'Hues and Cues', tagline: 'Devine la couleur', players: '3-10', duration: '30 min', emoji: '🎨', ready: true, usesPack: false },
  { id: 'codenames', name: 'Codenames', tagline: 'Deux équipes, un assassin', players: '4-8+', duration: '15 min', emoji: '🕵️', ready: false, usesPack: true },
  { id: 'pyramide', name: 'Pyramide', tagline: 'Bluff et mémoire', players: '3-10', duration: '20-40 min', emoji: '🔺', ready: false, usesPack: false },
  { id: 'palmier', name: 'Palmier', tagline: 'La tour qui tombe', players: '3-10', duration: '20 min', emoji: '🌴', ready: false, usesPack: false },
  { id: 'guess', name: 'Guess the size', tagline: 'Quelle taille ?', players: '2-10', duration: '10 min', emoji: '📏', ready: false, usesPack: true },
  { id: 'cyclone', name: 'Cyclone', tagline: 'Gage, action ou vérité', players: '3-10', duration: '20 min', emoji: '🌀', ready: false, usesPack: true },
  { id: 'doublage', name: 'Doublage', tagline: 'Double le film', players: '3-8', duration: '20 min', emoji: '🎬', ready: false, usesPack: true },
]
