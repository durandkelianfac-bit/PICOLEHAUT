<script lang="ts">
  import Icon from './Icon.svelte'
  import Avatar from './Avatar.svelte'
  import { COLORS, type Profile } from '../lib/room.svelte'
  import { ACCESSORIES, LOOKS, composeAvatar, parseAvatar } from '../lib/looks'
  import { GENDERS } from '../lib/cheeky'
  let { profile = $bindable() }: { profile: Profile } = $props()
  import HeroAvatar3D from './HeroAvatar3D.svelte'
  let ready = $state(false)
  const cur = $derived(parseAvatar(profile.avatar))
</script>
<div class="stack">
  <div class="hero">
    <!-- aperçu animé (un seul rendu 3D temps réel) ; la vignette fixe sert tant qu'il n'est pas prêt -->
    <div class="live">
      <div class="still" class:off={ready}><Avatar name={profile.name} color={profile.color} look={profile.avatar} size={104} /></div>
      {#key profile.avatar + profile.color}
        <div class="anim" class:on={ready}><HeroAvatar3D color={profile.color} look={profile.avatar} onready={() => (ready = true)} /></div>
      {/key}
    </div>
    <!-- Genre : sert à accorder les messages (Palmier pour l'instant). Genderfluid = tous les autres. -->
    <div class="gender" role="radiogroup" aria-label="Genre (accord des messages au Palmier)" title="Sert à accorder les messages du Palmier">
      {#each GENDERS as g}
        <button class:sel={(profile.gender ?? 'x') === g.id} role="radio" aria-checked={(profile.gender ?? 'x') === g.id} onclick={() => (profile.gender = g.id)}>{g.label}</button>
      {/each}
    </div>
  </div>
  <input class="input" placeholder="Ton pseudo" maxlength="16" bind:value={profile.name} aria-label="Pseudo" />

  <div class="colors" role="radiogroup" aria-label="Couleur">
    {#each COLORS as c}
      <button class="dot" class:sel={profile.color === c} style="background:{c}" onclick={() => (profile.color = c)} role="radio" aria-checked={profile.color === c} aria-label={c}></button>
    {/each}
  </div>

  <div class="stack" style="gap:8px">
    <strong class="lbl">Pose</strong>
    <div class="grid" role="radiogroup" aria-label="Pose du personnage">
      {#each LOOKS as l}
        <button class="opt" class:sel={cur.look === l.id} role="radio" aria-checked={cur.look === l.id} aria-label={l.label}
          onclick={() => (profile.avatar = composeAvatar(l.id, cur.acc))}>
          <Avatar name={l.label} color={profile.color} look={composeAvatar(l.id, cur.acc)} size={52} /><span>{l.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="stack" style="gap:8px">
    <strong class="lbl">Accessoire</strong>
    <div class="accs" role="radiogroup" aria-label="Accessoire">
      {#each ACCESSORIES as a}
        <button class="acc" class:sel={cur.acc === a.id} role="radio" aria-checked={cur.acc === a.id} onclick={() => (profile.avatar = composeAvatar(cur.look, a.id))}>
          <span class="e" aria-hidden="true"><Icon name={a.icon} size="1.5em" /></span><span>{a.label}</span>
        </button>
      {/each}
    </div>
  </div>
</div>
<style>
  .hero { position: relative; display: flex; justify-content: center; padding: 6px 0; }
  .live { position: relative; width: 136px; height: 170px; display: grid; place-items: center; }
  .still, .anim { grid-area: 1 / 1; width: 100%; height: 100%; display: grid; place-items: center; }
  .still.off { display: none; }
  .anim { opacity: 0; transition: opacity .25s; }
  .anim.on { opacity: 1; }
  .gender { position: absolute; top: 0; right: 0; display: flex; flex-direction: column; gap: 4px; align-items: stretch; }
  .gender button { padding: 3px 9px; border-radius: 99px; font-size: .68rem; color: var(--c-soft); background: var(--c-bg); box-shadow: var(--shadow-in); opacity: .8; }
  .gender button.sel { background: var(--c-accent); color: var(--c-on-accent); font-weight: 700; opacity: 1; }
  .colors { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .dot { width: 38px; height: 38px; border-radius: 50%; box-shadow: var(--shadow-out); border: 3px solid transparent; }
  .dot.sel { border-color: var(--c-text); transform: scale(1.12); }
  .lbl { font-size: .85rem; color: var(--c-soft); }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .opt { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 2px; border-radius: 18px; background: var(--c-bg); box-shadow: var(--shadow-in); font-size: .7rem; color: var(--c-soft); }
  .opt.sel { outline: 2px solid var(--c-accent); color: var(--c-text); }
  .accs { display: flex; flex-wrap: wrap; gap: 8px; }
  .acc { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 99px; background: var(--c-bg); box-shadow: var(--shadow-in); font-size: .8rem; color: var(--c-soft); }
  .acc.sel { outline: 2px solid var(--c-accent); color: var(--c-text); }
  .e { font-size: 1.1rem; }
</style>
