<script lang="ts">
  import ProfileForm from '../components/ProfileForm.svelte'
  import { joinExisting, myProfile } from '../lib/room.svelte'
  import { go, route } from '../lib/router.svelte'
  let profile = $state(myProfile())
  let asTable = $state(false)
  let code = $state((route.params.get('code') ?? '').toUpperCase().slice(0, 4))
  const valid = $derived((asTable || profile.name.trim().length > 0) && /^[A-Z]{4}$/.test(code))
  function submit() {
    if (!valid) return
    joinExisting(code, { ...profile, name: profile.name.trim() || 'Table' }, asTable)
    go(asTable ? '/table' : '/salon')
  }
</script>
<main class="page stack">
  <h2>Rejoindre un salon</h2>
  <input class="input code" placeholder="CODE" maxlength="4" bind:value={code} oninput={() => (code = code.toUpperCase().replace(/[^A-Z]/g, ''))} aria-label="Code du salon" />
  <label class="row" style="gap:12px"><input type="checkbox" bind:checked={asTable} style="width:24px;height:24px;accent-color:var(--c-accent)" /> Je suis l’écran « table » (TV, tablette, PC)</label>
  {#if !asTable}<div class="card"><ProfileForm bind:profile /></div>{/if}
  <button class="btn primary block" disabled={!valid} onclick={submit}>Rejoindre</button>
</main>
