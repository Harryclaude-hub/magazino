/* Ansicht einer Zeichenflaeche: welcher Ausschnitt des Plans in welchem
 * Massstab zu sehen ist. Reine Rechnungen ohne React, damit der Zeichner
 * und scripts/zeichner-pruefen.mjs dieselben Formeln benutzen.
 *
 * Verschieben hat keine Grenzen (Koordinaten koennen bis 50000 cm gehen),
 * nur der Zoom ist begrenzt.
 */

export interface Ansicht {
  /** Linke obere Ecke in cm. */
  x: number
  y: number
  /** Pixel je cm. */
  s: number
}

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** Kleinster und groesster Massstab in Pixel je cm. 0.02 zeigt 500 m auf
 *  1000 Pixeln, 8 zeigt 1 cm als 8 Pixel. */
export const ZOOM_MIN = 0.02
export const ZOOM_MAX = 8

/** Startausschnitt, wenn noch nichts gezeichnet ist: 11 m mal 7 m ab 0,0. */
export const LEER_BOX: Box = { x0: 0, y0: 0, x1: 1100, y1: 700 }

function zoomBegrenzen(s: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s))
}

/** Bildschirmpixel (relativ zur Flaeche) in Plan-cm. */
export function zuCm(a: Ansicht, px: number, py: number): [number, number] {
  return [a.x + px / a.s, a.y + py / a.s]
}

/** Plan-cm in Bildschirmpixel (relativ zur Flaeche). */
export function zuPx(a: Ansicht, cx: number, cy: number): [number, number] {
  return [(cx - a.x) * a.s, (cy - a.y) * a.s]
}

/** Die Box mittig und ganz sichtbar, mit Rand in Pixeln. Leere oder
 *  fehlende Box: sinnvoller Startausschnitt. */
export function einpassen(box: Box | null, w: number, h: number, randPx = 48): Ansicht {
  const b = box ?? LEER_BOX
  const bw = Math.max(100, b.x1 - b.x0)
  const bh = Math.max(100, b.y1 - b.y0)
  const nw = Math.max(1, w - 2 * randPx)
  const nh = Math.max(1, h - 2 * randPx)
  const s = zoomBegrenzen(Math.min(nw / bw, nh / bh))
  return { s, x: (b.x0 + b.x1) / 2 - w / (2 * s), y: (b.y0 + b.y1) / 2 - h / (2 * s) }
}

/** Zoomen um einen Bildschirmpunkt: der Planpunkt unter dem Zeiger
 *  bleibt unter dem Zeiger. */
export function zoomAm(a: Ansicht, faktor: number, px: number, py: number): Ansicht {
  const s = zoomBegrenzen(a.s * faktor)
  const [cx, cy] = zuCm(a, px, py)
  return { s, x: cx - px / s, y: cy - py / s }
}

/** Um so viele Bildschirmpixel verschieben, wie der Inhalt wandern soll
 *  (Ziehen nach rechts: dx positiv, der Plan folgt dem Zeiger). */
export function verschieben(a: Ansicht, dxPx: number, dyPx: number): Ansicht {
  return { ...a, x: a.x - dxPx / a.s, y: a.y - dyPx / a.s }
}

/** Was ein Rad-Ereignis tun soll. Rad hoch und runter zoomt immer (auch
 *  feine Schritte, Windows mit Skalierung meldet z. B. 83,33). Nur
 *  seitliches oder schraeges Wischen am Trackpad und Umschalt+Rad
 *  verschieben; war eben schon so ein Wischen am Werk, bleibt es dabei. */
export function radArt(
  e: { deltaX: number; deltaY: number; deltaMode: number; ctrlKey: boolean; metaKey: boolean; shiftKey?: boolean },
  eben_trackpad = false,
): 'zoom' | 'schieben' {
  if (e.ctrlKey || e.metaKey) return 'zoom'
  if (e.shiftKey) return 'schieben'
  if (e.deltaX !== 0) return 'schieben'
  if (eben_trackpad && e.deltaMode === 0) return 'schieben'
  return 'zoom'
}

/** Zoomfaktor fuer ein Rad-Ereignis (Zeilen in Pixel umgerechnet). Pinch
 *  liefert kleine Schritte und braucht mehr Wirkung je Pixel. */
export function radFaktor(e: { deltaY: number; deltaMode: number; ctrlKey: boolean }): number {
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY
  const k = e.ctrlKey && Math.abs(dy) < 50 ? 0.01 : 0.0015
  return Math.exp(-Math.max(-300, Math.min(300, dy)) * k)
}

/** Rasterlinien, die den sichtbaren Ausschnitt fuellen (auch links und
 *  oberhalb von 0,0). schritt in cm, so dass Linien mindestens 14 Pixel
 *  auseinander liegen. */
export function rasterLinien(a: Ansicht, w: number, h: number): { schritt: number; xs: number[]; ys: number[] } {
  let schritt = 10
  while (schritt * a.s < 14) schritt *= String(schritt)[0] === '1' ? 5 : 2
  const x1 = a.x + w / a.s
  const y1 = a.y + h / a.s
  const xs: number[] = []
  const ys: number[] = []
  for (let x = Math.floor(a.x / schritt) * schritt; x <= x1 && xs.length < 600; x += schritt) xs.push(x)
  for (let y = Math.floor(a.y / schritt) * schritt; y <= y1 && ys.length < 600; y += schritt) ys.push(y)
  return { schritt, xs, ys }
}
