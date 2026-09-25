/* Reine Operationen auf dem Dokument des Zeichners (GrundrissDaten).
 *
 * Jede Funktion bekommt ein Dokument und gibt ein neues zurueck, ohne das
 * alte anzufassen: so kann der Verlauf (Rueckgaengig) die alten Staende
 * einfach aufheben, und die Pruefung (scripts/zeichner-pruefen.mjs) laeuft
 * ohne Browser.
 *
 * Kisten stehen im Dokument nur zur Anzeige. Ihre Plaetze setzt der
 * Zeichner nie ueber das Dokument, sondern ueber platz_setzen; wird ein
 * Raum oder ein Moebel verschoben, rechnet das Dokument sie nur mit, damit
 * sie nicht zurueckbleiben, bis die Antwort der Datenbank kommt.
 */
import {
  flaeche2,
  objektEnthaelt,
  objektGlobal,
  objektRechtecke,
  polygonFehler,
  punktImPolygon,
  punktLage,
  rechteckImPolygon,
  zuUmriss,
  type Drehung,
  type ObjektForm,
  type PolygonFehler,
  type Punkt,
} from '../lib/geometrie.ts'
import { oeffnungPunkte, stapelWurzel } from '../components/plan/hilfe.ts'
import type { GrundrissDaten, Objekt, Oeffnung, PlanKiste, Raum } from '../lib/types'

export type Dok = GrundrissDaten

export type Auswahl =
  | { art: 'raum'; id: string }
  | { art: 'kante'; raumId: string; kante: number }
  | { art: 'ecke'; raumId: string; ecke: number }
  | { art: 'oeffnung'; id: string }
  | { art: 'objekt'; id: string }
  | { art: 'kiste'; id: string }
  | null

/* ------------------------------------------------------------ Kleinkram */

export function gleichPunkt(a: Punkt, b: Punkt, tol = 0.01): boolean {
  return Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol
}

function rund(p: Punkt): Punkt {
  return [Math.round(p[0]), Math.round(p[1])]
}

/** Aufeinanderfolgende doppelte Punkte weg (auch letzter gegen ersten). */
export function ohneDoppelte(p: Punkt[]): Punkt[] {
  const out: Punkt[] = []
  for (const q of p) if (!out.length || !gleichPunkt(out[out.length - 1], q)) out.push(q)
  while (out.length > 1 && gleichPunkt(out[0], out[out.length - 1])) out.pop()
  return out
}

/** Punkte, die genau auf der Geraden ihrer Nachbarn liegen und in
 *  dieselbe Richtung weiterlaufen, sind keine Ecke. */
export function ohneGeradeEcken(p: Punkt[]): Punkt[] {
  let out = p.slice()
  let geaendert = true
  while (geaendert && out.length > 3) {
    geaendert = false
    for (let i = 0; i < out.length; i++) {
      const a = out[(i + out.length - 1) % out.length]
      const b = out[i]
      const c = out[(i + 1) % out.length]
      const kreuz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
      const vor = (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1])
      if (kreuz === 0 && vor > 0) {
        out = out.filter((_, j) => j !== i)
        geaendert = true
        break
      }
    }
  }
  return out
}

export function raumVon(dok: Dok, id: string): Raum | undefined {
  return dok.raeume.find((r) => r.id === id)
}

/** Liegt die Strecke a-b (bis auf tol cm) auf einer Kante des Umrisses?
 *  Dann Kante und die Anteile entlang der Kante in cm. */
export function aufKante(
  punkte: Punkt[],
  a: Punkt,
  b: Punkt,
  tol = 0.75,
): { kante: number; t0: number; t1: number } | null {
  const n = punkte.length
  for (let k = 0; k < n; k++) {
    const p = punkte[k]
    const q = punkte[(k + 1) % n]
    const l = Math.hypot(q[0] - p[0], q[1] - p[1])
    if (l === 0) continue
    const rx = (q[0] - p[0]) / l
    const ry = (q[1] - p[1]) / l
    const da = Math.abs(rx * (a[1] - p[1]) - ry * (a[0] - p[0]))
    const db = Math.abs(rx * (b[1] - p[1]) - ry * (b[0] - p[0]))
    if (da > tol || db > tol) continue
    const ta = rx * (a[0] - p[0]) + ry * (a[1] - p[1])
    const tb = rx * (b[0] - p[0]) + ry * (b[1] - p[1])
    if (Math.min(ta, tb) < -tol || Math.max(ta, tb) > l + tol) continue
    return { kante: k, t0: Math.min(ta, tb), t1: Math.max(ta, tb) }
  }
  return null
}

