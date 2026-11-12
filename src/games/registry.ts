import type { GameModule } from './types'
import { hues } from './hues/module'
import { codenames } from './codenames/module'
import { pyramide } from './pyramide/module'
export const modules: Record<string, GameModule> = { hues, codenames, pyramide }
