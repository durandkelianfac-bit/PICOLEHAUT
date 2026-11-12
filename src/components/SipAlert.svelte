<script lang="ts">
  // Message plein écran quand quelqu'un te donne des gorgées : combien, de la part de qui, et un mot taquin.
  import { untrack } from 'svelte'
  import { session } from '../lib/room.svelte'
  import { cheekyLine, sipHeadline } from '../lib/cheeky'

  interface Alert { id: string; n: number; from: string; msg: string; sober: boolean }
  let queue = $state<Alert[]>([])
  const seen = new Set<string>()
  let primed = false

  $effect(() => {
    const s = session.state
    if (!s) { primed = false; seen.clear(); queue = []; return }
    if (!primed) { s.history.forEach((e) => seen.add(e.id)); primed = true; return }
    const me = session.me?.id
    const fresh: Alert[] = []
    for (const e of [...s.history].reverse()) {
      if (seen.has(e.id)) continue
      seen.add(e.id)
      if (e.kind === 'drink' && e.by && e.playerId === me && session.role === 'player' && e.n > 0) {
        fresh.push({ id: e.id, n: e.n, from: s.players.find((p) => p.id === e.by)?.name ?? 'Quelqu’un', msg: cheekyLine(e.id), sober: s.sober })
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
      <div class="card box">
        <div class="from">{top.from} te donne</div>
        <div class="n">{sipHeadline(top.n, top.sober)}</div>
        <p class="msg">« {top.msg} »</p>
        <button class="btn primary block" onclick={close}>{top.sober ? 'Compris !' : 'Glou glou !'}</button>
        {#if queue.length > 1}<span class="muted">+ {queue.length - 1} autre{queue.length > 2 ? 's' : ''}</span>{/if}
      </div>
    {/key}
  </div>
{/if}

<style>
  .veil { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 24px; background: rgb(20 20 19 / .86); backdrop-filter: blur(8px); }
  .box { max-width: 380px; width: 100%; text-align: center; display: flex; flex-direction: column; gap: 12px; animation: pop .35s var(--ease) both; border-top: 6px solid var(--c-accent); }
  .from { color: var(--c-soft); font-weight: 600; }
  .n { font-family: var(--font-display); font-size: 3rem; color: var(--c-accent); line-height: 1; }
  .msg { margin: 0; font-size: 1.25rem; font-weight: 700; line-height: 1.3; }
  @keyframes pop { from { opacity: 0; transform: scale(.85) rotate(-2deg); } to { opacity: 1; transform: none; } }
</style>
