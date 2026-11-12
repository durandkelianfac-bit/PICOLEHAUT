<script lang="ts">
  // Personnage 3D temps réel du hero (fond transparent), parallaxe pilotée par x et y (-1 à 1).
  import { onMount } from 'svelte'
  let { x = 0, y = 0, color = '#F5CB5C', look = 'wave+tophat', onready }: { x?: number; y?: number; color?: string; look?: string; onready?: () => void } = $props()

  let canvas: HTMLCanvasElement
  let px = 0, py = 0 // valeurs courantes lues par la boucle de rendu
  $effect(() => { px = x; py = y })

  onMount(() => {
    let raf = 0
    let stop = false
    let cleanup = () => {}
    ;(async () => {
      try {
        const kit = await import('../lib/avatar3d')
        const { THREE, model, mixer } = await kit.buildAvatar(look, color)
        if (stop) return
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
        renderer.setClearColor(0x000000, 0)
        const scene = new THREE.Scene()
        scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2), model)
        const sun = new THREE.DirectionalLight(0xffffff, 2.6)
        sun.position.set(2, 4, 5)
        scene.add(sun)
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
        const resize = () => {
          const w = canvas.clientWidth, h = canvas.clientHeight
          renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
          renderer.setSize(w, h, false)
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          kit.frame(THREE, camera, model, false)
        }
        resize()
        addEventListener('resize', resize)
        const timer = new THREE.Timer()
        const loop = () => {
          timer.update()
          if (!reduce) mixer.update(timer.getDelta())
          else mixer.setTime(0.5)
          model.rotation.y += (px * 0.55 - model.rotation.y) * 0.08
          model.rotation.x += (py * 0.12 - model.rotation.x) * 0.08
          renderer.render(scene, camera)
          raf = requestAnimationFrame(loop)
        }
        loop()
        onready?.()
        cleanup = () => { removeEventListener('resize', resize); renderer.dispose() }
      } catch { /* WebGL ou modèle indisponible : le placeholder SVG reste affiché */ }
    })()
    return () => { stop = true; cancelAnimationFrame(raf); cleanup() }
  })
</script>
<canvas bind:this={canvas} aria-hidden="true"></canvas>
<style>canvas { width: 100%; height: 100%; display: block; }</style>
