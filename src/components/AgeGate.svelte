<script lang="ts">
  import { load, save } from '../lib/storage'
  let ok = $state(load('picole.age18', false))
  function accept() { save('picole.age18', true); ok = true }
</script>
{#if !ok}
  <div class="gate" role="dialog" aria-modal="true" aria-labelledby="gt">
    <div class="card box">
      <div class="big">18+</div>
      <h2 id="gt">Réservé aux adultes</h2>
      <p class="muted">Ce site propose des jeux à boire. L'alcool est à consommer avec modération. Une option « sans alcool » est disponible dans chaque salon.</p>
      <button class="btn primary block" onclick={accept}>J'ai 18 ans ou plus</button>
    </div>
  </div>
{/if}
<style>
  .gate { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 24px; background: rgb(20 20 19 / .92); backdrop-filter: blur(10px); }
  .box { max-width: 380px; text-align: center; display: flex; flex-direction: column; gap: 14px; }
  .big { font-family: var(--font-display); font-size: 4rem; color: var(--c-accent); line-height: 1; }
</style>
