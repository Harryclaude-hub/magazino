import { supabase, errText } from './supabase'
import { tg } from './i18n'

type Bucket = 'item-photos' | 'chat-media' | 'avatars'

/* ------------------------------------------------------------ Verkleinern */

/** Bild auf Kantenlaenge begrenzen und als JPEG packen. Spart Upload und
 *  Speicher, ohne dass man auf dem Etikett etwas verliert. */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), 'image/jpeg', quality),
    )
    return blob && blob.size < file.size ? blob : file
  } catch (err) {
    console.warn('[media] Verkleinern nicht moeglich, lade Original:', err)
    return file
  }
}

/* ------------------------------------------------------ Aufnahmedatum */

/** Wann ein Foto gemacht wurde (E81), als ISO-Zeit, oder null.
 *  Zuerst aus den Bilddaten des Handys (EXIF, "DateTimeOriginal"), die
 *  das Verkleinern sonst wegwirft. Fehlen sie, gilt die Dateizeit, aber
 *  nur wenn sie deutlich vor jetzt liegt: ein frisch aufgenommenes Foto
 *  traegt sonst die Uhrzeit des Hochladens und waere kein Gewinn. */
export async function aufnahmeZeit(file: File): Promise<string | null> {
  const plausibel = (ms: number) => ms > Date.UTC(1990, 0, 1) && ms < Date.now() + 86_400_000
  try {
    if (file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)) {
      const exif = exifZeit(new DataView(await file.slice(0, 256 * 1024).arrayBuffer()))
      if (exif !== null && plausibel(exif)) return new Date(exif).toISOString()
    }
  } catch (err) {
    console.warn('[media] Bilddaten nicht lesbar:', err)
  }
  const datei = file.lastModified
  if (datei && plausibel(datei) && Date.now() - datei > 10 * 60_000) return new Date(datei).toISOString()
  return null
}

/** DateTimeOriginal (sonst DateTime) aus einem JPEG, als Millisekunden in
 *  Ortszeit des Geraets, oder null. Liest nur den Kopf der Datei. */
function exifZeit(v: DataView): number | null {
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null
  let p = 2
  while (p + 4 <= v.byteLength) {
    const marke = v.getUint16(p)
    const laenge = v.getUint16(p + 2)
    if ((marke & 0xff00) !== 0xff00 || laenge < 2) return null
    // APP1 mit "Exif\0\0"
    if (marke === 0xffe1 && p + 10 <= v.byteLength && v.getUint32(p + 4) === 0x45786966) {
      return tiffZeit(v, p + 10)
    }
    if (marke === 0xffda) return null // Bilddaten beginnen: kein EXIF davor
    p += 2 + laenge
  }
  return null
}

