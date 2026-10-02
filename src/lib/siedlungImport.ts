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
 *     siedlung: { name, lat, lon, gebaeude, wohnung, aussen, innen, stadt? },
 *     deko?: { grundrissId, objekte, symbole } }
 *
 * stadt (E87) ist die Umgebung aus scripts/stadt-aus-osm.mjs. Fehlt der
 * Schluessel, bleibt eine schon gespeicherte Stadt, wie sie ist; null
 * nimmt sie heraus. */
import { tg } from './i18n'
import { siedlungInnenPruefen } from './siedlungInnen'
import { stadtPruefen } from './stadt'
import type { Objekt, PlanSymbol, Siedlung, StadtDaten } from './types'

export type SiedlungDaten = Pick<Siedlung, 'name' | 'lat' | 'lon' | 'gebaeude' | 'wohnung' | 'aussen'> & {
  innen: NonNullable<Siedlung['innen']> | null
  /** Fehlt (undefined): die gespeicherte Stadt bleibt. */
  stadt?: StadtDaten | null
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

/** Groesser wird keine echte Siedlung: innen bis 2 MB (0045), die Stadt
 *  bis 6 MB (stadtPruefen; 0047 erlaubt 8 MB), dazu Haeuser und Deko. */
const MAX_BYTES = 8_000_000
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
  let stadt: StadtDaten | null | undefined
  if (s.stadt === null) stadt = null
  else if (s.stadt !== undefined) {
    const probleme = stadtPruefen(s.stadt)
    if (probleme.length) throw fehler(`stadt ${probleme[0]}`)
    stadt = s.stadt as StadtDaten
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
      ...(stadt !== undefined ? { stadt } : {}),
    },
    deko,
  }
}
