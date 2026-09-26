/* three.js fuer die 3D-Ansicht: aus den Koerpern von szene.ts werden
 * Meshes, dazu Kamera, Licht und OrbitControls. Nur Raum3D.tsx benutzt
 * das hier, beide liegen im selben Code-Teil, den nur der Computer laedt.
 *
 * Keine Texturen, keine Schatten. Gerendert wird nur, wenn sich etwas
 * aendert (Kamera, Groesse, Daten, Farben), nicht in einer Schleife; nach
 * dem Loslassen laeuft die Kamera kurz weich aus (Daempfung).
 *
 * Fluessig auch auf schwachen Laptops: Materialien gleicher Farbe werden
 * geteilt, und waehrend der Bewegung rechnet der Renderer mit hoechstens
 * einem Bildpunkt je Pixel.
 *
 * Mit Maus: linke Taste dreht, rechte verschiebt, Rad zoomt. Im Zeichner
 * laesst sich ein Moebel, Regal oder Schrank mit der linken Taste am Boden
 * entlang ziehen (ziehen()). Am Handy: ein Finger dreht, zwei Finger
 * verschieben und zoomen.
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
  MOUSE,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  Shape,
  ShapeGeometry,
  TOUCH,
  Vector2,
  Vector3,
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
  /** Hand: linke Maustaste (ein Finger) verschiebt, rechte dreht. Sonst
   *  umgekehrt. */
  hand(an: boolean): void
  /** Moebel ziehen erlauben (Zeichner), null schaltet es aus. traeger:
   *  Kiste -> Objekt, auf oder in dem ihr Stapel steht; sie gehen mit. */
  ziehen(fn: ((id: string, dxCm: number, dyCm: number) => void) | null, traeger: Map<string, string>): void
  dispose(): void
}

