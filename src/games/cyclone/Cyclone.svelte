<script lang="ts">
  import Avatar from '../../components/Avatar.svelte'
  import { session, gameAction, stopGame } from '../../lib/room.svelte'
  import { LEVEL_NAMES, TYPE_NAMES, type Level } from './logic'
  import type { CyclonePub } from './module'

  let { view = 'phone' }: { view?: 'phone' | 'table' } = $props()

  const s = $derived(session.state!)
  const g = $derived(s.game!.data as CyclonePub)
  const me = $derived(session.me?.id ?? '')
  const isTable = $derived(view === 'table')
  const act = (a: unknown) => gameAction(a, isTable ? s.hostId : undefined)
  const cur = $derived(g.order[g.turn])
  const curP = $derived(s.players.find((p) => p.id === cur))
  const mine = $derived(cur === me && !isTable)
  const unit = $derived(s.sober ? 'points' : 'gorgées')
  const levels: Level[] = [1, 2, 3]
  const hint = (t: string) => (t === 'gage' ? 'Fais-le, ou bois' : t === 'verite' ? 'Réponds, ou bois' : 'Action pour tout le monde')
</script>

<div class="game" class:table={isTable}>
  {#if g.phase === 'setup'}
    <h2>Cyclone</h2>
    <section class="card stack">
      <p class="muted">Une carte par tour : <b>Gage</b>, <b>Action</b> ou <b>Vérité</b>. Choisis l’intensité des cartes.</p>
      {#if session.isHost && !isTable}
        {#each levels as l}
          <label class="row sw"><input type="checkbox" checked={g.levels.includes(l)} onchange={(e) => gameAction({ type: 'level', level: l, on: e.currentTarget.checked })} /> {LEVEL_NAMES[l]}</label>
        {/each}
        <button class="btn primary block" onclick={() => gameAction({ type: 'begin' })}>Commencer</button>
      {:else}
        <p>Intensité : <b>{g.levels.map((l) => LEVEL_NAMES[l]).join(' · ')}</b></p>
        <p class="muted">L’hôte lance la partie.</p>
      {/if}
    </section>
  {:else if g.phase === 'end'}
    <section class="card stack center">
      <h2>Plus de cartes !</h2><p class="muted">{g.count} cartes jouées.</p>
      {#if session.isHost && !isTable}
        <button class="btn primary block" onclick={() => gameAction({ type: 'again' })}>Rejouer</button>
        <button class="btn block" onclick={stopGame}>Terminer</button>
      {/if}
    </section>
  {:else}
    <header class="row turn"><Avatar name={curP?.name} color={curP?.color} size={isTable ? 56 : 44} />
      <div><strong>{mine ? 'À toi !' : `Au tour de ${curP?.name}`}</strong><div class="muted">{g.left} cartes restantes</div></div></header>

    {#if g.card}
      <section class="card stack cyc {g.card.type}" aria-live="polite">
        <div class="row" style="justify-content:space-between"><span class="tag">{TYPE_NAMES[g.card.type]}</span><span class="chip">{LEVEL_NAMES[g.card.level]}</span></div>
        <p class="text">{g.card.text}</p>
        <div class="muted">{hint(g.card.type)}{g.card.sips ? ` · ${g.card.type === 'action' ? 'distribue' : 'sinon'} ${g.card.sips} ${unit}` : ''}</div>
      </section>
      {#if mine || (session.isHost && !isTable)}
        <div class="stack">
          <button class="btn primary block big" onclick={() => act({ type: 'done' })}>{g.card.type === 'action' ? 'Action faite' : 'Fait ✔'}</button>
          {#if g.card.type !== 'action'}<button class="btn block" onclick={() => act({ type: 'pass' })}>Je passe{g.card.sips ? ` (je bois ${g.card.sips})` : ''}</button>{/if}
        </div>
      {/if}
    {:else if mine}
      <button class="btn primary block big" onclick={() => act({ type: 'draw' })}>Piocher une carte</button>
    {:else if !isTable}
      <p class="muted center">{curP?.name} va piocher…</p>
    {/if}
  {/if}
  {#if session.toast}<div class="toast" role="alert">{session.toast}</div>{/if}
</div>

<style>
  .game { display: flex; flex-direction: column; gap: 14px; }
  .center { text-align: center; align-items: center; }
  .turn { gap: 14px; }
  .sw { gap: 12px; } .sw input { width: 24px; height: 24px; accent-color: var(--c-accent); }
  .cyc { border-top: 6px solid var(--c-accent); min-height: 220px; justify-content: space-between; }
  .cyc.gage { border-color: #e5645a; } .cyc.action { border-color: var(--c-accent); } .cyc.verite { border-color: #7aa7e8; }
  .tag { font-family: var(--font-display); letter-spacing: .1em; }
  .text { font-size: 1.4rem; font-weight: 700; line-height: 1.3; margin: 0; }
  .table .text { font-size: 2.4rem; } .table .cyc { min-height: 300px; max-width: 900px; }
  .big { min-height: 80px; font-size: 1.25rem; }
  .toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(var(--nav-h) + 90px); background: var(--c-danger); color: #fff; padding: 10px 18px; border-radius: 99px; font-weight: 700; z-index: 60; }
</style>