/** Tueren und Fenster eines Raums nach einer Aenderung des Umrisses neu
 *  zuordnen: jede Oeffnung sucht die Kante (auch in einem anderen der
 *  Ziel-Umrisse), auf der sie liegt. Findet sie keine, faellt sie weg. */
export function oeffnungenUmhaengen(
  altPunkte: Punkt[],
  ziele: { id: string; punkte: Punkt[] }[],
  oeffnungen: Oeffnung[],
): Oeffnung[] {
  const out: Oeffnung[] = []
  for (const o of oeffnungen) {
    const s = oeffnungPunkte({ punkte: altPunkte }, o)
    if (!s) continue
    for (const z of ziele) {
      const hit = aufKante(z.punkte, s[0], s[1])
      if (hit) {
        out.push({ ...o, raum_id: z.id, kante: hit.kante, abstand_cm: Math.max(0, Math.round(hit.t0)) })
        break
      }
    }
  }
  return out
}

/** Wandfarben je Kante auf einen neuen Umriss uebertragen: eine neue Kante
 *  erbt die Farbe der alten Kante, auf der sie ganz liegt. */
export function wandfarbenUmhaengen(
  altPunkte: Punkt[],
  alt: (string | null)[] | null,
  neuPunkte: Punkt[],
): (string | null)[] | null {
  if (!alt || alt.every((f) => !f)) return null
  const n = neuPunkte.length
  const out: (string | null)[] = []
  for (let k = 0; k < n; k++) {
    const hit = aufKante(altPunkte, neuPunkte[k], neuPunkte[(k + 1) % n])
    out.push(hit ? (alt[hit.kante] ?? null) : null)
  }
  return out.every((f) => !f) ? null : out
}

/** Einen Raum mit neuem Umriss ersetzen und Tueren, Fenster und Wandfarben
 *  mitnehmen (ueber die Kanten, nicht ueber die Nummern). */
function umrissErsetzen(dok: Dok, raumId: string, punkte: Punkt[]): Dok {
  const r = raumVon(dok, raumId)
  if (!r) return dok
  const eigene = dok.oeffnungen.filter((o) => o.raum_id === raumId)
  const neu = oeffnungenUmhaengen(r.punkte, [{ id: raumId, punkte }], eigene)
  return {
    ...dok,
    raeume: dok.raeume.map((x) =>
      x.id === raumId ? { ...x, punkte, wandfarben: wandfarbenUmhaengen(r.punkte, r.wandfarben, punkte) } : x,
    ),
    oeffnungen: [...dok.oeffnungen.filter((o) => o.raum_id !== raumId), ...neu],
  }
}

/** Jeder Raum im Uhrzeigersinn (so will es die Datenbank); gegen den
 *  Uhrzeigersinn gezeichnete werden umgedreht, Oeffnungen und
 *  Wandfarben ziehen mit. */
export function dokRichten(dok: Dok): Dok {
  let out = dok
  for (const r of dok.raeume) {
    if (r.punkte.length < 3 || flaeche2(zuUmriss(r.punkte)) >= 0) continue
    const umgekehrt: Punkt[] = [r.punkte[0]]
    for (let i = r.punkte.length - 1; i >= 1; i--) umgekehrt.push(r.punkte[i])
    out = umrissErsetzen(out, r.id, umgekehrt)
  }
  return out
}

/* ---------------------------------------------------------------- Raum */

export function neuerRaum(dok: Dok, id: string, punkte: Punkt[]): Raum {
  return {
    id,
    grundriss_id: dok.grundriss.id,
    project_id: dok.grundriss.project_id,
    tag_id: null,
    name: '',
    art: 'innen',
    punkte,
    hoehe_cm: 250,
    bodenfarbe: null,
    wandfarben: null,
    sort: dok.raeume.reduce((m, r) => Math.max(m, r.sort), -1) + 1,
    tag_name: null,
    tag_short: null,
    tag_color: null,
  }
}

