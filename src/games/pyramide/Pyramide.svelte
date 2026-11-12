<script lang="ts">
  import { onMount } from 'svelte'
  import Avatar from '../../components/Avatar.svelte'
  import PlayingCard from '../../components/PlayingCard.svelte'
  import { session, gameAction, stopGame } from '../../lib/room.svelte'
  import { type Card, FLOORS, RB_QUESTIONS, floorOf, valueName, defaultOptions, type Options, handSize } from './logic'
  import { sipsConfig } from '../../config/sips.config'
  import type { PyPub } from './module'

  let { view = 'phone' }: { view?: 'phone' | 'table' } = $props()

  const s = $derived(session.state!)
  const g = $derived(s.game!.data as PyPub)
  const me = $derived(session.me?.id ?? '')
  const isTable = $derived(view === 'table')
  const hostId = $derived(s.hostId)
  const player = (id: string) => s.players.find((p) => p.id === id)
  const unit = $derived(s.sober ? 'points' : 'gorgées')
  const priv = $derived(session.priv as { hand?: Card[]; peekAt?: number } | null)
  // En mode « table », la pyramide n'apparaît que sur l'écran partagé.
  const showPyramid = $derived(isTable || s.mode === 'equal')
  const cfgSips = (floor: number) => `${sipsConfig.pyramide.perFloor[floor - 1]}`
  const act = (action: unknown) => gameAction(action, isTable ? hostId : undefined)

  let now = $state(Date.now())
  onMount(() => { const t = setInterval(() => (now = Date.now()), 250); return () => clearInterval(t) })
  const secsLeft = $derived(g.deadline ? Math.max(0, Math.ceil((g.deadline - now) / 1000)) : 0)

  // L'hôte (téléphone) déclenche les fins de minuteur : fin de mémorisation et carte brûlée en mode Speed.
  let fired = ''
  $effect(() => {
    if (!session.isHost || isTable || !g.deadline || now < g.deadline) return
    const k = `${g.phase}-${g.current}-${g.deadline}`
    if (fired === k) return
    if (g.phase === 'memo') { fired = k; gameAction({ type: 'endmemo' }) }
    else if (g.phase === 'claim' && g.opts.speed && !g.claim) { fired = k; gameAction({ type: 'burn' }) }
  })

  // Consultation : la main s'affiche quelques secondes.
  const peeking = $derived(!!priv?.peekAt && now - priv.peekAt < 8000)
  const showHand = $derived(g.phase === 'memo' || peeking)
  const myShown = $derived(g.shown[me] ?? [])
  const hiddenCount = $derived(Math.max(0, (priv?.hand?.length ?? handSize(g.opts)) - myShown.length))
  const canPeek = $derived(g.opts.consult && !g.peeked.includes(me) && !!priv?.hand?.length && ['flip', 'claim', 'distribute', 'accuse', 'declare'].includes(g.phase))

  const currentCard = $derived(g.current >= 0 ? g.pyramid[g.current] : null)
  const rows = $derived(
    [...FLOORS].map((len, f) => ({ floor: f + 1, start: FLOORS.slice(0, f).reduce((a, b) => a + b, 0), len })).reverse(),
  )

  // Répartition des gorgées
  let alloc = $state<Record<string, number>>({})
  $effect(() => { g.dist?.from; g.dist?.total; alloc = {} })
  const allocated = $derived(Object.values(alloc).reduce((a, b) => a + b, 0))
  const targets = $derived(s.players.filter((p) => p.id !== me))
  const adj = (id: string, d: number) => {
    const n = (alloc[id] ?? 0) + d
    if (n < 0 || (d > 0 && allocated >= (g.dist?.total ?? 0))) return
    alloc[id] = n
  }
  const myAlloc = $derived(g.accuse?.alloc[me] ?? 0)
  const iAmTarget = $derived(g.phase === 'accuse' && !!g.accuse?.pending.includes(me) && !g.declare)
  const optLabels: Record<keyof Options, string> = {
    method: '', intense: 'Intense (pénalités ×2)', horizontal: 'Cartes horizontales (étage ×2)', bluffTotal: 'Bluff total (personne ne montre)',
    sixCards: '6 cartes par joueur', jokers: 'Jokers', speed: 'Speed (5 s pour revendiquer)', consult: 'Consultation (1 fois, 2 gorgées)',
  }
  const rbCards = $derived(g.rb?.cards ?? [])
  const rbWho = $derived(g.rb ? player(g.order[g.rb.idx]) : null)
  const rbChoices: [string, string][][] = [
    [['red', 'Rouge'], ['black', 'Noir']], [['more', 'Plus'], ['less', 'Moins']],
    [['inside', 'Intérieur'], ['outside', 'Extérieur']], [['S', '♠ Pique'], ['H', '♥ Cœur'], ['D', '♦ Carreau'], ['C', '♣ Trèfle']],
  ]
