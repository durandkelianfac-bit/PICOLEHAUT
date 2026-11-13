<script lang="ts">
  // Assistant d'extrait pour le Doublage : on regarde la vidéo et on appuie sur « Voix ici » à chaque réplique.
  // (L'audio d'une vidéo YouTube intégrée n'est pas accessible au site : le repérage se fait donc à la main,
  // mais le temps et le format sont calculés automatiquement.)
  import { onMount } from 'svelte'
  import { loadYouTubeApi } from '../lib/youtube'
  import { youtubeId, parseClip } from '../games/doublage/logic'
  import { updatePacks, newItem, packsStore } from '../lib/packs.svelte'

  let url = $state('')
  let title = $state('')
  let vid = $state<string | null>(null)
  let host: HTMLDivElement | undefined = $state()
  let player: any = null
  let now = $state(0)
  let markers = $state<{ t: number; text: string }[]>([])
  let startAt = $state<number | null>(null)
  let endAt = $state<number | null>(null)
  let msg = $state('')

  const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`
  const sorted = $derived([...markers].sort((a, b) => a.t - b.t))
  const start = $derived(startAt ?? Math.max(0, Math.floor((sorted[0]?.t ?? 0) - 1)))
  const end = $derived(endAt ?? Math.ceil((sorted.at(-1)?.t ?? start + 10) + 4))
  const line = $derived(
    vid && sorted.length ? [vid, start, end, title.trim() || 'Sans titre', sorted.map((m) => `${Math.max(0, m.t - start).toFixed(1)}:${m.text.trim() || '___'}`).join(' ## ')].join(' | ') : '',
  )
  const valid = $derived(!!line && !!parseClip(line))

  function load() {
    vid = youtubeId(url)
    markers = []; startAt = endAt = null; msg = vid ? '' : 'Lien YouTube invalide.'
    try { player?.destroy() } catch { /* ignoré */ }
    player = null
  }
  $effect(() => {
    const id = vid, el = host
    if (!id || !el) return
    let dead = false
    loadYouTubeApi().then((YT) => {
      if (dead) return
      player = new YT.Player(el, { videoId: id, width: '100%', height: '100%', playerVars: { playsinline: 1, rel: 0, modestbranding: 1 } })
    }).catch(() => (msg = 'YouTube indisponible.'))
    return () => { dead = true }
  })
  onMount(() => { const t = setInterval(() => { now = player?.getCurrentTime?.() ?? now }, 200); return () => clearInterval(t) })

  const mark = () => { markers.push({ t: Math.round(now * 10) / 10, text: '___' }) }
  function add() {
    const cat = packsStore.packs.doublage?.categories[0]
    if (!valid || !cat) return
    updatePacks((p) => p.doublage.categories[0].items.push(newItem(line)))
    msg = `Ajouté à « ${cat.name} » ✔`
    vid = null; url = ''; title = ''; markers = []
  }
</script>

<section class="card stack">
  <strong>🎬 Créer un extrait depuis un lien YouTube</strong>
  <form class="row" onsubmit={(e) => { e.preventDefault(); load() }}>
    <input class="input" bind:value={url} placeholder="Colle le lien YouTube" aria-label="Lien YouTube" /><button class="btn">Charger</button>
  </form>
  {#if msg}<span class="muted" role="status">{msg}</span>{/if}
  {#if vid}
    <div class="frame"><div bind:this={host}></div></div>
    <div class="row wrap">
      <span class="chip">⏱ {fmt(now)}</span>
      <button class="btn primary" onclick={mark}>🎤 Voix ici</button>
      <button class="btn" onclick={() => (startAt = Math.floor(now))}>Début ici</button>
      <button class="btn" onclick={() => (endAt = Math.ceil(now))}>Fin ici</button>
    </div>
    <span class="muted">Lance la vidéo, appuie sur « Voix ici » à chaque fois que quelqu'un parle. Extrait : {fmt(start)} → {fmt(end)}. Début et fin se règlent d'eux-mêmes, ou avec les boutons.</span>
    {#each sorted as m}
      <div class="row"><span class="chip">{fmt(Math.max(0, m.t - start))}</span><input class="input" bind:value={m.text} aria-label="Réplique à {fmt(m.t)}" placeholder="___ (trait à remplir par le joueur)" />
        <button class="btn" aria-label="Retirer" onclick={() => (markers = markers.filter((x) => x !== m))}>✕</button></div>
    {/each}
    <input class="input" bind:value={title} placeholder="Titre de l'extrait" aria-label="Titre" />
    <button class="btn primary block" disabled={!valid} onclick={add}>Ajouter au pack Doublage</button>
  {/if}
</section>

<style>
  .frame { position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 16px; overflow: hidden; background: #000; }
  .frame :global(iframe) { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  .wrap { flex-wrap: wrap; }
</style>
