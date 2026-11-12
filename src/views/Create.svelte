<script lang="ts">
  import ProfileForm from '../components/ProfileForm.svelte'
  import { createRoom, myProfile, type RoomMode } from '../lib/room.svelte'
  import { go } from '../lib/router.svelte'
  let profile = $state(myProfile())
  let mode = $state<RoomMode>('equal')
  let sober = $state(false)
  function submit() {
    if (!profile.name.trim()) return
    createRoom({ ...profile, name: profile.name.trim() }, mode, sober)
    go('/salon')
  }
</script>
<main class="page stack">
  <h2>Créer un salon</h2>
  <div class="card"><ProfileForm bind:profile /></div>
  <div class="card stack">
    <h3>Mode</h3>
    <div class="seg" role="radiogroup">
      <button class:on={mode === 'equal'} onclick={() => (mode = 'equal')} role="radio" aria-checked={mode === 'equal'}>Téléphones égaux</button>
      <button class:on={mode === 'table'} onclick={() => (mode = 'table')} role="radio" aria-checked={mode === 'table'}>Écran « table »</button>
    </div>
    <label class="row switch"><input type="checkbox" bind:checked={sober} /><span>Sans alcool (points à la place des gorgées)</span></label>
  </div>
  <button class="btn primary block" disabled={!profile.name.trim()} onclick={submit}>Ouvrir le salon</button>
</main>
<style>
  .seg { display: flex; background: var(--c-bg); box-shadow: var(--shadow-in); border-radius: 99px; padding: 4px; }
  .seg button { flex: 1; min-height: 46px; border-radius: 99px; font-weight: 700; font-size: .9rem; color: var(--c-soft); }
  .seg button.on { background: var(--c-accent); color: var(--c-on-accent); }
  .switch { gap: 12px; }
  .switch input { width: 24px; height: 24px; accent-color: var(--c-accent); }
</style>
