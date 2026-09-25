/* three.js fuer die 3D-Ansicht: aus den Koerpern von szene.ts werden
 * Meshes, dazu Kamera, Licht und OrbitControls. Nur Raum3D.tsx benutzt
 * das hier, beide liegen im selben Code-Teil, den nur der Computer laedt.
 *
 * Keine Texturen, keine Schatten. Gerendert wird nur, wenn sich etwas
 * aendert (Kamera, Groesse, Daten, Farben), nicht in einer Schleife.
 */
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  Shape,
  ShapeGeometry,
  Vector2,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { hervorMitte, szeneRahmen, type Koerper, type Vec3 } from './szene'

export type Blick = 'oben' | 'schraeg' | 'kiste'

export interface Motor {
  /** Neue Koerper zeigen. ausrichten: Kamera auf die Szene setzen. */
  setzen(koerper: Koerper[], hintergrund: string, ausrichten: boolean): void
  blick(b: Blick): void
  waendeHalb(an: boolean): void
  dispose(): void
}

/** Wie durchsichtig eine Wand ist, deren Aussenseite zur Kamera zeigt. */
const WAND_HALB = 0.16

/** Alles mit Innenseite (Wand, Sturz, Tuer, Fenster) wird im Weg halbdurchsichtig. */
interface WandInfo {
  mesh: Mesh
  linien: LineSegments | null
  innen: [number, number]
  x: number
  z: number
  basis: number
}

/** WebGL da? Ohne Kontext gibt es keine 3D-Ansicht, nur 2D. */
export function webglDa(): boolean {
  try {
    const c = document.createElement('canvas')
    const ctx = c.getContext('webgl2') ?? c.getContext('webgl')
    // Den Pruef-Kontext sofort freigeben, sonst sammeln sich beim
    // Umschalten 2D/3D Kontexte an, bis der Browser warnt.
    ctx?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!ctx
  } catch {
    return false
  }
}

/** Startet three im Element. null, wenn WebGL fehlt oder der Renderer
 *  nicht entsteht. */
