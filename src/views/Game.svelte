<script lang="ts">
  import PlayerPanel from '../components/PlayerPanel.svelte'
  import { session, stopGame } from '../lib/room.svelte'
  import { go } from '../lib/router.svelte'
  $effect(() => { if (session.state && !session.state.game) go('/salon') })
</script>
<main class="page wide stack">
  <PlayerPanel />
  {#if session.isHost}<button class="btn block" onclick={stopGame}>Arrêter la partie</button>{/if}
</main>
