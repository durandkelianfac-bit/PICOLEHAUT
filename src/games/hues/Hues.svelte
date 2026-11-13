<script lang="ts">
  import Icon from '../../components/Icon.svelte'
  import { onMount } from 'svelte'
  import HuesBoard from './HuesBoard.svelte'
  import Avatar from '../../components/Avatar.svelte'
  import TouchPad from '../../components/TouchPad.svelte'
  import { load, save } from '../../lib/storage'
  import { session, gameAction, stopGame, onLaserClick } from '../../lib/room.svelte'
  import { enableLaser, recenter, laserClick, laser } from '../../lib/pointer.svelte'
  import { type Cell, cellColor, cellLabel } from './logic'
  import type { HuesPub } from './module'

  let { view = 'phone' }: { view?: 'phone' | 'table' } = $props()

  const s = $derived(session.state!)
  const g = $derived(s.game!.data as HuesPub)
  const me = $derived(session.me!.id)
  const isGiver = $derived(g.giverId === me)
  const isTable = $derived(view === 'table')
  const player = (id: string) => s.players.find((p) => p.id === id)
  const giver = $derived(player(g.giverId))
  const currentGuesser = $derived(g.guessers[g.turn])
  const guessing = $derived(g.phase === 'guess1' || g.phase === 'guess2')
  const myTurn = $derived(guessing && currentGuesser === me)
  const useLaser = $derived(s.mode === 'table' && !isTable)
  // correction : si le gyroscope de ce téléphone est capricieux, on passe au pavé tactile (choix mémorisé)
  let touchMode = $state(load<boolean>('picole.hues.touch', false))
  const setTouch = (v: boolean) => { touchMode = v; save('picole.hues.touch', v) }
  const priv = $derived(session.priv as { options?: Cell[]; target?: Cell } | null)
  const sorted = $derived([...s.players].sort((a, b) => (g.totals[b.id] ?? 0) - (g.totals[a.id] ?? 0)))

  const tokens = $derived(
    Object.entries(g.tokens).flatMap(([id, list]) => {
      const p = player(id)
      return list.filter(Boolean).map((cell) => ({ cell: cell as Cell, color: p?.color ?? '#fff', initial: (p?.name[0] ?? '?').toUpperCase() }))
    }),
  )

  let selected = $state<Cell | null>(null)
  let clue = $state('')
  let board: HuesBoard
  let cs = $state(26)

  $effect(() => { if (!myTurn) selected = null })
  $effect(() => { g.phase; clue = '' })

  // Écran table : adapte la taille de la grille à l'écran, convertit les clics laser en pions.
  onMount(() => {
    const fit = () => { if (isTable) cs = Math.max(14, Math.floor(Math.min((innerWidth * 0.62) / 31, (innerHeight * 0.78) / 17))) }
    fit()
    addEventListener('resize', fit)
    const off = isTable
      ? onLaserClick((m) => {
          if (!guessing || currentGuesser !== m.id) return
          const cell = board?.cellAt(m.x * innerWidth, m.y * innerHeight)
          if (cell) gameAction({ type: 'place', cell }, m.id)
        })
      : () => {}
    return () => { removeEventListener('resize', fit); off() }
  })

  const phaseText = $derived(
    g.phase === 'pick' ? `${giver?.name} choisit une couleur…`
    : g.phase === 'clue1' ? `${giver?.name} cherche un indice d’un mot…`
    : g.phase === 'clue2' ? `${giver?.name} prépare le 2e indice…`
    : guessing ? `Au tour de ${player(currentGuesser)?.name}` : '',
  )
  const clueNo = $derived(g.phase === 'clue2' || g.phase === 'guess2' ? 2 : 1)
  const label = (c?: Cell) => (c ? cellLabel(c) : '')

  const confirm = () => { if (selected) { gameAction({ type: 'place', cell: selected }); selected = null } }
  const sendClue = () => gameAction({ type: 'clue', text: clue })
</script>

