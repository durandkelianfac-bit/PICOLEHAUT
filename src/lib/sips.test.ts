import { test } from 'node:test'
import assert from 'node:assert/strict'
import { give, drink, formatEvent, pushHistory, totals } from './sips.ts'

test('formatage gorgées', () => {
  assert.equal(formatEvent(give('a', 3, 'x'), 'Léa', false), 'Léa distribue 3 gorgées')
  assert.equal(formatEvent(drink('a', 1, 'x'), 'Tom', false), 'Tom boit 1 gorgée')
})
test('formatage sans alcool', () => {
  assert.equal(formatEvent(drink('a', 2, 'x'), 'Tom', true), 'Tom prend 2 points')
})
test('historique borné et totaux', () => {
  let h = [] as ReturnType<typeof give>[]
  for (let i = 0; i < 5; i++) h = pushHistory(h, i % 2 ? give('a', 2, 'x') : drink('a', 3, 'x'), 3)
  assert.equal(h.length, 3)
  assert.deepEqual(totals([give('a', 2, 'x'), drink('a', 3, 'x')]).a, { drunk: 3, given: 2 })
})
test('n jamais négatif', () => assert.equal(drink('a', -4, 'x').n, 0))
