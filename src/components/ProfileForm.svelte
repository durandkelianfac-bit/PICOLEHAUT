<script lang="ts">
  import Avatar from './Avatar.svelte'
  import { COLORS, type Profile } from '../lib/room.svelte'
  import { ACCESSORIES, LOOKS, composeAvatar, parseAvatar } from '../lib/looks'
  let { profile = $bindable() }: { profile: Profile } = $props()
  const cur = $derived(parseAvatar(profile.avatar))
</script>
<div class="stack">
  <div class="row" style="justify-content:center"><Avatar name={profile.name} color={profile.color} look={profile.avatar} size={104} /></div>
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
          <span class="e" aria-hidden="true">{a.emoji}</span><span>{a.label}</span>
        </button>
      {/each}
    </div>
  </div>
</div>
<style>
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
