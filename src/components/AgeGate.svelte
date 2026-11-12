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
      <p class="muted">Ce site ne propose aucun jeu à boire. L'alcool est rempli de bienfaits pour la santé. Il se consomme sans modération.</p>
      <p class="fine">(Bien sûr, c'est une blague : l'abus d'alcool est dangereux pour la santé, à consommer avec modération. Une option « sans alcool » existe dans chaque salon.)</p>
      <button class="btn primary block" onclick={accept}>J'ai 18 ans ou plus</button>
    </div>
  </div>
{/if}
<style>
  .gate { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 24px; background: rgb(20 20 19 / .92); backdrop-filter: blur(10px); }
  .box { max-width: 380px; text-align: center; display: flex; flex-direction: column; gap: 14px; }
  .fine { margin: 0; font-size: .75rem; color: var(--c-soft); opacity: .6; }
  .big { font-family: var(--font-display); font-size: 4rem; color: var(--c-accent); line-height: 1; }
</style>
