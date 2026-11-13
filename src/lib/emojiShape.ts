// Forme d'un emoji, rognée au plus juste : le bas de l'objet touche exactement le sol de la scène,
// et sa hauteur est celle de l'objet (sans marge propre à la police).
export interface Shape { url: string; ar: number } // ar = largeur / hauteur

const cache = new Map<string, Promise<Shape>>()

export function emojiShape(emoji: string): Promise<Shape> {
  let p = cache.get(emoji)
  if (!p) { p = draw(emoji); cache.set(emoji, p) }
  return p
}

async function draw(emoji: string): Promise<Shape> {
  const N = 256
  const c = document.createElement('canvas')
  c.width = c.height = N
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.font = `${N * 0.78}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillText(emoji, N / 2, N / 2)
  const d = x.getImageData(0, 0, N, N).data
  let x0 = N, y0 = N, x1 = -1, y1 = -1
  for (let y = 0; y < N; y++) for (let xx = 0; xx < N; xx++) if (d[(y * N + xx) * 4 + 3] > 24) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y }
  if (x1 < 0) return { url: c.toDataURL(), ar: 1 }
  const w = x1 - x0 + 1, h = y1 - y0 + 1
  const o = document.createElement('canvas')
  o.width = w; o.height = h
  o.getContext('2d')!.drawImage(c, x0, y0, w, h, 0, 0, w, h)
  return { url: o.toDataURL('image/png'), ar: w / h }
}

const isImage = (k: string) => /\.(png|webp|svg)$/i.test(k)

/** Forme d'une image détourée (PNG à fond transparent), rognée au plus juste. */
async function imageShape(url: string): Promise<Shape> {
  const img = new Image()
  img.src = url
  await img.decode()
  const N = 400
  const sc = Math.min(1, N / Math.max(img.naturalWidth, img.naturalHeight))
  const W = Math.max(1, Math.round(img.naturalWidth * sc)), H = Math.max(1, Math.round(img.naturalHeight * sc))
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.drawImage(img, 0, 0, W, H)
  return crop(c, x, W, H)
}

/** Forme d'un objet : image détourée si la clé est un fichier, sinon silhouette de l'emoji. */
export function loadShape(key: string): Promise<Shape> {
  let p = cache.get(key)
  if (!p) { p = isImage(key) ? imageShape(key) : draw(key); cache.set(key, p) }
  return p
}

function crop(c: HTMLCanvasElement, x: CanvasRenderingContext2D, W: number, H: number): Shape {
  const d = x.getImageData(0, 0, W, H).data
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) if (d[(y * W + xx) * 4 + 3] > 24) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y }
  if (x1 < 0) return { url: c.toDataURL(), ar: W / H }
  const w = x1 - x0 + 1, h = y1 - y0 + 1
  const o = document.createElement('canvas')
  o.width = w; o.height = h
  o.getContext('2d')!.drawImage(c, x0, y0, w, h, 0, 0, w, h)
  return { url: o.toDataURL('image/png'), ar: w / h }
}
