# Projet : site de jeux à gorgées (mobile first, gratuit, rendu professionnel)

## 0. Avant de coder
1. Lis tous les fichiers de /docs/ : règles des jeux dans /docs/regles/, maquettes dans /docs/design/.
2. Propose-moi la stack complète (framework, libs, hébergement) avec, pour chaque choix, la
   licence et les limites gratuites vérifiées. N'invente aucune limite : si tu ne peux pas la
   confirmer, écris "à vérifier". Attends mon accord.
3. Pose-moi en une seule fois les questions restantes (section 10), puis commence par la phase 1.
4. Si une règle manque ou est ambiguë, demande-moi. N'invente rien.

## 1. Contexte
Site de jeux entre amis où chaque jeu est décliné en version "gorgées" : à chaque manche, des
gorgées sont à distribuer ou à recevoir de notre breuvage préféré. Usage privé (non partagé
publiquement). Sans compte, sans pub. Il doit paraître professionnel : design soigné, animations
fluides, aucune impression de prototype.

## 2. Contraintes générales
- Mobile first. Chaque joueur utilise son propre téléphone (iOS Safari et Android Chrome).
- PWA installable, plein écran, écran qui reste allumé en partie (Wake Lock API).
- 100 % gratuit : libs open source et services avec offre gratuite uniquement.
- Français par défaut.
- Mention 18+ à l'entrée et option "sans alcool" (gorgées remplacées par points ou gages).
- Pas de sur-architecture : MVP visuel et jouable d'abord, testable en local, déploiement gratuit
  (GitHub Pages ou Cloudflare Pages).
- Le contenu (mots, cartes, visuels) est créé par nous, sauf les extraits vidéo du doublage.

## 3. Direction artistique (un seul design system en variables CSS)
Inspirée des maquettes de /docs/design/ :
- Fond sombre en dégradé (bleu nuit/violet), cartes en relief doux (néomorphisme + verre dépoli),
  très gros arrondis, boutons en pilule, barre de navigation en bas.
- Table de jeu vue de dessus (joueurs autour, cartes au centre), comme sur la maquette poker.
- Accueil façon catalogue : grille de vignettes (une par jeu) avec nombre de joueurs et durée,
  barre de recherche. Il sert aussi de lobby (créer ou rejoindre un salon).
- Page d'accueil (hero) : titre géant en typo grasse blanche sur fond très sombre, avatar 3D qui
  chevauche le titre (texte derrière le personnage, via PNG détouré), bouton principal
  "Créer un salon" en pilule à dégradé rose/violet, menu minimal (Jeux, Règles, Rejoindre).
  Référence : /docs/design/hero-reference.png.
- Parallaxe légère de l'avatar avec le gyroscope.

## 4. Avatars 3D automatiques et gratuits
Chaque joueur choisit ou reçoit un avatar 3D cartoon. Étudie et compare ces pistes, en vérifiant
licence et limites gratuites avant de me les proposer :
- A. Pack pré-généré (recommandé pour le MVP) : une trentaine d'avatars PNG transparents
  générés une fois avec une IA d'images, déposés dans /assets/avatars/, attribués
  automatiquement aux joueurs.
- B. Génération automatique à la création du profil via une API d'images gratuite
  (ex. Pollinations ou Cloudflare Workers AI), avec cache et repli sur le pack A.
- C. Repli 2D instantané : DiceBear (avatars SVG open source).
- D. Personnages 3D temps réel (Three.js + modèles glTF CC0).
Prévoir des placeholders SVG tant que les avatars n'existent pas.

## 5. Briques communes
### 5.1 Salon multi-téléphones
- Un joueur crée un salon (code à 4 lettres + QR code). Les autres rejoignent en scannant ou en
  tapant le code, avec pseudo, couleur et avatar.
- Deux modes : tous les téléphones égaux, ou écran "table" partagé (TV, tablette, PC) + téléphones
  en manettes.
- Synchro temps réel sans serveur payant : WebRTC pair-à-pair (compare PeerJS et Trystero, et
  Supabase Realtime en offre gratuite). Reconnexion si un joueur ferme l'onglet.

### 5.2 Pointeur laser gyroscope
- Le téléphone sert de pointeur sur l'écran table via DeviceOrientation.
- iOS : permission demandée après un geste utilisateur, HTTPS obligatoire.
- Bouton "recentrer", lissage du mouvement, faible latence. Un point laser par joueur, à sa couleur.
  Un tap sur le téléphone = clic.

### 5.3 Moteur de gorgées
- À la fin d'une action, le moteur produit "X distribue N gorgées" / "Y boit N gorgées", avec
  animation claire et historique de la partie.
