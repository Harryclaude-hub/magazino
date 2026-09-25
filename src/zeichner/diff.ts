/* Der Unterschied zweier Staende des Zeichners als Auftrag fuer
 * grundriss_speichern (0028).
 *
 * Die Datenbank arbeitet in dieser Reihenfolge (0031): loeschen (ohne
 * Raeume), raeume, umhaengen, verschieben, objekte, zuordnen, oeffnungen,
 * zuletzt Raeume loeschen. Daraus folgt:
 *  - Ein Raum, dessen Ecken alle um dasselbe (dx, dy) gewandert sind, geht
 *    als "verschieben" (Moebel und Kisten fahren in der Datenbank mit).
 *    Hat er sich zusaetzlich anders geaendert, steht er mit dem ALTEN
 *    Umriss unter "raeume", sonst wuerde er doppelt verschoben.
 *  - Moebel, die nur mit ihrem Raum mitgefahren sind, gehen nicht mit.
 *  - Nach dem Teilen haengt, was im neuen Raum liegt, per "zuordnen" um.
 *  - Teilen rueckgaengig: der abgeteilte Raum wird geloescht, sein Inhalt
 *    steht im Ziel wieder im alten Raum. Dann geht "umhaengen" (alles vom
 *    abgeteilten in den alten Raum) mit, damit keine Kiste ihren Platz
 *    verliert.
 * Kisten gehen sonst nie mit: ihren Platz setzt nur platz_setzen.
 */
import { umlaufRichten, zuUmriss, flaeche2 } from '../lib/geometrie.ts'
import type { GrundrissAenderung, Objekt, Oeffnung, Raum } from '../lib/types'
import { verschiebung, type Dok } from './dok.ts'

type RaumWerte = NonNullable<GrundrissAenderung['raeume']>[number]
type ObjektWerte = NonNullable<GrundrissAenderung['objekte']>[number]

function raumWerte(r: Raum): RaumWerte {
  return {
    id: r.id,
    tag_id: r.tag_id,
    name: r.name,
    art: r.art,
    punkte: r.punkte,
    hoehe_cm: r.hoehe_cm,
    bodenfarbe: r.bodenfarbe,
    wandfarben: r.wandfarben,
    sort: r.sort,
  }
}

function objektWerte(o: Objekt): ObjektWerte {
  return {
    id: o.id,
    raum_id: o.raum_id,
    art: o.art,
    name: o.name,
    x: o.x,
    y: o.y,
    breite_cm: o.breite_cm,
    tiefe_cm: o.tiefe_cm,
    hoehe_cm: o.hoehe_cm,
    drehung: o.drehung,
    form: o.form,
    ausschnitt_breite_cm: o.ausschnitt_breite_cm,
    ausschnitt_tiefe_cm: o.ausschnitt_tiefe_cm,
    ausschnitt_ecke: o.ausschnitt_ecke,
    brett_cm: o.brett_cm,
    spalten: o.spalten,
    farbe: o.farbe,
    item_id: o.item_id,
  }
}

function oeffnungWerte(o: Oeffnung): Oeffnung {
  return {
    id: o.id,
    raum_id: o.raum_id,
    art: o.art,
    kante: o.kante,
    abstand_cm: o.abstand_cm,
    breite_cm: o.breite_cm,
    hoehe_cm: o.hoehe_cm,
    bruestung_cm: o.bruestung_cm,
    anschlag: o.anschlag,
    aufschlag: o.aufschlag,
  }
}

