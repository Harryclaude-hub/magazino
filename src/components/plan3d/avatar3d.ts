/* Figuren fuer die 3D-Wohnung (E82): freundlich und rund, keine echten
 * Menschen. Rumpf als Kapsel, Kopf als Kugel, ein einfaches Gesicht (zwei
 * Augen, Nase, ein Laecheln), Haare je Frisur, auf Wunsch eine Brille.
 * Arme und Beine haengen an Gelenken (Schulter, Ellbogen, Huefte, Knie),
 * damit die Figur gehen, sitzen und liegen kann.
 *
 * Masse in Metern fuer eine Figur von 1,75 m; die ganze Figur wird mit
 * groesse_cm / 175 gestreckt, die Statur macht nur breiter oder schmaler.
 * Gesicht nach -z (wie die Kamera), Ursprung je Haltung wie in
 * vertrag3d.ts beschrieben:
 *   stehen  zwischen den Fuessen auf dem Boden, Augen bei 0,935 x Groesse
 *   sitz    auf der Sitzflaeche unter der Huefte, Augen bei 0,78 x Groesse/1,75,
 *           Oberschenkel nach vorn (-z), Unterschenkel nach unten
 *   liegen  auf der Liegeflaeche unter dem Kopf, auf dem Ruecken, Fuesse
 *           nach -z, Augen 0,2 m ueber der Flaeche
 *
 * Laeuft auch unter node (scripts/avatar-pruefen.mjs): nur das Namensschild
 * braucht eine Zeichenflaeche und entfaellt dort. Unter rund 3000 Dreiecken
 * je Figur, auch mit Locken und Brille. */
import {
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  Group,
  LinearFilter,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three'
import type { Avatar3D } from '../../lib/types'
import { GROESSE_MAX, GROESSE_MIN, GROESSE_STANDARD, pruefeLook } from '../../lib/avatar.ts'
import type { Figur3D, Haltung } from './vertrag3d'

/* ------------------------------------------------------------ Masse */

const BASIS = 1.75
/** Augenhoehe stehend: 0,935 x Groesse. */
const AUGE_Y = 0.935 * BASIS
const KOPF_Y = 1.62
const KOPF_R = 0.12
/** Augenmitte so weit vor der Kopfmitte (nach -z). */
const AUGE_Z = 0.106
const AUGE_X = 0.045
const HUEFTE_Y = 0.92
const HUEFTE_X = 0.09
const OBERSCHENKEL = 0.43
const UNTERSCHENKEL = 0.41
const SCHULTER_Y = 1.42
const SCHULTER_X = 0.2
const OBERARM = 0.28
const UNTERARM = 0.25
/** Sitzend: Augen bei 0,78 m (fuer 1,75 m) ueber der Sitzflaeche. Daraus
 *  folgt, wie hoch das Hueftgelenk ueber der Flaeche liegt (rund 6 cm). */
const SITZ_AUGE = 0.78
const SITZ_HUEFTE = SITZ_AUGE - (AUGE_Y - HUEFTE_Y)
const LIEGEN_AUGE = 0.2

const STATUR_BREITE = { schmal: 0.88, mittel: 1, breit: 1.16 } as const

/** Wenn jemand keinen Look hat: ruhig und neutral, das Oberteil in der
 *  Ersatzfarbe (etwa der Farbe der Person im Umzug). */
const NEUTRAL = { haut: '#d6a179', haare: '#4b3324', unten: '#2f3b4c', schuhe: '#3a3532' }
const AUGENFARBE = '#2b2622'
const MUNDFARBE = '#8a4a3e'
const BRILLENFARBE = '#26262b'
const FARBE = /^#[0-9a-f]{6}$/i

/* --------------------------------------------------- Namensschild */

/** Erste Schrift mit Richtung entscheidet: Arabisch oder Hebraeisch gibt
 *  rechts nach links, lateinische Buchstaben links nach rechts. */
function istRtl(text: string): boolean {
  for (const z of text) {
    if (/[֐-ࣿיִ-﷿ﹰ-﻿]/.test(z)) return true
    if (/[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/.test(z)) return false
  }
  return false
}

function kuerzen(text: string, max: number): string {
  const zeichen = Array.from(text)
  return zeichen.length > max ? zeichen.slice(0, max - 1).join('') + '…' : text
}

/** Name als Pille ueber dem Kopf. Bleibt auf dem Bildschirm gleich gross
 *  (sizeAttenuation aus), damit er auch von weitem lesbar ist. Wird nicht
 *  angeklickt (raycast leer). null ohne Zeichenflaeche (node) oder ohne Namen. */
function namensSchild(name: string): Sprite | null {
  if (typeof document === 'undefined') return null
  const text = kuerzen(name.trim(), 24)
  if (!text) return null
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const px = 44
  const schrift = `600 ${px}px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Arabic", Tahoma, sans-serif`
  ctx.font = schrift
  const rand = Math.round(px * 0.6)
  const w = Math.ceil(ctx.measureText(text).width) + rand * 2
  const h = Math.round(px * 1.6)
  canvas.width = w
  canvas.height = h
  // Nach dem Groessenwechsel ist der Zeichenzustand zurueckgesetzt.
  ctx.font = schrift
  ctx.direction = istRtl(text) ? 'rtl' : 'ltr'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const r = h / 2
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(w - r, 0)
  ctx.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2)
  ctx.lineTo(r, h)
  ctx.arc(r, r, r, Math.PI / 2, (Math.PI * 3) / 2)
  ctx.closePath()
  ctx.fillStyle = 'rgba(29, 27, 22, 0.82)'
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, w / 2, h / 2 + px * 0.04)

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.minFilter = LinearFilter
  tex.generateMipmaps = false
  const mat = new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true, sizeAttenuation: false })
  const schild = new Sprite(mat)
  schild.name = 'namensschild'
  schild.renderOrder = 10
  schild.center.set(0.5, 0)
  const hoehe = 0.032
  schild.scale.set((hoehe * w) / h, hoehe, 1)
  schild.raycast = () => {}
  return schild
}

