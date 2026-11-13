<script lang="ts">
  import Icon from '../components/Icon.svelte'
  import QRCode from 'qrcode'
  import Hues from '../games/hues/Hues.svelte'
  import Codenames from '../games/codenames/Codenames.svelte'
  import Pyramide from '../games/pyramide/Pyramide.svelte'
  import Palmier from '../games/palmier/Palmier.svelte'
  import Guess from '../games/guess/Guess.svelte'
  import Cyclone from '../games/cyclone/Cyclone.svelte'
  import Doublage from '../games/doublage/Doublage.svelte'
  import Avatar from '../components/Avatar.svelte'
  import PlayerPanel from '../components/PlayerPanel.svelte'
  // l'écran central qui joue aussi : son jeu privé (rôle, main…) s'ouvre à la demande, jamais affiché en permanence
  let privateOpen = $state(false)
  import { session } from '../lib/room.svelte'
  const s = $derived(session.state)
  const joinUrl = $derived(s ? `${location.origin}${location.pathname}#/rejoindre?code=${s.code}` : '')
  let qr = $state('')
  $effect(() => { if (joinUrl) QRCode.toDataURL(joinUrl, { margin: 1, width: 300, color: { dark: '#242423', light: '#E8EDDF' } }).then((u) => (qr = u)) })
</script>
<main class="tablepage">
  {#if !s}
    <p class="muted">Connexion au salon…</p>
  {:else if s.game?.id === 'hues'}
    <Hues view="table" />
  {:else if s.game?.id === 'codenames'}
    <Codenames view="table" />
  {:else if s.game?.id === 'pyramide'}
    <Pyramide view="table" />
  {:else if s.game?.id === 'palmier'}
    <Palmier view="table" />
  {:else if s.game?.id === 'guess'}
    <Guess view="table" />
  {:else if s.game?.id === 'cyclone'}
    <Cyclone view="table" />
  {:else if s.game?.id === 'doublage'}
    <Doublage view="table" />
  {:else}
    <div class="lobby">
      <div class="stack"><span class="muted">Rejoins le salon</span><div class="code">{s.code}</div>{#if qr}<img src={qr} alt="QR code du salon" width="220" height="220" />{/if}</div>
      <div class="stack">{#each s.players as p}<div class="row"><Avatar name={p.name} color={p.color} look={p.avatar} size={56} /><strong style="font-size:1.4rem">{p.name}</strong></div>{/each}</div>
    </div>
  {/if}
  {#if session.plays && s?.game}
    <button class="btn primary mine" onclick={() => (privateOpen = true)}><Icon name="hide" /> Mon jeu</button>
    {#if privateOpen}
      <div class="veil" role="dialog" aria-label="Mon jeu privé">
        <div class="sheet">
          <p class="muted" style="margin:0">Vérifie que personne ne regarde l’écran, puis referme.</p>
          <PlayerPanel />
          <button class="btn primary block" onclick={() => (privateOpen = false)}>Fermer et recacher</button>
        </div>
      </div>
    {/if}
  {/if}
</main>
<style>
  .mine { position: fixed; right: 20px; bottom: 20px; z-index: 40; }
  .veil { position: fixed; inset: 0; z-index: 80; background: rgb(20 20 19 / .94); overflow: auto; display: grid; place-items: start center; padding: 24px; }
  .sheet { width: min(520px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .tablepage { min-height: 100dvh; padding: 24px; }
  .lobby { display: flex; gap: 48px; align-items: center; justify-content: center; min-height: 80dvh; flex-wrap: wrap; }
  .code { font-family: var(--font-display); font-size: 5rem; letter-spacing: .25em; color: var(--c-accent); }
  img { border-radius: 18px; padding: 8px; background: var(--c-text); }
</style>
