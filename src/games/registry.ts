import type { GameModule } from './types'
import { hues } from './hues/module'
import { codenames } from './codenames/module'
export const modules: Record<string, GameModule> = { hues, codenames }
