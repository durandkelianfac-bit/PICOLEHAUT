<script lang="ts">
  // Course-poursuite des joueurs dans le salon : les robots 3D courent en file, un seul rendu WebGL pour tous.
  // Repli automatique sur la version à vignettes (ChaseFlat) si WebGL ou le modèle est indisponible,
  // ou si l'appareil demande moins d'animations.
  import ChaseFlat from './ChaseFlat.svelte'
  import type { Player } from '../lib/room.svelte'
  let { players }: { players: Player[] } = $props()

  const CROSS_S = 7 // secondes pour traverser l'écran
  let canvas = $state<HTMLCanvasElement>()
  let failed = $state(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  let ready = $state(false)

  // on reconstruit la scène quand la liste (ou l'apparence) des joueurs change
  const key = $derived(players.map((p) => `${p.id}|${p.avatar}|${p.color}|${p.connected ? 1 : 0}`).join(';'))

  $effect(() => {
    const el = canvas
    void key
    if (!el || failed) return
    const list = players.map((p) => ({ avatar: p.avatar, color: p.color, off: !p.connected }))
    let dead = false
    let d = () => {}
    run(el, list).then((x) => { if (dead) x(); else d = x }).catch(() => (failed = true))
    return () => { dead = true; d() }
  })

  async function run(el: HTMLCanvasElement, list: { avatar: string; color: string; off: boolean }[]) {
    const kit = await import('../lib/avatar3d')
    const built = await Promise.all(list.map((p) => kit.buildAvatar(p.avatar, p.color, 'Running')))
    const THREE = built[0]?.THREE ?? (await kit.buildAvatar('idle', '#ffffff')).THREE
    const renderer = new THREE.WebGLRenderer({ canvas: el, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    const scene = new THREE.Scene()
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2))
    const sun = new THREE.DirectionalLight(0xffffff, 2.6)
    sun.position.set(2, 4, 5)
    scene.add(sun)
    // hauteur d'un robot en unités du modèle (pose de course), pour tout dimensionner autour
    let H = 1
    built.forEach((b, i) => {
      b.mixer.setTime(0.2)
      b.model.updateMatrixWorld(true)
      if (i === 0) { const box = new THREE.Box3().setFromObject(b.model); H = box.max.y - box.min.y || 1 }
      b.model.rotation.y = Math.PI / 2 - 0.45 // de 3/4 : on voit la course et le visage
      if (list[i].off) b.model.traverse((o) => { const m = (o as import('three').Mesh).material as any; if (m) (Array.isArray(m) ? m : [m]).forEach((x: any) => { x.transparent = true; x.opacity = 0.4 }) })
      scene.add(b.model)
    })
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -H * 20, H * 20)
    camera.position.set(0, 0, H * 5)
    const timer = new THREE.Timer()
    let raf = 0
    let w = 0, h = 0, worldW = 1
    const layout = () => {
      const cw = el.clientWidth, ch = el.clientHeight
      if (cw === w && ch === h) return
      w = cw; h = ch
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      renderer.setSize(w, h, false)
      const viewH = H * 1.5
      worldW = viewH * (w / h)
      camera.left = -worldW / 2; camera.right = worldW / 2; camera.top = viewH * 0.86; camera.bottom = -viewH * 0.14
      camera.updateProjectionMatrix()
    }
    const t0 = performance.now()
    const loop = () => {
      timer.update()
      const dt = timer.getDelta()
      layout()
      const t = (performance.now() - t0) / 1000
      const span = worldW + H * 1.4 + built.length * H * 0.15
      const speed = span / CROSS_S
      built.forEach((b, i) => {
        b.mixer.update(dt)
        const gap = H * 0.95
        const x = ((((t * speed - i * gap) % span) + span) % span) - worldW / 2 - H * 0.7
        b.model.position.set(x, 0, 0)
        // pieds posés sur la même ligne pour tous
        b.model.position.y = -H * 0.0
      })
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    loop()
    ready = true
    return () => { cancelAnimationFrame(raf); renderer.dispose() }
  }
</script>

{#if failed}
  <ChaseFlat {players} />
{:else}
  <div class="track" aria-hidden="true"><canvas bind:this={canvas}></canvas>{#if !ready}<span class="load">…</span>{/if}</div>
{/if}

<style>
  .track { position: relative; height: 170px; border-radius: 20px; background: var(--c-bg); box-shadow: var(--shadow-in); overflow: hidden; }
  canvas { width: 100%; height: 100%; display: block; }
  .load { position: absolute; inset: 0; display: grid; place-items: center; color: var(--c-soft); }
</style>