</script>

<div class="game" class:table={isTable}>
  {#if g.phase === 'setup'}
    <h2>Pyramide — options</h2>
    <section class="card stack">
      {#if session.isHost && !isTable}
        <div class="seg" role="radiogroup" aria-label="Distribution">
          <button class:on={g.opts.method === 'A'} onclick={() => gameAction({ type: 'opt', key: 'method', value: 'A' })}>Cartes données</button>
          <button class:on={g.opts.method === 'B'} onclick={() => gameAction({ type: 'opt', key: 'method', value: 'B' })}>Rouge ou noir</button>
        </div>
        {#each Object.keys(defaultOptions).filter((k) => k !== 'method') as k}
          {@const key = k as keyof Options}
          {@const locked = g.opts.method === 'B' && (k === 'sixCards' || k === 'jokers')}
          <label class="row sw"><input type="checkbox" checked={!!g.opts[key]} disabled={locked} onchange={(e) => gameAction({ type: 'opt', key: k, value: e.currentTarget.checked })} /> {optLabels[key]}{locked ? ' (indisponible en Rouge ou noir)' : ''}</label>
        {/each}
        <button class="btn primary block" onclick={() => gameAction({ type: 'begin' })}>Commencer ({s.players.length} joueurs)</button>
      {:else}
        <p class="muted">L’hôte règle la partie.</p>
        <p>Distribution : <b>{g.opts.method === 'A' ? 'cartes données' : 'Rouge ou noir'}</b></p>
        <p class="muted">{Object.keys(defaultOptions).filter((k) => k !== 'method' && g.opts[k as keyof Options]).map((k) => optLabels[k as keyof Options]).join(' · ') || 'Aucune variante'}</p>
      {/if}
    </section>
  {:else}
    {#if g.message}<div class="msg" aria-live="polite">{g.message}</div>{/if}

    {#if g.phase === 'memo'}
      <section class="card stack center">
        <h3>Mémorise tes cartes ! {secsLeft ? `· ${secsLeft}s` : ''}</h3>
        {#if !isTable && priv?.hand}
          <div class="hand">{#each priv.hand as c}<PlayingCard card={c} w={64} />{/each}</div>
          <button class="btn primary block" disabled={g.ready.includes(me)} onclick={() => act({ type: 'ready' })}>{g.ready.includes(me) ? 'En attente des autres…' : 'J’ai mémorisé'}</button>
        {/if}
        <span class="muted">{g.ready.length}/{g.order.length} prêts</span>
        {#if session.isHost || isTable}<button class="btn" onclick={() => act({ type: 'endmemo' })}>Passer</button>{/if}
      </section>
    {/if}

    {#if g.phase === 'rb' && g.rb}
      <section class="card stack center">
        <h3>Rouge ou noir — {rbWho?.name}</h3>
        <div class="hand">{#each rbCards as c}<PlayingCard card={c} w={isTable ? 80 : 56} />{/each}{#if rbCards.length < 4}<PlayingCard w={isTable ? 80 : 56} />{/if}</div>
        <strong>{RB_QUESTIONS[g.rb.q]} <span class="chip">{g.rb.q + 1} {unit}</span></strong>
        {#if g.order[g.rb.idx] === me && !isTable}
          <div class="choices">{#each rbChoices[g.rb.q] as [val, label]}<button class="btn" onclick={() => act({ type: 'rb', answer: val })}>{label}</button>{/each}</div>
        {/if}
      </section>
    {/if}

    {#if showPyramid && g.phase !== 'rb' && g.phase !== 'memo'}
      <section class="pyr" aria-label="Pyramide">
        {#each rows as row}
          <div class="prow">
            <span class="fl">{cfgSips(row.floor)}</span>
            {#each Array(row.len) as _, k}
              {@const idx = row.start + k}
              <PlayingCard card={g.pyramid[idx]} w={isTable ? 62 : 40} horizontal={g.opts.horizontal && g.horizontal[idx]} glow={g.current === idx && g.phase !== 'flip' && g.phase !== 'end'} />
            {/each}
          </div>
        {/each}
      </section>
    {/if}

    {#if g.phase !== 'end'}
      <section class="players">
        {#each s.players as p (p.id)}
          <div class="pl" class:me={p.id === me} class:turn={g.claim?.by === p.id || g.dist?.from === p.id}>
            <Avatar name={p.name} color={p.color} look={p.avatar} size={isTable ? 44 : 34} />
            <span>{p.name}</span>
            <span class="cards">{#each (g.shown[p.id] ?? []) as sh}<PlayingCard card={sh.card} w={22} />{/each}</span>
          </div>
        {/each}
      </section>
    {/if}

    {#if g.phase === 'flip'}
      {#if session.isHost || isTable}<button class="btn primary block big" onclick={() => act({ type: 'flip' })}>Retourner la carte {g.cursor + 1}/15 (étage {floorOf(g.cursor)})</button>
      {:else}<p class="muted center">L’hôte retourne la prochaine carte…</p>{/if}
    {/if}

    {#if g.phase === 'claim'}
      <section class="card stack center claimbox">
        {#if g.opts.speed && secsLeft}<div class="timer">{secsLeft}</div>{/if}
        {#if !isTable}
          <button class="btn primary block big" onclick={() => act({ type: 'claim' })}>
            J’ai {showPyramid && currentCard ? `un ${valueName(currentCard.v)}` : 'la carte'} !
          </button>
        {:else}<h3>Qui a cette carte ?</h3>{/if}
        {#if (session.isHost || isTable) && !g.opts.speed}<button class="btn" onclick={() => act({ type: 'burn' })}>Personne (carte brûlée)</button>{/if}
      </section>
    {/if}

    {#if g.phase === 'distribute' && g.dist}
      <section class="card stack">
        {#if g.dist.from === me && !isTable}
          <h3>Distribue {g.dist.total} {unit} ({g.dist.total - allocated} restant{g.dist.total - allocated > 1 ? 's' : ''})</h3>
          {#each targets as p (p.id)}
            <div class="row"><Avatar name={p.name} color={p.color} look={p.avatar} size={36} /><span style="flex:1">{p.name}</span>
              <button class="step" onclick={() => adj(p.id, -1)} aria-label="Moins pour {p.name}">−</button><b class="n">{alloc[p.id] ?? 0}</b><button class="step" onclick={() => adj(p.id, 1)} aria-label="Plus pour {p.name}">+</button></div>
          {/each}
          <button class="btn primary block" disabled={allocated !== g.dist.total} onclick={() => act({ type: 'distribute', alloc: Object.fromEntries(Object.entries(alloc).filter(([, n]) => n > 0)) })}>Valider</button>
        {:else}
          <h3>{player(g.dist.from)?.name} distribue {g.dist.total} {unit}…</h3>
        {/if}
      </section>
    {/if}

    {#if g.phase === 'accuse' && g.accuse}
      <section class="card stack">
        <h3>{player(g.accuse.claimer)?.name} distribue</h3>
        {#each Object.entries(g.accuse.alloc) as [id, n]}<div class="row"><Avatar name={player(id)?.name} color={player(id)?.color} look={player(id)?.avatar} size={30} /><span style="flex:1">{player(id)?.name}</span><span class="chip">{n} {unit}</span>{#if !g.accuse.pending.includes(id)}<span>✔</span>{/if}</div>{/each}
        {#if iAmTarget && !isTable}
          <button class="btn block" onclick={() => act({ type: 'respond', choice: 'accept' })}>J’accepte ({myAlloc})</button>
          <button class="btn primary block" onclick={() => act({ type: 'respond', choice: 'liar' })}>Menteur !</button>
        {/if}
      </section>
    {/if}

    {#if g.phase === 'declare' && g.accuse}
      <section class="card stack center">
        <h3>« Menteur ! » — {player(g.declare?.target ?? '')?.name}</h3>
        {#if g.accuse.claimer === me && !isTable}
          <p>Avais-tu la carte ? <span class="muted">(personne ne montre ses cartes)</span></p>
          <div class="choices"><button class="btn" onclick={() => act({ type: 'declare', had: true })}>Oui, je l’avais</button><button class="btn" onclick={() => act({ type: 'declare', had: false })}>Non</button></div>
        {:else}<p class="muted">{player(g.accuse.claimer)?.name} répond…</p>{/if}
      </section>
    {/if}

    {#if showHand && g.phase !== 'memo' && priv?.hand && !isTable}
      <section class="card center stack"><strong>Tes cartes</strong><div class="hand">{#each priv.hand as c}<PlayingCard card={c} w={56} />{/each}</div><span class="muted">{Math.max(0, 8 - Math.floor((now - (priv.peekAt ?? 0)) / 1000))} s</span></section>
    {/if}

    {#if !isTable && g.phase !== 'memo' && g.phase !== 'rb' && g.phase !== 'end'}
      <div class="row mine">
        <span class="muted">Mes cartes :</span>
        {#each myShown as sh}<PlayingCard card={sh.card} w={30} />{/each}
        {#each Array(hiddenCount) as _}<PlayingCard w={30} />{/each}
        {#if canPeek}<button class="btn" style="min-height:40px;padding:0 14px;font-size:.85rem" onclick={() => act({ type: 'peek' })}>Consulter (−{sipsConfig.pyramide.consultationCost})</button>{/if}
      </div>
    {/if}

    {#if g.phase === 'end' && g.finalHands}
      <section class="card stack">
        <h2>Fin de partie !</h2>
        {#each s.players as p}
          <div class="row"><Avatar name={p.name} color={p.color} look={p.avatar} size={34} /><span style="min-width:70px">{p.name}</span><span class="cards">{#each (g.finalHands[p.id] ?? []) as c}<PlayingCard card={c} w={32} />{/each}</span></div>
        {/each}
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
  .center { text-align: center; align-items: center; }
  .msg { padding: 10px 16px; border-radius: 99px; background: var(--c-bg); box-shadow: var(--shadow-in); color: var(--c-accent); font-weight: 700; text-align: center; }
  .seg { display: flex; background: var(--c-bg); box-shadow: var(--shadow-in); border-radius: 99px; padding: 4px; }
  .seg button { flex: 1; min-height: 46px; border-radius: 99px; font-weight: 700; font-size: .9rem; color: var(--c-soft); }
  .seg button.on { background: var(--c-accent); color: var(--c-on-accent); }
  .sw { gap: 12px; } .sw input { width: 24px; height: 24px; accent-color: var(--c-accent); }
  .hand { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
  .choices { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; width: 100%; }
  .pyr { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 0; }
  .prow { display: flex; align-items: center; gap: 6px; position: relative; }
  .fl { position: absolute; left: -26px; font-size: .7rem; color: var(--c-soft); opacity: .6; }
  .players { display: flex; flex-wrap: wrap; gap: 8px; }
  .pl { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 99px; background: var(--c-surface); box-shadow: var(--shadow-out); font-size: .85rem; }
  .pl.me { outline: 2px solid var(--c-accent); } .pl.turn { background: var(--c-accent); color: var(--c-on-accent); }
  .cards { display: inline-flex; gap: 3px; }
  .big { min-height: 80px; font-size: 1.25rem; }
  .timer { font-family: var(--font-display); font-size: 3rem; color: var(--c-accent); }
  .step { width: 44px; height: 44px; border-radius: 50%; background: var(--c-bg); box-shadow: var(--shadow-out); font-size: 1.4rem; font-weight: 800; }
  .n { min-width: 24px; text-align: center; font-size: 1.2rem; }
  .mine { flex-wrap: wrap; position: sticky; bottom: calc(var(--nav-h) + 8px); padding: 8px 12px; border-radius: 99px; background: var(--glass); backdrop-filter: blur(10px); }
  .toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(var(--nav-h) + 90px); background: var(--c-danger); color: #fff; padding: 10px 18px; border-radius: 99px; font-weight: 700; z-index: 60; }
  .table .pyr { transform-origin: top center; padding-left: 30px; }
</style>
