<script lang="ts">
  import Icon from './Icon.svelte'
  // Pavé tactile : le doigt déplace le pointeur sur l'écran central (alternative au gyroscope, plus fiable).
  // Fond noir quadrillé ; « Poser ici » envoie un clic à la position courante.
  import { sendLaser } from '../lib/room.svelte'
  let { playerId, label = 'Poser le pion ici' }: { playerId: string; label?: string } = $props()
  let pad: HTMLDivElement
  let x = $state(0.5), y = $state(0.5)
  let touched = $state(false)
  let last = 0

  function move(e: PointerEvent, force = false) {
    const r = pad.getBoundingClientRect()
    x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))
    touched = true
    const now = performance.now()
    if (force || now - last > 33) { last = now; sendLaser({ id: playerId, x, y }) }
  }
  const down = (e: PointerEvent) => { pad.setPointerCapture(e.pointerId); move(e, true) }
  const drag = (e: PointerEvent) => { if (e.buttons || e.pointerType === 'touch') move(e) }
  const up = (e: PointerEvent) => move(e, true)
</script>

<div class="wrap stack">
  <div class="pad" bind:this={pad} role="application" aria-label="Pavé tactile : glisse le doigt pour déplacer le pointeur sur l’écran central"
    onpointerdown={down} onpointermove={drag} onpointerup={up}>
    {#if touched}<div class="cross" style="left:{x * 100}%;top:{y * 100}%"></div>{:else}<span class="hint">Glisse ton doigt ici pour viser l’écran</span>{/if}
  </div>
  <button class="btn primary block big" disabled={!touched} onclick={() => sendLaser({ id: playerId, x, y, click: true })}><Icon name="target" /> {label}</button>
</div>

<style>
  .pad { position: relative; aspect-ratio: 16 / 10; width: 100%; border-radius: 16px; touch-action: none; user-select: none; overflow: hidden;
    background-color: #0b0b0a;
    background-image: linear-gradient(#2c2c2a 1px, transparent 1px), linear-gradient(90deg, #2c2c2a 1px, transparent 1px);
    background-size: 10% 12.5%; box-shadow: inset 0 0 0 2px #333533; }
  .hint { position: absolute; inset: 0; display: grid; place-items: center; color: var(--c-soft); font-size: .85rem; text-align: center; padding: 12px; }
  .cross { position: absolute; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%; border: 3px solid var(--c-accent); box-shadow: 0 0 12px var(--c-accent); pointer-events: none; }
  .cross::before, .cross::after { content: ''; position: absolute; background: var(--c-accent); }
  .cross::before { left: 50%; top: -9px; bottom: -9px; width: 2px; margin-left: -1px; }
  .cross::after { top: 50%; left: -9px; right: -9px; height: 2px; margin-top: -1px; }
  .big { min-height: 72px; font-size: 1.1rem; }
</style>