/** Einen neuen Raum anlegen. Gegen den Uhrzeigersinn gezeichnet wird
 *  umgedreht; ein ungueltiger Umriss liefert die Kennung des Fehlers. */
export function raumAnlegen(
  dok: Dok,
  id: string,
  punkte: Punkt[],
): { dok: Dok; fehler: null } | { dok: null; fehler: PolygonFehler } {
  let p = ohneGeradeEcken(ohneDoppelte(punkte.map(rund)))
  if (p.length >= 3 && flaeche2(zuUmriss(p)) < 0) {
    const u: Punkt[] = [p[0]]
    for (let i = p.length - 1; i >= 1; i--) u.push(p[i])
    p = u
  }
  const f = polygonFehler(zuUmriss(p))
  if (f) return { dok: null, fehler: f }
  return { dok: { ...dok, raeume: [...dok.raeume, neuerRaum(dok, id, p)] }, fehler: null }
}

/** Raum samt Moebeln und Kisten verschieben (Tueren und Fenster haengen an
 *  den Kanten und fahren von selbst mit). */
export function raumVerschieben(dok: Dok, raumId: string, dx: number, dy: number): Dok {
  if (dx === 0 && dy === 0) return dok
  return {
    ...dok,
    raeume: dok.raeume.map((r) =>
      r.id === raumId ? { ...r, punkte: r.punkte.map(([x, y]) => [x + dx, y + dy] as Punkt) } : r,
    ),
    objekte: dok.objekte.map((o) => (o.raum_id === raumId ? { ...o, x: o.x + dx, y: o.y + dy } : o)),
    kisten: dok.kisten.map((k) =>
      k.platz_raum_id === raumId ? { ...k, platz_x: k.platz_x + dx, platz_y: k.platz_y + dy } : k,
    ),
  }
}

/** Sind alle Ecken um dasselbe (dx, dy) gewandert? Dann ist es eine reine
 *  Verschiebung (die Datenbank nimmt Moebel und Kisten mit). */
export function verschiebung(alt: Pick<Raum, 'punkte'>, neu: Pick<Raum, 'punkte'>): [number, number] | null {
  if (alt.punkte.length !== neu.punkte.length || alt.punkte.length === 0) return null
  const dx = neu.punkte[0][0] - alt.punkte[0][0]
  const dy = neu.punkte[0][1] - alt.punkte[0][1]
  if (dx === 0 && dy === 0) return null
  for (let i = 0; i < alt.punkte.length; i++) {
    if (neu.punkte[i][0] - alt.punkte[i][0] !== dx || neu.punkte[i][1] - alt.punkte[i][1] !== dy) return null
  }
  return [dx, dy]
}

/** Rueckgaengig und Wiederholen: der Stand aus dem Verlauf mit den
 *  jetzigen Kisten. Kisten stehen nicht im Verlauf (ihren Platz setzt nur
 *  platz_setzen), sie werden hier nur so mitgerechnet, wie es die
 *  Datenbank beim Speichern tut:
 *  - ein Raum, der nur verschoben zurueckspringt, nimmt seine Kisten mit;
 *  - ein Moebel, das zurueckspringt, nimmt mit, was darauf und darin steht;
 *  - eine Kiste, deren Raum es im Ziel nicht gibt (Teilen rueckgaengig)
 *    oder die im Ziel in einem neuen Raum steht (Teilen wiederholen),
 *    bekommt den Raum aus dem Ziel. */
