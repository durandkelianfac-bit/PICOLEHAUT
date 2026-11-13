<script lang="ts">
  import Avatar from '../../components/Avatar.svelte'
  import { session, gameAction, stopGame } from '../../lib/room.svelte'
  import { fmtSize, ratioToSlider, sliderToRatio } from './logic'
  import type { GuessPub } from './module'

  let { view = 'phone' }: { view?: 'phone' | 'table' } = $props()

  const s = $derived(session.state!)
  const g = $derived(s.game!.data as GuessPub)
  const me = $derived(session.me?.id ?? '')
  const isTable = $derived(view === 'table')
  const act = (a: unknown) => gameAction(a, isTable ? s.hostId : undefined)
  const player = (id: string) => s.players.find((p) => p.id === id)
  const locked = $derived(g.locked.includes(me))
  const sorted = $derived([...s.players].sort((a, b) => (g.totals[b.id] ?? 0) - (g.totals[a.id] ?? 0)))

  let t = $state(0.5) // curseur 0-1 (échelle logarithmique)
  $effect(() => { g.round; t = ratioToSlider(1) })
  const ratio = $derived(sliderToRatio(t))

  // Scène : deux barres verticales à l'échelle ; la vue s'adapte à la plus grande.
  const refSize = $derived(g.current?.ref.size ?? 1)
  const guessSize = $derived(refSize * ratio)
  const real = $derived(g.result?.real ?? null)
  const sceneMax = $derived(Math.max(refSize, guessSize, real ?? 0, ...Object.values(g.result?.guesses ?? {}).map((x) => x.size)))
  const h = (size: number) => Math.max(3, (size / sceneMax) * 190)
</script>

