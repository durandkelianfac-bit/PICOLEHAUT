import type { SipEvent } from '../lib/sips'

export interface GamePlayer { id: string; name: string }
export interface GameCtx { players: GamePlayer[]; sober: boolean }
export interface ReduceResult<P = unknown, S = unknown> {
  pub: P // état public, diffusé à tous
  secret: S // état secret, reste chez l'hôte
  sips?: SipEvent[]
  priv?: Record<string, unknown> // données privées envoyées à certains joueurs
}
export type ReduceOutcome<P, S> = ReduceResult<P, S> | { error: string }
export interface GameModule<P = any, S = any> {
  id: string
  min: number
  max: number
  init(ctx: GameCtx): ReduceResult<P, S>
  reduce(pub: P, secret: S, action: any, playerId: string, ctx: GameCtx): ReduceOutcome<P, S>
}
