<script lang="ts">
  import { onMount } from 'svelte'
  import Avatar from '../../components/Avatar.svelte'
  import LaserPad from '../../components/LaserPad.svelte'
  import { session, gameAction, onLaserClick, stopGame } from '../../lib/room.svelte'
  import { type Team, type Color, UNLIMITED, teamName } from './logic'
  import type { CnPub } from './module'

  let { view = 'phone' }: { view?: 'phone' | 'table' } = $props()

  const s = $derived(session.state!)
  const g = $derived(s.game!.data as CnPub)
  const me = $derived(session.me?.id ?? '')
  const isTable = $derived(view === 'table')
  const myTeam = $derived(g.teams[me] as Team | undefined)
  const isSpy = $derived(me === g.spies.red || me === g.spies.blue)
  const key = $derived((session.priv as { key?: Color[] } | null)?.key)
  const player = (id: string) => s.players.find((p) => p.id === id)
  const members = (t: Team) => s.players.filter((p) => g.teams[p.id] === t)
  const useLaser = $derived(s.mode === 'table' && !isTable)
  const guessing = $derived(g.phase === 'guess')
  const canGuess = $derived(guessing && !isTable && !isSpy && myTeam === g.turn)
  const spyTurn = $derived(g.phase === 'clue' && me === g.spies[g.turn])

  let selected = $state<number | null>(null)
  let word = $state('')
  let n = $state<string>('1')
  let grid: HTMLDivElement | undefined
  $effect(() => { if (!canGuess) selected = null })
  $effect(() => { g.phase; g.turn; word = '' })

  // Écran table : convertit un clic laser en carte désignée par un joueur de l'équipe active.
  onMount(() => {
    if (!isTable) return
    return onLaserClick((m) => {
      if (!guessing || !grid || g.teams[m.id] !== g.turn || m.id === g.spies[g.turn]) return
      const r = grid.getBoundingClientRect()
      const px = m.x * innerWidth, py = m.y * innerHeight
      if (px < r.left || px > r.right || py < r.top || py > r.bottom) return
      const index = Math.floor(((py - r.top) / r.height) * 5) * 5 + Math.floor(((px - r.left) / r.width) * 5)
      gameAction({ type: 'reveal', index }, m.id)
    })
  })

  const clueText = (c: { word: string; n: number }) => `${c.word} : ${c.n === UNLIMITED ? '∞' : c.n}`
  const keyColor = (i: number) => (key && !g.revealed[i] ? key[i] : null)
  const send = () => gameAction({ type: 'clue', word, n: n === 'inf' ? 'inf' : Number(n) })
  const confirm = () => { if (selected !== null) { gameAction({ type: 'reveal', index: selected }); selected = null } }
</script>