/* ------------------------------------------------------------ Bau */

interface Glieder {
  innen: Group
  brust: Group
  huefteL: Group
  huefteR: Group
  knieL: Group
  knieR: Group
  schulterL: Group
  schulterR: Group
  ellbogenL: Group
  ellbogenR: Group
}

/** Baut eine Figur. look darf null oder kaputt sein (Daten anderer
 *  Geraete): dann eine neutrale Figur mit ersatzFarbe als Oberteil. */
export function baueFigur(look: Avatar3D | null, name: string, ersatzFarbe: string): Figur3D {
  const sauber = pruefeLook(look)
  const oben = sauber?.oben ?? (FARBE.test(ersatzFarbe) ? ersatzFarbe : '#4f6d8f')
  const haut = sauber?.haut ?? NEUTRAL.haut
  const haare = sauber?.haare ?? NEUTRAL.haare
  const unten = sauber?.unten ?? NEUTRAL.unten
  const schuhe = sauber?.schuhe ?? NEUTRAL.schuhe
  const haarform = sauber?.haarform ?? 'kurz'
  const groesse = Math.min(GROESSE_MAX, Math.max(GROESSE_MIN, sauber?.groesse_cm ?? GROESSE_STANDARD)) / 100
  const s = groesse / BASIS
  const breit = STATUR_BREITE[sauber?.statur ?? 'mittel']

  // Gleiche Farbe, ein Material.
  const mats = new Map<string, MeshLambertMaterial>()
  const mat = (farbe: string) => {
    let m = mats.get(farbe)
    if (!m) {
      m = new MeshLambertMaterial({ color: new Color(farbe) })
      mats.set(farbe, m)
    }
    return m
  }
  const teil = (geo: BufferGeometry, farbe: string, bez: string, x = 0, y = 0, z = 0) => {
    const m = new Mesh(geo, mat(farbe))
    m.name = bez
    m.position.set(x, y, z)
    return m
  }
  const gelenk = (bez: string, x: number, y: number, z = 0) => {
    const g = new Group()
    g.name = bez
    g.position.set(x, y, z)
    return g
  }
  /** Kapsel von Gelenk zu Gelenk, haengt nach unten. */
  const glied = (laenge: number, radius: number, farbe: string, bez: string) => {
    const m = teil(new CapsuleGeometry(radius, Math.max(0.01, laenge - radius), 2, 8), farbe, bez, 0, -laenge / 2, 0)
    m.scale.set(breit, 1, breit)
    return m
  }

  const gruppe = new Group()
  gruppe.name = 'figur'
  const innen = new Group()
  innen.name = 'figur-innen'
  innen.scale.setScalar(s)
  gruppe.add(innen)

  // Becken in Hosenfarbe, fest an der Huefte.
  const becken = teil(new SphereGeometry(0.16, 12, 8), unten, 'becken', 0, 0.94, 0)
  becken.scale.set(1.02 * breit, 0.72, 0.72 * breit)
  innen.add(becken)

  // Beine: Huefte, Oberschenkel, Knie, Unterschenkel, Schuh.
  const bein = (seite: 1 | -1) => {
    const huefte = gelenk(seite > 0 ? 'huefte-r' : 'huefte-l', seite * HUEFTE_X * breit, HUEFTE_Y)
    huefte.add(glied(OBERSCHENKEL, 0.068, unten, 'oberschenkel'))
    const knie = gelenk(seite > 0 ? 'knie-r' : 'knie-l', 0, -OBERSCHENKEL)
    knie.add(glied(UNTERSCHENKEL, 0.056, unten, 'unterschenkel'))
    const schuh = teil(new CapsuleGeometry(0.05, 0.16, 2, 8), schuhe, 'schuh', 0, -UNTERSCHENKEL - 0.04, -0.05)
    schuh.rotation.x = Math.PI / 2
    // Nach dem Kippen liegt die Kapsel laengs; flach druecken (lokal z ist jetzt oben).
    schuh.scale.set(breit, 1, 0.8)
    knie.add(schuh)
    huefte.add(knie)
    innen.add(huefte)
    return { huefte, knie }
  }
  const beinL = bein(-1)
  const beinR = bein(1)

  // Alles ab der Huefte aufwaerts haengt an der Brust (Atmen, Vorbeugen).
  const brust = gelenk('brust', 0, HUEFTE_Y)
  innen.add(brust)
  const rumpf = teil(new CapsuleGeometry(0.15, 0.28, 4, 12), oben, 'rumpf', 0, 1.21 - HUEFTE_Y, 0)
  rumpf.scale.set(1.15 * breit, 1, 0.68 * breit)
  brust.add(rumpf)
  brust.add(teil(new CylinderGeometry(0.045, 0.05, 0.1, 8, 1, true), haut, 'hals', 0, 1.51 - HUEFTE_Y, 0))

  // Arme: Schulter, Oberarm (Aermel), Ellbogen, Unterarm, Hand.
  const arm = (seite: 1 | -1) => {
    const schulter = gelenk(seite > 0 ? 'schulter-r' : 'schulter-l', seite * SCHULTER_X * breit, SCHULTER_Y - HUEFTE_Y)
    schulter.add(glied(OBERARM, 0.05, oben, 'oberarm'))
    const ellbogen = gelenk(seite > 0 ? 'ellbogen-r' : 'ellbogen-l', 0, -OBERARM)
    ellbogen.add(glied(UNTERARM, 0.042, haut, 'unterarm'))
    ellbogen.add(teil(new SphereGeometry(0.046, 8, 6), haut, 'hand', 0, -UNTERARM - 0.02, 0))
    schulter.add(ellbogen)
    brust.add(schulter)
    return { schulter, ellbogen }
  }
  const armL = arm(-1)
  const armR = arm(1)

  // Kopf mit Gesicht.
  const kopf = gelenk('kopf', 0, KOPF_Y - HUEFTE_Y)
  brust.add(kopf)
  kopf.add(teil(new SphereGeometry(KOPF_R, 14, 10), haut, 'kopfkugel'))
  const augeY = AUGE_Y - KOPF_Y
  const augeGeo = new SphereGeometry(0.017, 6, 4)
  for (const seite of [-1, 1]) {
    kopf.add(teil(augeGeo, AUGENFARBE, 'auge', seite * AUGE_X, augeY, -AUGE_Z))
    const ohr = teil(new SphereGeometry(0.03, 6, 4), haut, 'ohr', seite * (KOPF_R - 0.006), 0.0, 0.005)
    ohr.scale.set(0.55, 1, 0.8)
    kopf.add(ohr)
  }
  kopf.add(teil(new SphereGeometry(0.019, 6, 4), haut, 'nase', 0, -0.012, -(KOPF_R - 0.002)))
  // Laecheln: halber Ring, Bogen nach unten.
  const mund = teil(new TorusGeometry(0.024, 0.0055, 4, 8, Math.PI), MUNDFARBE, 'mund', 0, -0.036, -0.111)
  mund.rotation.z = Math.PI
  kopf.add(mund)

  haareBauen(kopf, haarform, haare, teil)
  if (sauber?.brille) brilleBauen(kopf, augeY, teil)

  const schild = namensSchild(name)
  if (schild) gruppe.add(schild)

  const glieder: Glieder = {
    innen,
    brust,
    huefteL: beinL.huefte,
    huefteR: beinR.huefte,
    knieL: beinL.knie,
    knieR: beinR.knie,
    schulterL: armL.schulter,
    schulterR: armR.schulter,
    ellbogenL: armL.ellbogen,
    ellbogenR: armR.ellbogen,
  }

  const auge = (h: Haltung): number => {
    if (h === 'sitz') return SITZ_AUGE * s
    if (h === 'liegen') return LIEGEN_AUGE
    return AUGE_Y * s
  }

  let frei = false
  const figur: Figur3D = {
    gruppe,
    pose(haltung, tempo, zeit) {
      if (frei) return
      stellen(glieder, haltung, Number.isFinite(tempo) ? tempo : 0, Number.isFinite(zeit) ? zeit : 0, s)
      if (schild) {
        // Ueber dem Kopf, liegend ueber dem Gesicht.
        if (haltung === 'liegen') schild.position.set(0, LIEGEN_AUGE + 0.35, 0)
        else schild.position.set(0, auge(haltung) + (KOPF_Y + KOPF_R - AUGE_Y) * s + 0.2, 0)
      }
    },
    auge,
    dispose() {
      if (frei) return
      frei = true
      const geos = new Set<BufferGeometry>()
      const alle = new Set<Material>()
      gruppe.traverse((o: Object3D) => {
        if (o instanceof Mesh) {
          geos.add(o.geometry as BufferGeometry)
          const m = o.material as Material | Material[]
          for (const x of Array.isArray(m) ? m : [m]) alle.add(x)
        } else if (o instanceof Sprite) {
          o.material.map?.dispose()
          alle.add(o.material)
          // Die Sprite-Geometrie teilen sich alle Sprites in three, sie bleibt.
        }
      })
      geos.forEach((g) => g.dispose())
      alle.forEach((m) => m.dispose())
      mats.clear()
      gruppe.clear()
    },
  }
  figur.pose('stehen', 0, 0)
  return figur
}

