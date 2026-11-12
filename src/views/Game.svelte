<script lang="ts">
  import Hues from '../games/hues/Hues.svelte'
  import { session, stopGame } from '../lib/room.svelte'
  import { go } from '../lib/router.svelte'
  const game = $derived(session.state?.game)
  $effect(() => { if (session.state && !session.state.game) go('/salon') })
</script>
<main class="page wide stack">
  {#if game?.id === 'hues'}<Hues view="phone" />{/if}
  {#if session.isHost}<button class="btn block" onclick={stopGame}>Arrêter la partie</button>{/if}
</main>