<div class="game" class:table={isTable}>
  <header class="top">
    <div class="row"><Avatar name={giver?.name} color={giver?.color} look={giver?.avatar} size={40} />
      <div><strong>{giver?.name}</strong> <span class="muted">donne les indices · manche {g.round + 1}/{g.givers.length}</span></div></div>
    {#if g.clues.length}<div class="clues">{#each g.clues as c, i}<span class="chip big">Indice {i + 1} : <b>{c}</b></span>{/each}</div>{/if}
    {#if phaseText}<div class="phase" aria-live="polite">{phaseText}</div>{/if}
  </header>

  {#if !isTable && isGiver && (g.phase === 'pick' || g.phase === 'clue1' || g.phase === 'clue2' || guessing)}
    <section class="card secret stack">
      {#if g.phase === 'pick' && priv?.options}
        <strong>Choisis la couleur à faire deviner (secret)</strong>
        <div class="opts">{#each priv.options as o, i}
          <button class="opt" style="background:{cellColor(o)}" onclick={() => gameAction({ type: 'pick', index: i })}><span>{cellLabel(o)}</span></button>
        {/each}</div>
      {:else if priv?.target}
        <div class="row"><div class="sw" style="background:{cellColor(priv.target)}"></div><span>Ta couleur : <b>{label(priv.target)}</b></span></div>
        {#if g.phase === 'clue1' || g.phase === 'clue2'}
          <form class="stack" onsubmit={(e) => { e.preventDefault(); sendClue() }}>
            <input class="input" bind:value={clue} placeholder={clueNo === 1 ? 'Indice : un seul mot' : 'Indice : un ou deux mots'} aria-label="Indice" autocomplete="off" />
            <button class="btn primary block" disabled={!clue.trim()}>Envoyer l’indice {clueNo}</button>
            {#if g.phase === 'clue2'}<button type="button" class="btn block" onclick={() => gameAction({ type: 'skip' })}>Passer (pas de 2e indice)</button>{/if}
          </form>
        {/if}
      {/if}
    </section>
  {/if}

  <section class="boardbox" class:scroll={!isTable}>
    <HuesBoard bind:this={board} {cs} {tokens} {selected}
      target={g.target} hint={isGiver && !isTable && g.phase !== 'score' ? (priv?.target ?? null) : null}
      onpick={!isTable && !useLaser && myTurn ? (c) => (selected = c) : undefined} />
    {#if isTable}
      {#each Object.entries(session.pointers) as [id, p] (id)}
        {#if Date.now() - p.ts < 4000}
          <div class="laser" style="left:{p.x * 100}vw;top:{p.y * 100}vh;--c:{p.color}"><span>{p.name}</span></div>
        {/if}
      {/each}
    {/if}
  </section>

  {#if !isTable}
    {#if myTurn}
      {#if useLaser}
        <section class="card stack pad">
          <strong>À toi ! {clueNo === 1 ? '1er' : '2e'} pion</strong>
          <div class="seg" role="radiogroup" aria-label="Mode de pointage">
            <button role="radio" aria-checked={!touchMode} class:on={!touchMode} onclick={() => setTouch(false)}><Icon name="target" /> Gyroscope</button>
            <button role="radio" aria-checked={touchMode} class:on={touchMode} onclick={() => setTouch(true)}><Icon name="touch" /> Tactile (correction)</button>
          </div>
          {#if touchMode}
            <TouchPad playerId={me} label="Poser le pion" />
          {:else if !laser.active}
            <button class="btn primary block" onclick={() => enableLaser(me)}>Activer le pointeur laser</button>
            {#if laser.denied}<span class="muted">Permission refusée : autorise le capteur de mouvement dans les réglages du navigateur.</span>{/if}
          {:else}
            <button class="btn block big-tap" onclick={laserClick}><Icon name="target" /> Tape pour poser le pion</button>
            <button class="btn block" onclick={recenter}>Recentrer</button>
          {/if}
        </section>
      {:else}
        <section class="card stack pad">
          <strong>À toi ! {clueNo === 1 ? '1er' : '2e'} pion — {selected ? label(selected) : 'touche une case'}</strong>
          <button class="btn primary block" disabled={!selected} onclick={confirm}>Valider</button>
        </section>
      {/if}
    {:else if useLaser && laser.active}
      <button class="btn block" onclick={recenter}>Recentrer le pointeur</button>
    {/if}

    {#if g.phase === 'score'}
      <section class="card stack">
        <h3>Résultat — couleur {label(g.target ?? undefined)}</h3>
        {#each sorted as p}
          <div class="row"><Avatar name={p.name} color={p.color} look={p.avatar} size={34} /><span style="flex:1">{p.name}</span>
            {#if (g.roundPts?.[p.id] ?? 0) > 0}<span class="chip">+{g.roundPts?.[p.id]}</span>{/if}<strong>{g.totals[p.id] ?? 0}</strong></div>
        {/each}
        <button class="btn primary block" onclick={() => gameAction({ type: 'next' })}>Manche suivante</button>
      </section>
    {/if}
  {/if}

  {#if g.phase === 'score' && isTable}
    <section class="card stack score">
      <h3>Couleur {label(g.target ?? undefined)}</h3>
      {#each sorted as p}<div class="row"><Avatar name={p.name} color={p.color} look={p.avatar} size={34} /><span style="flex:1">{p.name}</span>{#if (g.roundPts?.[p.id] ?? 0) > 0}<span class="chip">+{g.roundPts?.[p.id]}</span>{/if}<strong>{g.totals[p.id] ?? 0}</strong></div>{/each}
    </section>
  {/if}

  {#if g.phase === 'end'}
    <section class="card stack end">
      <h2><Icon name="trophy" /> {g.winners.map((id) => player(id)?.name).join(' & ')}</h2>
      {#each sorted as p}<div class="row"><Avatar name={p.name} color={p.color} look={p.avatar} size={34} /><span style="flex:1">{p.name}</span><strong>{g.totals[p.id] ?? 0} pts</strong></div>{/each}
      {#if session.isHost}<button class="btn primary block" onclick={stopGame}>Terminer la partie</button>{/if}
    </section>
  {/if}

  {#if session.toast}<div class="toast" role="alert">{session.toast}</div>{/if}
</div>

<style>
  .game { display: flex; flex-direction: column; gap: 14px; }
  .top { display: flex; flex-direction: column; gap: 8px; }
  .clues { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip.big { font-size: 1rem; padding: 8px 14px; color: var(--c-text); }
  .chip b { color: var(--c-accent); }
  .phase { color: var(--c-accent); font-weight: 700; }
  .secret { border: 1px solid var(--c-accent); }
  .opts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .opt { height: 84px; border-radius: 20px; box-shadow: var(--shadow-out); display: grid; place-items: end start; padding: 8px 12px; }
  .opt span { background: rgb(36 36 35 / .75); color: var(--c-text); padding: 2px 8px; border-radius: 99px; font-size: .75rem; font-weight: 700; }
  .sw { width: 54px; height: 54px; border-radius: 16px; box-shadow: var(--shadow-out); }
  .boardbox { position: relative; }
  .boardbox.scroll { overflow: auto; padding: 4px 0 8px; border-radius: 12px; -webkit-overflow-scrolling: touch; }
  .pad { position: sticky; bottom: calc(var(--nav-h) + 8px); z-index: 5; }
  .seg { display: flex; gap: 6px; }
  .seg button { flex: 1; padding: 8px 6px; border-radius: 99px; font-size: .78rem; color: var(--c-soft); background: var(--c-bg); box-shadow: var(--shadow-in); }
  .seg button.on { background: var(--c-accent); color: var(--c-on-accent); font-weight: 700; }
  .big-tap { min-height: 96px; font-size: 1.2rem; }
  .laser { position: fixed; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 4px rgb(255 255 255 / .35), 0 0 18px 6px var(--c); pointer-events: none; z-index: 50; transition: left .05s linear, top .05s linear; }
  .laser span { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); font-size: .7rem; font-weight: 700; background: rgb(36 36 35 / .8); padding: 1px 6px; border-radius: 99px; white-space: nowrap; }
  .toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(var(--nav-h) + 90px); background: var(--c-danger); color: #fff; padding: 10px 18px; border-radius: 99px; font-weight: 700; z-index: 60; }
  .table { display: grid; grid-template-columns: auto 1fr; gap: 20px; align-items: start; }
  .table .top { grid-column: 1 / -1; }
  .table .score, .table .end { align-self: start; }
</style>
