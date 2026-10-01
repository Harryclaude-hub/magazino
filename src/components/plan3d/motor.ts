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
  MeshBasicMaterial,
  MeshPhongMaterial,
  PointLight,
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
import { hervorMitte, szeneRahmen, type Koerper, type Licht3D, type TuerDreh, type Vec3 } from './szene'

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
  /** Begehen: in Augenhoehe durch die Wohnung. start: Punkt im Plan (cm);
   *  null nimmt den Punkt, auf den die Kamera gerade schaut. Aus: die
   *  Kamera kehrt dorthin zurueck, wo sie vorher war. */
  begehen(an: boolean, start: [number, number] | null): void
  /** Gehen per Knopf (Handy): Richtung halten, loslassen stoppt. */
  gehenKnopf(richtung: GehRichtung, an: boolean): void
  /** Lichtquellen der Szene (Decke, Kueche, Lampen). E71. */
  lichter(liste: Licht3D[]): void
  /** Tag: Sonne, Lampen aus. Abend: wenig Himmel, alle Lampen an. */
  lichtModus(modus: 'tag' | 'abend'): void
  /** In welchen Raeumen das Licht an ist (E74). Die anderen sind dunkel. */
  lichtRaeume(an: Set<string>): void
  /** Klick auf einen Lichtschalter an der Wand: der Raum, den er schaltet.
   *  null schaltet es aus. */
  schalter(fn: ((raumId: string) => void) | null): void
  /** Kurzer Klick in die Szene (nicht auf eine Tuer): die Stelle im Plan
   *  in cm, auf Moebeln die Stelle auf ihnen. null schaltet es aus. */
  tippen(fn: ((xCm: number, yCm: number, treffer: Treffer3D | null) => void) | null): void
  dispose(): void
}

export type GehRichtung = 'vor' | 'zurueck' | 'links' | 'rechts'

/** Was ein Klick in 3D getroffen hat (Moebel oder Kiste). */
export interface Treffer3D {
  objekt?: string
  kiste?: string
}

/** Ab so vielen Pixeln wird aus einem Druck auf ein Moebel ein Ziehen. */
const ZIEH_PX = 4

/** Wie durchsichtig eine Wand ist, deren Aussenseite zur Kamera zeigt. */
const WAND_HALB = 0.16

/* Begehen: Augenhoehe, Schritt und Abstand zur Wand in Metern. Gegen
 * Waende, Bruestungen und Fenster stoesst man; Tueren und Durchgaenge
 * sind offen (der Pruefstrahl laeuft in Kniehoehe unter dem Sturz durch).
 * Seit E77 geht ein Mann mit 1,75 m durch die Wohnung: Augen auf 1,64 m,
 * Schultern 46 cm breit, und Moebel und Kisten halten auf (Strahlen in
 * Knie- und Tischhoehe). So spuert man, wo man durchpasst. Teppiche und
 * Haengendes ueber Kopf halten nicht auf. */
const AUGE_M = 1.64
/** Halbe Schulterbreite: links und rechts davon prueft je ein Strahl. */
const SCHULTER_M = 0.23
/** Hoehen, in denen Moebel aufhalten: Knie (Sofa, Bett, Bank) und Tischplatte. */
const MOEBEL_HOEHEN = [0.4, 0.73]
const KNIE_M = 0.45
const GEHEN_M_S = 1.4
const RENNEN_M_S = 2.8
const WAND_ABSTAND_M = 0.25
const HINDERNIS = new Set(['wand', 'bruestung', 'scheibe', 'rahmen', 'zarge'])

/** Tuerblatt im Motor: Drehung aus szene.ts und der jetzige Winkel. */
type TuerLage = TuerDreh & { winkel: number }

