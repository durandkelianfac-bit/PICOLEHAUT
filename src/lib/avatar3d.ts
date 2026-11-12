// Avatars 3D (Three.js, chargé à la demande). Un seul rendu hors-écran produit des vignettes PNG
// transparentes mises en cache, pour ne pas multiplier les contextes WebGL (un par joueur).
import { MODEL_URL, lookById, parseAvatar } from './looks'

type Three = typeof import('three')
let threeP: Promise<{ THREE: Three; gltf: import('three/addons/loaders/GLTFLoader.js').GLTF; clone: (o: import('three').Object3D) => import('three').Object3D }> | null = null

/** Charge Three.js et le modèle une seule fois. */
export function loadAvatarKit() {
  threeP ??= (async () => {
    const [THREE, { GLTFLoader }, { clone }] = await Promise.all([
      import('three'),
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/utils/SkeletonUtils.js'),
    ])
    const url = new URL(MODEL_URL, document.baseURI).href
    const gltf = await new GLTFLoader().loadAsync(url)
    return { THREE, gltf, clone }
  })()
  threeP.catch(() => { threeP = null }) // permet de réessayer plus tard
  return threeP
}

/**
 * Accessoires faits de formes simples, posés sur l'os « Head » du modèle. Les dimensions sont dans
 * l'unité locale de l'armature (la tête fait environ 0,026 de large ; le modèle est agrandi ×100).
 */
function makeAccessory(THREE: Three, acc: string, color: string) {
  const g = new THREE.Group()
  const mat = (c: string | number, extra: Record<string, unknown> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.1, ...extra })
  const add = (geo: import('three').BufferGeometry, m: import('three').Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o }
  const cyl = (rt: number, rb: number, h: number, seg = 24) => new THREE.CylinderGeometry(rt, rb, h, seg)
  switch (acc) {
    case 'tophat':
      add(cyl(0.015, 0.015, 0.0012), mat(0x1c1c1c), 0, 0.0006)
      add(cyl(0.0095, 0.0095, 0.012), mat(0x1c1c1c), 0, 0.0072)
      add(cyl(0.0097, 0.0097, 0.0026), mat(color), 0, 0.0034)
      break
    case 'crown': {
      add(cyl(0.0105, 0.0115, 0.0055), mat(0xf5cb5c, { metalness: 0.7, roughness: 0.3 }), 0, 0.0028)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        add(new THREE.ConeGeometry(0.0022, 0.005, 8), mat(0xf5cb5c, { metalness: 0.7, roughness: 0.3 }), Math.cos(a) * 0.0105, 0.0078, Math.sin(a) * 0.0105)
      }
      add(new THREE.SphereGeometry(0.0016, 12, 12), mat(0xe5645a), 0, 0.0028, 0.0113)
      break
    }
    case 'party': {
      add(new THREE.ConeGeometry(0.0085, 0.017, 24), mat(color), 0, 0.0085)
      add(new THREE.TorusGeometry(0.0058, 0.0008, 8, 24), mat(0xe8eddf), 0, 0.0055).rotation.x = Math.PI / 2
      add(new THREE.SphereGeometry(0.0022, 12, 12), mat(0xf5cb5c), 0, 0.0175)
      break
    }
    case 'cap': {
      const dome = add(new THREE.SphereGeometry(0.0135, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(color), 0, 0)
      dome.scale.y = 0.85
      add(new THREE.SphereGeometry(0.0013, 8, 8), mat(0xe8eddf), 0, 0.0113)
      break
    }
    case 'halo':
      add(new THREE.TorusGeometry(0.0105, 0.0013, 12, 36), mat(0xf5cb5c, { emissive: 0xf5cb5c, emissiveIntensity: 0.6 }), 0, 0.0075).rotation.x = Math.PI / 2
      break
    case 'antenna':
      add(cyl(0.0005, 0.0005, 0.011), mat(0xcfdbd5), 0, 0.0055)
      add(new THREE.SphereGeometry(0.0022, 14, 14), mat(0xe5645a, { emissive: 0xe5645a, emissiveIntensity: 0.5 }), 0, 0.0118)
      break
    case 'propeller': {
      const dome = add(new THREE.SphereGeometry(0.0125, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(color), 0, 0)
      dome.scale.y = 0.7
      add(cyl(0.0006, 0.0006, 0.004), mat(0x1c1c1c), 0, 0.0105)
      const blades = new THREE.Group(); blades.position.y = 0.0126; blades.name = 'propeller'
      for (const [w, d, c] of [[0.0200, 0.0030, 0xf5cb5c], [0.0030, 0.0200, 0xe5645a]] as const) blades.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.0004, d), mat(c)))
      g.add(blades)
      break
    }
    default:
      return null
  }
  // posé au sommet de la tête (sommet du maillage ≈ 0,0186 au-dessus de l'os), centré sur son axe
  g.position.set(0, 0.0178, -0.003)
  return g
}