<div class="game" class:table={isTable}>
  {#if g.phase === 'setup'}
    <h2>Guess the size</h2>
    <section class="card stack">
      <p class="muted">5 manches. Une cible à côté d’une référence de taille connue : règle la taille de la cible puis valide. Jusqu’à 100 points par manche. Le plus proche distribue, le plus éloigné boit.</p>
      {#if session.isHost && !isTable}<button class="btn primary block" onclick={() => gameAction({ type: 'begin' })}>Commencer</button>
      {:else}<p class="muted">L’hôte lance la partie.</p>{/if}
    </section>
  {:else if g.phase === 'end'}
    <section class="card stack">
      <h2>🏆 {player(sorted[0]?.id)?.name}</h2>
      {#each sorted as p}<div class="row"><Avatar name={p.name} color={p.color} look={p.avatar} size={36} /><span style="flex:1">{p.name}</span><strong>{g.totals[p.id] ?? 0} / 500</strong></div>{/each}
      {#if session.isHost && !isTable}
        <button class="btn primary block" onclick={() => gameAction({ type: 'again' })}>Rejouer</button>
        <button class="btn block" onclick={stopGame}>Terminer</button>
      {/if}
    </section>
  {:else if g.current}
    <header><span class="chip">Manche {g.round + 1}/{g.total}</span>
      <h3>Quelle est la taille de : {g.current.target.emoji} <b>{g.current.target.name}</b> ?</h3></header>

    <svg class="scene" viewBox="0 0 320 250" role="img" aria-label="Comparaison de tailles : la référence en bleu, la cible en rouge">
      <defs>
        <!-- silhouette d'une seule couleur : on garde la forme de l'objet, on remplace sa couleur -->
        <filter id="sil-ref" x="-5%" y="-5%" width="110%" height="110%"><feFlood flood-color="#4f9dff" /><feComposite in2="SourceAlpha" operator="in" /></filter>
        <filter id="sil-target" x="-5%" y="-5%" width="110%" height="110%"><feFlood flood-color="#ff5a5a" /><feComposite in2="SourceAlpha" operator="in" /></filter>
      </defs>
      <line x1="10" y1="215" x2="310" y2="215" stroke="#CFDBD5" stroke-opacity=".4" />
      <!-- référence (bleu) -->
      <text x="70" y={215 - h(refSize) * 0.08} text-anchor="middle" font-size={h(refSize)} filter="url(#sil-ref)">{g.current.ref.emoji}</text>
      <text x="70" y="233" text-anchor="middle" font-size="9" fill="#4f9dff">{g.current.ref.name.split(' (')[0]}</text>
      <text x="70" y="244" text-anchor="middle" font-size="9" fill="#E8EDDF">{fmtSize(refSize)}</text>
      <!-- cible (rouge) : c'est elle qui grandit -->
      {#if g.phase === 'guess'}
        <text x="230" y={215 - h(guessSize) * 0.08} text-anchor="middle" font-size={h(guessSize)} filter="url(#sil-target)">{g.current.target.emoji}</text>
      {:else if g.result}
        <text x="230" y={215 - h(g.result.real) * 0.08} text-anchor="middle" font-size={h(g.result.real)} filter="url(#sil-target)">{g.current.target.emoji}</text>
        {#each Object.entries(g.result.guesses) as [id, gs], i}
          <line x1="190" y1={215 - h(gs.size)} x2="270" y2={215 - h(gs.size)} stroke={player(id)?.color} stroke-width="3" stroke-dasharray="6 3" />
          <circle cx={278 + (i % 3) * 12} cy={215 - h(gs.size)} r="5" fill={player(id)?.color} />
        {/each}
        <text x="230" y="233" text-anchor="middle" font-size="9" fill="#ff5a5a">Réel</text>
        <text x="230" y="244" text-anchor="middle" font-size="9" fill="#E8EDDF">{fmtSize(g.result.real)}</text>
      {/if}
    </svg>

    {#if g.phase === 'guess'}
      {#if !isTable}
        <section class="card stack">
          <input type="range" min="0" max="1" step="0.001" bind:value={t} disabled={locked} aria-label="Taille de la cible" />
          <div class="row" style="justify-content:space-between"><span class="muted">plus petit</span><span class="muted">plus grand</span></div>
          <button class="btn primary block" disabled={locked} onclick={() => act({ type: 'lock', ratio })}>{locked ? 'Validé ✔' : 'Valider ma réponse'}</button>
        </section>
      {/if}
      <div class="row wrap">{#each s.players as p}<span class="chip">{g.locked.includes(p.id) ? '✔' : '…'} {p.name}</span>{/each}</div>
      {#if session.isHost && !isTable}<button class="btn" onclick={() => gameAction({ type: 'reveal' })}>Révéler maintenant</button>{/if}
    {:else if g.result}
      <section class="card stack">
        {#each sorted as p}
          {@const r = g.result.guesses[p.id]}
          <div class="row"><Avatar name={p.name} color={p.color} look={p.avatar} size={34} /><span style="flex:1">{p.name}{g.result.closest.includes(p.id) ? ' 🎯' : ''}{g.result.farthest.includes(p.id) ? ' 🍺' : ''}</span>
            <span class="muted">{r ? fmtSize(r.size) : '—'}</span>{#if r}<span class="chip">+{r.score}</span>{/if}<strong>{g.totals[p.id] ?? 0}</strong></div>
        {/each}
        {#if session.isHost && !isTable}<button class="btn primary block" onclick={() => gameAction({ type: 'next' })}>{g.round + 1 >= g.total ? 'Résultat final' : 'Manche suivante'}</button>{/if}
      </section>
    {/if}
  {/if}
  {#if session.toast}<div class="toast" role="alert">{session.toast}</div>{/if}
</div>

<style>
  .game { display: flex; flex-direction: column; gap: 14px; }
  .scene { width: 100%; max-height: 52vh; background: var(--c-surface); border-radius: var(--r-card); box-shadow: var(--shadow-in); }
  .table .scene { max-height: 62vh; }
  .wrap { flex-wrap: wrap; }
  header h3 b { color: var(--c-accent); }
  input[type='range'] { width: 100%; height: 44px; accent-color: var(--c-accent); }
  .toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(var(--nav-h) + 90px); background: var(--c-danger); color: #fff; padding: 10px 18px; border-radius: 99px; font-weight: 700; z-index: 60; }
</style>
