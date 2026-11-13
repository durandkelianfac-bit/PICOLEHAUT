// Salon multi-téléphones : WebRTC pair-à-pair (Trystero), l'hôte fait autorité.
// Les clients envoient des "intents" à l'hôte ; l'hôte diffuse l'état complet.
import { joinRoom } from 'trystero'
import { load, save } from './storage'
import { pushHistory, type SipEvent } from './sips'
import { modules } from '../games/registry'
import { assignDistinct, assignLook } from './looks'
import { clearAudio, putAudio, registerAudioSender } from './audio.svelte'
import { tabId } from './identity'
import type { Gender } from './cheeky'
import { onLocalPacksChange, packsStore, replacePacks, type Packs } from './packs.svelte'

export interface Profile { id: string; name: string; color: string; avatar: string; gender?: Gender }
export interface Player extends Profile { connected: boolean }
export type RoomMode = 'equal' | 'table'
export interface RoomState {
  code: string
  hostId: string
  mode: RoomMode
  sober: boolean
  players: Player[]
  history: SipEvent[]
  packs: Packs
  game: { id: string; data: any } | null
}
type Intent =
  | { t: 'join'; profile: Profile }
  | { t: 'packs'; packs: Packs }
  | { t: 'sip'; event: SipEvent }
  | { t: 'join-table' }
  | { t: 'start'; gameId: string }
  | { t: 'stop' }
  | { t: 'game'; action: any; as?: string }
export interface Pointer { x: number; y: number; color: string; name: string; ts: number }
export interface PointerMsg { id: string; x: number; y: number; click?: boolean }

const APP_ID = 'picole-haut-app-v1'
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
export const COLORS = ['#F5CB5C', '#E8EDDF', '#CFDBD5', '#e5645a', '#6ec6a0', '#7aa7e8', '#d58be0', '#f09a5a']

export const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('')

