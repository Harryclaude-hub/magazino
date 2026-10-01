import type { Material, Objekt } from './types'
import type { ProduktDaten } from './api'

/* Ein Moebel nach seiner Produktseite richten (E77): Name, Masse, Preis,
 * Farbe aus dem Produktfoto, Material aus dem Namen. Reine Rechnung; das
 * Holen macht produktLesen in api.ts. */

/** Ist das ein Link, den produkt-lesen versteht? */
export function istProduktLink(link: string | null | undefined): boolean {
  if (!link) return false
  try {
    const u = new URL(link)
    return u.protocol === 'https:' && /^(www\.)?ikea\.com$/i.test(u.hostname) && u.pathname.includes('/p/')
  } catch {
    return false
  }
}

/** Die Farbe des Produkts aus seinem Foto: der haeufigste Farbton, ohne den
 *  hellen Studiohintergrund. null, wenn das Bild nicht zu lesen ist. */
export async function farbeAusBild(dataUrl: string): Promise<string | null> {
  try {
    const bild = new Image()
    bild.src = dataUrl
    await bild.decode()
    const n = 48
    const c = document.createElement('canvas')
    c.width = n
    c.height = n
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(bild, 0, 0, n, n)
    const px = ctx.getImageData(0, 0, n, n).data
    const eimer = new Map<number, { r: number; g: number; b: number; zahl: number }>()
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i]
      const g = px[i + 1]
      const b = px[i + 2]
      if (px[i + 3] < 200) continue
      const hell = Math.max(r, g, b)
      const satt = hell === 0 ? 0 : (hell - Math.min(r, g, b)) / hell
      // Weisser oder hellgrauer Hintergrund der Produktfotos.
      if (hell > 232 && satt < 0.08) continue
      const schluessel = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
      const e = eimer.get(schluessel) ?? { r: 0, g: 0, b: 0, zahl: 0 }
      e.r += r
      e.g += g
      e.b += b
      e.zahl++
      eimer.set(schluessel, e)
    }
    let beste: { r: number; g: number; b: number; zahl: number } | null = null
    for (const e of eimer.values()) if (!beste || e.zahl > beste.zahl) beste = e
    if (!beste || beste.zahl < 6) return null
    const hex = (v: number) => Math.round(v / beste!.zahl).toString(16).padStart(2, '0')
    return `#${hex(beste.r)}${hex(beste.g)}${hex(beste.b)}`
  } catch {
    return null
  }
}

/** Material aus dem Produktnamen, wenn er es verraet. */
export function materialAusName(name: string): Material | null {
  const n = name.toLowerCase()
  if (/leder/.test(n)) return 'leder'
  if (/samt/.test(n)) return 'samt'
  if (/glas|spiegel/.test(n)) return 'glas'
  if (/metall|stahl|alu|messing|chrom/.test(n)) return 'metall'
  if (/keramik|porzellan|steingut/.test(n)) return 'keramik'
  if (/eiche|buche|birke|kiefer|esche|nuss|bambus|holz|furnier|rattan/.test(n)) return 'holz'
  if (/sofa|sessel|polster|bezug|stoff|teppich|matte|kissen|bett/.test(n)) return 'stoff'
  return null
}

/**
 * Das Objekt nach den Produktdaten richten. Was die Seite nicht liefert,
 * bleibt, wie es war. Die Hoehe passt in den Raum (hoehe + boden). Bei
 * einer L-Form (Sofa mit Recamiere) wird die tiefe Seite zur Tiefe.
 */
export function nachProdukt(o: Objekt, d: ProduktDaten, farbe: string | null, raumHoehe: number): Objekt {
  const neu: Objekt = { ...o }
  if (d.name) neu.name = d.name.slice(0, 60)
  if (d.preis_cent !== null) neu.preis_cent = d.preis_cent
  neu.link = d.url
  const masz = (v: number | null) => (v !== null && v >= 5 && v <= 2000 ? v : null)
  const b = masz(d.breite_cm)
  const t = masz(d.tiefe_cm)
  const h = d.hoehe_cm !== null && d.hoehe_cm >= 1 ? Math.min(d.hoehe_cm, Math.max(1, raumHoehe - (o.boden_cm ?? 0))) : null
  if (b !== null) neu.breite_cm = b
  if (h !== null) neu.hoehe_cm = h
  const lang = masz(d.tiefe_lang_cm)
  if (o.form === 'l' && lang !== null && t !== null && lang > t) {
    neu.tiefe_cm = lang
    neu.ausschnitt_tiefe_cm = lang - t
    if (neu.ausschnitt_breite_cm !== null && neu.ausschnitt_breite_cm >= neu.breite_cm) neu.ausschnitt_breite_cm = Math.round(neu.breite_cm * 0.6)
  } else if (t !== null) {
    neu.tiefe_cm = t
    if (o.form === 'l' && neu.ausschnitt_tiefe_cm !== null && neu.ausschnitt_tiefe_cm >= t) neu.ausschnitt_tiefe_cm = Math.round(t * 0.4)
  }
  if (farbe) neu.farbe = farbe
  const m = d.name ? materialAusName(d.name) : null
  if (m) neu.material = m
  return neu
}