export function motorStarten(host: HTMLElement): Motor | null {
  if (!webglDa()) return null
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ antialias: true })
  } catch {
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.touchAction = 'none'
  host.appendChild(renderer.domElement)

  const scene = new Scene()
  const camera = new PerspectiveCamera(40, 1, 0.05, 400)
  camera.position.set(-6, 8, 10)

  // Licht von oben: der Boden hell, senkrechte Waende dunkler, damit Wand
  // und Boden deutlich auseinandergehen. three rechnet Licht physikalisch
  // (Lambert teilt durch Pi), darum die Staerken mal Pi: Umgebung plus
  // Sonne ergeben auf dem Boden etwa die Farbe des Tokens.
  scene.add(new AmbientLight(0xffffff, 0.72 * Math.PI))
  const sonne = new DirectionalLight(0xffffff, 0.36 * Math.PI)
  sonne.position.set(-3, 10, 5)
  scene.add(sonne)
  const gegen = new DirectionalLight(0xffffff, 0.12 * Math.PI)
  gegen.position.set(4, 3, -6)
  scene.add(gegen)

  const gruppe = new Group()
  scene.add(gruppe)

  const einheit = new BoxGeometry(1, 1, 1)
  const kanten = new EdgesGeometry(einheit)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = false
  controls.maxPolarAngle = Math.PI * 0.49
  controls.minDistance = 0.4
  controls.maxDistance = 80
  controls.screenSpacePanning = true

  let waende: WandInfo[] = []
  let halb = true
  let koerperJetzt: Koerper[] = []
  let geplant = 0
  let weg = false

  function waendePruefen() {
    const cx = camera.position.x
    const cz = camera.position.z
    for (const w of waende) {
      // Zeigt die Aussenseite zur Kamera, steht die Wand im Weg.
      const vorne = halb && (cx - w.x) * w.innen[0] + (cz - w.z) * w.innen[1] < -0.05
      const mat = w.mesh.material as MeshLambertMaterial
      mat.opacity = vorne ? Math.min(w.basis, WAND_HALB) : w.basis
      mat.depthWrite = !vorne && w.basis >= 1
      if (w.linien) (w.linien.material as LineBasicMaterial).opacity = mat.opacity
    }
  }

  function rendern() {
    if (weg || geplant) return
    geplant = requestAnimationFrame(() => {
      geplant = 0
      if (weg) return
      waendePruefen()
      renderer.render(scene, camera)
    })
  }

  function groesse() {
    const w = Math.max(1, host.clientWidth)
    const h = Math.max(1, host.clientHeight)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    rendern()
  }
  const ro = new ResizeObserver(groesse)
  ro.observe(host)
  groesse()

  controls.addEventListener('change', rendern)
  // Das Mausrad gehoert hier der Kamera, nicht der Seite oder dem Zeichner darunter.
  const radStopp = (e: WheelEvent) => e.stopPropagation()
  host.addEventListener('wheel', radStopp)

  function leeren() {
    const alt = [...gruppe.children]
    gruppe.clear()
    for (const o of alt) wegwerfen(o, einheit, kanten)
    waende = []
  }

  function bauen(liste: Koerper[]) {
    leeren()
    for (const k of liste) {
      if (k.art === 'flaeche') {
        const form = new Shape(k.punkte.map(([x, z]) => new Vector2(x, -z)))
        const geo = new ShapeGeometry(form)
        const mesh = new Mesh(geo, new MeshLambertMaterial({ color: new Color(k.farbe) }))
        mesh.rotation.x = -Math.PI / 2
        mesh.position.y = k.y - 0.002
        gruppe.add(mesh)
        continue
      }
      const wand = k.innen !== null
      const durch = k.deckkraft < 1 || wand
      const mat = new MeshLambertMaterial({
        color: new Color(k.farbe),
        transparent: durch,
        opacity: k.deckkraft,
        depthWrite: k.deckkraft >= 1,
      })
      const mesh = new Mesh(einheit, mat)
      mesh.position.set(k.mitte[0], k.mitte[1], k.mitte[2])
      mesh.scale.set(k.masse[0], k.masse[1], k.masse[2])
      mesh.rotation.y = k.drehY
      let linien: LineSegments | null = null
      if (k.kante) {
        linien = new LineSegments(
          kanten,
          new LineBasicMaterial({ color: new Color(k.kante), transparent: durch, opacity: k.hervor ? 1 : k.deckkraft }),
        )
        mesh.add(linien)
      }
      gruppe.add(mesh)
      if (k.innen) waende.push({ mesh, linien, innen: k.innen, x: k.mitte[0], z: k.mitte[2], basis: k.deckkraft })
    }
  }

  function zielen(ziel: Vec3, abstand: number, polar: number, azimut: number) {
    controls.target.set(ziel[0], ziel[1], ziel[2])
    camera.position.set(
      ziel[0] + abstand * Math.sin(polar) * Math.sin(azimut),
      ziel[1] + abstand * Math.cos(polar),
      ziel[2] + abstand * Math.sin(polar) * Math.cos(azimut),
    )
    controls.update()
    rendern()
  }

  function blick(b: Blick) {
    const r = szeneRahmen(koerperJetzt)
    if (!r) return
    const mitte: Vec3 = [(r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2]
    const breite = Math.max(r.x1 - r.x0, 1)
    const tiefe = Math.max(r.z1 - r.z0, 1)
    const halbFov = (camera.fov * Math.PI) / 360
    // Abstand, bei dem die ganze Flaeche ins Bild passt (Hoehe und Breite des Bilds).
    const passt = Math.max(tiefe / 2 / Math.tan(halbFov), breite / 2 / (Math.tan(halbFov) * camera.aspect))
    if (b === 'oben') {
      zielen(mitte, passt * 1.12 + r.hoehe, 0.0001, 0)
    } else if (b === 'schraeg') {
      zielen([mitte[0], r.hoehe * 0.2, mitte[2]], passt * 1.25 + r.hoehe, 0.95, -0.55)
    } else {
      const k = hervorMitte(koerperJetzt)
      if (!k) return
      // Die Richtung der Kamera bleibt, nur naeher an die Kiste.
      const dx = camera.position.x - controls.target.x
      const dz = camera.position.z - controls.target.z
      // Steil von oben, damit Tuerblaetter und Moebel davor nicht verdecken.
      zielen(k, 4.2, 0.62, Math.hypot(dx, dz) > 0.01 ? Math.atan2(dx, dz) : -0.55)
    }
  }

  return {
    setzen(liste, hintergrund, ausrichten) {
      koerperJetzt = liste
      scene.background = new Color(hintergrund)
      bauen(liste)
      if (ausrichten) blick('schraeg')
      else rendern()
    },
    blick,
    waendeHalb(an) {
      halb = an
      rendern()
    },
    dispose() {
      weg = true
      if (geplant) cancelAnimationFrame(geplant)
      ro.disconnect()
      host.removeEventListener('wheel', radStopp)
      controls.removeEventListener('change', rendern)
      controls.dispose()
      leeren()
      einheit.dispose()
      kanten.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}

/** Geometrien und Materialien eines Objekts freigeben (die geteilten
 *  Einheits-Geometrien bleiben bis zum Ende). */
function wegwerfen(o: Object3D, ...geteilt: BufferGeometry[]) {
  o.traverse((x) => {
    const g = (x as Mesh).geometry as BufferGeometry | undefined
    if (g && !geteilt.includes(g)) g.dispose()
    const m = (x as Mesh).material as Material | Material[] | undefined
    if (Array.isArray(m)) m.forEach((y) => y.dispose())
    else m?.dispose()
  })
}