export function verlaufZiel(akt: Dok, ziel: Dok): Dok {
  let d = akt
  for (const r of ziel.raeume) {
    const a = raumVon(akt, r.id)
    const v = a ? verschiebung(a, r) : null
    if (v) d = raumVerschieben(d, r.id, v[0], v[1])
  }
  for (const o of ziel.objekte) {
    const a = d.objekte.find((x) => x.id === o.id)
    if (a && (a.x !== o.x || a.y !== o.y || a.drehung !== o.drehung || a.raum_id !== o.raum_id)) d = objektSetzen(d, o)
  }
  const imZiel = new Set(ziel.raeume.map((r) => r.id))
  const jetzt = new Set(akt.raeume.map((r) => r.id))
  const zielKiste = new Map(ziel.kisten.map((k) => [k.id, k]))
  const kisten = d.kisten.map((k) => {
    const zk = zielKiste.get(k.id)
    if (!zk || zk.platz_raum_id === k.platz_raum_id || !imZiel.has(zk.platz_raum_id)) return k
    if (imZiel.has(k.platz_raum_id) && jetzt.has(zk.platz_raum_id)) return k
    return { ...k, platz_raum_id: zk.platz_raum_id }
  })
  return { ...ziel, kisten }
}

export function eckeVerschieben(dok: Dok, raumId: string, ecke: number, p: Punkt): Dok {
  return {
    ...dok,
    raeume: dok.raeume.map((r) =>
      r.id === raumId ? { ...r, punkte: r.punkte.map((q, i) => (i === ecke ? rund(p) : q)) } : r,
    ),
  }
}

/** Kante k parallel verschieben: beide Ecken um denselben Weg entlang der
 *  Normalen. d in cm, positiv nach innen. */
export function kanteVerschieben(dok: Dok, raumId: string, kante: number, d: number): Dok {
  const r = raumVon(dok, raumId)
  if (!r || d === 0) return dok
  const n = r.punkte.length
  const a = r.punkte[kante]
  const b = r.punkte[(kante + 1) % n]
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const nx = -(b[1] - a[1]) / l
  const ny = (b[0] - a[0]) / l
  const verschub = (q: Punkt): Punkt => rund([q[0] + nx * d, q[1] + ny * d])
  return {
    ...dok,
    raeume: dok.raeume.map((x) =>
      x.id === raumId
        ? { ...x, punkte: x.punkte.map((q, i) => (i === kante || i === (kante + 1) % n ? verschub(q) : q)) }
        : x,
    ),
  }
}

/** Eine Ecke auf Kante k einfuegen (Doppelklick). p wird auf die Kante
 *  gelegt und gerundet. */
export function eckeEinfuegen(dok: Dok, raumId: string, kante: number, p: Punkt): Dok | null {
  const r = raumVon(dok, raumId)
  if (!r || r.punkte.length >= 200) return null
  const q = rund(p)
  const n = r.punkte.length
  if (gleichPunkt(q, r.punkte[kante]) || gleichPunkt(q, r.punkte[(kante + 1) % n])) return null
  const punkte = [...r.punkte.slice(0, kante + 1), q, ...r.punkte.slice(kante + 1)]
  return umrissErsetzen(dok, raumId, punkte)
}

/** Eine Ecke entfernen (Doppelklick auf die Ecke). Mindestens drei Ecken
 *  bleiben. */
export function eckeEntfernen(dok: Dok, raumId: string, ecke: number): Dok | null {
  const r = raumVon(dok, raumId)
  if (!r || r.punkte.length <= 3) return null
  const punkte = r.punkte.filter((_, i) => i !== ecke)
  if (polygonFehler(zuUmriss(punkte))) return null
  return umrissErsetzen(dok, raumId, punkte)
}

/** Laenge von Kante k setzen. Bei einer geraden Wand (waagrecht oder
 *  senkrecht) rueckt alles jenseits ihres Endes mit, so bleibt ein
 *  Rechteck ein Rechteck. Schraege Wand: nur ihr Endpunkt rueckt. */
