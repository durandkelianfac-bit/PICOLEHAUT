<script lang="ts">
  import Icon from '../../components/Icon.svelte'
  import Avatar from '../../components/Avatar.svelte'
  import YouTubeClip from '../../components/YouTubeClip.svelte'
  import VoiceRecorder from '../../components/VoiceRecorder.svelte'
  import { session, gameAction, stopGame } from '../../lib/room.svelte'
  import { recs, sendAudio, clearAudio } from '../../lib/audio.svelte'
  import { fillLine, parseClip, BLANK, type Clip } from './logic'
  import { sipsConfig } from '../../config/sips.config'
  import type { DoublagePub } from './module'

  let { view = 'phone' }: { view?: 'phone' | 'table' } = $props()

  const s = $derived(session.state!)
  const g = $derived(s.game!.data as DoublagePub)
  const me = $derived(session.me?.id ?? '')
  const isTable = $derived(view === 'table')
  const act = (a: unknown) => gameAction(a, isTable ? s.hostId : undefined)
  const player = (id: string) => s.players.find((p) => p.id === id)
  const unit = $derived(s.sober ? 'points' : 'gorgées')
  // La vidéo s'affiche sur l'écran table, ou sur tous les téléphones sans écran table.
  const showVideo = $derived(isTable || s.mode === 'equal')
  // Le son du montage ne sort que d'un seul appareil : l'écran table, sinon le téléphone de l'hôte.
  const playsAudio = $derived(isTable || (s.mode === 'equal' && session.isHost))
  const clipList = $derived(
    (s.packs.doublage?.categories ?? []).filter((c) => c.enabled).flatMap((c) => c.items.map((i) => parseClip(i.text))).filter((c): c is Clip => !!c),
  )
  const mine = $derived(g.clip ? g.clip.lines.map((l, i) => ({ l, i })).filter(({ i }) => g.assignees[i] === me) : [])
  const allSent = $derived(!!g.clip && g.submitted.length >= g.clip.lines.length)

  // --- enregistrement (téléphone du joueur) ---
  let drafts = $state<Record<number, { words: string[]; blob: Blob | null }>>({})
  $effect(() => { if (g.phase === 'setup' || g.phase === 'watch') drafts = {} })
  const draft = (i: number, blanks: number) => (drafts[i] ??= { words: Array(blanks).fill(''), blob: null })
  let sending = $state(false)
  async function send(i: number, blanks: number) {
    const d = draft(i, blanks)
    if (!d.blob) return
    sending = true
    await sendAudio(i, d.blob)
    gameAction({ type: 'submit', line: i, words: d.words })
    sending = false
  }

  // --- lecture / montage ---
  let ytc: YouTubeClip | undefined
  let t = $state(0)
  let audios: Record<number, HTMLAudioElement> = {}
  let fired = new Set<number>()
  let primed = $state(false)
  let lastReplay = 0

  function prime() {
    audios = {}
    for (const [i, r] of Object.entries(recs.map)) {
      const a = new Audio(r.url)
      a.preload = 'auto'
      a.play().then(() => { a.pause(); a.currentTime = 0 }).catch(() => {})
      audios[+i] = a
    }
    primed = true
  }
  function onTime(time: number) {
    t = time
    g.clip?.lines.forEach((l, i) => {
      if (fired.has(i) || time < l.at) return
      fired.add(i)
      if (playsAudio) { const a = audios[i] ?? (recs.map[i] ? new Audio(recs.map[i].url) : null); a?.play().catch(() => {}) }
    })
  }
  const subtitle = $derived.by(() => {
    if (!g.clip) return ''
    let cur = -1
    g.clip.lines.forEach((l, i) => { if (t >= l.at && t < l.at + 5) cur = i })
    return cur >= 0 ? fillLine(g.clip.lines[cur].text, g.words[cur] ?? []) : ''
  })
  // Chaque lancement du montage (replayN) redémarre l'extrait avec les voix.
  $effect(() => {
    if ((g.phase === 'replay' || g.phase === 'vote') && g.replayN > lastReplay) {
      lastReplay = g.replayN
      fired = new Set(); t = 0
      if (playsAudio && !primed) prime()
      setTimeout(() => ytc?.play(true), 150)
    }
  })
  $effect(() => { if (g.phase === 'setup') { clearAudio(); lastReplay = 0; primed = false } })
