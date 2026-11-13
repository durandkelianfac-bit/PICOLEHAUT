<script lang="ts">
  import Icon from '../components/Icon.svelte'
  import { games } from '../config/games'
  let q = $state('')
  const list = $derived(games.filter((g) => (g.name + g.tagline).toLowerCase().includes(q.toLowerCase())))
</script>
<main class="page stack">
  <h2>Jeux</h2>
  <input class="input" type="search" placeholder="Rechercher un jeu…" bind:value={q} aria-label="Rechercher" />
  <div class="grid">
    {#each list as g}
      <article class="card tile">
        <div class="emoji" aria-hidden="true"><Icon name={g.icon} size="1.9rem" /></div>
        <h3>{g.name}</h3>
        <p class="muted">{g.tagline}</p>
        <div class="row meta"><span class="chip"><Icon name="users" /> {g.players}</span><span class="chip"><Icon name="timer" /> {g.duration}</span></div>
        {#if !g.ready}<span class="soon">Bientôt</span>{/if}
      </article>
    {:else}
      <p class="muted">Aucun jeu trouvé.</p>
    {/each}
  </div>
</main>
<style>
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .tile { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 16px; }
  .tile h3 { font-size: 1.05rem; }
  .tile p { margin: 0; font-size: .85rem; }
  .emoji { font-size: 2rem; }
  .meta { flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .soon { position: absolute; top: 12px; right: 12px; font-size: .65rem; font-weight: 800; text-transform: uppercase; padding: 3px 8px; border-radius: 99px; background: var(--c-accent); color: var(--c-on-accent); }
  @media (min-width: 720px) { .grid { grid-template-columns: repeat(3, 1fr); } }
</style>