export function kanteLaengeSetzen(dok: Dok, raumId: string, kante: number, laenge: number): Dok | null {
  const r = raumVon(dok, raumId)
  if (!r || laenge < 1) return null
  const n = r.punkte.length
  const a = r.punkte[kante]
  const b = r.punkte[(kante + 1) % n]
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const alt = Math.hypot(dx, dy)
  if (alt === 0) return null
  const delta = laenge - alt
  let punkte: Punkt[]
  if (dy === 0 || dx === 0) {
    const achse = dy === 0 ? 0 : 1
    const s = Math.sign(achse === 0 ? dx : dy)
    const grenze = b[achse]
    punkte = r.punkte.map((q) => {
      if ((q[achse] - grenze) * s < 0) return q
      const neu: Punkt = [q[0], q[1]]
      neu[achse] = Math.round(q[achse] + s * delta)
      return neu
    })
  } else {
    punkte = r.punkte.map((q, i) =>
      i === (kante + 1) % n ? rund([a[0] + (dx / alt) * laenge, a[1] + (dy / alt) * laenge]) : q,
    )
  }
  if (polygonFehler(zuUmriss(punkte))) return null
  return { ...dok, raeume: dok.raeume.map((x) => (x.id === raumId ? { ...x, punkte } : x)) }
}

export function raumAendern(dok: Dok, raumId: string, werte: Partial<Raum>): Dok {
  return { ...dok, raeume: dok.raeume.map((r) => (r.id === raumId ? { ...r, ...werte } : r)) }
}

/* -------------------------------------------------------------- Teilen */

interface Schnitt {
  t: number
  kante: number
  p: Punkt
}

/** Einen Raum entlang der Geraden durch a und b teilen. Der groessere Teil
 *  behaelt Id, Zimmer und Namen; Tueren, Fenster, Wandfarben, Moebel und
 *  Kisten gehen an den Teil, in dem sie liegen. */
export function raumTeilen(
  dok: Dok,
  a: Punkt,
  b: Punkt,
  neueId: string,
): { dok: Dok; neuId: string; altId: string } | { fehler: string } {
  const lx = b[0] - a[0]
  const ly = b[1] - a[1]
  const ll = Math.hypot(lx, ly)
  if (ll < 1) return { fehler: 'zeichner.teilen_zu_kurz' }
  const mitte: Punkt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const raum =
    dok.raeume.find((r) => punktLage(zuUmriss(r.punkte), mitte[0], mitte[1]) === 1) ??
    dok.raeume.find((r) => punktImPolygon(zuUmriss(r.punkte), Math.round(mitte[0]), Math.round(mitte[1])))
  if (!raum) return { fehler: 'zeichner.teilen_kein_raum' }
  const p = raum.punkte
  const n = p.length
  const schnitte: Schnitt[] = []
  for (let k = 0; k < n; k++) {
    const s = p[k]
    const e = p[(k + 1) % n]
    const ex = e[0] - s[0]
    const ey = e[1] - s[1]
    const nenner = lx * ey - ly * ex
    if (nenner === 0) continue // parallel
    const t = ((s[0] - a[0]) * ey - (s[1] - a[1]) * ex) / nenner
    const u = ((s[0] - a[0]) * ly - (s[1] - a[1]) * lx) / nenner
    if (u < -1e-9 || u > 1 + 1e-9) continue
    if (u > 1 - 1e-9) continue // Endpunkt zaehlt als Anfang der naechsten Kante
    schnitte.push({ t, kante: k, p: [s[0] + u * ex, s[1] + u * ey] })
  }
  schnitte.sort((x, y) => x.t - y.t)
  const tm = 0.5
  let von: Schnitt | null = null
  let bis: Schnitt | null = null
  for (let i = 0; i + 1 < schnitte.length; i++) {
    if (schnitte[i].t <= tm && schnitte[i + 1].t >= tm) {
      von = schnitte[i]
      bis = schnitte[i + 1]
      break
    }
  }
  if (!von || !bis || gleichPunkt(von.p, bis.p, 0.5)) return { fehler: 'zeichner.teilen_quer' }
  const A = rund(von.p)
  const B = rund(bis.p)
  const kette = (start: number, ende: number): Punkt[] => {
    const out: Punkt[] = []
    for (let i = (start + 1) % n; ; i = (i + 1) % n) {
      out.push(p[i])
      if (i === ende) break
    }
    return out
  }
  const teil1 = ohneGeradeEcken(ohneDoppelte([A, ...kette(von.kante, bis.kante), B]))
  const teil2 = ohneGeradeEcken(ohneDoppelte([B, ...kette(bis.kante, von.kante), A]))
  for (const t of [teil1, teil2]) {
    if (polygonFehler(zuUmriss(t)) !== null) return { fehler: 'zeichner.teilen_ungueltig' }
  }
  const [gross, klein] = flaeche2(zuUmriss(teil1)) >= flaeche2(zuUmriss(teil2)) ? [teil1, teil2] : [teil2, teil1]

  const alt = raum
  const neuRaum: Raum = {
    ...neuerRaum(dok, neueId, klein),
    art: alt.art,
    hoehe_cm: alt.hoehe_cm,
    bodenfarbe: alt.bodenfarbe,
    wandfarben: wandfarbenUmhaengen(alt.punkte, alt.wandfarben, klein),
  }
  const bleibt: Raum = { ...alt, punkte: gross, wandfarben: wandfarbenUmhaengen(alt.punkte, alt.wandfarben, gross) }

  const eigene = dok.oeffnungen.filter((o) => o.raum_id === alt.id)
  const oeffnungen = oeffnungenUmhaengen(
    alt.punkte,
    [
      { id: alt.id, punkte: gross },
      { id: neueId, punkte: klein },
    ],
    eigene,
  )

  const uKlein = zuUmriss(klein)
  const umziehen = new Set<string>()
  const objekte = dok.objekte.map((o) => {
    if (o.raum_id !== alt.id) return o
    if (objektRechtecke(o).every((q) => rechteckImPolygon(uKlein, q))) {
      umziehen.add(o.id)
      return { ...o, raum_id: neueId }
    }
    return o
  })
  const uGross = zuUmriss(gross)
  const kisten = dok.kisten.map((k) => {
    if (k.platz_raum_id !== alt.id) return k
    const w = stapelWurzel(k, dok.kisten)
    const aufObjekt = (w.unterlage_art === 'objekt' || w.unterlage_art === 'fach') && w.unterlage_objekt_id
    if (aufObjekt) return umziehen.has(w.unterlage_objekt_id as string) ? { ...k, platz_raum_id: neueId } : k
    if (
      punktImPolygon(uKlein, w.platz_x, w.platz_y) &&
      !punktImPolygon(uGross, w.platz_x, w.platz_y)
    ) {
      return { ...k, platz_raum_id: neueId }
    }
    return k
  })

  return {
    dok: {
      ...dok,
      raeume: [...dok.raeume.map((r) => (r.id === alt.id ? bleibt : r)), neuRaum],
      oeffnungen: [...dok.oeffnungen.filter((o) => o.raum_id !== alt.id), ...oeffnungen],
      objekte,
      kisten,
    },
    neuId: neueId,
    altId: alt.id,
  }
}

