<script lang="ts">
  // Mini-jeu de la tour (écran table) : le téléphone du joueur pilote la carte (laser : x = position,
  // y = inclinaison), un tap la lâche. Moteur physique 2D : Matter.js.
  import { onMount } from 'svelte'
  import Matter from 'matter-js'
  import { session, onLaserClick } from '../../lib/room.svelte'

  let { active, playerId, onresult }: { active: boolean; playerId: string; onresult: (r: 'placed' | 'collapsed') => void } = $props()

  const W = 600, H = 900, CW = 64, CH = 90, PLAT_Y = H - 60, PLAT_W = 240, PLAT_H = 24
  let canvas: HTMLCanvasElement
  let engine: Matter.Engine
  let platform: Matter.Body
  let cards: Matter.Body[] = []
  let held: Matter.Body | null = null
  let released = false
  let calm = 0
  let releasedAt = 0
  let reported = false

  const platTop = PLAT_Y - PLAT_H / 2
  const towerTop = () => Math.min(platTop, ...cards.filter((c) => c !== held).map((c) => c.bounds.min.y))

  function spawn() {
    held = Matter.Bodies.rectangle(W / 2, towerTop() - 160, CW, CH, {
      isSensor: true, friction: 0.8, frictionStatic: 1, restitution: 0, density: 0.002, chamfer: { radius: 4 },
    })
    cards.push(held)
    Matter.Composite.add(engine.world, held)
    released = false; calm = 0; reported = false
  }
  function clearTower() {
    for (const c of cards) Matter.Composite.remove(engine.world, c)
    cards = []; held = null
  }
  function report(r: 'placed' | 'collapsed') {
    if (reported) return
    reported = true
    if (r === 'collapsed') clearTower()
    else held = null
    onresult(r)
  }

  // Quand c'est à un joueur de poser : on fait apparaître une carte.
  // `active` doit être lu AVANT tout retour anticipé : sinon l'effet ne dépend de rien et ne se relance jamais
  $effect(() => {
    const on = active
    if (!engine || !on) return
    if (!held) spawn()
  })

  onMount(() => {
    engine = Matter.Engine.create({ gravity: { x: 0, y: 1 }, positionIterations: 10, velocityIterations: 8 })
    platform = Matter.Bodies.rectangle(W / 2, PLAT_Y, PLAT_W, PLAT_H, { isStatic: true, friction: 1 })
    Matter.Composite.add(engine.world, platform)
    // sonde de débogage pour les tests automatiques (jamais dans la version publiée)
    if (import.meta.env.DEV) (window as unknown as { __tower: unknown }).__tower = { info: () => ({ cards: cards.length, held: !!held, released, active, reported, calm, speed: held?.speed, ang: held?.angularSpeed, y: held?.position.y, x: held?.position.x }) }
    const ctx2d = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()

    const offClick = onLaserClick((m) => {
      if (m.id === playerId && active && held && !released) {
        // la carte devient solide et tombe (setStatic(false) donnait des positions NaN avec Matter)
        held.isSensor = false
        Matter.Body.setVelocity(held, { x: 0, y: 0 })
        Matter.Body.setAngularVelocity(held, 0)
        released = true; releasedAt = performance.now(); calm = 0
      }
    })

    function frame(t: number) {
      const dt = Math.min(32, t - last); last = t
      // pilotage de la carte tenue
      if (held && !released) {
        const p = session.pointers[playerId]
        const x = p ? W * (0.15 + 0.7 * p.x) : W / 2
        const angle = p ? (p.y - 0.5) * 1.6 : 0
        Matter.Body.setPosition(held, { x, y: towerTop() - 160 })
        Matter.Body.setAngle(held, angle)
        // la gravité s'applique à chaque pas : on annule la vitesse pour que la carte reste là où on la tient
        Matter.Body.setVelocity(held, { x: 0, y: 0 })
        Matter.Body.setAngularVelocity(held, 0)
      }
      Matter.Engine.update(engine, Math.min(dt, 16.667))

      // détection : effondrement, ou carte posée et immobile
      if (released && held && !reported) {
        const fallen = cards.some((c) => c.position.y > platTop + 30)
        if (fallen) report('collapsed')
        else {
          // Matter garde une petite agitation sur un corps au repos : seuils tolérants
          const still = held.speed < 0.35 && Math.abs(held.angularSpeed) < 0.03
          calm = still ? calm + 1 : 0
          if (calm > 45 || t - releasedAt > 7000) report('placed')
        }
      } else if (!released && !reported && cards.some((c) => c !== held && c.position.y > platTop + 30)) {
        report('collapsed')
      }

      // dessin, vue ajustée à la hauteur de la tour
      const cw = canvas.width, ch = canvas.height
      ctx2d.clearRect(0, 0, cw, ch)
      const top = towerTop() - 260
      const scale = Math.min(cw / W, ch / Math.max(H, PLAT_Y + 40 - top))
      ctx2d.save()
      ctx2d.scale(scale, scale)
      // le bas de la plateforme reste en bas de l'écran ; la vue monte avec la tour
      ctx2d.translate((cw / scale - W) / 2, ch / scale - (PLAT_Y + 40))
      const draw = (b: Matter.Body, fill: string, stroke: string) => {
        ctx2d.beginPath()
        b.vertices.forEach((v, i) => (i ? ctx2d.lineTo(v.x, v.y) : ctx2d.moveTo(v.x, v.y)))
        ctx2d.closePath(); ctx2d.fillStyle = fill; ctx2d.fill(); ctx2d.strokeStyle = stroke; ctx2d.lineWidth = 3; ctx2d.stroke()
      }
      draw(platform, '#333533', '#CFDBD5')
      for (const c of cards) draw(c, c === held && !released ? '#F5CB5C' : '#E8EDDF', '#242423')
      ctx2d.restore()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); offClick(); Matter.Engine.clear(engine) }
  })
</script>

<canvas bind:this={canvas} width="720" height="900" aria-label="Tour de cartes"></canvas>

<style>
  canvas { width: 100%; max-height: 78vh; background: radial-gradient(circle at 50% 100%, #333533, #242423 70%); border-radius: var(--r-card); box-shadow: var(--shadow-in); }
</style>
