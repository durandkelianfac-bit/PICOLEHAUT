// Gestionnaire de packs : catégories + éléments, par jeu.
// Sauvegarde locale + export/import JSON. En salon, l'hôte fait autorité (voir room.svelte.ts).
import { load, save } from './storage'
import { codenamesWords } from '../config/words.codenames'

export interface PackItem { id: string; text: string }
export interface PackCategory { id: string; name: string; enabled: boolean; items: PackItem[] }
export interface Pack { gameId: string; name: string; categories: PackCategory[] }
export type Packs = Record<string, Pack>

const uid = () => Math.random().toString(36).slice(2, 9)
export const newItem = (text: string): PackItem => ({ id: uid(), text })
export const newCategory = (name: string, items: string[] = []): PackCategory => ({ id: uid(), name, enabled: true, items: items.map(newItem) })

/** Catégories Codenames par défaut, sans doublon d'un mot à l'autre. */
function codenamesCategories(): PackCategory[] {
  const seen = new Set<string>()
  const norm = (w: string) => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return Object.entries(codenamesWords).map(([name, words]) =>
    newCategory(name, words.filter((w) => { const k = norm(w); if (seen.has(k)) return false; seen.add(k); return true })),
  )
}

// Packs par défaut : catégories prêtes, contenu rempli dans les phases de chaque jeu.
export function defaultPacks(): Packs {
  return {
    codenames: { gameId: 'codenames', name: 'Codenames — mots', categories: codenamesCategories() },
    cyclone: { gameId: 'cyclone', name: 'Cyclone — cartes', categories: [newCategory('Gage'), newCategory('Action'), newCategory('Vérité')] },
    guess: { gameId: 'guess', name: 'Guess the size — objets', categories: [newCategory('Animaux'), newCategory('Monuments'), newCategory('Objets')] },
    doublage: { gameId: 'doublage', name: 'Doublage — extraits', categories: [newCategory('Films'), newCategory('Séries')] },
  }
}

const KEY = 'picole.packs'
// Un pack encore vide (sauvegardé avant l'ajout du contenu) est remplacé par le pack par défaut.
function initialPacks(): Packs {
  const defaults = defaultPacks()
  const saved = load<Packs | null>(KEY, null)
  if (!saved) return defaults
  for (const [id, d] of Object.entries(defaults)) {
    const cur = saved[id]
    if (!cur || cur.categories.every((c) => c.items.length === 0)) saved[id] = d
  }
  return saved
}
export const packsStore = $state<{ packs: Packs }>({ packs: initialPacks() })

let emit: ((p: Packs) => void) | null = null
/** La salle s'abonne pour diffuser/transmettre les changements. */
export function onLocalPacksChange(fn: ((p: Packs) => void) | null) { emit = fn }

/** Modification par l'utilisateur local : sauvegarde + diffusion. */
export function updatePacks(mutate: (p: Packs) => void) {
  const next = $state.snapshot(packsStore.packs) as Packs
  mutate(next)
  packsStore.packs = next
  save(KEY, next)
  emit?.(next)
}
/** Remplacement reçu de l'hôte : sauvegarde sans réémission. */
export function replacePacks(p: Packs) {
  packsStore.packs = p
  save(KEY, p)
}

export function exportPacks(): string { return JSON.stringify($state.snapshot(packsStore.packs), null, 2) }
export function importPacks(json: string): boolean {
  try {
    const p = JSON.parse(json) as Packs
    if (!p || typeof p !== 'object') return false
    for (const k of Object.keys(p)) if (!Array.isArray(p[k]?.categories)) return false
    updatePacks((cur) => { for (const k of Object.keys(cur)) delete cur[k]; Object.assign(cur, p) })
    return true
  } catch { return false }
}

/** Éléments actifs d'un pack (catégories activées uniquement). */
export function activeItems(gameId: string): PackItem[] {
  return (packsStore.packs[gameId]?.categories ?? []).filter((c) => c.enabled).flatMap((c) => c.items)
}