/* -------------------------------------------------------------- Objekte */

export interface Vorlage {
  schluessel: string
  art: Objekt['art']
  name: string
  breite_cm: number
  tiefe_cm: number
  hoehe_cm: number
  form: 'rechteck' | 'l'
  ausschnitt_breite_cm: number | null
  ausschnitt_tiefe_cm: number | null
  ausschnitt_ecke: Objekt['ausschnitt_ecke']
  brett_cm: number[] | null
  spalten: number
}

/** Rahmen eines Objekts (bei L der umfassende). */
export function objektBox(o: ObjektForm): { x0: number; y0: number; x1: number; y1: number } {
  const a = objektGlobal(o, 0, 0)
  const b = objektGlobal(o, o.breite_cm, o.tiefe_cm)
  return { x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) }
}

/** x und y so, dass der Rahmen des gedrehten Objekts um mitte liegt. */
export function objektUm(form: Omit<ObjektForm, 'x' | 'y'>, mitte: Punkt): { x: number; y: number } {
  const probe = objektBox({ ...form, x: 0, y: 0 })
  const cx = (probe.x0 + probe.x1) / 2
  const cy = (probe.y0 + probe.y1) / 2
  return { x: Math.round(mitte[0] - cx), y: Math.round(mitte[1] - cy) }
}

/** Um 90 Grad drehen (richtung 1 im Uhrzeigersinn, -1 dagegen), auf der
 *  Stelle: die Mitte des Rahmens bleibt. */
