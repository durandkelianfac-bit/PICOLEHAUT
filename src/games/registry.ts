import type { GameModule } from './types'
import { hues } from './hues/module'
import { codenames } from './codenames/module'
import { pyramide } from './pyramide/module'
import { palmier } from './palmier/module'
import { guess } from './guess/module'
import { cyclone } from './cyclone/module'
import { doublage } from './doublage/module'
export const modules: Record<string, GameModule> = { hues, codenames, pyramide, palmier, guess, cyclone, doublage }
