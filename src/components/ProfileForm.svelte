<script lang="ts">
  import Avatar from './Avatar.svelte'
  import { COLORS, type Profile } from '../lib/room.svelte'
  let { profile = $bindable() }: { profile: Profile } = $props()
</script>
<div class="stack">
  <div class="row" style="justify-content:center"><Avatar name={profile.name} color={profile.color} look={profile.avatar} size={84} /></div>
  <input class="input" placeholder="Ton pseudo" maxlength="16" bind:value={profile.name} aria-label="Pseudo" />
  <div class="colors" role="radiogroup" aria-label="Couleur">
    {#each COLORS as c}
      <button class="dot" class:sel={profile.color === c} style="background:{c}" onclick={() => (profile.color = c)} role="radio" aria-checked={profile.color === c} aria-label={c}></button>
    {/each}
  </div>
</div>
<style>
  .colors { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .dot { width: 38px; height: 38px; border-radius: 50%; box-shadow: var(--shadow-out); border: 3px solid transparent; }
  .dot.sel { border-color: var(--c-text); transform: scale(1.12); }
</style>