export function objektGedreht<T extends ObjektForm>(o: T, richtung: 1 | -1): T {
  const box = objektBox(o)
  const mitte: Punkt = [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2]
  const drehung = ((((o.drehung + 90 * richtung) % 360) + 360) % 360) as Drehung
  const pos = objektUm({ ...o, drehung }, mitte)
  return { ...o, drehung, ...pos }
}

/** Passt das Objekt in diesen Raum (ganz drin, nicht hoeher)? */
export function objektPasst(o: ObjektForm, raum: Pick<Raum, 'punkte' | 'hoehe_cm'>): boolean {
  const u = zuUmriss(raum.punkte)
  return o.hoehe_cm <= raum.hoehe_cm && objektRechtecke(o).every((q) => rechteckImPolygon(u, q))
}

/** Der Raum, in dessen Innerem der Punkt liegt (Rand zaehlt). */
export function raumAn(dok: Pick<Dok, 'raeume'>, p: Punkt): Raum | null {
  return (
    dok.raeume.find((r) => punktLage(zuUmriss(r.punkte), p[0], p[1]) === 1) ??
    dok.raeume.find((r) => punktImPolygon(zuUmriss(r.punkte), Math.round(p[0]), Math.round(p[1]))) ??
    null
  )
}

/** Ein Objekt versetzen; was darauf oder darin steht, faehrt mit (zur
 *  Anzeige; die Datenbank macht dasselbe in objekte_nachher). */
export function objektSetzen(dok: Dok, neu: Objekt): Dok {
  const alt = dok.objekte.find((o) => o.id === neu.id)
  let kisten = dok.kisten
  if (alt && (alt.x !== neu.x || alt.y !== neu.y || alt.drehung !== neu.drehung || alt.raum_id !== neu.raum_id)) {
    kisten = dok.kisten.map((k) => {
      const w = stapelWurzel(k, dok.kisten)
      if (w.unterlage_objekt_id !== alt.id || (w.unterlage_art !== 'objekt' && w.unterlage_art !== 'fach')) return k
      const lx = lokal(alt, k.platz_x, k.platz_y)
      const g = objektGlobal(neu, lx[0], lx[1])
      const quer = ((neu.drehung - alt.drehung + 360) % 180) === 90
      return {
        ...k,
        platz_raum_id: neu.raum_id,
        platz_x: g[0],
        platz_y: g[1],
        platz_drehung: quer ? ((90 - k.platz_drehung) as 0 | 90) : k.platz_drehung,
      }
    })
  }
  const objekte = alt ? dok.objekte.map((o) => (o.id === neu.id ? neu : o)) : [...dok.objekte, neu]
  return { ...dok, objekte, kisten }
}

function lokal(o: Pick<ObjektForm, 'x' | 'y' | 'drehung'>, x: number, y: number): Punkt {
  const dx = x - o.x
  const dy = y - o.y
  switch (o.drehung) {
    case 0:
      return [dx, dy]
    case 90:
      return [dy, -dx]
    case 180:
      return [-dx, -dy]
    default:
      return [-dy, dx]
  }
}

export function neuesObjekt(v: Vorlage, id: string, raumId: string, pos: { x: number; y: number }, drehung: Drehung): Objekt {
  return {
    id,
    raum_id: raumId,
    art: v.art,
    name: v.name,
    x: pos.x,
    y: pos.y,
    breite_cm: v.breite_cm,
    tiefe_cm: v.tiefe_cm,
    hoehe_cm: v.hoehe_cm,
    drehung,
    form: v.art === 'moebel' ? v.form : 'rechteck',
    ausschnitt_breite_cm: v.art === 'moebel' && v.form === 'l' ? v.ausschnitt_breite_cm : null,
    ausschnitt_tiefe_cm: v.art === 'moebel' && v.form === 'l' ? v.ausschnitt_tiefe_cm : null,
    ausschnitt_ecke: v.art === 'moebel' && v.form === 'l' ? v.ausschnitt_ecke : null,
    brett_cm: v.art === 'moebel' ? null : v.brett_cm,
    spalten: v.art === 'moebel' ? 1 : v.spalten,
    farbe: null,
    item_id: null,
    item_code: null,
    item_title: null,
  }
}

