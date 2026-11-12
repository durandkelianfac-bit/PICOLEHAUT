<script lang="ts">
  import ProfileForm from '../components/ProfileForm.svelte'
  import { joinExisting, myProfile } from '../lib/room.svelte'
  import { go, route } from '../lib/router.svelte'
  let profile = $state(myProfile())
  let code = $state((route.params.get('code') ?? '').toUpperCase().slice(0, 4))
  const valid = $derived(profile.name.trim().length > 0 && /^[A-Z]{4}$/.test(code))
  function submit() {
    if (!valid) return
    joinExisting(code, { ...profile, name: profile.name.trim() })
    go('/salon')
  }
</script>
<main class="page stack">
  <h2>Rejoindre un salon</h2>
  <input class="input code" placeholder="CODE" maxlength="4" bind:value={code} oninput={() => (code = code.toUpperCase().replace(/[^A-Z]/g, ''))} aria-label="Code du salon" />
  <div class="card"><ProfileForm bind:profile /></div>
  <button class="btn primary block" disabled={!valid} onclick={submit}>Rejoindre</button>
</main>
