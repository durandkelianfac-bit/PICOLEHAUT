<script lang="ts">
  import { route } from '../lib/router.svelte'
  const items = [
    { path: '/', label: 'Accueil', d: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
    { path: '/jeux', label: 'Jeux', d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
    { path: '/salon', label: 'Salon', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0z' },
    { path: '/packs', label: 'Packs', d: 'M4 6h16v4H4zM4 12h16v4H4zM4 18h10v2H4z' },
  ]
  const active = (p: string) => (p === '/' ? route.path === '/' : route.path.startsWith(p))
</script>
<nav class="nav glass" aria-label="Navigation">
  {#each items as it}
    <a href={'#' + it.path} class:on={active(it.path)} aria-current={active(it.path) ? 'page' : undefined}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d={it.d} /></svg>
      <span>{it.label}</span>
    </a>
  {/each}
</nav>
<style>
  .nav { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(env(safe-area-inset-bottom) + 12px); width: min(520px, calc(100% - 24px)); height: 64px; border-radius: 999px; display: flex; justify-content: space-around; align-items: center; z-index: 20; box-shadow: var(--shadow-out); }
  a { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: .68rem; color: var(--c-soft); opacity: .7; padding: 6px 16px; border-radius: 999px; transition: .2s; }
  a.on { color: var(--c-on-accent); background: var(--c-accent); opacity: 1; font-weight: 700; }
</style>
