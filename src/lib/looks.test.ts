import { describe, it, expect } from 'vitest'
import { LOOKS, ACCESSORIES, assignLook, assignDistinct, lookById, parseAvatar, composeAvatar } from './looks'

describe('avatars 3D', () => {
  it('looks et accessoires : identifiants uniques, poses du modèle RobotExpressive', () => {
    expect(new Set(LOOKS.map((l) => l.id)).size).toBe(LOOKS.length)
    expect(new Set(ACCESSORIES.map((a) => a.id)).size).toBe(ACCESSORIES.length)
    const poses = ['Dance', 'Death', 'Idle', 'Jump', 'No', 'Punch', 'Running', 'Sitting', 'Standing', 'ThumbsUp', 'Walking', 'WalkJump', 'Wave', 'Yes']
    expect(LOOKS.every((l) => poses.includes(l.pose))).toBe(true)
    expect(LOOKS.every((l) => l.expression === null || ['Angry', 'Surprised', 'Sad'].includes(l.expression))).toBe(true)
  })
  it('lecture et écriture « look+accessoire »', () => {
    expect(parseAvatar('wave+crown')).toEqual({ look: 'wave', acc: 'crown' })
    expect(parseAvatar('wave')).toEqual({ look: 'wave', acc: 'none' })
    expect(parseAvatar('inconnu+truc')).toEqual({ look: 'idle', acc: 'none' })
    expect(parseAvatar('')).toEqual({ look: 'idle', acc: 'none' })
    expect(composeAvatar('wave', 'crown')).toBe('wave+crown')
    expect(composeAvatar('wave', 'none')).toBe('wave')
  })
  it('même graine, même avatar valide', () => {
    expect(assignLook('abc')).toBe(assignLook('abc'))
    const { look, acc } = parseAvatar(assignLook('xyz'))
    expect(lookById(look)).toBeDefined()
    expect(ACCESSORIES.some((a) => a.id === acc)).toBe(true)
  })
  it('tous les joueurs d’un salon ont un avatar différent', () => {
    const taken: string[] = []
    for (let i = 0; i < 40; i++) taken.push(assignDistinct('player-' + (i % 3), taken))
    expect(new Set(taken).size).toBe(40)
  })
  it('répartition correcte sur beaucoup de graines', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 3000; i++) seen.add(assignLook('seed' + i))
    expect(seen.size).toBeGreaterThan(LOOKS.length * ACCESSORIES.length * 0.9)
  })
})
