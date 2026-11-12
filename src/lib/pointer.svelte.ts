// Pointeur laser : le téléphone vise l'écran table via DeviceOrientation.
// iOS : permission après un geste utilisateur, HTTPS obligatoire.
import { sendLaser } from './room.svelte'

const FOV_X = 40 // degrés de rotation horizontale pour traverser l'écran
const FOV_Y = 28
const SMOOTH = 0.25 // lissage exponentiel (0 = figé, 1 = brut)
const SEND_MS = 33 // ~30 Hz

export const laser = $state({ active: false, supported: true, denied: false, x: 0.5, y: 0.5 })

let yaw0: number | null = null
let pitch0: number | null = null
let raw = { yaw: 0, pitch: 0 }
let timer: ReturnType<typeof setInterval> | null = null
let myId = ''

const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180
const clamp = (v: number) => Math.max(0, Math.min(1, v))

function onOrient(e: DeviceOrientationEvent) {
  if (e.alpha == null || e.beta == null) return
  raw = { yaw: e.alpha, pitch: e.beta }
  if (yaw0 === null || pitch0 === null) { yaw0 = raw.yaw; pitch0 = raw.pitch }
  // alpha augmente en tournant vers la gauche : on inverse pour que droite = x croissant
  const tx = clamp(0.5 - wrap(raw.yaw - yaw0) / FOV_X)
  const ty = clamp(0.5 - (raw.pitch - pitch0) / FOV_Y)
  laser.x += (tx - laser.x) * SMOOTH
  laser.y += (ty - laser.y) * SMOOTH
}

/** À appeler depuis un geste utilisateur (tap sur un bouton). */
export async function enableLaser(playerId: string) {
  myId = playerId
  laser.denied = false
  const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
  try {
    if (typeof D.requestPermission === 'function' && (await D.requestPermission()) !== 'granted') { laser.denied = true; return }
  } catch { laser.denied = true; return }
  if (!('DeviceOrientationEvent' in window)) { laser.supported = false; return }
  addEventListener('deviceorientation', onOrient)
  laser.active = true
  recenter()
  timer ??= setInterval(() => sendLaser({ id: myId, x: laser.x, y: laser.y }), SEND_MS)
}

export function recenter() {
  yaw0 = raw.yaw; pitch0 = raw.pitch
  laser.x = 0.5; laser.y = 0.5
}

/** Tap = clic à la position courante du laser. */
export function laserClick() { sendLaser({ id: myId, x: laser.x, y: laser.y, click: true }) }

export function disableLaser() {
  removeEventListener('deviceorientation', onOrient)
  if (timer) { clearInterval(timer); timer = null }
  laser.active = false; yaw0 = pitch0 = null
}