/** Ab so vielen Pixeln wird aus einem Druck auf ein Moebel ein Ziehen. */
const ZIEH_PX = 4

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
    renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  // Scharf im Stand, schnell in Bewegung (siehe bewegungAn).
  const ratioStand = Math.min(window.devicePixelRatio || 1, 1.5)
  const ratioBewegt = Math.min(ratioStand, 1)
  renderer.setPixelRatio(ratioStand)
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

  /* Moebel ziehen. Die Zuhoerer sitzen am host in der Einfang-Phase, also
   * vor OrbitControls am Canvas: trifft der Druck ein Moebel, bekommt die
   * Kamera ihn nicht. */
  let ziehFn: ((id: string, dxCm: number, dyCm: number) => void) | null = null
  let traeger = new Map<string, string>()
  const strahl = new Raycaster()
  const bodenEbene = new Plane(new Vector3(0, 1, 0), 0)
  let zug: {
    id: string
    px: number
    py: number
    start: Vector3
    meshes: Object3D[]
    basis: Vector3[]
    bewegt: boolean
    dx: number
    dz: number
    pointerId: number
  } | null = null

  function zeigerNdc(e: { clientX: number; clientY: number }): Vector2 {
    const r = renderer.domElement.getBoundingClientRect()
    return new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
  }

  /** Das Objekt (Moebel, Regal, Schrank) unter dem Zeiger, sonst null. */
  function objektUnter(e: { clientX: number; clientY: number }): string | null {
    strahl.setFromCamera(zeigerNdc(e), camera)
    for (const t of strahl.intersectObjects(gruppe.children, false)) {
      const id = (t.object.userData as { objektId?: string }).objektId
      if (id) return id
      // Was davor steht und nicht halbdurchsichtig ist, verdeckt.
      const mat = (t.object as Mesh).material as MeshLambertMaterial | undefined
      if (mat && mat.opacity >= 0.5) return null
    }
    return null
  }

  function bodenPunkt(e: { clientX: number; clientY: number }): Vector3 | null {
    strahl.setFromCamera(zeigerNdc(e), camera)
    const p = new Vector3()
    return strahl.ray.intersectPlane(bodenEbene, p) ? p : null
  }

  const ziehRunter = (e: PointerEvent) => {
    if (!ziehFn || e.button !== 0 || e.pointerType === 'touch') return
    const id = objektUnter(e)
    if (!id) return
    const start = bodenPunkt(e)
    if (!start) return
    const meshes = gruppe.children.filter((o) => {
      const u = o.userData as { objektId?: string; kisteId?: string }
      return u.objektId === id || (!!u.kisteId && traeger.get(u.kisteId) === id)
    })
    e.stopPropagation()
    e.preventDefault()
    host.setPointerCapture(e.pointerId)
    zug = {
      id,
      px: e.clientX,
      py: e.clientY,
      start,
      meshes,
      basis: meshes.map((m) => m.position.clone()),
      bewegt: false,
      dx: 0,
      dz: 0,
      pointerId: e.pointerId,
    }
  }
  const ziehBewegen = (e: PointerEvent) => {
    const z = zug
    if (!z) {
      // Ohne Druck zeigen, dass sich ein Moebel greifen laesst.
      if (ziehFn && e.pointerType === 'mouse' && e.buttons === 0) {
        renderer.domElement.style.cursor = objektUnter(e) ? 'grab' : ''
      }
      return
    }
    e.stopPropagation()
    if (!z.bewegt && Math.hypot(e.clientX - z.px, e.clientY - z.py) < ZIEH_PX) return
    if (!z.bewegt) {
      z.bewegt = true
      bewegungAn(true)
      renderer.domElement.style.cursor = 'grabbing'
    }
    const p = bodenPunkt(e)
    if (!p) return
    // Auf ganze cm, damit Vorschau und Ergebnis gleich aussehen.
    z.dx = Math.round((p.x - z.start.x) * 100) / 100
    z.dz = Math.round((p.z - z.start.z) * 100) / 100
    z.meshes.forEach((m, i) => m.position.set(z.basis[i].x + z.dx, z.basis[i].y, z.basis[i].z + z.dz))
    rendern()
  }
  const ziehHoch = (e: PointerEvent) => {
    const z = zug
    if (!z || e.pointerId !== z.pointerId) return
    e.stopPropagation()
    zug = null
    if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId)
    renderer.domElement.style.cursor = ''
    if (!z.bewegt) return
    bewegungAn(false)
    const dx = Math.round(z.dx * 100)
    const dy = Math.round(z.dz * 100)
    if ((dx !== 0 || dy !== 0) && ziehFn) {
      ziehFn(z.id, dx, dy)
    } else {
      z.meshes.forEach((m, i) => m.position.copy(z.basis[i]))
      rendern()
    }
  }
  host.addEventListener('pointerdown', ziehRunter, { capture: true })
  host.addEventListener('pointermove', ziehBewegen, { capture: true })
  host.addEventListener('pointerup', ziehHoch, { capture: true })
  host.addEventListener('pointercancel', ziehHoch, { capture: true })

  const controls = new OrbitControls(camera, renderer.domElement)
  // Weicher Nachlauf nach dem Loslassen: fuehlt sich fluessiger an.
  controls.enableDamping = true
  controls.dampingFactor = 0.14
  controls.rotateSpeed = 0.8
  controls.zoomToCursor = true
  controls.maxPolarAngle = Math.PI * 0.49
  controls.minDistance = 0.4
  controls.maxDistance = 80
  controls.screenSpacePanning = true

  let waende: WandInfo[] = []
  let halb = true
  let koerperJetzt: Koerper[] = []
  let geplant = 0
  let weg = false
  let bewegt = false

  /** Waehrend der Bewegung mit weniger Bildpunkten rechnen. */
  function bewegungAn(an: boolean) {
    if (bewegt === an) return
    bewegt = an
    renderer.setPixelRatio(an ? ratioBewegt : ratioStand)
    rendern()
  }

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
      // Daempfung: solange die Kamera noch auslaeuft, meldet update()
      // 'change', und das plant das naechste Bild.
      controls.update()
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
  const anfang = () => {
    window.clearTimeout(ruheUhr)
    bewegungAn(true)
  }
  let ruheUhr = 0
  const ende = () => {
    // Nach dem Auslaufen wieder scharf.
    window.clearTimeout(ruheUhr)
    ruheUhr = window.setTimeout(() => bewegungAn(false), 400)
  }
  controls.addEventListener('start', anfang)
  controls.addEventListener('end', ende)
  // Das Mausrad gehoert hier der Kamera, nicht der Seite oder dem Zeichner darunter.
  const radStopp = (e: WheelEvent) => e.stopPropagation()
  host.addEventListener('wheel', radStopp)

  /* Gleiche Farbe und Deckkraft: ein Material fuer alle. Waende bekommen je
   * ein eigenes, weil ihre Deckkraft einzeln wechselt. */
  const flaechenMat = new Map<string, MeshLambertMaterial>()
  const linienMat = new Map<string, LineBasicMaterial>()
  function flaecheMaterial(farbe: string, deckkraft: number, durch: boolean): MeshLambertMaterial {
    const key = `${farbe}|${deckkraft}|${durch}`
    let m = flaechenMat.get(key)
    if (!m) {
      m = new MeshLambertMaterial({ color: new Color(farbe), transparent: durch, opacity: deckkraft, depthWrite: deckkraft >= 1 })
      flaechenMat.set(key, m)
    }
    return m
  }
  function linieMaterial(farbe: string, deckkraft: number, durch: boolean): LineBasicMaterial {
    const key = `${farbe}|${deckkraft}|${durch}`
    let m = linienMat.get(key)
    if (!m) {
      m = new LineBasicMaterial({ color: new Color(farbe), transparent: durch, opacity: deckkraft })
      linienMat.set(key, m)
    }
    return m
  }

  function leeren() {
    const alt = [...gruppe.children]
    gruppe.clear()
    // Geteilte Materialien werden dabei mehrfach freigegeben; das ist in three harmlos.
    for (const o of alt) wegwerfen(o, einheit, kanten)
    flaechenMat.clear()
    linienMat.clear()
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
      const mat = wand
        ? new MeshLambertMaterial({
            color: new Color(k.farbe),
            transparent: durch,
            opacity: k.deckkraft,
            depthWrite: k.deckkraft >= 1,
          })
        : flaecheMaterial(k.farbe, k.deckkraft, durch)
      const mesh = new Mesh(einheit, mat)
      if (k.id && (k.rolle === 'moebel' || k.rolle === 'regal' || k.rolle === 'brett')) mesh.userData = { objektId: k.id }
      else if (k.id && k.rolle === 'kiste') mesh.userData = { kisteId: k.id }
      mesh.position.set(k.mitte[0], k.mitte[1], k.mitte[2])
      mesh.scale.set(k.masse[0], k.masse[1], k.masse[2])
      mesh.rotation.y = k.drehY
      let linien: LineSegments | null = null
      if (k.kante) {
        const deck = k.hervor ? 1 : k.deckkraft
        linien = new LineSegments(
          kanten,
          wand
            ? new LineBasicMaterial({ color: new Color(k.kante), transparent: durch, opacity: deck })
            : linieMaterial(k.kante, deck, durch),
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
    hand(an) {
      controls.mouseButtons = an
        ? { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }
        : { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }
      controls.touches = an ? { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE } : { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }
    },
    ziehen(fn, t) {
      ziehFn = fn
      traeger = t
      if (!fn) renderer.domElement.style.cursor = ''
    },
    dispose() {
      weg = true
      if (geplant) cancelAnimationFrame(geplant)
      window.clearTimeout(ruheUhr)
      host.removeEventListener('pointerdown', ziehRunter, { capture: true })
      host.removeEventListener('pointermove', ziehBewegen, { capture: true })
      host.removeEventListener('pointerup', ziehHoch, { capture: true })
      host.removeEventListener('pointercancel', ziehHoch, { capture: true })
      controls.removeEventListener('start', anfang)
      controls.removeEventListener('end', ende)
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
