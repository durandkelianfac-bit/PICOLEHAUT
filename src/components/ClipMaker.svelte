<script lang="ts">
  import Icon from './Icon.svelte'
  // Assistant d'extrait pour le Doublage : on regarde la vidéo et on appuie sur « Voix ici » à chaque réplique.
  // (L'audio d'une vidéo YouTube intégrée n'est pas accessible au site : le repérage se fait donc à la main,
  // mais le temps et le format sont calculés automatiquement.)
  import { onMount, onDestroy } from 'svelte'
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

  // --- Détection automatique des voix ---
  // Le site ne peut pas lire l'audio d'une vidéo YouTube intégrée. En revanche, le navigateur (ordinateur : Chrome, Edge)
  // sait capter le son de l'onglet quand on l'autorise : on écoute alors la bande de la voix pendant la lecture.
  const canCapture = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia
  let listening = $state(false)
  let level = $state(0) // 0-1, pour le témoin visuel
  let sens = $state(0.5) // sensibilité 0-1
  let stream: MediaStream | null = null
  let ctx: AudioContext | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  async function listen() {
    msg = ''
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true, preferCurrentTab: true, selfBrowserSurface: 'include', systemAudio: 'exclude' } as DisplayMediaStreamOptions)
    } catch { msg = 'Capture refusée : choisis « Cet onglet » et coche « Partager le son de l’onglet ».'; return }
    stream.getVideoTracks().forEach((t) => t.stop())
    if (!stream.getAudioTracks().length) { msg = 'Pas de son partagé : recommence en cochant « Partager le son de l’onglet ».'; stopListen(); return }
    ctx = new AudioContext()
    const an = ctx.createAnalyser()
    an.fftSize = 2048
    ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(an)
    const bins = new Uint8Array(an.frequencyBinCount)
    const hz = ctx.sampleRate / an.fftSize
    const lo = Math.round(300 / hz), hi = Math.round(3400 / hz)
    let floor = 0.02, above = 0, below = 0, talking = false, startT = 0
    const TICK = 50
    timer = setInterval(() => {
      if (player?.getPlayerState?.() !== 1) { level = 0; return }
      an.getByteFrequencyData(bins)
      let v = 0, tot = 0
      for (let i = 1; i < bins.length; i++) { const x = bins[i] / 255; tot += x; if (i >= lo && i <= hi) v += x }
      const speech = v / (hi - lo + 1)
      // la voix domine la bande 300-3400 Hz ; la musique seule étale son énergie sur tout le spectre
      const share = tot > 0 ? v / tot : 0
      level = Math.min(1, speech * 3)
      const thr = Math.max(0.05, floor * (2.2 - sens * 1.2)) + (1 - sens) * 0.05
      const active = speech > thr && share > 0.3
      if (!active) floor = floor * 0.97 + speech * 0.03
      if (active) { above += TICK; below = 0 } else { below += TICK; above = 0 }
      if (!talking && above >= 150) { talking = true; startT = Math.max(0, (player?.getCurrentTime?.() ?? now) - 0.25) }
      if (talking && below >= 450) {
        talking = false
        const t = Math.round(startT * 10) / 10
        if (!markers.some((m) => Math.abs(m.t - t) < 1)) markers.push({ t, text: '___' })
      }
    }, TICK)
    listening = true
    stream.getAudioTracks()[0].addEventListener('ended', stopListen)
    try { player?.playVideo?.() } catch { /* ignoré */ }
  }
  function stopListen() {
    if (timer) clearInterval(timer)
    timer = null
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
    void ctx?.close()
    ctx = null
    listening = false; level = 0
  }
  onDestroy(stopListen)

  const mark = () => { markers.push({ t: Math.round(now * 10) / 10, text: '___' }) }
  function add() {
    const cat = packsStore.packs.doublage?.categories[0]
    if (!valid || !cat) return
    updatePacks((p) => p.doublage.categories[0].items.push(newItem(line)))
    msg = `Ajouté à « ${cat.name} »`
    vid = null; url = ''; title = ''; markers = []
  }
</script>

<section class="card stack">
  <strong><Icon name="clap" /> Créer un extrait depuis un lien YouTube</strong>
  <form class="row" onsubmit={(e) => { e.preventDefault(); load() }}>
    <input class="input" bind:value={url} placeholder="Colle le lien YouTube" aria-label="Lien YouTube" /><button class="btn">Charger</button>
  </form>
  {#if msg}<span class="muted" role="status">{msg}</span>{/if}
  {#if vid}
    <div class="frame"><div bind:this={host}></div></div>
    <div class="row wrap">
      <span class="chip">⏱ {fmt(now)}</span>
      <button class="btn primary" onclick={mark}><Icon name="mic" /> Voix ici</button>
      <button class="btn" onclick={() => (startAt = Math.floor(now))}>Début ici</button>
      <button class="btn" onclick={() => (endAt = Math.ceil(now))}>Fin ici</button>
    </div>
    {#if canCapture}
      <div class="row wrap auto">
        {#if listening}<button class="btn" onclick={stopListen}><Icon name="close" /> Arrêter la détection</button>
          <span class="meter" aria-hidden="true"><i style="width:{Math.round(level * 100)}%"></i></span>
        {:else}<button class="btn primary" onclick={listen}><Icon name="sparkle" /> Détecter les voix automatiquement</button>{/if}
        <label class="row sens">Sensibilité <input type="range" min="0" max="1" step="0.05" bind:value={sens} aria-label="Sensibilité de la détection" /></label>
      </div>
      <span class="muted">Le navigateur te demande de partager <b>cet onglet avec son</b> (rien n'est enregistré ni envoyé). La vidéo se lance, et chaque prise de parole est repérée toute seule. Tu peux corriger ou retirer les repères ensuite.</span>
    {:else}<span class="muted">Détection automatique : disponible sur ordinateur (Chrome ou Edge). Sur téléphone, utilise « Voix ici ».</span>{/if}
    <span class="muted">Sinon, lance la vidéo, appuie sur « Voix ici » à chaque fois que quelqu'un parle. Extrait : {fmt(start)} → {fmt(end)}. Début et fin se règlent d'eux-mêmes, ou avec les boutons.</span>
    {#each sorted as m}
      <div class="row"><span class="chip">{fmt(Math.max(0, m.t - start))}</span><input class="input" bind:value={m.text} aria-label="Réplique à {fmt(m.t)}" placeholder="___ (trait à remplir par le joueur)" />
        <button class="btn" aria-label="Retirer" onclick={() => (markers = markers.filter((x) => x !== m))}><Icon name="close" /></button></div>
    {/each}
    <input class="input" bind:value={title} placeholder="Titre de l'extrait" aria-label="Titre" />
    <button class="btn primary block" disabled={!valid} onclick={add}>Ajouter au pack Doublage</button>
  {/if}
</section>

<style>
  .frame { position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 16px; overflow: hidden; background: #000; }
  .frame :global(iframe) { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  .wrap { flex-wrap: wrap; }
  .auto { align-items: center; gap: 10px; }
  .sens { gap: 8px; font-size: .85rem; color: var(--c-soft); }
  .meter { flex: 1; min-width: 80px; height: 10px; border-radius: 6px; background: var(--c-bg); box-shadow: var(--shadow-in); overflow: hidden; }
  .meter i { display: block; height: 100%; background: var(--c-accent); transition: width .08s linear; }
</style>