/** Identifiant aléatoire ; randomUUID n'existe qu'en contexte sécurisé (HTTPS / localhost). */
function newId(): string {
  try { if (typeof crypto.randomUUID === 'function') return crypto.randomUUID() } catch { /* repli ci-dessous */ }
  const b = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

export function myProfile(): Profile {
  const p = load<Profile | null>('picole.profile', null)
  if (p) {
    if (!p.avatar) { p.avatar = assignLook(p.id); save('picole.profile', p) }
    return { ...p, id: tabId() ?? p.id }
  }
  const fresh: Profile = { id: tabId() ?? newId(), name: '', color: COLORS[Math.floor(Math.random() * COLORS.length)], avatar: '' }
  fresh.avatar = assignLook(fresh.id)
  save('picole.profile', fresh)
  return fresh
}
/** Sauvegarde le profil ; l'identifiant sauvegardé (celui de l'onglet principal) n'est jamais écrasé. */
export function saveProfile(p: Profile) {
  const stored = load<Profile | null>('picole.profile', null)
  save('picole.profile', { ...p, id: stored?.id ?? p.id })
}

export const session = $state<{
  state: RoomState | null
  status: 'idle' | 'connecting' | 'online' | 'error'
  error: string
  isHost: boolean
  me: Profile | null
  role: 'player' | 'table'
  plays: boolean // l'écran central joue aussi (il a un profil de joueur)
  priv: any
  pointers: Record<string, Pointer>
  toast: string
  peers: number
}>({ state: null, status: 'idle', error: '', isHost: false, me: null, role: 'player', plays: false, priv: null, pointers: {}, toast: '', peers: 0 })

/** Abonnés aux clics laser (l'écran table les convertit en actions de jeu). */
const clickListeners = new Set<(m: PointerMsg) => void>()
export function onLaserClick(fn: (m: PointerMsg) => void) { clickListeners.add(fn); return () => clickListeners.delete(fn) }

let room: ReturnType<typeof joinRoom> | null = null
let sendState: ((s: RoomState) => Promise<void>) | null = null
let sendIntent: ((i: Intent, hostPeer?: string) => Promise<void>) | null = null
const peerToPlayer = new Map<string, string>() // peerId -> player.id (hôte uniquement)
let hostPeerId: string | null = null
let sendPriv: ((d: unknown, target: string) => Promise<void>) | null = null
let sendPointer: ((m: PointerMsg) => Promise<void>) | null = null
const tablePeers = new Set<string>() // hôte : appareils « écran table »
let secret: unknown = null // hôte : état secret du jeu en cours

function commit(next: RoomState) {
  session.state = next
  save('picole.room.' + next.code, next)
  sendState?.($state.snapshot(next) as RoomState)
}

function applyIntent(i: Intent, peerId: string) {
  const s = session.state
  if (!s) return
  const fromHost = peerId === 'self' || s.hostId === peerToPlayer.get(peerId)
  if (i.t === 'join') {
    peerToPlayer.set(peerId, i.profile.id)
    const others = s.players.filter((p) => p.id !== i.profile.id)
    // chaque joueur a un look différent dans le salon
    const taken = others.map((p) => p.avatar)
    const avatar = i.profile.avatar && !taken.includes(i.profile.avatar) ? i.profile.avatar : assignDistinct(i.profile.id, taken)
    commit({ ...s, players: [...others, { ...i.profile, avatar, connected: true }] })
    if (s.game) deliverPriv({ [i.profile.id]: modules[s.game.id]?.privFor?.(s.game.data, secret, i.profile.id) ?? undefined })
  } else if (i.t === 'packs') {
    replacePacks(i.packs)
    commit({ ...s, packs: i.packs })
  } else if (i.t === 'sip') {
    commit({ ...s, history: pushHistory(s.history, i.event) })
  } else if (i.t === 'join-table') {
    tablePeers.add(peerId)
  } else if (i.t === 'start' && fromHost) {
    const mod = modules[i.gameId]
    if (!mod || s.players.filter((p) => p.connected).length < mod.min) { toast(`Il faut au moins ${mod?.min ?? '?'} joueurs.`); return }
    const r = mod.init({ players: s.players.filter((p) => p.connected), sober: s.sober, hostId: s.hostId, packs: s.packs })
    secret = r.secret
    commit({ ...s, game: { id: i.gameId, data: r.pub } })
    deliverPriv(r.priv)
  } else if (i.t === 'stop' && fromHost) {
    secret = null
    commit({ ...s, game: null })
  } else if (i.t === 'game' && s.game) {
    const mod = modules[s.game.id]
    // un écran table peut agir au nom d'un joueur ; sinon l'identité vient de la connexion
    const pid = tablePeers.has(peerId) && i.as ? i.as : peerId === 'self' ? session.me!.id : peerToPlayer.get(peerId)
    if (!mod || !pid) return
    const r = mod.reduce(s.game.data, secret, i.action, pid, { players: s.players, sober: s.sober, hostId: s.hostId, packs: s.packs })
    if ('error' in r) { deliverPriv({ [pid]: { error: r.error } }); return }
    secret = r.secret
    let history = s.history
    for (const e of r.sips ?? []) history = pushHistory(history, e)
    commit({ ...s, history, game: { id: s.game.id, data: r.pub } })
    deliverPriv(r.priv)
  }
}

function toast(msg: string) { session.toast = msg; setTimeout(() => { if (session.toast === msg) session.toast = '' }, 3000) }

/** Envoie des données privées à des joueurs (l'hôte les garde pour lui-même). */
function deliverPriv(priv?: Record<string, unknown>) {
  if (!priv) return
  for (const [pid, data] of Object.entries(priv)) {
    if (data == null) continue
    if (pid === session.me?.id) { session.priv = { ...(session.priv ?? {}), ...(data as object) }; if ((data as any).error) toast((data as any).error); continue }
    const peer = [...peerToPlayer.entries()].find(([, v]) => v === pid)?.[0]
    if (peer) sendPriv?.(data, peer)
  }
}

function connect(code: string, host: boolean, initial?: RoomState, asTable = false, alsoPlay = false) {
  const me = myProfile()
  session.me = me
  session.isHost = host
  session.role = asTable ? 'table' : 'player'
  session.plays = asTable && alsoPlay
  session.priv = null
  session.pointers = {}
  session.status = 'connecting'
  session.error = ''
  // Trystero chiffre les échanges avec crypto.subtle, réservé aux pages sécurisées (https:// ou localhost)
  if (!globalThis.crypto?.subtle) {
    session.status = 'error'
    session.error = 'Le salon demande une page sécurisée : ouvre le site en https:// (ou en localhost sur l’ordinateur).'
    return
  }
  try {
    // identity 'none' : pas d'identité Trystero persistante (nos joueurs ont leur propre identifiant)
    room = joinRoom({ appId: APP_ID, identity: 'none' }, code)
  } catch (e) {
    session.status = 'error'; session.error = String(e); return
  }
  const countPeers = () => { session.peers = Object.keys(room?.getPeers() ?? {}).length }
  room.onPeerJoin(countPeers)
  room.onPeerLeave(countPeers)
  session.peers = 0
  const stateAction = room.makeAction<RoomState>('state')
  const intentAction = room.makeAction<Intent>('intent')
  sendState = (s) => stateAction.send(s)
  sendIntent = (i, target) => intentAction.send(i, target ? { target } : undefined)
  const privAction = room.makeAction<any>('priv')
  const pointerAction = room.makeAction<PointerMsg>('pointer')
  sendPriv = (d, target) => privAction.send(d, { target })
  sendPointer = (m) => pointerAction.send(m)
  privAction.onMessage((d) => {
    session.priv = { ...(session.priv ?? {}), ...d }
    if (d?.error) toast(d.error)
  })
  // audio du Doublage : enregistrements diffusés à tous les appareils
  const audioAction = room.makeAction<ArrayBuffer>('audio')
  registerAudioSender((buf, meta) => audioAction.send(buf, { metadata: meta }))
  audioAction.onMessage((data, ctx) => {
    const meta = ctx.metadata as { line?: number; mime?: string } | undefined
    if (typeof meta?.line === 'number') putAudio(meta.line, new Blob([data], { type: meta.mime || 'audio/webm' }))
  })
  pointerAction.onMessage((m) => {
    const st = session.state
    const pl = st?.players.find((p) => p.id === m.id)
    if (pl) session.pointers[m.id] = { x: m.x, y: m.y, color: pl.color, name: pl.name, ts: Date.now() }
    if (m.click) clickListeners.forEach((fn) => fn(m))
  })

  if (host && initial) {
    session.state = initial
    session.status = 'online'
    onLocalPacksChange((p) => session.state && commit({ ...session.state, packs: p }))
    room.onPeerJoin(() => { if (session.state) stateAction.send($state.snapshot(session.state) as RoomState) })
    intentAction.onMessage((i, ctx) => applyIntent(i, ctx.peerId))
    room.onPeerLeave(({ peerId }) => {
      const pid = peerToPlayer.get(peerId)
      peerToPlayer.delete(peerId)
      const s = session.state
      if (pid && s) commit({ ...s, players: s.players.map((p) => (p.id === pid ? { ...p, connected: false } : p)) })
    })
  } else {
    onLocalPacksChange((p) => hostPeerId && sendIntent?.({ t: 'packs', packs: p }, hostPeerId))
    stateAction.onMessage((s, ctx) => {
      if (host) return
      hostPeerId = ctx.peerId
      const first = session.state === null
      session.state = s
      session.status = 'online'
      replacePacks(s.packs)
      // (re)connexion : se présenter à l'hôte, aussi après une coupure
      if (!s.game) session.priv = null
      if (asTable && first) sendIntent?.({ t: 'join-table' }, ctx.peerId)
      // un joueur normal, ou un écran central qui joue aussi, se présente à l'hôte (aussi après une coupure)
      if ((!asTable || alsoPlay) && (first || !s.players.some((p) => p.id === me.id && p.connected))) sendIntent?.({ t: 'join', profile: me }, ctx.peerId)
    })
    room.onPeerLeave(({ peerId }) => {
      if (peerId === hostPeerId) { session.status = 'connecting' }
    })
    setTimeout(() => {
      if (session.state) return
      session.status = 'error'
      session.error = session.peers === 0
        ? 'Aucun appareil trouvé : vérifie le code, que l’hôte a bien ouvert son salon, et que vous êtes sur des navigateurs différents (ou un onglet privé).'
        : 'Appareil trouvé mais le salon ne répond pas : demande à l’hôte de rouvrir son salon.'
    }, 20000)
  }
}

export function createRoom(profile: Profile, mode: RoomMode, sober: boolean) {
  saveProfile(profile)
  const code = makeCode()
  const initial: RoomState = {
    code, hostId: profile.id, mode, sober,
    players: [{ ...profile, connected: true }], history: [], game: null,
    packs: $state.snapshot(packsStore.packs) as Packs,
  }
  save('picole.lastHost', code)
  connect(code, true, initial)
  return code
}

/** Reprise d'un salon hébergé (l'hôte a fermé l'onglet) depuis la sauvegarde locale. */
export function resumeRoom(code: string): boolean {
  const saved = load<RoomState | null>('picole.room.' + code, null)
  if (!saved || saved.hostId !== myProfile().id) return false
  connect(code, true, { ...saved, players: saved.players.map((p) => (p.id === saved.hostId ? p : { ...p, connected: false })) })
  return true
}

export function joinExisting(code: string, profile: Profile, asTable = false, alsoPlay = false) {
  if (!asTable || alsoPlay) saveProfile(profile)
  connect(code.toUpperCase(), false, undefined, asTable, alsoPlay)
}

export function startGame(gameId: string) { applyIntent({ t: 'start', gameId }, 'self') }
export function stopGame() { applyIntent({ t: 'stop' }, 'self') }
/** Action de jeu : l'hôte l'applique directement, les autres l'envoient à l'hôte. */
export function gameAction(rawAction: unknown, as?: string) {
  const action = $state.snapshot(rawAction) // pas de proxy réactif dans les messages réseau
  if (session.isHost) applyIntent({ t: 'game', action, as }, 'self')
  else if (hostPeerId) sendIntent?.({ t: 'game', action, as }, hostPeerId)
}
export function sendLaser(m: PointerMsg) { sendPointer?.(m) }

export function reportSips(event: SipEvent) {
  if (session.isHost) applyIntent({ t: 'sip', event }, 'self')
  else if (hostPeerId) sendIntent?.({ t: 'sip', event }, hostPeerId)
}

export function setSober(sober: boolean) {
  if (session.isHost && session.state) commit({ ...session.state, sober })
}

export async function leaveRoom() {
  onLocalPacksChange(null)
  await room?.leave()
  room = null; sendState = null; sendIntent = null; hostPeerId = null
  peerToPlayer.clear()
  session.state = null; session.status = 'idle'; session.isHost = false; session.priv = null; session.pointers = {}
  tablePeers.clear(); secret = null
  registerAudioSender(null); clearAudio()
}