/* ------------------------------------------------------------- Loeschen */

/** Kisten mit Platz in diesem Raum (fuer die Frage vor dem Loeschen). */
export function kistenImRaum(dok: Pick<Dok, 'kisten'>, raumId: string): PlanKiste[] {
  return dok.kisten.filter((k) => k.platz_raum_id === raumId)
}

export function loeschen(dok: Dok, a: NonNullable<Auswahl>): Dok {
  switch (a.art) {
    case 'raum':
      return {
        ...dok,
        raeume: dok.raeume.filter((r) => r.id !== a.id),
        oeffnungen: dok.oeffnungen.filter((o) => o.raum_id !== a.id),
        objekte: dok.objekte.filter((o) => o.raum_id !== a.id),
        kisten: dok.kisten.filter((k) => k.platz_raum_id !== a.id),
      }
    case 'oeffnung':
      return { ...dok, oeffnungen: dok.oeffnungen.filter((o) => o.id !== a.id) }
    case 'objekt': {
      // Was darauf oder darin stand, steht danach auf dem Boden (objekte_weg).
      const kisten = dok.kisten.map((k) =>
        k.unterlage_objekt_id === a.id
          ? { ...k, unterlage_art: 'boden' as const, unterlage_objekt_id: null, fach_ebene: null, fach_spalte: null }
          : k,
      )
      return { ...dok, objekte: dok.objekte.filter((o) => o.id !== a.id), kisten }
    }
    case 'ecke': {
      return eckeEntfernen(dok, a.raumId, a.ecke) ?? dok
    }
    default:
      return dok
  }
}

/** Gibt es das Ausgewaehlte im Dokument noch? Sonst null. */
export function auswahlPruefen(dok: Dok, a: Auswahl): Auswahl {
  if (!a) return null
  switch (a.art) {
    case 'raum':
      return raumVon(dok, a.id) ? a : null
    case 'kante':
    case 'ecke': {
      const r = raumVon(dok, a.raumId)
      const i = a.art === 'kante' ? a.kante : a.ecke
      return r && i < r.punkte.length ? a : null
    }
    case 'oeffnung':
      return dok.oeffnungen.some((o) => o.id === a.id) ? a : null
    case 'objekt':
      return dok.objekte.some((o) => o.id === a.id) ? a : null
    case 'kiste':
      return dok.kisten.some((k) => k.id === a.id) ? a : null
  }
}

/** Raeume, deren Umriss sich anders als durch reines Verschieben geaendert
 *  hat (oder die neu sind). Nur bei ihnen kann eine Kiste herausfallen. */
export function umrissGeaendert(alt: Pick<Dok, 'raeume'>, neu: Pick<Dok, 'raeume'>): Set<string> {
  const vorher = new Map(alt.raeume.map((r) => [r.id, r]))
  const out = new Set<string>()
  for (const r of neu.raeume) {
    const a = vorher.get(r.id)
    if (!a) out.add(r.id)
    else if (JSON.stringify(a.punkte) !== JSON.stringify(r.punkte) && !verschiebung(a, r)) out.add(r.id)
  }
  return out
}

/** Kisten, deren Mitte nach einer Raum-Aenderung ausserhalb laege (Codes).
 *  Die Datenbank lehnt das ohnehin ab; der Zeichner sagt es vorher.
 *  nur: nur diese Raeume pruefen (sonst alle). */
export function kistenDraussen(dok: Dok, nur?: Set<string>): string[] {
  const out: string[] = []
  for (const k of dok.kisten) {
    if (nur && !nur.has(k.platz_raum_id)) continue
    const r = raumVon(dok, k.platz_raum_id)
    if (!r) continue
    if (!punktImPolygon(zuUmriss(r.punkte), k.platz_x, k.platz_y)) out.push(k.code)
  }
  return out
}

/** Steht p auf einem Objekt? (fuer die Kiste: Objekt statt Boden) */
export function objektUnter(dok: Pick<Dok, 'objekte'>, p: Punkt): Objekt | null {
  return dok.objekte.find((o) => objektEnthaelt(o, p[0], p[1])) ?? null
}
