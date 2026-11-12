<script lang="ts">
  import QRCode from 'qrcode'
  import Hues from '../games/hues/Hues.svelte'
  import Codenames from '../games/codenames/Codenames.svelte'
  import Pyramide from '../games/pyramide/Pyramide.svelte'
  import Palmier from '../games/palmier/Palmier.svelte'
  import Guess from '../games/guess/Guess.svelte'
  import Cyclone from '../games/cyclone/Cyclone.svelte'
  import Avatar from '../components/Avatar.svelte'
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
  {:else}
    <div class="lobby">
      <div class="stack"><span class="muted">Rejoins le salon</span><div class="code">{s.code}</div>{#if qr}<img src={qr} alt="QR code du salon" width="220" height="220" />{/if}</div>
      <div class="stack">{#each s.players as p}<div class="row"><Avatar name={p.name} color={p.color} size={56} /><strong style="font-size:1.4rem">{p.name}</strong></div>{/each}</div>
    </div>
  {/if}
</main>
<style>
  .tablepage { min-height: 100dvh; padding: 24px; }
  .lobby { display: flex; gap: 48px; align-items: center; justify-content: center; min-height: 80dvh; flex-wrap: wrap; }
  .code { font-family: var(--font-display); font-size: 5rem; letter-spacing: .25em; color: var(--c-accent); }
  img { border-radius: 18px; padding: 8px; background: var(--c-text); }
</style>