</script>

<div class="game" class:table={isTable}>
  {#if g.phase === 'setup'}
    <h2>Doublage de film</h2>
    <section class="card stack">
      <p class="muted">Un court extrait, muet. Chacun double une ou plusieurs répliques à la voix, en remplissant les trous. Le site rejoue l’extrait avec vos voix, puis vote secret : le plus drôle distribue {sipsConfig.doublage.funniestGives} {unit}.</p>
      {#if session.isHost && !isTable}
        {#if clipList.length}
          <button class="btn primary block" onclick={() => gameAction({ type: 'begin' })}>Extrait au hasard ({clipList.length} dans le pack)</button>
          {#each clipList as c, i}<button class="btn block" onclick={() => gameAction({ type: 'begin', index: i })}><Icon name="clap" /> {c.title}</button>{/each}
        {:else}
          <p>Aucun extrait dans le pack. Ajoute-en dans <a href="#/packs"><b>Packs → Doublage</b></a> (format indiqué sur la page).</p>
        {/if}
      {:else}<p class="muted">L’hôte choisit l’extrait.</p>{/if}
    </section>
  {:else if g.clip}
    <header><span class="chip"><Icon name="clap" /> {g.clip.title}</span></header>

    {#if showVideo && g.phase !== 'result'}
      <div class="video">
        {#key g.clip.id}<YouTubeClip bind:this={ytc} videoId={g.clip.id} start={g.clip.start} end={g.clip.end} ontime={onTime} onend={() => (t = 0)} />{/key}
        {#if (g.phase === 'replay' || g.phase === 'vote') && subtitle}<div class="sub" aria-live="polite">{subtitle}</div>{/if}
      </div>
      <div class="row wrap">
        <button class="btn" onclick={() => ytc?.play(true)}>▶ Voir l’extrait (muet)</button>
        {#if playsAudio && (g.phase === 'replay' || g.phase === 'vote') && !primed}<button class="btn primary" onclick={prime}><Icon name="volume" /> Activer le son</button>{/if}
      </div>
    {/if}

    {#if g.phase === 'watch'}
      <section class="card stack">
        <h3>Les répliques</h3>
        {#each g.clip.lines as l, i}
          <div class="line"><span class="chip">{l.at}s</span><span style="flex:1">{l.text.replaceAll(BLANK, '____')}</span><span class="who"><Avatar name={player(g.assignees[i])?.name} color={player(g.assignees[i])?.color} look={player(g.assignees[i])?.avatar} size={28} /></span></div>
        {/each}
        {#if session.isHost || isTable}<button class="btn primary block" onclick={() => act({ type: 'record' })}>C’est parti : enregistrer</button>{/if}
      </section>
    {/if}

    {#if g.phase === 'record'}
      {#if !isTable}
        {#each mine as { l, i } (i)}
          {@const d = draft(i, l.blanks)}
          <section class="card stack">
            <div class="row"><span class="chip">{l.at}s</span><strong style="flex:1">À toi de doubler :</strong></div>
            <p class="text">{l.text.replaceAll(BLANK, '____')}</p>
            {#if g.submitted.includes(i)}<p><Icon name="check" /> Envoyé !</p>
            {:else}
              {#each d.words as _, k}<input class="input" bind:value={d.words[k]} placeholder="Ton mot pour le trou {k + 1}" maxlength="40" aria-label="Trou {k + 1}" />{/each}
              <p class="muted" style="margin:0">Dis la réplique avec tes mots, en jouant la scène.</p>
              <VoiceRecorder bind:blob={d.blob} />
              <button class="btn primary block" disabled={!d.blob || sending || d.words.some((w) => !w.trim())} onclick={() => send(i, l.blanks)}>Envoyer ma réplique</button>
            {/if}
          </section>
        {:else}<p class="muted center">Tu n’as pas de réplique : encourage les autres et prépare ton vote !</p>{/each}
      {/if}
      <div class="row wrap">{#each g.clip.lines as _, i}<span class="chip">{g.submitted.includes(i) ? "OK" : "…"} {player(g.assignees[i])?.name}</span>{/each}</div>
      {#if (session.isHost || isTable) && allSent}<button class="btn primary block" onclick={() => { if (playsAudio) prime(); act({ type: 'replay' }) }}><Icon name="clap" /> Lancer le montage</button>{/if}
    {/if}

    {#if g.phase === 'replay'}
      <div class="row wrap">
        {#if session.isHost || isTable}
          <button class="btn" onclick={() => { if (playsAudio) prime(); act({ type: 'replay' }) }}>↻ Revoir</button>
          <button class="btn primary" onclick={() => act({ type: 'tovote' })}>Passer au vote</button>
        {:else}<span class="muted">Regarde le montage…</span>{/if}
      </div>
    {/if}

    {#if g.phase === 'vote'}
      <section class="card stack">
        <h3>Vote secret : qui était le plus drôle ?</h3>
        {#if !isTable && !g.voted.includes(me) && g.order.includes(me)}
          {#each g.order.filter((id) => id !== me) as id}
            <button class="btn block" onclick={() => act({ type: 'vote', for: id })}><Avatar name={player(id)?.name} color={player(id)?.color} look={player(id)?.avatar} size={32} /> {player(id)?.name}</button>
          {/each}
        {:else if !isTable}<p><Icon name="check" /> Vote enregistré.</p>{/if}
        <div class="row wrap">{#each s.players as p}<span class="chip">{g.voted.includes(p.id) ? "OK" : "…"} {p.name}</span>{/each}</div>
        {#if session.isHost || isTable}<button class="btn" onclick={() => { if (playsAudio) prime(); act({ type: 'replay' }) }}>↻ Revoir le montage</button>{/if}
      </section>
    {/if}

    {#if g.phase === 'result' && g.result}
      <section class="card stack">
        <h2><Icon name="trophy" /> {g.result.winners.map((id) => player(id)?.name).join(' & ') || 'Personne'}</h2>
        {#if g.result.winners.length}<p>{g.result.winners.length > 1 ? 'Ils distribuent' : 'Il / elle distribue'} <b>{sipsConfig.doublage.funniestGives} {unit}</b>.</p>{/if}
        {#each s.players as p}<div class="row"><Avatar name={p.name} color={p.color} look={p.avatar} size={34} /><span style="flex:1">{p.name}</span><strong>{g.result.counts[p.id] ?? 0} voix</strong></div>{/each}
        {#if session.isHost && !isTable}
          <button class="btn primary block" onclick={() => gameAction({ type: 'again' })}>Rejouer</button>
          <button class="btn block" onclick={stopGame}>Terminer</button>
        {/if}
      </section>
    {/if}
  {/if}
  {#if session.toast}<div class="toast" role="alert">{session.toast}</div>{/if}
</div>

<style>
  .game { display: flex; flex-direction: column; gap: 14px; }
  .center { text-align: center; }
  .wrap { flex-wrap: wrap; }
  .video { position: relative; }
  .table .video { max-width: min(92vw, 150vh); margin: 0 auto; width: 100%; }
  .sub { position: absolute; left: 6%; right: 6%; bottom: 8%; text-align: center; background: rgb(0 0 0 / .65); color: #fff; padding: 8px 12px; border-radius: 12px; font-weight: 700; font-size: clamp(.95rem, 3.4vw, 1.4rem); pointer-events: none; }
  .line { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--glass-border); }
  .text { font-size: 1.2rem; font-weight: 700; margin: 0; }
  .toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(var(--nav-h) + 90px); background: var(--c-danger); color: #fff; padding: 10px 18px; border-radius: 99px; font-weight: 700; z-index: 60; }
</style>
