// Enregistrements audio du Doublage : stockés localement (Blob) et diffusés à tous les appareils du salon.
export interface Rec { url: string; mime: string }
export const recs = $state<{ map: Record<number, Rec> }>({ map: {} })

type Sender = (buf: ArrayBuffer, meta: { line: number; mime: string }) => Promise<void>
let sender: Sender | null = null
export function registerAudioSender(fn: Sender | null) { sender = fn }

export function putAudio(line: number, blob: Blob) {
  const old = recs.map[line]
  if (old) URL.revokeObjectURL(old.url)
  recs.map[line] = { url: URL.createObjectURL(blob), mime: blob.type }
}
export function clearAudio() {
  for (const r of Object.values(recs.map)) URL.revokeObjectURL(r.url)
  recs.map = {}
}

/** Garde l'enregistrement chez soi et l'envoie aux autres appareils. */
export async function sendAudio(line: number, blob: Blob) {
  putAudio(line, blob)
  await sender?.(await blob.arrayBuffer(), { line, mime: blob.type })
}
