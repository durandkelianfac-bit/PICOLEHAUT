<script lang="ts">
  // Message plein écran quand on te fait boire : combien, de la part de qui, et un mot taquin.
  // Trois styles : gorgées données par un joueur, cul sec, et cadeau d'un roi.
  import { untrack } from 'svelte'
  import { session } from '../lib/room.svelte'
  import { cheekyLine, culSecLine, royalLine, sipHeadline } from '../lib/cheeky'

  interface Alert { id: string; header: string; headline: string; msg: string; button: string; tag: 'plain' | 'culsec' | 'royal' }
  let queue = $state<Alert[]>([])
  const seen = new Set<string>()
  let primed = false

  $effect(() => {
    const s = session.state
    if (!s) { primed = false; seen.clear(); queue = []; return }
    if (!primed) { s.history.forEach((e) => seen.add(e.id)); primed = true; return }
    const me = session.me?.id
    const mine = s.players.find((p) => p.id === me)
    const fresh: Alert[] = []
    for (const e of [...s.history].reverse()) {
      if (seen.has(e.id)) continue
      seen.add(e.id)
      if (e.kind !== 'drink' || e.playerId !== me || (session.role !== 'player' && !session.plays) || e.n <= 0) continue
      const from = s.players.find((p) => p.id === e.by)?.name ?? 'Quelqu’un'
      // le genre n'accorde les messages que pour le Palmier, pour l'instant
      const gender = e.game === 'palmier' ? mine?.gender : undefined
      if (e.tag === 'royal' && e.by) {
        fresh.push({ id: e.id, tag: 'royal', header: `🎁 Un petit cadeau de ${from} 👑`, headline: sipHeadline(e.n, s.sober), msg: royalLine(e.id, gender), button: 'Merci, Majesté !' })
      } else if (e.tag === 'culsec') {
        fresh.push({ id: e.id, tag: 'culsec', header: e.by ? `${from} t’offre un` : 'Tu as pioché un As noir :', headline: 'CUL SEC !', msg: culSecLine(e.id, gender), button: s.sober ? 'À fond !' : 'Santé !' })
      } else if (e.by) {
        fresh.push({ id: e.id, tag: 'plain', header: `${from} te donne`, headline: sipHeadline(e.n, s.sober), msg: cheekyLine(e.id, gender), button: s.sober ? 'Compris !' : 'Glou glou !' })
      }
    }
    if (fresh.length) {
      untrack(() => { queue = [...queue, ...fresh] })
      try { navigator.vibrate?.([120, 60, 120]) } catch { /* non supporté */ }
    }
  })

  const top = $derived(queue[0])
  const close = () => { queue = queue.slice(1) }
  $effect(() => {
    if (!top) return
    const t = setTimeout(close, 9000)
    return () => clearTimeout(t)
  })
</script>

{#if top}
  <div class="veil" role="alertdialog" aria-live="assertive" aria-label="Gorgées reçues">
    {#key top.id}
      <div class="card box {top.tag}">
        <div class="from">{top.header}</div>
        <div class="n">{top.headline}</div>
        <p class="msg">« {top.msg} »</p>
        <button class="btn primary block" onclick={close}>{top.button}</button>
        {#if queue.length > 1}<span class="muted">+ {queue.length - 1} autre{queue.length > 2 ? 's' : ''}</span>{/if}
      </div>
    {/key}
  </div>
{/if}

<style>
  .veil { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 24px; background: rgb(20 20 19 / .86); backdrop-filter: blur(8px); }
  .box { max-width: 380px; width: 100%; text-align: center; display: flex; flex-direction: column; gap: 12px; animation: pop .35s var(--ease) both; border-top: 6px solid var(--c-accent); }
  .box.royal { border-top-color: #b98cff; background: linear-gradient(160deg, #3b3550, var(--c-surface) 55%); }
  .box.culsec { border-top-color: var(--c-danger); }
  .box.culsec .n { color: var(--c-danger); }
  .from { color: var(--c-soft); font-weight: 600; }
  .n { font-family: var(--font-display); font-size: 3rem; color: var(--c-accent); line-height: 1; }
  .box.royal .n { color: #d7b9ff; }
  .msg { margin: 0; font-size: 1.25rem; font-weight: 700; line-height: 1.3; }
  @keyframes pop { from { opacity: 0; transform: scale(.85) rotate(-2deg); } to { opacity: 1; transform: none; } }
</style>