- Les règles de gorgées de chaque jeu sont dans un fichier de config séparé, modifiable sans
  toucher au code.

### 5.4 Gestionnaire de packs de contenu (mots, cartes, objets, extraits)
- Chaque jeu qui utilise du contenu préintégré (mots Codenames, cartes Cyclone, objets Guess the
  size, extraits du doublage) a un pack par défaut organisé en CATÉGORIES.
- Une page "Packs" permet d'ajouter, modifier, supprimer des éléments et des catégories, et
  d'activer ou désactiver des catégories.
- Les modifications sont possibles AUSSI EN COURS DE PARTIE et se propagent en direct à tous
  les téléphones du salon (l'hôte fait autorité).
- Sauvegarde locale (localStorage/IndexedDB) + export/import JSON pour ne rien perdre.

## 6. Jeux (un module par jeu)

### 6.1 Hues and Cues
- Règles : /docs/regles/Hues_and_Cues_ITA.pdf (2 indices : 1 mot puis 2 mots, placement de
  pions, cadre de score 3×3, points 3 / 2 / 1, scoring du donneur d'indices). Fin de partie : voir PDF.
- Grille de couleurs : notre propre palette (lettres × numéros, dimensions à confirmer dans le PDF).
- Téléphone : voit la couleur secrète (donneur) ou place son pion (devineurs), éventuellement au pointeur laser.
- Gorgées (config modifiable) : 1 point = 1 gorgée à distribuer.

### 6.2 Codenames
- Règles : /docs/regles/Codenames_rulebook_FR.pdf (grille 5×5, 2 équipes, 8 mots chacune + 1 pour
  l'équipe qui commence, 7 neutres, 1 assassin, un espion par équipe).
- Les deux espions voient la carte Clé sur leur téléphone. Les autres voient la grille sur l'écran
  table et désignent un mot au pointeur laser.
- Pack de mots : au moins 400 mots français originaux, en catégories (voir 5.4).
- Gorgées (config modifiable) : l'équipe perdante boit autant de gorgées que de mots restants
  à l'équipe gagnante ; l'assassin = X gorgées.

### 6.3 Doublage de film
- Un court extrait vidéo, des répliques à texte à trous, chaque joueur enregistre sa voix sur son
  téléphone (MediaRecorder), puis le site rediffuse l'extrait final avec les voix des joueurs.
- Usage privé : extraits YouTube acceptés. MVP : lecteur YouTube intégré (IFrame API) avec début
  et fin, son d'origine coupé, sous-titres et répliques à trous dans un JSON (pack, voir 5.4).
- Phase 2 : IA gratuite pour découper et sous-titrer (Whisper via Transformers.js, ffmpeg.wasm).
  Elle exige le fichier audio, donc des extraits préparés en local. Indique si c'est viable sur
  téléphone ou s'il faut traiter sur l'appareil de l'hôte.
- Gorgées : [à définir avec moi]

### 6.4 Pyramide
- Règles de référence : /docs/regles/pyramide.txt (à respecter en entier).
- Jeu de 52 cartes virtuel, 3 à 10 joueurs.
- Distribution (méthode A) : chaque joueur voit ses 4 cartes sur son téléphone (accès par QR code)
  pendant un temps de mémorisation, puis elles se masquent. Pas de consultation ensuite
  (sauf variante "consultation autorisée contre 2 gorgées").
- Méthode B "Rouge ou noir" en option : 4 questions, 1 / 2 / 3 / 4 gorgées à distribuer ou à boire.
- La pyramide (5-4-3-2-1 = 15 cartes) et la révélation des cartes s'affichent UNIQUEMENT sur l'écran partagé.
- Gorgées par étage : 1 / 2 / 3 / 4 / 5 (ou cul sec au sommet), doublées en cas d'accusation.
- Déroulé : un joueur revendique la valeur (bouton) → il répartit les gorgées → l'accusé accepte
  ou crie "Menteur" → révélation d'UNE carte sur l'écran partagé, qui reste visible → le menteur
  ou l'accusateur prend le double.
- Seule la valeur compte. Plusieurs revendications : premier arrivé (horodatage serveur).
  Aucune revendication : carte brûlée.
- Variantes activables dans le salon : Intense (×2), cartes horizontales, Bluff total,
  6 cartes, Jokers, Speed (5 s).

### 6.5 Palmier
Paquet de 52 cartes virtuel. Chaque tour, le joueur tire une carte (effet), puis pose sa carte
sur la tour avec son téléphone.
Effets :
- 2 à 6 : carte rouge = tu donnes ; carte noire = tu reçois. Nombre de gorgées = valeur de
  la carte (config modifiable).
- 7 : "J'ai dans ma valise…". Le jeu affiche seulement l'intitulé, le groupe sait comment jouer.
- 8 : "J'ai déjà…" ou "Je n'ai jamais…". Le jeu tire l'une des deux au hasard, le groupe sait jouer.
- 9 : une règle pour tout le monde, y compris celui qui a tiré. Le joueur la saisit (texte libre)
  et elle s'affiche en bandeau jusqu'à ce qu'elle soit remplacée.
- 10 : "C'est un 10 mais…". Le joueur l'annonce à voix haute. Le jeu demande seulement le nombre
  de personnes en majorité et en minorité, et applique : chaque personne de la minorité boit 5 gorgées.
- Valet : roi des pouces / freeze. Gardé sur le téléphone du joueur (voir ci-dessous).
- Dame : tout le monde boit.
- Roi : le joueur fait ce qu'il veut (règle libre). Gardé sur le téléphone du joueur (voir ci-dessous).
- As : rouge = cul sec pour quelqu'un (le joueur choisit) ; noir = cul sec pour soi.
- Valet et roi "gardés" : la carte reste dans la main du joueur sur son téléphone et il l'utilise
  quand il veut. Elle n'est remise dans le jeu que si un autre valet ou roi sort dans la main
  d'un joueur. [Ma formulation exacte est à valider, voir questions.]
- Mini-jeu gyroscope : le téléphone EST la carte. Le joueur l'incline pour la déplacer et la
  faire pivoter sur l'écran partagé (moteur physique 2D open source type Matter.js), puis la
  pose d'un tap. Si la tour s'effondre, le joueur boit (X gorgées, config).
- Interface proche de Guess the size : écran table avec la tour, téléphones en manettes.
- Toutes les règles sont des modules de config éditables séparément (5.3).

### 6.6 Cyclone
- Cartes retournées, une par tour, chaque joueur pioche à son tour.
- Chaque carte a un pouvoir de type GAGE, ACTION ou VÉRITÉ, avec des gorgées éventuelles.
- Pack de départ à proposer par toi : au moins 60 cartes originales réparties dans ces trois
  catégories, avec un niveau d'intensité (soft / moyen / épicé) activable dans le salon.
  Ton : soirée entre amis, humour, aucun contenu sexuel explicite, aucun gage dangereux
  ou humiliant. Éditable via les packs (5.4).

### 6.7 Guess the size (inspiré de magnitudle.com/size-it-up)
- 5 manches. Par manche : un objet cible à côté d'une référence de taille connue.
- Chaque joueur redimensionne l'objet sur son téléphone (curseur ou inclinaison gyroscope) puis valide.
- Score : jusqu'à 100 points par manche selon la proximité avec la taille réelle (formule à
  définir : écart relatif, courbe dégressive), 500 au maximum.
- Gorgées (config) : le plus proche distribue, le plus éloigné boit.
- Données : tailles réelles vérifiées (Wikipedia ou Wikidata), sans estimation. Si une taille
  ne peut pas être confirmée, ne l'inclus pas. Visuels : silhouettes SVG ou images libres de Wikimedia Commons.
- Objets en catégories, éditables via les packs (5.4).

## 7. Phasage (à la fin de chaque phase : lançable en local, démo sur mon téléphone, commit)
1. Socle : design system, accueil/hero, salon + QR, synchro, moteur de gorgées, packs, PWA, déploiement.
2. Pointeur gyroscope + Hues and Cues.
3. Codenames.
4. Pyramide.
5. Palmier (cartes puis mini-jeu gyroscope) + Guess the size.
6. Cyclone (pack de cartes).
7. Avatars 3D automatiques.
8. Doublage de film (MVP puis IA).

## 8. Qualité attendue
- Design cohérent, animations discrètes et utiles, mode sombre, boutons larges utilisables d'une main.
- Accessibilité de base (contrastes, tailles de texte, retour haptique en option).
- Chargement rapide en 4G, code découpé par jeu.
- Tests sur les règles de score et de gorgées de chaque jeu.

## 9. Façon de travailler
- Étapes courtes, démo testable après chacune, commits clairs.
- Dis-moi explicitement ce que tu n'as pas pu vérifier ou tester (notamment le gyroscope sur
  iPhone et Android, qui exige un vrai téléphone).

## 10. Questions à me poser avant de démarrer (si non déjà tranchées)
- Nom du site.
- Palette exacte (violet/bleu nuit conseillé).
- Gorgées du doublage et du mini-jeu Palmier.
- Palmier : la règle "valet/roi gardés" est-elle bien comprise ?
