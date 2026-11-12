// Avatars 3D (Three.js, chargé à la demande). Un seul rendu hors-écran produit des vignettes PNG
// transparentes mises en cache, pour ne pas multiplier les contextes WebGL (un par joueur).
import { MODEL_URL, lookById } from './looks'

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

/** Instancie le robot : couleur du joueur sur le matériau « Main », expression et pose du look. */
export async function buildAvatar(lookId: string, color: string) {
  const { THREE, gltf, clone } = await loadAvatarKit()
  const look = lookById(lookId) ?? lookById('idle')!
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
