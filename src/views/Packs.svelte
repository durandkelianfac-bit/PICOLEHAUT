<script lang="ts">
  import { packsStore, updatePacks, newItem, newCategory, exportPacks, importPacks } from '../lib/packs.svelte'
  import { session } from '../lib/room.svelte'
  import ClipMaker from '../components/ClipMaker.svelte'

  let gameId = $state('codenames')
  let newCat = $state('')
  let drafts = $state<Record<string, string>>({})
  let msg = $state('')
  const pack = $derived(packsStore.packs[gameId])
  const live = $derived(session.state !== null)

  const addCat = () => { if (newCat.trim()) { updatePacks((p) => p[gameId].categories.push(newCategory(newCat.trim()))); newCat = '' } }
  const toggle = (cid: string) => updatePacks((p) => { const c = p[gameId].categories.find((x) => x.id === cid); if (c) c.enabled = !c.enabled })
  const delCat = (cid: string) => updatePacks((p) => { p[gameId].categories = p[gameId].categories.filter((x) => x.id !== cid) })
  const addItem = (cid: string) => {
    const t = (drafts[cid] ?? '').trim(); if (!t) return
    updatePacks((p) => p[gameId].categories.find((x) => x.id === cid)?.items.push(newItem(t)))
    drafts[cid] = ''
  }
  const delItem = (cid: string, iid: string) => updatePacks((p) => { const c = p[gameId].categories.find((x) => x.id === cid); if (c) c.items = c.items.filter((i) => i.id !== iid) })
  const editItem = (cid: string, iid: string, text: string) => updatePacks((p) => { const i = p[gameId].categories.find((x) => x.id === cid)?.items.find((y) => y.id === iid); if (i) i.text = text })

  function doExport() {
    const url = URL.createObjectURL(new Blob([exportPacks()], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'picole-haut-packs.json' })
    a.click(); URL.revokeObjectURL(url)
  }
  async function doImport(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (!f) return
    msg = importPacks(await f.text()) ? 'Import réussi.' : 'Fichier invalide.'
  }
</script>

<main class="page stack">
  <h2>Packs</h2>
  <p class="muted" style="margin:0">{live ? '🟢 En salon : tes modifications sont envoyées en direct à tous les téléphones.' : 'Hors salon : sauvegarde locale sur cet appareil.'}</p>
  <div class="tabs" role="tablist">
    {#each Object.values(packsStore.packs) as p}
      <button role="tab" aria-selected={gameId === p.gameId} class:on={gameId === p.gameId} onclick={() => (gameId = p.gameId)}>{p.name.split(' — ')[0]}</button>
    {/each}
  </div>

  {#if gameId === 'doublage'}
    <div class="card stack"><strong>Format d’un extrait</strong>
      <code>lien ou id YouTube | début (s) | fin (s) | titre | 1.5:Réplique avec ___ ## 6:Autre réplique</code>
      <span class="muted">Le nombre devant « : » est l’instant de la réplique (en secondes depuis le début de l’extrait). « ___ » est un trou que le joueur remplit. Extraits courts (10 à 30 s) recommandés.</span></div>
    <ClipMaker />
  {:else if gameId === 'cyclone'}
    <div class="card stack"><strong>Format d’une carte</strong>
      <code>intensité (1 soft, 2 moyen, 3 épicé) | texte | gorgées</code>
      <span class="muted">Catégories : Gage et Vérité (gorgées si refus), Action (gorgées distribuées). {'{autre}'} = un autre joueur tiré au sort.</span></div>
  {:else if gameId === 'guess'}
    <div class="card stack"><strong>Format d’un objet</strong>
      <code>nom | taille en mètres | emoji</code>
      <span class="muted">Ajoute uniquement des tailles que tu as vérifiées (Wikipédia, Wikidata).</span></div>
  {/if}
  {#if pack}
    {#each pack.categories as c (c.id)}
      <section class="card stack">
        <div class="row">
          <h3 style="flex:1">{c.name} <span class="muted">({c.items.length})</span></h3>
          <button class="chip" onclick={() => toggle(c.id)} aria-pressed={c.enabled}>{c.enabled ? 'Activée' : 'Désactivée'}</button>
          <button class="chip" onclick={() => delCat(c.id)} aria-label="Supprimer la catégorie {c.name}">✕</button>
        </div>
        <div class="items">
          {#each c.items as i (i.id)}
            <span class="item"><input value={i.text} onchange={(e) => editItem(c.id, i.id, e.currentTarget.value)} aria-label="Élément" /><button onclick={() => delItem(c.id, i.id)} aria-label="Supprimer {i.text}">✕</button></span>
          {/each}
        </div>
        <form class="row" onsubmit={(e) => { e.preventDefault(); addItem(c.id) }}>
          <input class="input" placeholder="Ajouter un élément" bind:value={drafts[c.id]} />
          <button class="btn primary" style="padding:0 20px" aria-label="Ajouter">+</button>
        </form>
      </section>
    {/each}
    <form class="row" onsubmit={(e) => { e.preventDefault(); addCat() }}>
      <input class="input" placeholder="Nouvelle catégorie" bind:value={newCat} />
      <button class="btn" style="padding:0 20px">Créer</button>
    </form>
  {/if}

  <div class="card stack">
    <h3>Sauvegarde</h3>
    <div class="row"><button class="btn" onclick={doExport}>Exporter JSON</button>
      <label class="btn">Importer<input type="file" accept="application/json" onchange={doImport} hidden /></label></div>
    {#if msg}<span class="muted">{msg}</span>{/if}
  </div>
</main>

<style>
  .tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
  .tabs button { white-space: nowrap; padding: 10px 16px; border-radius: 99px; background: var(--c-surface); box-shadow: var(--shadow-out); font-weight: 600; font-size: .85rem; }
  .tabs button.on { background: var(--c-accent); color: var(--c-on-accent); }
  .chip { cursor: pointer; }
  .items { display: flex; flex-wrap: wrap; gap: 8px; }
  .item { display: inline-flex; align-items: center; background: var(--c-bg); box-shadow: var(--shadow-in); border-radius: 99px; padding: 2px 10px 2px 14px; }
  .item input { background: none; border: 0; outline: 0; width: 9ch; min-width: 6ch; font-size: .9rem; }
  .item button { color: var(--c-soft); padding: 6px; }
</style>
