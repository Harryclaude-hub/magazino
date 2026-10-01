import { useEffect, useRef, useState } from 'react'
import {
  AmbientLight,
  CircleGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { useT } from '../../lib/i18n'
import type { Avatar3D } from '../../lib/types'
import { baueFigur } from './avatar3d'
import type { Figur3D } from './vertrag3d'

/* Kleine 3D-Vorschau der eigenen Figur in den Einstellungen (E82). Eigener
 * Code-Teil samt three: AvatarEditor laedt ihn per lazy(), so bleibt three
 * aus dem Hauptbundle. Eigene kleine Buehne statt motor.ts: nur Licht,
 * ein Schatten am Boden und die Figur. Sie dreht sich langsam (nicht bei
 * der Stufe "ruhig" oder reduzierter Bewegung), Ziehen dreht von Hand.
 * Ohne WebGL steht dort ein Satz statt der Figur. */

export interface AvatarVorschauProps {
  look: Avatar3D
  name: string
}

function webglDa(): boolean {
  try {
    const c = document.createElement('canvas')
    const ctx = c.getContext('webgl2') ?? c.getContext('webgl')
    // Pruef-Kontext sofort freigeben (wie in motor.ts).
    ctx?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!ctx
  } catch {
    return false
  }
}

interface Buehne {
  renderer: WebGLRenderer
  scene: Scene
  figurOrt: Group
}

export default function AvatarVorschau({ look, name }: AvatarVorschauProps) {
  const t = useT()
  const host = useRef<HTMLDivElement>(null)
  const buehne = useRef<Buehne | null>(null)
  const figur = useRef<Figur3D | null>(null)
  const [geht, setGeht] = useState<'pruefen' | 'ja' | 'nein'>('pruefen')

  // Buehne einmal aufbauen, beim Verlassen alles freigeben.
  useEffect(() => {
    const el = host.current
    if (!el) return
    if (!webglDa()) {
      setGeht('nein')
      return
    }
    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true })
    } catch (err) {
      console.warn('[figur] Vorschau ohne WebGL:', err instanceof Error ? err.message : err)
      setGeht('nein')
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    const canvas = renderer.domElement
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    // Waagrecht ziehen dreht, senkrecht scrollt die Seite weiter.
    canvas.style.touchAction = 'pan-y'
    canvas.style.cursor = 'grab'
    el.appendChild(canvas)

    const scene = new Scene()
    // Die Figur schaut nach -z, also steht die Kamera dort.
    const camera = new PerspectiveCamera(30, 1, 0.1, 50)
    camera.position.set(0, 1.3, -5.2)
    camera.lookAt(0, 1.1, 0)
    scene.add(new AmbientLight(0xf1f3f7, 0.55 * Math.PI))
    const sonne = new DirectionalLight(0xfff4e6, 0.6 * Math.PI)
    sonne.position.set(-2, 4, -3)
    scene.add(sonne)
    const gegen = new DirectionalLight(0xffffff, 0.2 * Math.PI)
    gegen.position.set(3, 2, 4)
    scene.add(gegen)

    const schattenGeo = new CircleGeometry(0.42, 32)
    const schattenMat = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14, depthWrite: false })
    const schatten = new Mesh(schattenGeo, schattenMat)
    schatten.rotation.x = -Math.PI / 2
    schatten.position.y = 0.002
    scene.add(schatten)
    // Hier haengt die Figur und dreht sich.
    const figurOrt = new Group()
    scene.add(figurOrt)
    buehne.current = { renderer, scene, figurOrt }
    setGeht('ja')

    const groesse = () => {
      const w = Math.max(1, el.clientWidth)
      const h = Math.max(1, el.clientHeight)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    groesse()
    const beobachter = new ResizeObserver(groesse)
    beobachter.observe(el)
    // Nicht zeichnen, solange die Vorschau aus dem Bild gescrollt ist (Akku).
    let sichtbar = true
    const imBild = new IntersectionObserver((eintraege) => {
      sichtbar = eintraege.some((e) => e.isIntersecting)
    })
    imBild.observe(el)
    const wenigBewegung = window.matchMedia('(prefers-reduced-motion: reduce)')
    const ruhig = () => wenigBewegung.matches || document.documentElement.dataset.motion === 'ruhig'

    // Drehen von Hand.
    let ziehen: { id: number; x: number } | null = null
    let drehung = 0
    let zuletztGezogen = -Infinity
    const runter = (e: PointerEvent) => {
      ziehen = { id: e.pointerId, x: e.clientX }
      canvas.setPointerCapture(e.pointerId)
      canvas.style.cursor = 'grabbing'
    }
    const bewegen = (e: PointerEvent) => {
      if (!ziehen || e.pointerId !== ziehen.id) return
      drehung += (e.clientX - ziehen.x) * 0.012
      ziehen.x = e.clientX
      zuletztGezogen = performance.now()
    }
    const hoch = (e: PointerEvent) => {
      if (!ziehen || e.pointerId !== ziehen.id) return
      ziehen = null
      canvas.style.cursor = 'grab'
    }
    canvas.addEventListener('pointerdown', runter)
    canvas.addEventListener('pointermove', bewegen)
    canvas.addEventListener('pointerup', hoch)
    canvas.addEventListener('pointercancel', hoch)

    let bild = 0
    let vorher = performance.now()
    const start = vorher
    const schleife = (jetzt: number) => {
      bild = requestAnimationFrame(schleife)
      const dt = Math.min(0.1, (jetzt - vorher) / 1000)
      vorher = jetzt
      if (!sichtbar) return
      // Langsam weiterdrehen, aber nicht direkt nach dem Ziehen.
      if (!ruhig() && !ziehen && jetzt - zuletztGezogen > 2500) drehung += dt * 0.5
      figurOrt.rotation.y = drehung
      figur.current?.pose('stehen', 0, (jetzt - start) / 1000)
      renderer.render(scene, camera)
    }
    bild = requestAnimationFrame(schleife)

    return () => {
      cancelAnimationFrame(bild)
      beobachter.disconnect()
      imBild.disconnect()
      canvas.removeEventListener('pointerdown', runter)
      canvas.removeEventListener('pointermove', bewegen)
      canvas.removeEventListener('pointerup', hoch)
      canvas.removeEventListener('pointercancel', hoch)
      figur.current?.dispose()
      figur.current = null
      schattenGeo.dispose()
      schattenMat.dispose()
      buehne.current = null
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    }
  }, [])

  // Figur neu bauen, sobald sich Look oder Name aendern.
  useEffect(() => {
    const b = buehne.current
    if (geht !== 'ja' || !b) return
    const f = baueFigur(look, name, look.oben)
    b.figurOrt.add(f.gruppe)
    figur.current = f
    return () => {
      b.figurOrt.remove(f.gruppe)
      f.dispose()
      if (figur.current === f) figur.current = null
    }
  }, [look, name, geht])

  return (
    <div className="relative h-full w-full">
      <div ref={host} className="absolute inset-0" role="img" aria-label={t('einstellungen.figur_vorschau')} />
      {geht === 'nein' ? (
        <p className="absolute inset-0 flex items-center justify-center p-3 text-center text-sm">{t('einstellungen.figur_kein_3d')}</p>
      ) : null}
    </div>
  )
}