function tiffZeit(v: DataView, start: number): number | null {
  const klein = v.getUint16(start) === 0x4949
  const u16 = (o: number) => v.getUint16(start + o, klein)
  const u32 = (o: number) => v.getUint32(start + o, klein)
  const text = (o: number, n: number) => {
    let s = ''
    for (let i = 0; i < n && start + o + i < v.byteLength; i++) {
      const c = v.getUint8(start + o + i)
      if (c === 0) break
      s += String.fromCharCode(c)
    }
    return s
  }
  /** Eintraege eines Verzeichnisses: Kennung -> Wertstelle und Anzahl. */
  const lesen = (ifd: number) => {
    const out = new Map<number, { wert: number; n: number }>()
    if (start + ifd + 2 > v.byteLength) return out
    const anzahl = u16(ifd)
    for (let i = 0; i < anzahl; i++) {
      const e = ifd + 2 + i * 12
      if (start + e + 12 > v.byteLength) break
      out.set(u16(e), { n: u32(e + 4), wert: u32(e + 8) })
    }
    return out
  }
  const ifd0 = lesen(u32(4))
  let roh: string | null = null
  const exifZeiger = ifd0.get(0x8769)
  if (exifZeiger) {
    const orig = lesen(exifZeiger.wert).get(0x9003)
    if (orig && orig.n >= 19) roh = text(orig.wert, 19)
  }
  if (!roh) {
    const dt = ifd0.get(0x0132)
    if (dt && dt.n >= 19) roh = text(dt.wert, 19)
  }
  const m = roh ? /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(roh) : null
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

/* ----------------------------------------------------------- Ausschnitt */

export interface Rahmen {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** So lang wird die laengere Seite eines Ausschnitts. Genug, um das Ding
 *  in der Suche zu erkennen, klein genug fuer eine lange Trefferliste. */
const AUSSCHNITT_KANTE = 320
/** Etwas Rand um den Rahmen, damit das Ding nicht an der Kante klebt. */
const AUSSCHNITT_RAND = 0.03

/**
 * Ein Ding aus einem Foto ausschneiden und als kleines JPEG ablegen.
 *
 * Das Foto wird ueber den Speicher geholt, nicht ueber eine Adresse: so
 * gibt es keine Fremd-Herkunft, die das Bild fuer die Leinwand sperrt.
 * Der Rahmen ist in Anteilen des Bildes, wie in der Datenbank (0023).
 * Liefert den Pfad des Ausschnitts.
 */
export async function ausschnittErstellen(
  fotoPfad: string,
  rahmen: Rahmen,
  zielPfad: string,
): Promise<string> {
  const { data, error } = await supabase.storage.from('item-photos').download(fotoPfad)
  if (error || !data) throw new Error(tg('fehler.ausschnitt', { grund: errText(error) }))
  const bild = await createImageBitmap(data)
  try {
    const w = bild.width
    const h = bild.height
    const sx = Math.max(0, (rahmen.x0 - AUSSCHNITT_RAND) * w)
    const sy = Math.max(0, (rahmen.y0 - AUSSCHNITT_RAND) * h)
    const ex = Math.min(w, (rahmen.x1 + AUSSCHNITT_RAND) * w)
    const ey = Math.min(h, (rahmen.y1 + AUSSCHNITT_RAND) * h)
    const sw = Math.max(1, ex - sx)
    const sh = Math.max(1, ey - sy)
    const massstab = Math.min(1, AUSSCHNITT_KANTE / Math.max(sw, sh))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(sw * massstab))
    canvas.height = Math.max(1, Math.round(sh * massstab))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error(tg('fehler.ausschnitt', { grund: 'canvas' }))
    ctx.drawImage(bild, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), 'image/jpeg', 0.82),
    )
    if (!blob) throw new Error(tg('fehler.ausschnitt', { grund: 'toBlob' }))
    /* Immer eine neue Datei: der Speicher erlaubt Bearbeitern Anlegen und
     * Loeschen, aber kein Ueberschreiben (0005). Den alten Ausschnitt
     * raeumt der Aufrufer weg. */
    const { error: hochFehler } = await supabase.storage.from('item-photos').upload(zielPfad, blob, {
      contentType: 'image/jpeg',
      upsert: false,
      cacheControl: '3600',
    })
    if (hochFehler) throw new Error(tg('fehler.ausschnitt', { grund: errText(hochFehler) }))
    return zielPfad
  } finally {
    bild.close?.()
  }
}

/* --------------------------------------------------------------- Upload */

export async function uploadTo(
  bucket: Bucket,
  path: string,
  body: Blob,
  contentType?: string,
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: contentType ?? body.type ?? 'application/octet-stream',
    upsert: false,
    cacheControl: '3600',
  })
  if (error) throw new Error(tg('fehler.hochladen', { grund: errText(error) }))
  return path
}

/* ---------------------------------------------------------- Signierte URLs */

const cache = new Map<string, { url: string; exp: number }>()
const TTL = 60 * 60 // Sekunden

export async function signedUrl(bucket: Bucket, path: string): Promise<string | null> {
  const key = `${bucket}/${path}`
  const hit = cache.get(key)
  if (hit && hit.exp > Date.now() + 60_000) return hit.url
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, TTL)
  if (error || !data?.signedUrl) {
    console.warn('[media] signierte URL fehlgeschlagen:', error?.message)
    return null
  }
  cache.set(key, { url: data.signedUrl, exp: Date.now() + TTL * 1000 })
  return data.signedUrl
}

export async function signedUrls(bucket: Bucket, paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const missing: string[] = []
  for (const p of paths) {
    const hit = cache.get(`${bucket}/${p}`)
    if (hit && hit.exp > Date.now() + 60_000) out.set(p, hit.url)
    else missing.push(p)
  }
  if (missing.length) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(missing, TTL)
    if (error) console.warn('[media] signierte URLs fehlgeschlagen:', error.message)
    for (const row of data ?? []) {
      if (row.signedUrl && row.path) {
        out.set(row.path, row.signedUrl)
        cache.set(`${bucket}/${row.path}`, { url: row.signedUrl, exp: Date.now() + TTL * 1000 })
      }
    }
  }
  return out
}

/* --------------------------------------------------------- Sprachaufnahme */

