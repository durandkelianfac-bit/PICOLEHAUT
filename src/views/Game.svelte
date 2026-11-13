<script lang="ts">
  import PlayerPanel from '../components/PlayerPanel.svelte'
  import { session, stopGame, leaveRoom } from '../lib/room.svelte'
  import { go } from '../lib/router.svelte'
  $effect(() => { if (session.state && !session.state.game) go('/salon') })
</script>
<main class="page wide stack">
  {#if !session.state}
    <section class="card stack">
      <h3>{session.status === 'error' ? 'Connexion perdue' : 'Retour dans la partie…'}</h3>
      <p class="muted">{session.status === 'error' ? session.error : 'Reconnexion au salon en cours, ça peut prendre quelques secondes.'}</p>
      <button class="btn block" onclick={async () => { await leaveRoom(); go('/') }}>Quitter</button>
    </section>
  {/if}
  <PlayerPanel />
  {#if session.isHost}<button class="btn block" onclick={stopGame}>Arrêter la partie</button>{/if}
</main>
