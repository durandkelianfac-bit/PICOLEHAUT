import { test, expect } from 'vitest'
import { give, drink, formatEvent, pushHistory, totals } from './sips.ts'

test('formatage gorgées', () => {
  expect(formatEvent(give('a', 3, 'x'), 'Léa', false)).toBe('Léa distribue 3 gorgées')
  expect(formatEvent(drink('a', 1, 'x'), 'Tom', false)).toBe('Tom boit 1 gorgée')
})
test('formatage sans alcool', () => {
  expect(formatEvent(drink('a', 2, 'x'), 'Tom', true)).toBe('Tom prend 2 points')
})
test('historique borné et totaux', () => {
  let h = [] as ReturnType<typeof give>[]
  for (let i = 0; i < 5; i++) h = pushHistory(h, i % 2 ? give('a', 2, 'x') : drink('a', 3, 'x'), 3)
  expect(h.length).toBe(3)
  expect(totals([give('a', 2, 'x'), drink('a', 3, 'x')]).a).toEqual({ drunk: 3, given: 2 })
})
test('n jamais négatif', () => expect(drink('a', -4, 'x').n).toBe(0))
