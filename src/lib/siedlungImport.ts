/* Eine Siedlung aus einer Datei laden (E85).
 *
 * Statt Befehle in der Datenbank auszufuehren, waehlt man einmal eine
 * Datei (JSON), und die App traegt sie mit dem eigenen Konto ein: die
 * Siedlung mit allen Haeusern und Wohnungen und, wenn dabei, Deko und
 * Schalter fuer den eigenen Grundriss. Die Datei liegt beim Nutzer, nie im
 * Code. Hier steht nur das Lesen und Pruefen, rein und ohne Datenbank;
 * das Eintragen macht api.ts (siedlungImportieren).
 *
 * Aufbau der Datei:
 *   { art: 'kistly-siedlung', v: 1,
 *     siedlung: { name, lat, lon, gebaeude, wohnung, aussen, innen },
 *     deko?: { grundrissId, objekte, symbole } } */
import { tg } from './i18n'
import { siedlungInnenPruefen } from './siedlungInnen'
import type { Objekt, PlanSymbol, Siedlung } from './types'

export type SiedlungDaten = Pick<Siedlung, 'name' | 'lat' | 'lon' | 'gebaeude' | 'wohnung' | 'aussen'> & {
  innen: NonNullable<Siedlung['innen']> | null
}

export interface DekoDaten {
  grundrissId: string
  objekte: Omit<Objekt, 'item_code' | 'item_title'>[]
  symbole: PlanSymbol[]
}

export interface SiedlungDatei {
  siedlung: SiedlungDaten
  deko: DekoDaten | null
}

/** Groesser wird keine echte Siedlung (0045 erlaubt 2 MB fuer innen). */
const MAX_BYTES = 3_000_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const istObjekt = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

function fehler(grund: string): Error {
  return new Error(tg('siedlung.datei_fehler', { grund }))
}

/** Liest und prueft den Text einer Siedlungs-Datei. Wirft einen Fehler mit
 *  verstaendlichem Satz, wenn etwas nicht stimmt. Die Datenbank prueft beim
 *  Eintragen noch einmal alles (0044, 0045). */
export function siedlungDateiLesen(text: string): SiedlungDatei {
  if (text.length > MAX_BYTES) throw fehler(tg('siedlung.datei_zu_gross'))
  let roh: unknown
  try {
    roh = JSON.parse(text)
  } catch {
    throw fehler(tg('siedlung.datei_kein_json'))
  }
  if (!istObjekt(roh) || roh.art !== 'kistly-siedlung' || roh.v !== 1) throw fehler(tg('siedlung.datei_falsche_art'))
  const s = roh.siedlung
  if (!istObjekt(s)) throw fehler('siedlung')
  if (typeof s.name !== 'string' || !s.name.trim() || s.name.length > 80) throw fehler('name')
  if (typeof s.lat !== 'number' || typeof s.lon !== 'number' || !Number.isFinite(s.lat) || !Number.isFinite(s.lon)) throw fehler('lat/lon')
  if (!Array.isArray(s.gebaeude) || s.gebaeude.length === 0) throw fehler('gebaeude')
  if (s.wohnung !== null && !istObjekt(s.wohnung)) throw fehler('wohnung')
  if (!istObjekt(s.aussen)) throw fehler('aussen')
  const ids = (s.gebaeude as unknown[]).map((g) => (istObjekt(g) && typeof g.id === 'string' ? g.id : ''))
  const innen = s.innen ?? null
  if (innen !== null) {
    const probleme = siedlungInnenPruefen(innen, ids)
    if (probleme.length) throw fehler(`innen ${probleme[0].pfad} ${probleme[0].kennung}`)
  }
  let deko: DekoDaten | null = null
  if (roh.deko !== undefined && roh.deko !== null) {
    const d = roh.deko
    if (!istObjekt(d) || typeof d.grundrissId !== 'string' || !UUID.test(d.grundrissId)) throw fehler('deko')
    if (!Array.isArray(d.objekte) || !Array.isArray(d.symbole)) throw fehler('deko')
    if (d.objekte.length > 500 || d.symbole.length > 500) throw fehler('deko')
    deko = { grundrissId: d.grundrissId, objekte: d.objekte as DekoDaten['objekte'], symbole: d.symbole as PlanSymbol[] }
  }
  return {
    siedlung: {
      name: s.name.trim(),
      lat: s.lat,
      lon: s.lon,
      gebaeude: s.gebaeude as Siedlung['gebaeude'],
      wohnung: (s.wohnung ?? null) as Siedlung['wohnung'],
      aussen: s.aussen as unknown as Siedlung['aussen'],
      innen: innen as SiedlungDaten['innen'],
    },
    deko,
  }
}
