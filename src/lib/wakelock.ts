// Garde l'écran allumé (Wake Lock API) tant que la page est visible.
let lock: WakeLockSentinel | null = null
async function request() {
  try { lock = await navigator.wakeLock?.request('screen') } catch { lock = null }
}
export function keepAwake() {
  request()
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') request() })
}
