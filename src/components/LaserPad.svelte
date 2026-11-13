<script lang="ts">
  import Icon from './Icon.svelte'
  import { onMount } from 'svelte'
  import { enableLaser, recenter, laserClick, laser } from '../lib/pointer.svelte'
  let { playerId, label = 'Tape pour désigner' }: { playerId: string; label?: string } = $props()

  // Retour visuel : le capteur répond-il ? (sinon on explique quoi vérifier)
  let now = $state(Date.now())
  onMount(() => { const t = setInterval(() => (now = Date.now()), 500); return () => clearInterval(t) })
  const waiting = $derived(laser.active && laser.events === 0 && now - laser.since > 2000)
</script>
{#if !laser.active}
  <button class="btn primary block" onclick={() => enableLaser(playerId)}>Activer le pointeur laser</button>
  {#if laser.denied}<span class="muted" role="alert">Permission refusée : autorise « Mouvement et orientation » dans les réglages du navigateur (iPhone : Réglages › Safari).</span>{/if}
  {#if !laser.supported}<span class="muted" role="alert">Cet appareil n’a pas de capteur de mouvement.</span>{/if}
{:else}
  <div class="status" class:ok={laser.events > 0} role="status">
    {#if laser.events > 0}<Icon name="dot" /> Capteur actif — bouge le téléphone pour viser{:else if waiting}<Icon name="warn" /> Aucun mouvement détecté : vérifie que le capteur est autorisé et que la page est en https{:else}… démarrage du capteur{/if}
  </div>
  <button class="btn block big" onclick={laserClick}><Icon name="target" /> {label}</button>
  <button class="btn block" onclick={recenter}>Recentrer</button>
{/if}
<style>
  .big { min-height: 96px; font-size: 1.2rem; }
  .status { font-size: .8rem; text-align: center; color: var(--c-soft); }
  .status.ok { color: #6ec6a0; }
</style>
