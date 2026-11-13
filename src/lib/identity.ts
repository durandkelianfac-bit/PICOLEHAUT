// Un identifiant de joueur par onglet : deux onglets d'un même navigateur (tests sur un seul PC)
// ne se confondent pas en un seul joueur. Sur un téléphone (un seul onglet), l'identifiant sauvegardé
// est conservé, ce qui permet de se reconnecter à son salon.
const KEY = 'picole.pid'
let current: string | null = null

export const tabId = () => current
let primary = true
/** Vrai pour le premier onglet de l'appareil (il garde l'identifiant sauvegardé du profil). */
export const isPrimaryTab = () => primary

function fresh(): string {
  try { if (typeof crypto.randomUUID === 'function') return crypto.randomUUID() } catch { /* contexte non sécurisé */ }
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (x) => x.toString(16).padStart(2, '0')).join('')
}

/** À appeler une fois au démarrage, avant d'afficher l'application. */
export async function claimTabId(preferred: string): Promise<void> {
  let id = preferred
  try { id = sessionStorage.getItem(KEY) || preferred } catch { /* stockage indisponible */ }
  current = id || null
  if (!id || typeof BroadcastChannel === 'undefined') return
  const me = fresh()
  const ch = new BroadcastChannel('picole-ids')
  // Les autres onglets répondent s'ils utilisent déjà cet identifiant
  ch.onmessage = (e: MessageEvent) => {
    const m = e.data as { type: string; id: string; from: string; to?: string }
    if (m.type === 'ping' && m.id === current && m.from !== me) ch.postMessage({ type: 'pong', id: m.id, from: me, to: m.from })
  }
  const taken = await new Promise<boolean>((resolve) => {
    ch.addEventListener('message', (e: MessageEvent) => { const m = e.data; if (m.type === 'pong' && m.to === me) resolve(true) })
    ch.postMessage({ type: 'ping', id, from: me })
    setTimeout(() => resolve(false), 250)
  })
  if (taken) current = fresh()
  primary = current === preferred
  try { if (current) sessionStorage.setItem(KEY, current) } catch { /* ignoré */ }
}
