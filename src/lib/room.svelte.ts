// Salon multi-téléphones : WebRTC pair-à-pair (Trystero), l'hôte fait autorité.
// Les clients envoient des "intents" à l'hôte ; l'hôte diffuse l'état complet.
import { joinRoom } from 'trystero'
import { load, save } from './storage'
import { pushHistory, type SipEvent } from './sips'
import { onLocalPacksChange, packsStore, replacePacks, type Packs } from './packs.svelte'

export interface Profile { id: string; name: string; color: string; avatar: string }
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
}
type Intent =
  | { t: 'join'; profile: Profile }
  | { t: 'packs'; packs: Packs }
  | { t: 'sip'; event: SipEvent }

const APP_ID = 'picole-haut-app-v1'
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
export const COLORS = ['#F5CB5C', '#E8EDDF', '#CFDBD5', '#e5645a', '#6ec6a0', '#7aa7e8', '#d58be0', '#f09a5a']

export const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('')

export function myProfile(): Profile {
  const p = load<Profile | null>('picole.profile', null)
  if (p) return p
  const fresh: Profile = { id: crypto.randomUUID(), name: '', color: COLORS[Math.floor(Math.random() * COLORS.length)], avatar: '' }
  save('picole.profile', fresh)
  return fresh
}
export function saveProfile(p: Profile) { save('picole.profile', p) }

export const session = $state<{
  state: RoomState | null
  status: 'idle' | 'connecting' | 'online' | 'error'
  error: string
  isHost: boolean
  me: Profile | null
}>({ state: null, status: 'idle', error: '', isHost: false, me: null })

let room: ReturnType<typeof joinRoom> | null = null
let sendState: ((s: RoomState) => Promise<void>) | null = null
let sendIntent: ((i: Intent, hostPeer?: string) => Promise<void>) | null = null
const peerToPlayer = new Map<string, string>() // peerId -> player.id (hôte uniquement)
let hostPeerId: string | null = null

function commit(next: RoomState) {
  session.state = next
  save('picole.room.' + next.code, next)
  sendState?.(next)
}

function applyIntent(i: Intent, peerId: string) {
  const s = session.state
  if (!s) return
  if (i.t === 'join') {
    peerToPlayer.set(peerId, i.profile.id)
    const others = s.players.filter((p) => p.id !== i.profile.id)
    commit({ ...s, players: [...others, { ...i.profile, connected: true }] })
  } else if (i.t === 'packs') {
    replacePacks(i.packs)
    commit({ ...s, packs: i.packs })
  } else if (i.t === 'sip') {
    commit({ ...s, history: pushHistory(s.history, i.event) })
  }
}

function connect(code: string, host: boolean, initial?: RoomState) {
  const me = myProfile()
  session.me = me
  session.isHost = host
  session.status = 'connecting'
  session.error = ''
  try {
    room = joinRoom({ appId: APP_ID }, code)
  } catch (e) {
    session.status = 'error'; session.error = String(e); return
  }
  const stateAction = room.makeAction<RoomState>('state')
  const intentAction = room.makeAction<Intent>('intent')
  sendState = (s) => stateAction.send(s)
  sendIntent = (i, target) => intentAction.send(i, target ? { target } : undefined)

  if (host && initial) {
    session.state = initial
    session.status = 'online'
    onLocalPacksChange((p) => session.state && commit({ ...session.state, packs: p }))
    room.onPeerJoin(() => { if (session.state) stateAction.send(session.state) })
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
      if (first || !s.players.some((p) => p.id === me.id && p.connected)) sendIntent?.({ t: 'join', profile: me }, ctx.peerId)
    })
    room.onPeerLeave(({ peerId }) => {
      if (peerId === hostPeerId) { session.status = 'connecting' }
    })
    setTimeout(() => { if (!session.state) { session.status = 'error'; session.error = 'Salon introuvable ou hôte hors ligne.' } }, 15000)
  }
}

export function createRoom(profile: Profile, mode: RoomMode, sober: boolean) {
  saveProfile(profile)
  const code = makeCode()
  const initial: RoomState = {
    code, hostId: profile.id, mode, sober,
    players: [{ ...profile, connected: true }], history: [],
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

export function joinExisting(code: string, profile: Profile) {
  saveProfile(profile)
  connect(code.toUpperCase(), false)
}

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
  session.state = null; session.status = 'idle'; session.isHost = false
}
