<script lang="ts">
  import { onMount } from 'svelte'
  import { go } from '../lib/router.svelte'
  import HeroAvatar3D from '../components/HeroAvatar3D.svelte'
  let x = $state(0), y = $state(0)
  let ready = $state(false) // personnage 3D prêt : le placeholder SVG s'efface

  // Parallaxe : gyroscope si autorisé (iOS : permission après un geste), sinon souris.
  function onOrient(e: DeviceOrientationEvent) {
    x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30))
    y = Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 30))
  }
  async function enableGyro() {
    // DeviceOrientationEvent n'existe pas sur tous les navigateurs (ordinateurs, notamment)
    const D = (globalThis as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent
    if (!D) return
    try {
      if (typeof D.requestPermission === 'function') { if ((await D.requestPermission()) !== 'granted') return }
      addEventListener('deviceorientation', onOrient)
    } catch { /* indisponible */ }
  }
  function onMouse(e: MouseEvent) { x = (e.clientX / innerWidth - 0.5) * 2; y = (e.clientY / innerHeight - 0.5) * 2 }
  onMount(() => {
    const D = (globalThis as { DeviceOrientationEvent?: { requestPermission?: unknown } }).DeviceOrientationEvent
    if (D && typeof D.requestPermission !== 'function') addEventListener('deviceorientation', onOrient)
    return () => removeEventListener('deviceorientation', onOrient)
  })
</script>

<svelte:window onmousemove={onMouse} onpointerdown={enableGyro} />

<main class="page hero">
  <header class="menu"><a href="#/jeux">Jeux</a><a href="#/regles">Règles</a><a href="#/rejoindre">Rejoindre</a></header>

  <section class="stage">
    <h1 class="title"><span>Picole</span><span>Haut</span></h1>
    <!-- Personnage 3D (Three.js, chargé à la demande) ; le SVG sert de placeholder tant qu'il n'est pas prêt. -->
    <div class="avatar3d" class:on={ready} style="transform: translate({x * 10}px, {y * 8}px)"><HeroAvatar3D {x} {y} onready={() => (ready = true)} /></div>
    <svg class="avatar" class:off={ready} style="transform: translate({x * 14}px, {y * 10}px)" viewBox="0 0 200 240" aria-hidden="true">
      <defs>
        <radialGradient id="skin" cx="38%" cy="30%"><stop offset="0" stop-color="#ffe9b8" /><stop offset="1" stop-color="#F5CB5C" /></radialGradient>
      </defs>
      <ellipse cx="100" cy="228" rx="62" ry="10" fill="#000" opacity=".35" />
      <path d="M52 232c0-44 22-64 48-64s48 20 48 64z" fill="#CFDBD5" />
      <circle cx="100" cy="110" r="68" fill="url(#skin)" />
      <path d="M40 98c2-46 38-66 70-60 34 6 52 32 50 60-16-22-40-30-62-28-24 0-44 10-58 28z" fill="#333533" />
      <circle cx="76" cy="116" r="11" fill="#fff" /><circle cx="124" cy="116" r="11" fill="#fff" />
      <circle cx="78" cy="118" r="6" fill="#242423" /><circle cx="126" cy="118" r="6" fill="#242423" />
      <path d="M72 148q28 24 56 0" stroke="#242423" stroke-width="7" fill="none" stroke-linecap="round" />
      <path d="M148 168l14-30 10 4-6 30z" fill="#E8EDDF" opacity=".9" />
    </svg>
  </section>

  <p class="muted lead">Des jeux entre amis, à boire (ou pas). Un téléphone chacun, zéro compte.</p>
  <div class="stack">
    <button class="btn primary block" onclick={() => go('/creer')}>Créer un salon</button>
    <button class="btn block" onclick={() => go('/rejoindre')}>Rejoindre avec un code</button>
  </div>
</main>

<style>
  .hero { display: flex; flex-direction: column; gap: 18px; overflow: hidden; }
  .menu { display: flex; gap: 22px; justify-content: center; font-size: .85rem; letter-spacing: .12em; text-transform: uppercase; color: var(--c-soft); }
  .menu a:hover { color: var(--c-accent); }
  .stage { position: relative; display: grid; place-items: center; min-height: 410px; margin-top: 8px; align-items: end; }
  .title { position: absolute; top: 0; left: 0; right: 0; z-index: 1; text-align: center; font-size: clamp(3.4rem, 22vw, 6.6rem); display: flex; flex-direction: column; color: var(--c-text); }
  .title span:last-child { color: var(--c-accent); }
  .avatar { grid-area: 1 / 1; position: relative; z-index: 2; width: 40%; max-width: 170px; margin-top: 0; filter: drop-shadow(0 18px 24px rgb(0 0 0 / .5)); transition: transform .12s linear; }
  .avatar.off { display: none; }
  .avatar3d { position: relative; z-index: 2; width: 58%; max-width: 230px; aspect-ratio: 4 / 5; margin-top: 0; grid-area: 1 / 1; opacity: 0; transition: opacity .4s; filter: drop-shadow(0 18px 24px rgb(0 0 0 / .5)); }
  .avatar3d.on { opacity: 1; }
  .lead { text-align: center; margin: 0; }
</style>
