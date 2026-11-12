<script lang="ts">
  import Hues from '../games/hues/Hues.svelte'
  import Codenames from '../games/codenames/Codenames.svelte'
  import Pyramide from '../games/pyramide/Pyramide.svelte'
  import Palmier from '../games/palmier/Palmier.svelte'
  import Guess from '../games/guess/Guess.svelte'
  import { session, stopGame } from '../lib/room.svelte'
  import { go } from '../lib/router.svelte'
  const game = $derived(session.state?.game)
  $effect(() => { if (session.state && !session.state.game) go('/salon') })
</script>
<main class="page wide stack">
  {#if game?.id === 'hues'}<Hues view="phone" />{/if}
  {#if game?.id === 'codenames'}<Codenames view="phone" />{/if}
  {#if game?.id === 'pyramide'}<Pyramide view="phone" />{/if}
  {#if game?.id === 'palmier'}<Palmier view="phone" />{/if}
  {#if game?.id === 'guess'}<Guess view="phone" />{/if}
  {#if session.isHost}<button class="btn block" onclick={stopGame}>Arrêter la partie</button>{/if}
</main>
