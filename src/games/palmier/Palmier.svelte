<script lang="ts">
  import Avatar from '../../components/Avatar.svelte'
  import PlayingCard from '../../components/PlayingCard.svelte'
  import LaserPad from '../../components/LaserPad.svelte'
  import Tower from './Tower.svelte'
  import { onMount } from 'svelte'
  import { session, gameAction, stopGame, onLaserClick } from '../../lib/room.svelte'
  import { effectTitle } from './logic'
  import { sipsConfig } from '../../config/sips.config'
  import { SPREAD, type PalPub } from './module'

  let { view = 'phone' }: { view?: 'phone' | 'table' } = $props()

  const s = $derived(session.state!)
  const g = $derived(s.game!.data as PalPub)
  const me = $derived(session.me?.id ?? '')
  const isTable = $derived(view === 'table')
  const player = (id: string) => s.players.find((p) => p.id === id)
  const cur = $derived(g.order[g.turn])
  const curP = $derived(player(cur))
  const mine = $derived(cur === me && !isTable)
  const unit = $derived(s.sober ? 'points' : 'gorgées')
  const act = (action: unknown) => gameAction(action, isTable ? s.hostId : undefined)
  const total = $derived((g.card?.v ?? 0) * sipsConfig.palmier.lowPerValue)
  const tableMode = $derived(s.mode === 'table')

  // Éventail de cartes face cachée : on en choisit UNE (au toucher, ou au laser sur l'écran central)
  const fanCount = $derived(Math.min(SPREAD, g.deckLeft))
  const picking = $derived(g.phase === 'play' && g.step === 'draw')
  onMount(() => {
    if (!isTable) return
    return onLaserClick((m) => {
      if (!picking || m.id !== cur) return
      const el = document.elementFromPoint(m.x * innerWidth, m.y * innerHeight)?.closest('[data-idx]') as HTMLElement | null
      if (el) gameAction({ type: 'draw', index: Number(el.dataset.idx) }, m.id)
    })
  })

  let alloc = $state<Record<string, number>>({})
  let ruleText = $state('')
  let kingText = $state('')
  let decreeTo = $state('')
  let decreeN = $state(1)
  let maj = $state(0), min = $state(0)
  $effect(() => { g.turn; g.step; g.need; alloc = {}; ruleText = ''; maj = 0; min = 0 })
  const allocated = $derived(Object.values(alloc).reduce((a, b) => a + b, 0))
  const others = $derived(s.players.filter((p) => p.id !== me))
  const adj = (id: string, d: number) => {
    const n = (alloc[id] ?? 0) + d
    if (n < 0 || (d > 0 && allocated >= total)) return
    alloc[id] = n
  }
</script>

