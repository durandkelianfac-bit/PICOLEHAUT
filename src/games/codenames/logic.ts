// Codenames — logique pure. Règles : docs/regles/Codenames_rulebook_FR.pdf
export type Team = 'red' | 'blue'
export type Color = Team | 'neutral' | 'assassin'
export const other = (t: Team): Team => (t === 'red' ? 'blue' : 'red')
export const teamName = (t: Team) => (t === 'red' ? 'Rouge' : 'Bleue')
export const UNLIMITED = 99

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/** Carte Clé : 9 mots pour l'équipe qui commence, 8 pour l'autre, 7 neutres, 1 assassin. */
export function makeKey(start: Team, rand: () => number = Math.random): Color[] {
  const cells: Color[] = [
    ...Array<Color>(9).fill(start), ...Array<Color>(8).fill(other(start)),
    ...Array<Color>(7).fill('neutral'), 'assassin',
  ]
  return shuffle(cells, rand)
}

/** 25 mots distincts tirés du pack actif. Retourne null s'il y en a moins de 25. */
export function pickWords(pool: string[], rand: () => number = Math.random): string[] | null {
  const seen = new Set<string>()
  const uniq = pool.filter((w) => { const k = norm(w); if (!k || seen.has(k)) return false; seen.add(k); return true })
  return uniq.length < 25 ? null : shuffle(uniq, rand).slice(0, 25)
}

export function remaining(key: Color[], revealed: (Color | null)[]): Record<Team, number> {
  const r = { red: 0, blue: 0 }
  key.forEach((c, i) => { if ((c === 'red' || c === 'blue') && !revealed[i]) r[c]++ })
  return r
}

/** Indice invalide : un seul mot, pas un mot visible sur la table ni une partie d'un mot visible. */
export function validateClue(word: string, visibleWords: string[]): string | null {
  const w = word.trim()
  if (!w) return 'Indice vide.'
  if (/\s/.test(w)) return 'Un seul mot.'
  const n = norm(w)
  if (!n) return 'Indice invalide.'
  for (const v of visibleWords) {
    const k = norm(v)
    if (k === n) return 'Ce mot est visible sur la table.'
    if (n.length >= 3 && k.length >= 3 && (k.includes(n) || n.includes(k))) return `Trop proche de « ${v} ».`
  }
  return null
}

/** Équipes initiales : alternance, le premier de chaque équipe est espion. */
export function autoTeams(ids: string[]) {
  const teams: Record<string, Team> = {}
  const spies: Record<Team, string | null> = { red: null, blue: null }
  ids.forEach((id, i) => {
    const t: Team = i % 2 === 0 ? 'red' : 'blue'
    teams[id] = t
    spies[t] ??= id
  })
  return { teams, spies }
}

export function validTeams(teams: Record<string, Team>, spies: Record<Team, string | null>): string | null {
  for (const t of ['red', 'blue'] as Team[]) {
    const members = Object.keys(teams).filter((id) => teams[id] === t)
    if (!spies[t]) return `L'équipe ${teamName(t)} n'a pas d'espion.`
    if (members.length < 2) return `L'équipe ${teamName(t)} doit avoir au moins un joueur en plus de l'espion.`
  }
  return null
}
