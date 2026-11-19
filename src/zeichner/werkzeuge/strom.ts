/* Strom (S): Steckdose, Licht oder Schalter setzen (rechts waehlen). Ein
 * Klick setzt das Symbol an die Stelle (Raster). Nur zur Anzeige, nichts
 * wird geprueft. Waehlen, ziehen und loeschen mit der Auswahl.
 */
import { einrasten, type Punkt } from '../../lib/geometrie.ts'
import { symbolHinzufuegen } from '../dok.ts'
import type { SymbolArt } from '../../lib/types'
import type { Vorschau, Werkzeug } from './typen.ts'

export const SYMBOL_ARTEN: SymbolArt[] = ['steckdose', 'licht', 'schalter']

interface StromZustand {
  zeiger: Punkt | null
}

export const stromWerkzeug: Werkzeug<StromZustand> = {
  name: 'strom',
  start: () => ({ zeiger: null }),
  runter(k, z, s) {
    const p: Punkt = [einrasten(z.p[0], k.raster), einrasten(z.p[1], k.raster)]
    const id = k.neueId()
    return {
      s: { ...s, zeiger: p },
      aktionen: [
        { typ: 'aendern', dok: symbolHinzufuegen(k.dok, { id, art: k.symbolArt ?? 'steckdose', x: p[0], y: p[1] }), auswahl: { art: 'symbol', id } },
      ],
    }
  },
  bewegen(k, z) {
    return { s: { zeiger: [einrasten(z.p[0], k.raster), einrasten(z.p[1], k.raster)] } }
  },
  hoch: (_k, _z, s) => ({ s }),
  taste: () => null,
  abbrechen: (s) => ({ s, etwas: false }),
  vorschau(_k, s): Vorschau {
    return { punkte: s.zeiger ? [s.zeiger] : [] }
  },
}
