// Règles de gorgées de chaque jeu. Modifiable sans toucher au code du moteur.
// Les valeurs "à confirmer" sont des propositions validées avec l'utilisateur.
export const sipsConfig = {
  huesAndCues: { pointToSips: 1 },
  codenames: { assassinSips: 10, perRemainingWord: 1 },
  pyramide: { perFloor: [1, 2, 3, 4, 5], topIsCulSec: false, accusationMultiplier: 2, consultationCost: 2, rougeNoir: [1, 2, 3, 4] },
  palmier: { towerCollapseSips: 7, queenAll: true, tenMinorityPerPerson: 5 },
  doublage: { funniestGives: 5 },
  guessTheSize: {},
  cyclone: {},
} as const

export type SipsConfig = typeof sipsConfig