/** Kleinster Unterschied zweier Winkel (-Pi bis Pi). */
function winkelDiff(a: number, b: number): number {
  let d = a - b
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

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
  // Sonne ergeben auf dem Boden etwa die Farbe des Tokens. Weniger
  // Umgebungslicht und mehr Sonne von schraeg (E64): jede Wandseite hat
  // ihren eigenen Ton, nichts wirkt grell. Sonne leicht warm, Umgebung
  // leicht kuehl, wie Tageslicht im Raum.
  const umgebung = new AmbientLight(0xf1f3f7, 0.5 * Math.PI)
  scene.add(umgebung)
  const sonne = new DirectionalLight(0xfff4e6, 0.52 * Math.PI)
  sonne.position.set(-4, 8, 6)
  scene.add(sonne)
  const gegen = new DirectionalLight(0xffffff, 0.16 * Math.PI)
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
  // Moebel greifen nur im Modus Hand; beim Drehen dreht ein Druck immer die Ansicht.
  let handAn = false
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
    if (!ziehFn || !handAn || gehen || e.button !== 0 || e.pointerType === 'touch') return
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
      if (ziehFn && handAn && !gehen && e.pointerType === 'mouse' && e.buttons === 0) {
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
  // Kurzer, ruhiger Nachlauf nach dem Loslassen: weich, aber die Wohnung
  // rollt nicht lange weiter.
  controls.enableDamping = true
  controls.dampingFactor = 0.28
  controls.rotateSpeed = 0.7
  controls.zoomToCursor = true
  controls.maxPolarAngle = Math.PI * 0.49
  controls.minDistance = 0.4
  controls.maxDistance = 80
  // Verschieben bleibt auf Bodenhoehe: so dreht sich die Wohnung immer um
  // einen Punkt auf dem Boden und schwebt nicht weg.
  controls.screenSpacePanning = false

  let waende: WandInfo[] = []
  /** Woran man beim Begehen stoesst (Rollen in HINDERNIS). */
  let hindernisse: Mesh[] = []
  /** Moebel und Kisten, an denen man beim Begehen haengen bleibt (E77). */
  let moebelHindernisse: Mesh[] = []
  /** Tuerblaetter, die sich per Klick drehen (E65). */
  let tueren: Mesh[] = []
  /** Winkel je Tuer, damit ein Neubau der Szene ihn nicht zuruecksetzt. */
  const tuerStand = new Map<string, number>()
  /** Schubladen (E68) und wie weit sie offen sind (0 bis 1). */
  let schuebe: Mesh[] = []
  const schubStand = new Map<string, number>()
  let halb = true
  let koerperJetzt: Koerper[] = []
  let geplant = 0
  let weg = false
  let bewegt = false
  /** Begehen: Kamera in Augenhoehe, OrbitControls ruhen (siehe gehenAn). */
  let gehen = false

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
      // Beim Begehen steht man im Raum: dann bleibt jede Wand ganz sichtbar.
      const vorne = halb && !gehen && (cx - w.x) * w.innen[0] + (cz - w.z) * w.innen[1] < -0.05
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
      // 'change', und das plant das naechste Bild. Beim Begehen fuehrt
      // gehenAn die Kamera; update() wuerde sie zum Ziel zurueckdrehen.
      if (!gehen) controls.update()
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
  const flaechenMat = new Map<string, MeshLambertMaterial | MeshPhongMaterial>()
  /** Leuchten (Decke, LED, Lampenschirm): selbstleuchtend, je Raum ein
   *  Material, damit der Schalter nur seinen Raum hell macht (E74). */
  const leuchteMats = new Map<string, MeshBasicMaterial>()
  function leuchteMat(raum: string): MeshBasicMaterial {
    let mat = leuchteMats.get(raum)
    if (!mat) {
      mat = new MeshBasicMaterial({ color: new Color(leuchteFarbe(raum)) })
      leuchteMats.set(raum, mat)
    }
    return mat
  }
  /** An: warm-hell. Aus: am Tag hellgrau wie ein Schirm, am Abend dunkel. */
  function leuchteFarbe(raum: string): string {
    return raeumeAn.has(raum) ? '#fff4dc' : modus === 'abend' ? '#6f6b64' : '#e9e4da'
  }

  /* ------------------------------------------------ Licht (E71) */
  let punktLichter: PointLight[] = []
  let modus: 'tag' | 'abend' = 'tag'
  let raeumeAn = new Set<string>()
  let schalterFn: ((raumId: string) => void) | null = null
  function lichterSetzen(liste: Licht3D[]) {
    for (const l of punktLichter) {
      scene.remove(l)
      l.dispose()
    }
    // Hoechstens 20 Lichter, damit schwache Rechner fluessig bleiben.
    punktLichter = liste.slice(0, 20).map((l) => {
      const p = new PointLight(new Color(l.farbe), 0, l.art === 'kueche' ? 2.2 : 7, 2)
      p.position.set(l.pos[0], l.pos[1], l.pos[2])
      p.userData = { staerke: l.staerke, art: l.art, raum: l.raumId }
      scene.add(p)
      return p
    })
    modusSetzen(modus)
  }
  function modusSetzen(m: 'tag' | 'abend') {
    modus = m
    const abend = m === 'abend'
    umgebung.intensity = (abend ? 0.16 : 0.5) * Math.PI
    umgebung.color.set(abend ? 0x9aa6c4 : 0xf1f3f7)
    sonne.intensity = (abend ? 0.04 : 0.52) * Math.PI
    gegen.intensity = (abend ? 0.03 : 0.16) * Math.PI
    for (const l of punktLichter) {
      const d = l.userData as { staerke: number; art: string; raum: string }
      // Candela (three rechnet physikalisch): Decke etwa 12, Kueche naeher dran.
      // Am Tag gibt eingeschaltetes Licht nur etwas dazu.
      const basis = d.art === 'kueche' ? 2.6 : d.art === 'lampe' ? 7 : 13
      l.intensity = raeumeAn.has(d.raum) ? basis * d.staerke * (abend ? 1 : 0.45) : 0
    }
    for (const [raum, mat] of leuchteMats) mat.color.set(leuchteFarbe(raum))
    rendern()
  }
  function lichtRaeume(an: Set<string>) {
    raeumeAn = new Set(an)
    modusSetzen(modus)
  }
  const linienMat = new Map<string, LineBasicMaterial>()
  function flaecheMaterial(farbe: string, deckkraft: number, durch: boolean, glanz = 0): MeshLambertMaterial | MeshPhongMaterial {
    const key = `${farbe}|${deckkraft}|${durch}|${glanz}`
    let m = flaechenMat.get(key)
    if (!m) {
      // Glaenzendes (Leder, Metall, Keramik, Glas) mit Lichtpunkt, sonst matt.
      // Phong rechnet das Licht wie Lambert, nur mit Glanz dazu.
      m =
        glanz > 0
          ? new MeshPhongMaterial({
              color: new Color(farbe),
              transparent: durch,
              opacity: deckkraft,
              depthWrite: deckkraft >= 1,
              shininess: 6 + glanz * 90,
              specular: new Color(glanz * 0.32, glanz * 0.32, glanz * 0.32),
            })
          : new MeshLambertMaterial({ color: new Color(farbe), transparent: durch, opacity: deckkraft, depthWrite: deckkraft >= 1 })
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
    hindernisse = []
    moebelHindernisse = []
    tueren = []
    schuebe = []
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
      const mat = k.rolle === 'leuchte'
        ? leuchteMat(k.id ?? '')
        : wand
        ? new MeshLambertMaterial({
            color: new Color(k.farbe),
            transparent: durch,
            opacity: k.deckkraft,
            depthWrite: k.deckkraft >= 1,
          })
        : flaecheMaterial(k.farbe, k.deckkraft, durch, k.art === 'quader' ? (k.glanz ?? 0) : 0)
      const mesh = new Mesh(einheit, mat)
      if (k.id && (k.rolle === 'moebel' || k.rolle === 'regal' || k.rolle === 'brett')) mesh.userData = { objektId: k.id }
      else if (k.id && k.rolle === 'kiste') mesh.userData = { kisteId: k.id }
      else if (k.id && k.rolle === 'schalter') mesh.userData = { schalterRaum: k.id }
      if (HINDERNIS.has(k.rolle)) hindernisse.push(mesh)
      else if (k.art === 'quader' && (k.rolle === 'moebel' || k.rolle === 'regal' || k.rolle === 'front' || k.rolle === 'kiste')) {
        const unten = k.mitte[1] - k.masse[1] / 2
        const oben = k.mitte[1] + k.masse[1] / 2
        if (oben > 0.3 && unten < 1.2) moebelHindernisse.push(mesh)
      }
      if (k.art === 'quader' && k.tuer) {
        // Tuerstand behalten, wenn die Szene neu gebaut wird (Zeichner aendert live).
        const stand = tuerStand.get(k.tuer.id)
        const tuer: TuerLage = { ...k.tuer, winkel: stand ?? k.drehY }
        mesh.userData = { tuer }
        tuerSetzen(mesh, tuer.winkel)
        tueren.push(mesh)
      }
      if (k.art === 'quader' && k.schub) {
        // Schublade (E68): Grundlage ist die geschlossene Lage.
        mesh.userData = { schub: { id: k.schub.id, weg: k.schub.weg, basis: [mesh.position.x, mesh.position.z] } }
        schuebe.push(mesh)
        schubSetzen(mesh, schubStand.get(k.schub.id) ?? 0)
      }
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

  /* ---------------------------------------------------------- Begehen */

  let gier = 0 // Drehung um die Hochachse (Blickrichtung)
  let neigung = 0 // hoch und runter schauen
  let vorher: { pos: Vector3; ziel: Vector3; fov: number } | null = null
  const halten = new Set<GehRichtung>()
  let rennen = false
  let schritt = 0
  let zuletzt = 0
  let schauen: { x: number; y: number; id: number } | null = null

  function kameraAusrichten() {
    camera.rotation.set(neigung, gier, 0, 'YXZ')
    rendern()
  }

  /** Ist der Weg von (x, z) um (dx, dz) frei? Strahlen aus der Mitte und
   *  von beiden Schultern: Waende in Kniehoehe, Moebel in Knie- und
   *  Tischhoehe. */
  function frei(x: number, z: number, dx: number, dz: number): boolean {
    const l = Math.hypot(dx, dz)
    if (l < 1e-6) return true
    const rx = dx / l
    const rz = dz / l
    const zu = tueren.filter((t) => {
      const d = t.userData.tuer as TuerLage
      return Math.abs(winkelDiff(d.winkel, d.zu)) < 0.35
    })
    const waende = zu.length ? [...hindernisse, ...zu] : hindernisse
    const richtung = new Vector3(rx, 0, rz)
    let stoss = false
    strahl.far = l + WAND_ABSTAND_M
    for (const seite of [0, -SCHULTER_M, SCHULTER_M]) {
      // Seitlich versetzt, quer zur Gehrichtung.
      const sx = x - rz * seite
      const sz = z + rx * seite
      strahl.set(new Vector3(sx, KNIE_M, sz), richtung)
      if (strahl.intersectObjects(waende, false).length > 0) stoss = true
      for (const h of MOEBEL_HOEHEN) {
        if (stoss) break
        strahl.set(new Vector3(sx, h, sz), richtung)
        if (strahl.intersectObjects(moebelHindernisse, false).length > 0) stoss = true
      }
      if (stoss) break
    }
    strahl.far = Infinity
    return !stoss
  }

  function gehSchritt(zeit: number) {
    schritt = 0
    if (!gehen || weg) return
    const dt = zuletzt ? Math.min(0.05, (zeit - zuletzt) / 1000) : 0.016
    zuletzt = zeit
    const vor = (halten.has('vor') ? 1 : 0) - (halten.has('zurueck') ? 1 : 0)
    const seit = (halten.has('rechts') ? 1 : 0) - (halten.has('links') ? 1 : 0)
    if (!vor && !seit) {
      zuletzt = 0
      bewegungAn(false)
      return
    }
    // Vorwaerts ist die Blickrichtung am Boden, rechts quer dazu.
    let dx = -Math.sin(gier) * vor + Math.cos(gier) * seit
    let dz = -Math.cos(gier) * vor - Math.sin(gier) * seit
    const l = Math.hypot(dx, dz)
    const weit = (rennen ? RENNEN_M_S : GEHEN_M_S) * dt
    dx = (dx / l) * weit
    dz = (dz / l) * weit
    const p = camera.position
    // An der Wand entlang gleiten: erst ganz, sonst nur laengs oder quer.
    if (frei(p.x, p.z, dx, dz)) {
      p.x += dx
      p.z += dz
    } else if (frei(p.x, p.z, dx, 0)) p.x += dx
    else if (frei(p.x, p.z, 0, dz)) p.z += dz
    rendern()
    schritt = requestAnimationFrame(gehSchritt)
  }

  function losgehen() {
    if (schritt || !gehen) return
    bewegungAn(true)
    zuletzt = 0
    schritt = requestAnimationFrame(gehSchritt)
  }

  const TASTEN: Record<string, GehRichtung> = {
    KeyW: 'vor',
    ArrowUp: 'vor',
    KeyS: 'zurueck',
    ArrowDown: 'zurueck',
    KeyA: 'links',
    ArrowLeft: 'links',
    KeyD: 'rechts',
    ArrowRight: 'rechts',
  }
  const tasteRunter = (e: KeyboardEvent) => {
    if (!gehen) return
    const ziel = e.target as HTMLElement | null
    if (ziel && (ziel.tagName === 'INPUT' || ziel.tagName === 'TEXTAREA' || ziel.isContentEditable)) return
    rennen = e.shiftKey
    const r = TASTEN[e.code]
    if (!r) return
    e.preventDefault()
    halten.add(r)
    losgehen()
  }
  const tasteHoch = (e: KeyboardEvent) => {
    rennen = e.shiftKey
    const r = TASTEN[e.code]
    if (r) halten.delete(r)
  }
  // Fenster verliert den Fokus: sonst liefe man mit "gedrueckter" Taste weiter.
  const fokusWeg = () => halten.clear()
  window.addEventListener('keydown', tasteRunter)
  window.addEventListener('keyup', tasteHoch)
  window.addEventListener('blur', fokusWeg)

  // Umschauen: gedrueckt ziehen, wie bei einem Rundblick-Foto.
  const schauRunter = (e: PointerEvent) => {
    if (!gehen || schauen) return
    schauen = { x: e.clientX, y: e.clientY, id: e.pointerId }
    renderer.domElement.setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  const schauBewegen = (e: PointerEvent) => {
    if (!gehen || !schauen || e.pointerId !== schauen.id) return
    const dx = e.clientX - schauen.x
    const dy = e.clientY - schauen.y
    schauen.x = e.clientX
    schauen.y = e.clientY
    gier += dx * 0.0045
    neigung = Math.max(-1.2, Math.min(1.2, neigung + dy * 0.0045))
    kameraAusrichten()
  }
  const schauHoch = (e: PointerEvent) => {
    if (!schauen || e.pointerId !== schauen.id) return
    schauen = null
    if (renderer.domElement.hasPointerCapture(e.pointerId)) renderer.domElement.releasePointerCapture(e.pointerId)
  }
  renderer.domElement.addEventListener('pointerdown', schauRunter)
  renderer.domElement.addEventListener('pointermove', schauBewegen)
  renderer.domElement.addEventListener('pointerup', schauHoch)
  renderer.domElement.addEventListener('pointercancel', schauHoch)

  /* ------------------------------------------------ Tueren auf und zu */

  /** Tuerblatt um die Angel auf Winkel w drehen (drehY). */
  function tuerSetzen(mesh: Mesh, w: number) {
    const d = mesh.userData.tuer as TuerLage
    d.winkel = w
    tuerStand.set(d.id, w)
    mesh.rotation.y = w
    mesh.position.x = d.angel[0] + (Math.cos(w) * d.laenge) / 2
    mesh.position.z = d.angel[1] - (Math.sin(w) * d.laenge) / 2
  }

  /** Schublade auf Anteil a (0 zu, 1 ganz offen) setzen. */
  function schubSetzen(mesh: Mesh, a: number) {
    const d = mesh.userData.schub as { id: string; weg: [number, number]; basis: [number, number] }
    mesh.position.x = d.basis[0] + d.weg[0] * a
    mesh.position.z = d.basis[1] + d.weg[1] * a
  }

  let tuerLauf = 0
  const tuerZiele = new Map<Mesh, { von: number; nach: number; start: number }>()
  const schubZiele = new Map<string, { von: number; nach: number; start: number }>()
  function tuerSchritt(zeit: number) {
    tuerLauf = 0
    const glatt = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2)
    for (const [mesh, z] of tuerZiele) {
      const p = Math.min(1, (zeit - z.start) / 350)
      tuerSetzen(mesh, z.von + winkelDiff(z.nach, z.von) * glatt(p))
      if (p >= 1) tuerZiele.delete(mesh)
    }
    for (const [id, z] of schubZiele) {
      const p = Math.min(1, (zeit - z.start) / 300)
      const a = z.von + (z.nach - z.von) * glatt(p)
      schubStand.set(id, a)
      for (const mesh of schuebe) if ((mesh.userData.schub as { id: string }).id === id) schubSetzen(mesh, a)
      if (p >= 1) schubZiele.delete(id)
    }
    rendern()
    if (tuerZiele.size || schubZiele.size) tuerLauf = requestAnimationFrame(tuerSchritt)
  }

  function schubUmschalten(id: string) {
    const jetzt = schubStand.get(id) ?? 0
    schubZiele.set(id, { von: jetzt, nach: jetzt > 0.5 ? 0 : 1, start: performance.now() })
    if (!tuerLauf) tuerLauf = requestAnimationFrame(tuerSchritt)
  }

  /** Offen -> zu, zu -> ganz offen. */
  function tuerUmschalten(mesh: Mesh) {
    const d = mesh.userData.tuer as TuerLage
    const istZu = Math.abs(winkelDiff(d.winkel, d.zu)) < 0.05
    tuerZiele.set(mesh, { von: d.winkel, nach: istZu ? d.auf : d.zu, start: performance.now() })
    if (!tuerLauf) tuerLauf = requestAnimationFrame(tuerSchritt)
  }

  /** Ein kurzer Klick (ohne Ziehen) auf ein Tuerblatt schaltet es. Davor
   *  stehende halbdurchsichtige Waende zaehlen nicht. */
  let tipp: { x: number; y: number; zeit: number } | null = null
  const tippRunter = (e: PointerEvent) => {
    tipp = e.button === 0 ? { x: e.clientX, y: e.clientY, zeit: performance.now() } : null
  }
  const tippHoch = (e: PointerEvent) => {
    const t = tipp
    tipp = null
    if (!t || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 5 || performance.now() - t.zeit > 500) return
    strahl.setFromCamera(zeigerNdc(e), camera)
    for (const hit of strahl.intersectObjects(gruppe.children, false)) {
      if (hit.object.userData.tuer) {
        tuerUmschalten(hit.object as Mesh)
        return
      }
      if (hit.object.userData.schalterRaum && schalterFn) {
        schalterFn(hit.object.userData.schalterRaum as string)
        return
      }
      if (hit.object.userData.schub) {
        schubUmschalten((hit.object.userData.schub as { id: string }).id)
        return
      }
      const mat = (hit.object as Mesh).material as MeshLambertMaterial | undefined
      if (mat && mat.opacity >= 0.5) {
        // Auf ein Moebel, Regal oder eine Kiste: die Stelle darauf. Sonst
        // (Wand) zaehlt der Boden unter dem Zeiger.
        const u = hit.object.userData as { objektId?: string; kisteId?: string }
        if (tippFn && (u.objektId || u.kisteId)) {
          tippFn(Math.round(hit.point.x * 100), Math.round(hit.point.z * 100), { objekt: u.objektId, kiste: u.kisteId })
          return
        }
        break
      }
    }
    if (!tippFn) return
    const p = bodenPunkt(e)
    if (p) tippFn(Math.round(p.x * 100), Math.round(p.z * 100), null)
  }
  let tippFn: ((xCm: number, yCm: number, treffer: Treffer3D | null) => void) | null = null
  renderer.domElement.addEventListener('pointerdown', tippRunter)
  renderer.domElement.addEventListener('pointerup', tippHoch)

  function gehenAn(an: boolean, start: [number, number] | null) {
    if (an === gehen) return
    if (an) {
      vorher = { pos: camera.position.clone(), ziel: controls.target.clone(), fov: camera.fov }
      // In die Richtung schauen, in die die Kamera eben geschaut hat.
      const dx = controls.target.x - camera.position.x
      const dz = controls.target.z - camera.position.z
      gier = Math.hypot(dx, dz) > 0.01 ? Math.atan2(-dx, -dz) : 0
      neigung = 0
      gehen = true
      controls.enabled = false
      camera.position.set(start ? start[0] / 100 : controls.target.x, AUGE_M, start ? start[1] / 100 : controls.target.z)
      camera.fov = 70
      camera.updateProjectionMatrix()
      kameraAusrichten()
      return
    }
    gehen = false
    halten.clear()
    schauen = null
    if (schritt) cancelAnimationFrame(schritt)
    schritt = 0
    controls.enabled = true
    if (vorher) {
      camera.position.copy(vorher.pos)
      controls.target.copy(vorher.ziel)
      camera.fov = vorher.fov
      camera.updateProjectionMatrix()
    }
    controls.update()
    bewegungAn(false)
    rendern()
  }

  function blick(b: Blick) {
    if (gehen) gehenAn(false, null)
    const r = szeneRahmen(koerperJetzt)
    if (!r) return
    const mitte: Vec3 = [(r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2]
    const breite = Math.max(r.x1 - r.x0, 1)
    const tiefe = Math.max(r.z1 - r.z0, 1)
    const halbFov = (camera.fov * Math.PI) / 360
    // Abstand, bei dem die ganze Flaeche ins Bild passt (Hoehe und Breite des Bilds).
    const passt = Math.max(tiefe / 2 / Math.tan(halbFov), breite / 2 / (Math.tan(halbFov) * camera.aspect))
    /* Hochformat (Handy, E76): die Wohnung um 90 Grad gedreht zeigen, damit
     * ihre lange Seite die Hoehe des Bildschirms nutzt statt winzig quer zu
     * liegen. Dafuer tauschen Breite und Tiefe ihre Rolle. */
    const hoch = camera.aspect < 0.85 && breite > tiefe
    const passtHoch = Math.max(breite / 2 / Math.tan(halbFov), tiefe / 2 / (Math.tan(halbFov) * camera.aspect))
    if (b === 'oben') {
      zielen(mitte, (hoch ? passtHoch : passt) * 1.12 + r.hoehe, 0.0001, hoch ? -Math.PI / 2 : 0)
    } else if (b === 'schraeg') {
      zielen([mitte[0], r.hoehe * 0.2, mitte[2]], (hoch ? passtHoch * 1.75 : passt * 1.25) + r.hoehe, 0.95, hoch ? -0.55 - Math.PI / 2 : -0.55)
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
      handAn = an
      if (!an) renderer.domElement.style.cursor = ''
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
    begehen: gehenAn,
    lichter: lichterSetzen,
    lichtModus: modusSetzen,
    lichtRaeume,
    schalter(fn) {
      schalterFn = fn
    },
    tippen(fn) {
      tippFn = fn
    },
    gehenKnopf(richtung, an) {
      if (!gehen) return
      if (an) {
        halten.add(richtung)
        losgehen()
      } else halten.delete(richtung)
    },
    dispose() {
      weg = true
      if (geplant) cancelAnimationFrame(geplant)
      if (schritt) cancelAnimationFrame(schritt)
      window.removeEventListener('keydown', tasteRunter)
      window.removeEventListener('keyup', tasteHoch)
      window.removeEventListener('blur', fokusWeg)
      renderer.domElement.removeEventListener('pointerdown', schauRunter)
      renderer.domElement.removeEventListener('pointerdown', tippRunter)
      renderer.domElement.removeEventListener('pointerup', tippHoch)
      if (tuerLauf) cancelAnimationFrame(tuerLauf)
      for (const l of punktLichter) l.dispose()
      for (const mat of leuchteMats.values()) mat.dispose()
      renderer.domElement.removeEventListener('pointermove', schauBewegen)
      renderer.domElement.removeEventListener('pointerup', schauHoch)
      renderer.domElement.removeEventListener('pointercancel', schauHoch)
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
