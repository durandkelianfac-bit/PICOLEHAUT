<script lang="ts">
  // Vue « téléphone » du jeu en cours : utilisée par la page de jeu et, sur l'écran central, par le panneau privé.
  import Hues from '../games/hues/Hues.svelte'
  import Codenames from '../games/codenames/Codenames.svelte'
  import Pyramide from '../games/pyramide/Pyramide.svelte'
  import Palmier from '../games/palmier/Palmier.svelte'
  import Guess from '../games/guess/Guess.svelte'
  import Cyclone from '../games/cyclone/Cyclone.svelte'
  import Doublage from '../games/doublage/Doublage.svelte'
  import { session } from '../lib/room.svelte'
  const game = $derived(session.state?.game)
</script>
{#if game?.id === 'hues'}<Hues view="phone" />{/if}
{#if game?.id === 'codenames'}<Codenames view="phone" />{/if}
{#if game?.id === 'pyramide'}<Pyramide view="phone" />{/if}
{#if game?.id === 'palmier'}<Palmier view="phone" />{/if}
{#if game?.id === 'guess'}<Guess view="phone" />{/if}
{#if game?.id === 'cyclone'}<Cyclone view="phone" />{/if}
{#if game?.id === 'doublage'}<Doublage view="phone" />{/if}
