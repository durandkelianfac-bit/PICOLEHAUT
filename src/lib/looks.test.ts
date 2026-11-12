import { describe, it, expect } from 'vitest'
import { LOOKS, assignLook, assignDistinct, lookById } from './looks'

describe('looks d’avatar', () => {
  it('identifiants uniques et poses connues du modèle RobotExpressive', () => {
    expect(new Set(LOOKS.map((l) => l.id)).size).toBe(LOOKS.length)
    const poses = ['Dance', 'Death', 'Idle', 'Jump', 'No', 'Punch', 'Running', 'Sitting', 'Standing', 'ThumbsUp', 'Walking', 'WalkJump', 'Wave', 'Yes']
    expect(LOOKS.every((l) => poses.includes(l.pose))).toBe(true)
    expect(LOOKS.every((l) => l.expression === null || ['Angry', 'Surprised', 'Sad'].includes(l.expression))).toBe(true)
  })
  it('même graine, même look', () => {
    expect(assignLook('abc')).toBe(assignLook('abc'))
    expect(lookById(assignLook('xyz'))).toBeDefined()
  })
  it('chaque joueur d’un salon a un look différent (jusqu’à 12)', () => {
    const taken: string[] = []
    for (let i = 0; i < LOOKS.length; i++) taken.push(assignDistinct('player-' + (i % 3), taken))
    expect(new Set(taken).size).toBe(LOOKS.length)
  })
  it('répartition correcte sur beaucoup de graines', () => {
    const counts = new Map<string, number>()
    for (let i = 0; i < 1200; i++) { const id = assignLook('seed' + i); counts.set(id, (counts.get(id) ?? 0) + 1) }
    expect(counts.size).toBe(LOOKS.length)
  })
})
