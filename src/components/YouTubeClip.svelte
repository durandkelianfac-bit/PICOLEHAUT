<script lang="ts">
  // Lecteur YouTube (IFrame API) d'un extrait [start, end], son d'origine coupé par défaut.
  // Pas de composant tiers : l'API officielle est chargée à la demande.
  import { onMount } from 'svelte'
  import { loadYouTubeApi as loadApi } from '../lib/youtube'

  let { videoId, start, end, ontime, onend }: { videoId: string; start: number; end: number; ontime?: (t: number) => void; onend?: () => void } = $props()

  let host: HTMLDivElement
  let player: any = null
  let ready = $state(false)
  let failed = $state(false)
  let raf = 0
  let playing = false

  /** Joue l'extrait depuis le début. */
  export function play(muted = true) {
    if (!player || !ready) return
    muted ? player.mute() : player.unMute()
    player.seekTo(start, true)
    player.playVideo()
    playing = true
    tick()
  }
  export function stop() { playing = false; player?.pauseVideo?.() }

  function tick() {
    cancelAnimationFrame(raf)
    const loop = () => {
      if (!playing || !player) return
      const t = (player.getCurrentTime?.() ?? start) - start
      ontime?.(Math.max(0, t))
      if (t >= end - start - 0.05) { playing = false; player.pauseVideo(); onend?.(); return }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
  }

  onMount(() => {
    let dead = false
    loadApi().then((YT) => {
      if (dead) return
      player = new YT.Player(host, {
        videoId, width: '100%', height: '100%',
        playerVars: { start: Math.floor(start), end: Math.ceil(end), controls: 0, modestbranding: 1, rel: 0, playsinline: 1, disablekb: 1, fs: 0, iv_load_policy: 3 },
        events: { onReady: () => { player.mute(); ready = true }, onError: () => (failed = true) },
      })
    }).catch(() => (failed = true))
    return () => { dead = true; cancelAnimationFrame(raf); try { player?.destroy() } catch { /* ignoré */ } }
  })
</script>

<div class="frame">
  <div bind:this={host}></div>
  {#if failed}<p class="err">Vidéo indisponible (intégration refusée ou hors ligne).</p>{/if}
</div>
<style>
  .frame { position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: var(--r-card); overflow: hidden; background: #000; box-shadow: var(--shadow-out); }
  .frame :global(iframe) { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; pointer-events: none; }
  .err { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; padding: 16px; margin: 0; color: var(--c-soft); }
</style>