<div class="game" class:table={isTable}>
  {#if g.phase === 'setup'}
    <h2>Palmier</h2>
    <section class="card stack">
      {#if session.isHost && !isTable}
        <label class="row sw"><input type="checkbox" checked={g.tower} disabled={!tableMode} onchange={(e) => gameAction({ type: 'opt', tower: e.currentTarget.checked })} />
          Mini-jeu de la tour (gyroscope){!tableMode ? ' — demande le mode « Écran central »' : ''}</label>
        <button class="btn primary block" onclick={() => gameAction({ type: 'begin' })}>Commencer ({s.players.length} joueurs)</button>
      {:else}<p class="muted">L’hôte lance la partie.</p>{/if}
    </section>
  {:else}
    {#if g.rule}<div class="rule" role="status">📜 Règle de {player(g.rule.by)?.name} : <b>{g.rule.text}</b></div>{/if}
    <div class="held">
      {#each [['jack', 'Valet ❄️'], ['king', 'Roi 👑']] as [k, label]}
        {#if g.held[k as 'jack' | 'king']}
          {@const owner = g.held[k as 'jack' | 'king']!}
          <span class="chip big">{label} : {player(owner)?.name}</span>
        {/if}
      {/each}
    </div>

    {#if g.phase === 'end'}
      <section class="card stack center">
        <h2>Le paquet est vide !</h2>
        <p class="muted">{g.collapses} effondrement{g.collapses > 1 ? 's' : ''} de la tour.</p>
        {#if session.isHost && !isTable}
          <button class="btn primary block" onclick={() => gameAction({ type: 'again' })}>Rejouer</button>
          <button class="btn block" onclick={stopGame}>Terminer</button>
        {/if}
      </section>
    {:else}
      <header class="row turn"><Avatar name={curP?.name} color={curP?.color} look={curP?.avatar} size={isTable ? 56 : 44} />
        <div><strong>{mine ? 'À toi de jouer !' : `Au tour de ${curP?.name}`}</strong><div class="muted">{g.deckLeft} cartes restantes</div></div></header>

      {#if g.banner}<div class="banner" aria-live="polite">{g.banner}</div>{/if}

      <div class="stage">
        {#if g.card}
          <div class="bigcard"><PlayingCard card={g.card} w={isTable ? 150 : 110} /></div>
          <div class="effect">{effectTitle(g.card)}{#if g.eight}<div class="eight">« {g.eight} »</div>{/if}</div>
        {:else if picking}
          <div class="fan" role="group" aria-label="Cartes à choisir">
            {#each Array(fanCount) as _, i}
              <button class="pick" data-idx={i} style="--r:{(i - (fanCount - 1) / 2) * 6}deg" disabled={!mine} onclick={() => act({ type: 'draw', index: i })} aria-label="Carte {i + 1}">
                <PlayingCard w={isTable ? 110 : 62} />
              </button>
            {/each}
          </div>
        {/if}
        {#if isTable && g.tower}<div class="tower"><Tower active={g.step === 'place'} playerId={cur} onresult={(r) => act({ type: r })} /></div>{/if}
      </div>

      {#if !isTable}
        {#if g.step === 'draw'}
          {#if mine}
            <p class="center"><strong>Choisis une carte !</strong> <span class="muted">Une seule, au toucher.</span></p>
            {#if tableMode}<section class="card stack"><span class="muted">Ou vise la carte sur l’écran central :</span><LaserPad playerId={me} label="Tape pour choisir la carte visée" /></section>{/if}
          {:else}<p class="muted center">{curP?.name} choisit une carte…</p>{/if}
        {/if}

        {#if g.need === 'give' && mine}
          <section class="card stack"><h3>Donne {total} {unit} ({total - allocated} restant{total - allocated > 1 ? 's' : ''})</h3>
            {#each others as p (p.id)}<div class="row"><Avatar name={p.name} color={p.color} look={p.avatar} size={36} /><span style="flex:1">{p.name}</span>
              <button class="step" onclick={() => adj(p.id, -1)} aria-label="Moins pour {p.name}">−</button><b class="n">{alloc[p.id] ?? 0}</b><button class="step" onclick={() => adj(p.id, 1)} aria-label="Plus pour {p.name}">+</button></div>{/each}
            <button class="btn primary block" disabled={allocated !== total} onclick={() => act({ type: 'distribute', alloc: Object.fromEntries(Object.entries(alloc).filter(([, n]) => n > 0)) })}>Valider</button>
          </section>
        {:else if g.need === 'target' && mine}
          <section class="card stack"><h3>Cul sec pour qui ?</h3>
            {#each others as p (p.id)}<button class="btn block" onclick={() => act({ type: 'target', id: p.id })}>{p.name}</button>{/each}</section>
        {:else if g.need === 'rule' && mine}
          <section class="card stack"><h3>Ta règle pour tout le monde</h3>
            <form class="stack" onsubmit={(e) => { e.preventDefault(); act({ type: 'rule', text: ruleText }) }}>
              <input class="input" bind:value={ruleText} maxlength="140" placeholder="Ex. : interdit de dire « oui »" aria-label="Règle" />
              <button class="btn primary block" disabled={!ruleText.trim()}>Valider la règle</button></form></section>
        {:else if g.need === 'ten' && mine}
          <section class="card stack"><h3>C’est un 10 mais… Combien de personnes ?</h3>
            <div class="row"><span style="flex:1">En majorité</span><button class="step" onclick={() => (maj = Math.max(0, maj - 1))}>−</button><b class="n">{maj}</b><button class="step" onclick={() => (maj += 1)}>+</button></div>
            <div class="row"><span style="flex:1">En minorité</span><button class="step" onclick={() => (min = Math.max(0, min - 1))}>−</button><b class="n">{min}</b><button class="step" onclick={() => (min += 1)}>+</button></div>
            <p class="muted">Chaque personne de la minorité boit {sipsConfig.palmier.tenMinorityPerPerson} {unit}.</p>
            <button class="btn primary block" onclick={() => act({ type: 'ten', majority: maj, minority: min })}>Valider</button></section>
        {:else if g.need && !mine}
          <p class="muted center">{curP?.name} décide…</p>
        {/if}

        {#if g.step === 'place'}
          {#if mine}
            <section class="card stack pad"><strong>Pose ta carte sur la tour !</strong>
              <p class="muted" style="margin:0">Incline le téléphone pour déplacer et pivoter la carte, tape pour la lâcher.</p>
              <LaserPad playerId={me} label="Lâcher la carte" /></section>
          {:else}<p class="muted center">{curP?.name} pose sa carte sur la tour (regarde l’écran)…</p>{/if}
        {/if}

        {#if g.step === 'done'}
          {#if mine || session.isHost}<button class="btn primary block" onclick={() => act({ type: 'next' })}>Terminé — joueur suivant</button>{/if}
        {/if}

        {#if g.held.jack === me}<button class="btn block" onclick={() => act({ type: 'use', card: 'jack' })}>❄️ Jouer mon Valet (freeze)</button>{/if}
        {#if g.held.king === me}
          <section class="card stack king">
            <h3>👑 Tu es le roi</h3>
            <form class="row" onsubmit={(e) => { e.preventDefault(); act({ type: 'use', card: 'king', text: kingText }); kingText = '' }}>
              <input class="input" bind:value={kingText} placeholder="Ma règle de Roi…" aria-label="Règle du roi" /><button class="btn" disabled={!kingText.trim()}>Décréter</button></form>
            <strong>Offrir des {unit} (sans limite, quand tu veux)</strong>
            <div class="row">
              <select class="input" bind:value={decreeTo} aria-label="Joueur à gratifier">
                <option value="" disabled>À qui ?</option>
                {#each others as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
              </select>
              <input class="input num" type="number" min="1" step="1" bind:value={decreeN} aria-label="Nombre de {unit}" />
            </div>
            <button class="btn primary block" disabled={!decreeTo || !(decreeN >= 1)} onclick={() => act({ type: 'decree', to: decreeTo, n: Math.floor(decreeN) })}>🎁 Envoyer le cadeau royal</button>
          </section>
        {/if}
      {:else}
        {#if g.step === 'done' && session.isHost}<button class="btn primary" onclick={() => act({ type: 'next' })}>Joueur suivant</button>{/if}
      {/if}
    {/if}
  {/if}
  {#if session.toast}<div class="toast" role="alert">{session.toast}</div>{/if}
</div>

<style>
  .game { display: flex; flex-direction: column; gap: 14px; }
  .center { text-align: center; align-items: center; }
  .rule { padding: 12px 16px; border-radius: 20px; background: var(--c-accent); color: var(--c-on-accent); }
  .held { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip.big { font-size: .9rem; padding: 8px 14px; color: var(--c-text); }
  .turn { gap: 14px; }
  .banner { padding: 10px 16px; border-radius: 99px; background: var(--c-bg); box-shadow: var(--shadow-in); color: var(--c-accent); font-weight: 700; text-align: center; }
  .stage { display: flex; align-items: center; gap: 20px; justify-content: center; flex-wrap: wrap; }
  .effect { font-size: 1.3rem; font-weight: 800; max-width: 18ch; }
  .eight { color: var(--c-accent); margin-top: 8px; }
  .big { min-height: 80px; font-size: 1.25rem; }
  .sw { gap: 12px; } .sw input { width: 24px; height: 24px; accent-color: var(--c-accent); }
  .step { width: 44px; height: 44px; border-radius: 50%; background: var(--c-bg); box-shadow: var(--shadow-out); font-size: 1.4rem; font-weight: 800; }
  .n { min-width: 24px; text-align: center; font-size: 1.2rem; }
  .pad { position: sticky; bottom: calc(var(--nav-h) + 8px); z-index: 5; }
  .fan { display: flex; justify-content: center; padding: 18px 20px 6px; width: 100%; }
  .pick { margin-left: -30px; padding: 0; border-radius: 10px; transform: rotate(var(--r)) translateY(calc(var(--r) * var(--r) * .02)); transition: transform .2s var(--ease); }
  .pick:first-child { margin-left: 0; }
  .pick:not(:disabled):hover, .pick:not(:disabled):focus-visible { transform: rotate(var(--r)) translateY(-18px); z-index: 2; }
  .pick:disabled { cursor: default; }
  .table .pick { margin-left: -50px; }
  .king { border-top: 4px solid #b98cff; }
  .num { max-width: 110px; text-align: center; }
  .tower { flex: 1; min-width: 320px; max-width: 520px; }
  .table .stage { align-items: flex-start; }
  .toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(var(--nav-h) + 90px); background: var(--c-danger); color: #fff; padding: 10px 18px; border-radius: 99px; font-weight: 700; z-index: 60; }
</style>