type TeilBauer = (geo: BufferGeometry, farbe: string, bez: string, x?: number, y?: number, z?: number) => Mesh

/** Kappe aus einem Stueck Kugel: oben (ganzer Umfang) oder hinten
 *  (halber Umfang, phi 0 bis pi liegt auf +z, also am Hinterkopf). */
function kappe(r: number, hinten: boolean, theta: number, breiteSeg: number): SphereGeometry {
  return hinten
    ? new SphereGeometry(r, breiteSeg, 6, 0, Math.PI, 0, theta)
    : new SphereGeometry(r, breiteSeg, 6, 0, Math.PI * 2, 0, theta)
}

function haareBauen(kopf: Group, form: Avatar3D['haarform'], farbe: string, teil: TeilBauer): void {
  if (form === 'glatze') return
  if (form === 'locken') {
    // Grundkappe, darauf kleine Kugeln oben und am Hinterkopf.
    kopf.add(teil(kappe(KOPF_R * 1.04, false, 1.2, 14), farbe, 'haare'))
    const ringe: [number, number, number, number][] = [
      // theta, Anzahl, phi Anfang, phi Breite
      [0.3, 4, 0, Math.PI * 2],
      [0.85, 7, 0, Math.PI * 2],
      [1.45, 6, 0.15, Math.PI - 0.3],
    ]
    const locke = new SphereGeometry(0.046, 6, 4)
    for (const [theta, n, phi0, breite] of ringe) {
      const voll = breite >= Math.PI * 2 - 1e-6
      for (let i = 0; i < n; i++) {
        const phi = phi0 + (voll ? (i / n) * breite : (i / (n - 1)) * breite)
        const r = KOPF_R * 1.02
        const x = -r * Math.cos(phi) * Math.sin(theta)
        const y = r * Math.cos(theta)
        const z = r * Math.sin(phi) * Math.sin(theta)
        kopf.add(teil(locke, farbe, 'locke', x, y, z))
      }
    }
    return
  }
  // kurz, lang und zopf beginnen gleich: Kappe oben, Kappe hinten.
  kopf.add(teil(kappe(KOPF_R * 1.07, false, 1.15, 16), farbe, 'haare'))
  kopf.add(teil(kappe(KOPF_R * 1.06, true, form === 'lang' ? 2.3 : 2.0, 12), farbe, 'haare'))
  if (form === 'lang') {
    // Fallendes Haar hinten bis auf die Schultern.
    const fall = teil(new CapsuleGeometry(0.09, 0.14, 2, 10), farbe, 'haare', 0, -0.12, 0.1)
    fall.scale.set(1.25, 1, 0.5)
    kopf.add(fall)
  } else if (form === 'zopf') {
    kopf.add(teil(new SphereGeometry(0.03, 6, 4), farbe, 'haare', 0, 0.02, KOPF_R + 0.015))
    const zopf = teil(new CapsuleGeometry(0.038, 0.16, 2, 8), farbe, 'haare', 0, -0.08, KOPF_R + 0.05)
    zopf.rotation.x = -0.35
    kopf.add(zopf)
  }
}