/** Instancie le robot : couleur du joueur sur le matériau « Main », expression, pose et accessoire. */
export async function buildAvatar(avatar: string, color: string) {
  const { THREE, gltf, clone } = await loadAvatarKit()
  const parsed = parseAvatar(avatar)
  const look = lookById(parsed.look)!
  const model = clone(gltf.scene)
  model.traverse((o) => {
    const mesh = o as import('three').Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const clones = mats.map((m) => {
      const c = m.clone() as import('three').MeshStandardMaterial
      if (c.name === 'Main') c.color = new THREE.Color(color)
      return c
    })
    mesh.material = Array.isArray(mesh.material) ? clones : clones[0]
    // expression : morph target du visage, quel que soit le nom du maillage
    const idx = look.expression ? mesh.morphTargetDictionary?.[look.expression] : undefined
    if (idx !== undefined && mesh.morphTargetInfluences) mesh.morphTargetInfluences[idx] = 1
  })
  // accessoire sur l'os de la tête
  let headBone: import('three').Object3D | null = null
  model.traverse((o) => { if (!headBone && (o as import('three').Bone).isBone && o.name === 'Head') headBone = o })
  const accessory = headBone ? makeAccessory(THREE, parsed.acc, color) : null
  if (accessory) (headBone as unknown as import('three').Object3D).add(accessory)
  const mixer = new THREE.AnimationMixer(model)
  const clip = gltf.animations.find((a) => a.name === look.pose) ?? gltf.animations.find((a) => a.name === 'Idle')
  if (clip) mixer.clipAction(clip).play()
  return { THREE, model, mixer, look }
}

/** Place la caméra : `bust` cadre le haut du corps (vignettes), sinon le corps entier. */
export function frame(THREE: Three, camera: import('three').PerspectiveCamera, model: import('three').Object3D, bust: boolean) {
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const viewH = bust ? size.y * 0.62 : size.y * 1.15
  const targetY = bust ? box.max.y - viewH / 2 - size.y * 0.04 : center.y
  const dist = viewH / 2 / Math.tan((camera.fov * Math.PI) / 360)
  camera.position.set(center.x, targetY, center.z + dist + size.z)
  camera.lookAt(center.x, targetY, center.z)
}

const cache = new Map<string, Promise<string>>()
let queue: Promise<unknown> = Promise.resolve()
let shared: { renderer: import('three').WebGLRenderer } | null = null

/** Vignette PNG transparente d'un avatar (en cache par look + couleur). */
export function avatarSnapshot(lookId: string, color: string, px = 192): Promise<string> {
  const key = `${lookId}|${color}|${px}`
  let p = cache.get(key)
  if (!p) {
    p = (queue = queue.then(() => render(lookId, color, px)))  as Promise<string>
    p.catch(() => cache.delete(key))
    cache.set(key, p)
  }
  return p
}

async function render(lookId: string, color: string, px: number): Promise<string> {
  const { THREE, model, mixer, look } = await buildAvatar(lookId, color)
  if (!shared) {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
    renderer.setClearColor(0x000000, 0)
    shared = { renderer }
  }
  const { renderer } = shared
  renderer.setSize(px, px, false)
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2), model)
  const sun = new THREE.DirectionalLight(0xffffff, 2.4)
  sun.position.set(2, 4, 5)
  scene.add(sun)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  mixer.setTime(look.time)
  model.updateMatrixWorld(true)
  frame(THREE, camera, model, true)
  renderer.render(scene, camera)
  return renderer.domElement.toDataURL('image/png')
}
