// Pack de départ « Guess the size ». Format d'une ligne : « Nom | taille en mètres | emoji ».
// Les tailles ont été vérifiées le 2026-11-12 sur Wikipedia (extraits d'articles) ou Wikidata
// (valeurs normalisées en mètres, une seule valeur non ambiguë). Les objets dont la taille n'a
// pas pu être confirmée ont été écartés. Modifiable depuis la page « Packs ».
//
// Sources — Wikipedia : « 1 euro coin » 23,25 mm ; « 2 euro coin » 25,75 mm ; « Compact disc » 120 mm ;
// « ISO/IEC 7810 » ID-1 85,60 mm ; « ISO 216 » A4 297 mm ; « Table tennis » balle de 40 mm ;
// « Basketball » cercle à 3,05 m ; « Football pitch » but de 7,32 m ; « Tennis court » 23,77 m ;
// « Olympic-size swimming pool » 50 m ; « Intermodal container » 40 pieds = 12,192 m.
// Wikidata (hauteur P2048 / longueur P2043) : Tour Eiffel Q243, Elizabeth Tower Q41225,
// Arc de Triomphe Q64436, Space Needle Q5317, Viaduc de Millau Q99236, Golden Gate Bridge Q44440,
// Airbus A380 Q5830, Concorde Q6505, Tower Bridge Q83125, Washington Monument Q178114,
// Atomium Q180901, Tokyo Skytree Q57965, Shanghai Tower Q18547, London Eye Q160659.
export const guessItems: Record<string, string[]> = {
  'Petits objets': [
    'Pièce de 1 € (diamètre) | 0.02325 | 🪙',
    'Pièce de 2 € (diamètre) | 0.02575 | 🪙',
    'Balle de ping-pong (diamètre) | 0.04 | 🏓',
    'Carte bancaire (largeur) | 0.0856 | 💳',
    'CD (diamètre) | 0.12 | 💿',
    'Feuille A4 (longueur) | 0.297 | 📄',
  ],
  'Sport': [
    'Panier de basket (hauteur du cercle) | 3.05 | 🏀',
    'But de football (largeur) | 7.32 | 🥅',
    'Court de tennis (longueur) | 23.77 | 🎾',
    'Piscine olympique (longueur) | 50 | 🏊',
  ],
  'Transports': [
    'Conteneur de 40 pieds (longueur) | 12.192 | 📦',
    'Concorde (longueur) | 61.66 | ✈️',
    'Airbus A380 (longueur) | 72.72 | ✈️',
  ],
  'Monuments': [
    'Arc de Triomphe (hauteur) | 49.54 | 🏛️',
    'Tower Bridge (hauteur) | 65 | 🌉',
    'Big Ben, Elizabeth Tower (hauteur) | 96 | 🕰️',
    'Atomium (hauteur) | 102 | ⚛️',
    'London Eye (hauteur) | 135 | 🎡',
    'Washington Monument (hauteur) | 169.046 | 🏛️',
    'Space Needle (hauteur) | 184 | 🗼',
    'Golden Gate Bridge (hauteur des tours) | 227.38 | 🌉',
    'Tour Eiffel (hauteur) | 330 | 🗼',
    'Viaduc de Millau (hauteur du pylône) | 343 | 🌉',
    'Shanghai Tower (hauteur) | 632 | 🏙️',
    'Tokyo Skytree (hauteur) | 634 | 🗼',
  ],
}
