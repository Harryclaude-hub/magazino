/* Kiste setzen (B): links eine Kiste ohne Platz (oder eine gezeichnete)
 * in die Hand nehmen, auf die Stelle klicken. Dann kommt die Auswahl der
 * Unterlage (Boden, Kiste, Moebel, Fach), danach platz_setzen. Das ist
 * kein Schritt der Zeichnung: Rueckgaengig dafuer steht an der Kiste.
 * Q und E drehen die Kiste um 90 Grad.
 */
import { einrasten, type Punkt } from '../../lib/geometrie.ts'
import { raumAn } from '../dok.ts'
import type { Schritt, Vorschau, Werkzeug } from './typen.ts'

interface KisteZustand {
  zeiger: Punkt | null
  drehung: 0 | 90
}

export const kisteWerkzeug: Werkzeug<KisteZustand> = {
  name: 'kiste',
  start: () => ({ zeiger: null, drehung: 0 }),
  runter(k, z, s): Schritt<KisteZustand> {
    if (!k.kiste) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.kiste_erst_waehlen' }] }
    const p: Punkt = [einrasten(z.p[0], k.raster), einrasten(z.p[1], k.raster)]
    const raum = raumAn(k.dok, p)
    if (!raum) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.kiste_in_raum' }] }
    return { s, aktionen: [{ typ: 'unterlage_waehlen', raumId: raum.id, x: p[0], y: p[1], drehung: s.drehung }] }
  },
  bewegen: (k, z, s) => ({ s: { ...s, zeiger: [einrasten(z.p[0], k.raster), einrasten(z.p[1], k.raster)] } }),
  hoch: (_k, _z, s) => ({ s }),
  taste(_k, code, _key, _frei, s) {
    if (code === 'KeyQ' || code === 'KeyE') return { s: { ...s, drehung: s.drehung === 0 ? 90 : 0 } }
    return null
  },
  abbrechen: (s) => ({ s, etwas: false }),
  vorschau(k, s): Vorschau {
    if (!k.kiste || !s.zeiger) return {}
    const ex = s.drehung === 90 ? k.kiste.breite_cm : k.kiste.laenge_cm
    const ey = s.drehung === 90 ? k.kiste.laenge_cm : k.kiste.breite_cm
    return { kiste: { x: s.zeiger[0], y: s.zeiger[1], ex, ey, ok: raumAn(k.dok, s.zeiger) !== null } }
  },
}
