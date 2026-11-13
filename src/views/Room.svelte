<script lang="ts">
  import Icon from '../components/Icon.svelte'
  import QRCode from 'qrcode'
  import Avatar from '../components/Avatar.svelte'
  import Chase from '../components/Chase.svelte'
  import { session, leaveRoom, setSober, resumeRoom, startGame } from '../lib/room.svelte'
  import { formatEvent, totals } from '../lib/sips'
  import { games } from '../config/games'
  import { go } from '../lib/router.svelte'
  import { load } from '../lib/storage'
  import { modules } from '../games/registry'
  const online = $derived(s ? s.players.filter((p) => p.connected).length : 0)
  const missing = (id: string) => online < (modules[id]?.min ?? 1)

  const s = $derived(session.state)
  const name = (id: string) => s?.players.find((p) => p.id === id)?.name ?? '?'
  const tot = $derived(s ? totals(s.history) : {})
  const joinUrl = $derived(s ? `${location.origin}${location.pathname}#/rejoindre?code=${s.code}` : '')
  let qr = $state('')
  $effect(() => {
    if (joinUrl) QRCode.toDataURL(joinUrl, { margin: 1, width: 280, color: { dark: '#242423', light: '#E8EDDF' } }).then((u) => (qr = u)).catch(() => (qr = ''))
  })

  async function quit() { await leaveRoom(); go('/') }
  const lastHost = load<string>('picole.lastHost', '')
</script>

<main class="page stack">
  {#if !s}
    {#if session.status === 'connecting'}
      <div class="card center"><div class="spin"></div><p>Recherche du salon…</p><p class="muted" style="margin:0">{session.peers} appareil{session.peers > 1 ? 's' : ''} trouvé{session.peers > 1 ? 's' : ''} · cela peut prendre quelques secondes</p></div>
    {:else if session.status === 'error'}
      <div class="card stack"><p>{session.error}</p><button class="btn block" onclick={() => go('/rejoindre')}>Réessayer</button></div>
    {:else}
      <h2>Salon</h2>
      <button class="btn primary block" onclick={() => go('/creer')}>Créer un salon</button>
      <button class="btn block" onclick={() => go('/rejoindre')}>Rejoindre avec un code</button>
      {#if lastHost}<button class="btn block" onclick={() => resumeRoom(lastHost)}>Reprendre mon salon {lastHost}</button>{/if}
    {/if}
  {:else}
    <section class="card center stack">
      <span class="muted">Code du salon</span>
      <div class="code">{s.code}</div>
      {#if qr}<img class="qr" src={qr} alt="QR code pour rejoindre le salon {s.code}" width="200" height="200" />{/if}
      <div class="row" style="justify-content:center;flex-wrap:wrap">
        <span class="chip">{#if s.mode === 'table'}<Icon name="tv" /> Écran central{:else}<Icon name="phone" /> Simple{/if}</span>
        <span class="chip"><Icon name="dot" /> {session.status === 'online' ? 'En ligne' : 'Reconnexion…'}</span>
        <span class="chip">{#if s.sober}<Icon name="cup" /> Sans alcool{:else}<Icon name="beer" /> Gorgées{/if}</span>
      </div>
      {#if session.isHost}
        <label class="row" style="justify-content:center;gap:10px"><input type="checkbox" checked={s.sober} onchange={(e) => setSober(e.currentTarget.checked)} style="width:22px;height:22px;accent-color:var(--c-accent)" /> Mode sans alcool</label>
      {/if}
    </section>

    <section class="card stack">
      <h3>Joueurs ({s.players.length})</h3>
      {#each s.players as p (p.id)}
        <div class="row player" class:off={!p.connected}>
          <Avatar name={p.name} color={p.color} look={p.avatar} size={44} />
          <strong>{p.name}{#if p.id === s.hostId} <Icon name="crown" />{/if}</strong>
          <span class="muted tot">{tot[p.id] ? `${tot[p.id].drunk} ${s.sober ? 'pts' : 'gorgées'} · ${tot[p.id].given} donnés` : ''}</span>
        </div>
      {/each}
    </section>

    <Chase players={s.players} />

    <section class="card stack">
      <h3>Jeux</h3>
      <div class="gl">{#each games as g}
        {#if g.ready && session.isHost}<button class="btn primary" disabled={missing(g.id)} onclick={() => { startGame(g.id); go('/jeu') }}><Icon name={g.icon} /> Lancer {g.name}{missing(g.id) ? ` (${modules[g.id].min} joueurs min.)` : ''}</button>
        {:else}<span class="chip"><Icon name={g.icon} /> {g.name}{g.ready ? '' : ' · bientôt'}</span>{/if}
      {/each}</div>
      {#if session.toast}<span class="muted" role="alert">{session.toast}</span>{/if}
    </section>

    <section class="card stack">
      <h3>Historique</h3>
      {#each s.history.slice(0, 12) as e (e.id)}
        <div class="hist"><span>{formatEvent(e, name(e.playerId), s.sober)}</span>{#if e.reason}<span class="muted"> · {e.reason}</span>{/if}</div>
      {:else}
        <p class="muted">Rien pour l'instant.</p>
      {/each}
    </section>

    <button class="btn block" onclick={quit}>Quitter le salon</button>
  {/if}
</main>

<style>
  .center { text-align: center; align-items: center; }
  .code { font-family: var(--font-display); font-size: 3.4rem; letter-spacing: .25em; padding-left: .25em; color: var(--c-accent); }
  .qr { border-radius: 18px; background: var(--c-text); padding: 6px; }
  .player { padding: 6px 4px; }
  .player.off { opacity: .45; }
  .tot { margin-left: auto; font-size: .8rem; }
  .gl { display: flex; flex-wrap: wrap; gap: 8px; }
  .hist { padding: 8px 12px; border-radius: 14px; background: var(--c-bg); box-shadow: var(--shadow-in); font-size: .9rem; animation: rise .3s var(--ease) both; }
  .spin { width: 36px; height: 36px; border-radius: 50%; border: 4px solid var(--c-bg); border-top-color: var(--c-accent); animation: sp 1s linear infinite; }
  @keyframes sp { to { transform: rotate(360deg); } }
</style>
