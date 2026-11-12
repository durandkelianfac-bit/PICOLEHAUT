// Règles de gorgées de chaque jeu. Modifiable sans toucher au code du moteur.
// Les valeurs "à confirmer" sont des propositions validées avec l'utilisateur.
export const sipsConfig = {
  huesAndCues: { pointToSips: 1 },
  // remainingOf : 'loser' = mots restants à l'équipe perdante ; 'winner' = à l'équipe gagnante. À confirmer.
  codenames: { assassinSips: 10, perRemainingWord: 1, remainingOf: 'loser' as 'loser' | 'winner' },
  pyramide: { perFloor: [1, 2, 3, 4, 5], topIsCulSec: false, accusationMultiplier: 2, consultationCost: 2, rougeNoir: [1, 2, 3, 4] },
  // lowPerValue : 2 à 6 = valeur × ce facteur. queenSips et culSec : valeurs proposées, à confirmer.
  palmier: { towerCollapseSips: 7, lowPerValue: 1, queenSips: 1, culSec: 10, tenMinorityPerPerson: 5 },
  doublage: { funniestGives: 5 },
  guessTheSize: {},
  cyclone: {},
} as const

export type SipsConfig = typeof sipsConfig
