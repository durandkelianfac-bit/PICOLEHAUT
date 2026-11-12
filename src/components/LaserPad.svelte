<script lang="ts">
  import { enableLaser, recenter, laserClick, laser } from '../lib/pointer.svelte'
  let { playerId, label = 'Tape pour désigner' }: { playerId: string; label?: string } = $props()
</script>
{#if !laser.active}
  <button class="btn primary block" onclick={() => enableLaser(playerId)}>Activer le pointeur laser</button>
  {#if laser.denied}<span class="muted">Permission refusée : autorise le capteur de mouvement dans les réglages du navigateur.</span>{/if}
{:else}
  <button class="btn block big" onclick={laserClick}>🎯 {label}</button>
  <button class="btn block" onclick={recenter}>Recentrer</button>
{/if}
<style>.big { min-height: 96px; font-size: 1.2rem; }</style>