function gleich(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Sicherheitsnetz: ein Raum gegen den Uhrzeigersinn wird vor dem Senden
 *  umgedreht, seine Oeffnungen bekommen Kante und Abstand dazu. Der
 *  Zeichner richtet schon beim Aendern (dokRichten); hier bleibt es fast
 *  immer beim Alten. */
function gerichtet(r: RaumWerte, oeffnungen: Oeffnung[]): { r: RaumWerte; oeffnungen: Oeffnung[] } {
  if (flaeche2(zuUmriss(r.punkte)) > 0) return { r, oeffnungen }
  const u = umlaufRichten(r.punkte)
  const laenge = (k: number) => {
    const a = r.punkte[k]
    const b = r.punkte[(k + 1) % r.punkte.length]
    return Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  return {
    r: { ...r, punkte: u.punkte, wandfarben: r.wandfarben ? r.punkte.map((_, k) => r.wandfarben?.[u.kante(k)] ?? null) : null },
    oeffnungen: oeffnungen.map((o) =>
      o.raum_id === r.id
        ? { ...o, kante: u.kante(o.kante), abstand_cm: u.abstand(o.kante, laenge(o.kante), o.abstand_cm, o.breite_cm) }
        : o,
    ),
  }
}

/** Geloeschte Raeume, deren ganzer Inhalt (Moebel und Kisten) im neuen
 *  Stand in genau einem anderen, schon bestehenden Raum steht: von -> nach.
 *  Eine Kiste, die noch auf den geloeschten Raum zeigt, zaehlt als
 *  mitgenommen; fehlt etwas im neuen Stand, gibt es kein Umhaengen. */
function umhaengenAus(alt: Dok, neu: Dok): Map<string, string> {
  const neuRaum = new Set(neu.raeume.map((r) => r.id))
  const altRaum = new Set(alt.raeume.map((r) => r.id))
  const neuObjekt = new Map(neu.objekte.map((o) => [o.id, o.raum_id]))
  const neuKiste = new Map(neu.kisten.map((k) => [k.id, k.platz_raum_id]))
  const out = new Map<string, string>()
  for (const r of alt.raeume) {
    if (neuRaum.has(r.id)) continue
    const ziele = [
      ...alt.objekte.filter((o) => o.raum_id === r.id).map((o) => neuObjekt.get(o.id)),
      ...alt.kisten.filter((k) => k.platz_raum_id === r.id).map((k) => neuKiste.get(k.id)),
    ]
    if (ziele.some((z) => z === undefined)) continue
    const nach = new Set(ziele.filter((z): z is string => z !== r.id))
    if (nach.size !== 1) continue
    const ziel = [...nach][0]
    if (neuRaum.has(ziel) && altRaum.has(ziel)) out.set(r.id, ziel)
  }
  return out
}

export function unterschied(alt: Dok, neu: Dok): GrundrissAenderung {
  const a: GrundrissAenderung = {}
  const altRaum = new Map(alt.raeume.map((r) => [r.id, r]))
  const neuRaum = new Map(neu.raeume.map((r) => [r.id, r]))
  const verschoben = new Map<string, [number, number]>()

  const raeumeLoeschen = alt.raeume.filter((r) => !neuRaum.has(r.id)).map((r) => r.id)
  if (raeumeLoeschen.length) a.raeume_loeschen = raeumeLoeschen
  const umhaengen = umhaengenAus(alt, neu)

  const raeume: RaumWerte[] = []
  const verschieben: { raum_id: string; dx: number; dy: number }[] = []
  for (const r of neu.raeume) {
    const vorher = altRaum.get(r.id)
    if (!vorher) {
      raeume.push(raumWerte(r))
      continue
    }
    const v = verschiebung(vorher, r)
    if (v) {
      verschoben.set(r.id, v)
      verschieben.push({ raum_id: r.id, dx: v[0], dy: v[1] })
      const sonst = { ...raumWerte(r), punkte: vorher.punkte }
      if (!gleich(sonst, raumWerte(vorher))) raeume.push(sonst)
      continue
    }
    if (!gleich(raumWerte(r), raumWerte(vorher))) raeume.push(raumWerte(r))
  }

  const altObjekt = new Map(alt.objekte.map((o) => [o.id, o]))
  const neuObjekt = new Set(neu.objekte.map((o) => o.id))
  const objekteLoeschen = alt.objekte
    .filter((o) => !neuObjekt.has(o.id) && neuRaum.has(o.raum_id))
    .map((o) => o.id)
  if (objekteLoeschen.length) a.objekte_loeschen = objekteLoeschen

  const objekte: ObjektWerte[] = []
  const zuordnen = new Map<string, { von_raum_id: string; nach_raum_id: string }>()
  for (const o of neu.objekte) {
    const vorher = altObjekt.get(o.id)
    if (!vorher) {
      objekte.push(objektWerte(o))
      continue
    }
    const v = verschoben.get(vorher.raum_id)
    const umgehaengt = umhaengen.get(vorher.raum_id)
    const erwartet =
      v && vorher.raum_id === o.raum_id
        ? { ...vorher, x: vorher.x + v[0], y: vorher.y + v[1] }
        : umgehaengt === o.raum_id
          ? { ...vorher, raum_id: o.raum_id }
          : vorher
    if (!gleich(objektWerte(o), objektWerte(erwartet))) objekte.push(objektWerte(o))
    if (o.raum_id !== vorher.raum_id && !altRaum.has(o.raum_id) && altRaum.has(vorher.raum_id)) {
      zuordnen.set(`${vorher.raum_id}>${o.raum_id}`, { von_raum_id: vorher.raum_id, nach_raum_id: o.raum_id })
    }
  }

  // Kisten, die der Zeichner nach dem Teilen in den neuen Raum gelegt hat.
  const altKiste = new Map(alt.kisten.map((k) => [k.id, k]))
  for (const k of neu.kisten) {
    const vorher = altKiste.get(k.id)
    if (!vorher || vorher.platz_raum_id === k.platz_raum_id) continue
    if (!altRaum.has(k.platz_raum_id) && altRaum.has(vorher.platz_raum_id)) {
      zuordnen.set(`${vorher.platz_raum_id}>${k.platz_raum_id}`, {
        von_raum_id: vorher.platz_raum_id,
        nach_raum_id: k.platz_raum_id,
      })
    }
  }

  const altOeff = new Map(alt.oeffnungen.map((o) => [o.id, o]))
  const neuOeff = new Set(neu.oeffnungen.map((o) => o.id))
  const oeffLoeschen = alt.oeffnungen
    .filter((o) => !neuOeff.has(o.id) && neuRaum.has(o.raum_id))
    .map((o) => o.id)
  if (oeffLoeschen.length) a.oeffnungen_loeschen = oeffLoeschen
  let oeffnungen: Oeffnung[] = []
  for (const o of neu.oeffnungen) {
    const vorher = altOeff.get(o.id)
    if (!vorher || !gleich(oeffnungWerte(o), oeffnungWerte(vorher))) oeffnungen.push(oeffnungWerte(o))
  }

  // Umlauf pruefen (nur fuer gesendete Raeume).
  const gesendet: RaumWerte[] = []
  for (const r of raeume) {
    const g = gerichtet(r, oeffnungen)
    gesendet.push(g.r)
    oeffnungen = g.oeffnungen
  }

  if (gesendet.length) a.raeume = gesendet
  if (umhaengen.size) a.umhaengen = [...umhaengen].map(([von, nach]) => ({ von_raum_id: von, nach_raum_id: nach }))
  if (verschieben.length) a.verschieben = verschieben
  if (objekte.length) a.objekte = objekte
  if (zuordnen.size) a.zuordnen = [...zuordnen.values()]
  if (oeffnungen.length) a.oeffnungen = oeffnungen
  return a
}

export function istLeer(a: GrundrissAenderung): boolean {
  return Object.values(a).every((v) => !v || (Array.isArray(v) && v.length === 0))
}

/** Raeume, die dieser Auftrag loescht und in denen Kisten stehen (nach
 *  dem alten Stand). Vor dem Senden fragt der Zeichner nach. Was
 *  umgehaengt wird, behaelt seinen Platz und zaehlt nicht. */
export function geloeschteMitKisten(alt: Dok, a: GrundrissAenderung): { raumId: string; codes: string[] }[] {
  const umgehaengt = new Set((a.umhaengen ?? []).map((u) => u.von_raum_id))
  return (a.raeume_loeschen ?? [])
    .filter((raumId) => !umgehaengt.has(raumId))
    .map((raumId) => ({ raumId, codes: alt.kisten.filter((k) => k.platz_raum_id === raumId).map((k) => k.code) }))
    .filter((x) => x.codes.length > 0)
}
