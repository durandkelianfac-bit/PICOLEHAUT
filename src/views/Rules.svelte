<script lang="ts">
  const rules = [
    { t: 'Hues and Cues', d: 'Le donneur choisit une couleur et donne un indice d’un mot, puis de deux mots. Chacun pose 2 pions. Devineurs : 3 pts sur la bonne case, 2 dans le cadre 3×3, 1 autour. Donneur : 1 pt par pion dans le cadre.' },
    { t: 'Codenames', d: 'Deux équipes, deux espions. L’espion donne un mot et un chiffre ; l’équipe désigne des mots. L’assassin fait perdre. La première équipe qui trouve tous ses mots gagne.' },
    { t: 'Pyramide', d: 'Mémorise tes 4 cartes. À chaque carte de la pyramide, revendique-la (seule la valeur compte) pour distribuer des gorgées. L’accusé peut crier « Menteur » : le perdant prend le double.' },
    { t: 'Palmier', d: 'Tire une carte : son effet s’applique, puis pose-la sur la tour avec ton téléphone. Valet et roi restent dans ta main jusqu’à ce qu’un autre valet (ou roi) sorte.' },
    { t: 'Doublage', d: 'Un extrait, des répliques à trous, chacun enregistre sa voix. Vote secret du plus drôle : il distribue 5 gorgées.' },
  ]
</script>
<main class="page stack">
  <h2>Règles</h2>
  {#each rules as r}
    <details class="card"><summary>{r.t}</summary><p class="muted">{r.d}</p></details>
  {/each}
</main>
<style>
  summary { font-weight: 700; cursor: pointer; min-height: 32px; }
  p { margin: 10px 0 0; line-height: 1.5; }
</style>
