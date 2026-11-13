<script lang="ts">
  // Les avatars des joueurs se courent après dans le salon (CSS pur, vignettes déjà générées : léger).
  import Avatar from './Avatar.svelte'
  import type { Player } from '../lib/room.svelte'
  let { players }: { players: Player[] } = $props()
  const SIZE = 56
  const DURATION = 7 // secondes pour traverser l'écran
</script>

<div class="track" aria-hidden="true" style="--size:{SIZE}px">
  {#each players as p, i (p.id)}
    <!-- chacun part un peu après le précédent : ils se poursuivent en file -->
    <div class="runner" class:off={!p.connected} style="--d:{DURATION}s; --delay:{-(i * 0.9)}s; --bob:{0.45 + (i % 3) * 0.05}s">
      <div class="bob"><Avatar name={p.name} color={p.color} look={p.avatar} size={SIZE} /></div>
      <span class="nm">{p.name}</span>
    </div>
  {/each}
</div>

<style>
  .track { container-type: inline-size; position: relative; height: calc(var(--size) + 56px); overflow: hidden; border-radius: 20px; background: var(--c-bg); box-shadow: var(--shadow-in); }
  .track::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: 16px; height: 3px; border-radius: 3px; background: color-mix(in srgb, var(--c-soft) 35%, transparent); }
  .runner { position: absolute; left: 0; bottom: 20px; display: flex; flex-direction: column; align-items: center; width: var(--size); animation: run var(--d) linear infinite; animation-delay: var(--delay); }
  .runner.off { opacity: .4; }
  .bob { animation: bob var(--bob) ease-in-out infinite alternate; }
  .nm { font-size: .62rem; color: var(--c-soft); max-width: 72px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
  @keyframes run { from { transform: translateX(calc(-1 * var(--size))); } to { transform: translateX(100cqw); } }
  @keyframes bob { from { transform: translateY(0) rotate(-4deg); } to { transform: translateY(-9px) rotate(4deg); } }
  @media (prefers-reduced-motion: reduce) {
    .runner { animation: none; position: static; display: inline-flex; margin: 4px; }
    .track { display: flex; justify-content: center; align-items: end; flex-wrap: wrap; }
    .bob { animation: none; }
  }
</style>