function brilleBauen(kopf: Group, augeY: number, teil: TeilBauer): void {
  const z = -(AUGE_Z + 0.024)
  const ring = new TorusGeometry(0.03, 0.005, 4, 12)
  const steg = new BoxGeometry(0.026, 0.006, 0.006)
  const buegel = new BoxGeometry(0.006, 0.006, 0.12)
  kopf.add(teil(steg, BRILLENFARBE, 'brille', 0, augeY, z))
  for (const seite of [-1, 1]) {
    kopf.add(teil(ring, BRILLENFARBE, 'brille', seite * AUGE_X, augeY, z))
    // Kurzes Stueck vom Glas zur Seite, dann der Buegel nach hinten.
    kopf.add(teil(steg, BRILLENFARBE, 'brille', seite * (AUGE_X + 0.042), augeY, z))
    kopf.add(teil(buegel, BRILLENFARBE, 'brille', seite * 0.104, augeY, z + 0.06))
  }
}

/* ---------------------------------------------------------- Pose */

/** Setzt die Glieder fuer Haltung, Tempo und Zeit. Alles absolut, nichts
 *  wird aufaddiert: dieselben Werte geben dieselbe Pose. */
function stellen(g: Glieder, haltung: Haltung, tempo: number, zeit: number, s: number): void {
  const { innen, brust } = g
  innen.position.set(0, 0, 0)
  innen.rotation.set(0, 0, 0)
  brust.position.set(0, HUEFTE_Y, 0)
  brust.rotation.set(0, 0, 0)
  for (const j of [g.huefteL, g.huefteR, g.knieL, g.knieR, g.schulterL, g.schulterR, g.ellbogenL, g.ellbogenR]) {
    j.rotation.set(0, 0, 0)
  }
  // Arme haengen leicht nach aussen (+x ist rechts, -x links).
  g.schulterR.rotation.z = 0.07
  g.schulterL.rotation.z = -0.07
  g.ellbogenL.rotation.x = 0.12
  g.ellbogenR.rotation.x = 0.12

  // Ruhiges Atmen, alle vier Sekunden.
  const atem = Math.sin(zeit * Math.PI * 0.5)

  if (haltung === 'liegen') {
    // Auf dem Ruecken: Kopf ueber dem Ursprung, Fuesse nach -z, Gesicht
    // nach oben. Die Augen liegen 0,2 m ueber der Flaeche.
    innen.rotation.x = Math.PI / 2
    innen.position.set(0, LIEGEN_AUGE - AUGE_Z * s, -KOPF_Y * s)
    g.schulterR.rotation.z = 0.12
    g.schulterL.rotation.z = -0.12
    return
  }

  if (haltung === 'sitz') {
    innen.position.y = (SITZ_HUEFTE - HUEFTE_Y) * s
    g.huefteL.rotation.x = Math.PI / 2
    g.huefteR.rotation.x = Math.PI / 2
    g.knieL.rotation.x = -Math.PI / 2
    g.knieR.rotation.x = -Math.PI / 2
    // Haende neben und auf den Oberschenkeln.
    g.schulterR.rotation.z = 0.02
    g.schulterL.rotation.z = -0.02
    g.schulterL.rotation.x = 0.2
    g.schulterR.rotation.x = 0.2
    g.ellbogenL.rotation.x = 0.95
    g.ellbogenR.rotation.x = 0.95
    brust.position.y = HUEFTE_Y + 0.003 * atem
    return
  }

  const v = Math.min(2, Math.max(0, tempo))
  if (v < 0.05) {
    // Stehen: nur Atmen und ein Hauch Bewegung in den Armen.
    brust.position.y = HUEFTE_Y + 0.003 * atem
    g.schulterR.rotation.z = 0.07 + 0.015 * atem
    g.schulterL.rotation.z = -0.07 - 0.015 * atem
    return
  }

  // Gehen und Rennen: Beine und Arme gegengleich, Knie beugen sich, wenn
  // das Bein nach vorn schwingt. Schneller heisst oefter und weiter.
  const takt = 0.55 + 0.45 * v
  const phi = zeit * Math.PI * 2 * takt
  const weite = 0.42 * Math.min(1, v) + 0.18 * Math.max(0, v - 1)
  const sin = Math.sin(phi)
  const cos = Math.cos(phi)
  g.huefteL.rotation.x = weite * sin
  g.huefteR.rotation.x = -weite * sin
  g.knieL.rotation.x = -1.3 * weite * Math.max(0, cos)
  g.knieR.rotation.x = -1.3 * weite * Math.max(0, -cos)
  g.schulterL.rotation.x = -0.9 * weite * sin
  g.schulterR.rotation.x = 0.9 * weite * sin
  const beuge = 0.2 + 0.6 * weite + 0.4 * Math.max(0, v - 1)
  g.ellbogenL.rotation.x = beuge
  g.ellbogenR.rotation.x = beuge
  // Beim Rennen leicht vorgebeugt (negativ kippt nach -z, also nach vorn).
  brust.rotation.x = -0.12 * Math.max(0, v - 1)
  // Mit gespreizten Beinen sinkt die Huefte, so bleibt der Fuss am Boden.
  innen.position.y = -(OBERSCHENKEL + UNTERSCHENKEL) * (1 - Math.cos(weite * Math.abs(sin))) * s
}