<div class="game" class:table={isTable}>
  {#if g.phase === 'teams'}
    <h2>Codenames — équipes</h2>
    <div class="teams">
      {#each ['red', 'blue'] as t (t)}
        <section class="card stack {t}">
          <h3>Équipe {teamName(t as Team)}</h3>
          {#each members(t as Team) as p (p.id)}
            <div class="row"><Avatar name={p.name} color={p.color} look={p.avatar} size={36} /><span style="flex:1">{p.name}</span>{#if g.spies[t as Team] === p.id}<span class="chip">🕵️ espion</span>{/if}</div>
          {/each}
          {#if !isTable}
            {#if myTeam !== t}<button class="btn block" onclick={() => gameAction({ type: 'team', team: t })}>Rejoindre</button>
            {:else if g.spies[t as Team] !== me}<button class="btn block" onclick={() => gameAction({ type: 'spy' })}>Devenir espion</button>{/if}
          {/if}
        </section>
      {/each}
    </div>
    {#if session.isHost && !isTable}
      <button class="btn primary block" onclick={() => gameAction({ type: 'begin' })}>Commencer la partie</button>
    {:else if !isTable}<p class="muted">L’hôte lance la partie quand les équipes sont prêtes.</p>{/if}
  {:else}
    <header class="top">
      <div class="score">
        <span class="pill red" class:on={g.turn === 'red' && g.phase !== 'end'}>Rouge · {g.remaining.red}</span>
        <span class="pill blue" class:on={g.turn === 'blue' && g.phase !== 'end'}>Bleue · {g.remaining.blue}</span>
      </div>
      {#if g.phase === 'end'}
        <div class="phase">🏆 Équipe {teamName(g.winner!)} gagne{g.reason === 'assassin' ? ' (assassin !)' : ''}</div>
      {:else if g.clue}
        <div class="clue">Indice : <b>{clueText(g.clue)}</b> <span class="muted">· {g.guessesLeft >= UNLIMITED ? 'autant que vous voulez' : `${g.guessesLeft} essai${g.guessesLeft > 1 ? 's' : ''}`}</span></div>
      {:else}
        <div class="phase">L’espion {teamName(g.turn)} ({player(g.spies[g.turn]!)?.name}) cherche un indice…</div>
      {/if}
    </header>

    <div class="grid" bind:this={grid} role="grid">
      {#each g.words as w, i}
        {@const done = g.revealed[i]}
        {@const hint = keyColor(i)}
        <button class="card-w {done ?? ''}" class:hint-red={hint === 'red'} class:hint-blue={hint === 'blue'} class:hint-neutral={hint === 'neutral'} class:hint-assassin={hint === 'assassin'}
          class:sel={selected === i} disabled={!canGuess || !!done || useLaser} onclick={() => (selected = i)}>
          <span>{w}</span>
          {#if done === 'assassin'}<em>☠</em>{/if}
        </button>
      {/each}
    </div>

    {#if spyTurn && !isTable}
      <section class="card stack pad">
        <strong>Ton indice (un seul mot + un chiffre)</strong>
        <form class="stack" onsubmit={(e) => { e.preventDefault(); send() }}>
          <input class="input" bind:value={word} placeholder="Indice" autocomplete="off" aria-label="Indice" />
          <select class="input" bind:value={n} aria-label="Nombre de mots">
            {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as k}<option value={String(k)}>{k}</option>{/each}
            <option value="inf">illimité</option>
          </select>
          <button class="btn primary block" disabled={!word.trim()}>Donner l’indice</button>
        </form>
      </section>
    {:else if canGuess}
      <section class="card stack pad">
        {#if useLaser}
          <strong>À votre équipe de jouer</strong>
          <LaserPad playerId={me} label="Tape pour désigner une carte" />
        {:else}
          <strong>{selected !== null ? `« ${g.words[selected]} »` : 'Touche une carte'}</strong>
          <button class="btn primary block" disabled={selected === null} onclick={confirm}>Désigner</button>
        {/if}
        <button class="btn block" disabled={g.guessed < 1} onclick={() => gameAction({ type: 'pass' })}>Terminer le tour</button>
      </section>
    {/if}

    {#if g.phase === 'end' && session.isHost && !isTable}
      <section class="card stack">
        <button class="btn primary block" onclick={() => gameAction({ type: 'again' })}>Rejouer</button>
        <button class="btn block" onclick={stopGame}>Terminer</button>
      </section>
    {/if}

    {#if g.history.length}
      <details class="card"><summary>Indices donnés</summary>
        {#each [...g.history].reverse() as h}<div class="hist {h.team}">{teamName(h.team)} · {clueText(h)}</div>{/each}
      </details>
    {/if}
  {/if}

  {#if isTable}
    {#each Object.entries(session.pointers) as [id, p] (id)}
      {#if Date.now() - p.ts < 4000}<div class="laser" style="left:{p.x * 100}vw;top:{p.y * 100}vh;--c:{p.color}"><span>{p.name}</span></div>{/if}
    {/each}
  {/if}
  {#if session.toast}<div class="toast" role="alert">{session.toast}</div>{/if}
</div>

<style>
  .game { display: flex; flex-direction: column; gap: 14px; --red: #e5645a; --blue: #7aa7e8; }
  .teams { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .teams section.red { border-top: 4px solid var(--red); }
  .teams section.blue { border-top: 4px solid var(--blue); }
  .top { display: flex; flex-direction: column; gap: 8px; }
  .score { display: flex; gap: 10px; }
  .pill { flex: 1; text-align: center; padding: 8px; border-radius: 99px; font-weight: 800; background: var(--c-bg); box-shadow: var(--shadow-in); opacity: .6; }
  .pill.red.on { background: var(--red); color: #fff; opacity: 1; }
  .pill.blue.on { background: var(--blue); color: #1b2a44; opacity: 1; }
  .clue { font-size: 1.2rem; } .clue b { color: var(--c-accent); font-size: 1.5rem; }
  .phase { color: var(--c-accent); font-weight: 700; }
  .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .card-w { position: relative; aspect-ratio: 4 / 3; border-radius: 12px; background: var(--c-surface); box-shadow: var(--shadow-out); display: grid; place-items: center; padding: 2px; font-weight: 800; font-size: clamp(.55rem, 2.6vw, .8rem); text-transform: uppercase; letter-spacing: .02em; overflow: hidden; word-break: break-word; hyphens: auto; }
  .card-w:disabled { opacity: 1; cursor: default; }
  .card-w.red { background: var(--red); color: #fff; } .card-w.blue { background: var(--blue); color: #1b2a44; }
  .card-w.neutral { background: #CFDBD5; color: #242423; } .card-w.assassin { background: #111; color: #fff; }
  .card-w.red, .card-w.blue, .card-w.neutral, .card-w.assassin { box-shadow: var(--shadow-in); }
  .card-w.hint-red { box-shadow: inset 0 0 0 3px var(--red); } .card-w.hint-blue { box-shadow: inset 0 0 0 3px var(--blue); }
  .card-w.hint-neutral { box-shadow: inset 0 0 0 3px #CFDBD5; } .card-w.hint-assassin { background: #000; color: #fff; box-shadow: inset 0 0 0 3px #888; }
  .card-w.sel { outline: 3px solid var(--c-accent); animation: pulse .9s ease-in-out infinite alternate; }
  em { position: absolute; top: 2px; right: 4px; font-style: normal; }
  .pad { position: sticky; bottom: calc(var(--nav-h) + 8px); z-index: 5; }
  .hist { padding: 4px 0; } .hist.red { color: var(--red); } .hist.blue { color: var(--blue); }
  .laser { position: fixed; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 4px rgb(255 255 255 / .35), 0 0 18px 6px var(--c); pointer-events: none; z-index: 50; transition: left .05s linear, top .05s linear; }
  .laser span { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); font-size: .7rem; font-weight: 700; background: rgb(36 36 35 / .8); padding: 1px 6px; border-radius: 99px; white-space: nowrap; }
  .toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(var(--nav-h) + 90px); background: var(--c-danger); color: #fff; padding: 10px 18px; border-radius: 99px; font-weight: 700; z-index: 60; }
  .table .grid { max-width: min(92vw, 150vh); margin: 0 auto; gap: 10px; width: 100%; }
  .table .card-w { font-size: clamp(.9rem, 2.2vw, 1.8rem); }
  @keyframes pulse { to { transform: scale(1.06); } }
</style>
