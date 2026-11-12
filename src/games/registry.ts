import type { GameModule } from './types'
import { hues } from './hues/module'
import { codenames } from './codenames/module'
import { pyramide } from './pyramide/module'
import { palmier } from './palmier/module'
export const modules: Record<string, GameModule> = { hues, codenames, pyramide, palmier }
