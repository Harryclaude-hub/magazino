import { useEffect, useState } from 'react'
import { supabase, errText } from './supabase'
import { tg } from './i18n'

export type Bucket = 'item-photos' | 'chat-media' | 'avatars'

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

export function extOf(file: { name?: string; type?: string }, fallback = 'bin'): string {
  const fromName = file.name?.includes('.') ? file.name.split('.').pop()! : ''
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'application/pdf': 'pdf',
  }
  return map[file.type ?? ''] ?? fallback
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

export function useSignedUrl(bucket: Bucket, path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (!path) {
      setUrl(null)
      return
    }
    signedUrl(bucket, path).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [bucket, path])
  return url
}

/* --------------------------------------------------------- Sprachaufnahme */

export interface Recording {
  blob: Blob
  seconds: number
  mimeType: string
}

export class VoiceRecorder {
  private rec: MediaRecorder | null = null
  private chunks: Blob[] = []
  private stream: MediaStream | null = null
  private startedAt = 0

  static supported(): boolean {
    return typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  }

  private static pickMime(): string {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported?.(c)) return c
    }
    return ''
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = VoiceRecorder.pickMime()
    this.rec = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined)
    this.chunks = []
    this.rec.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.startedAt = Date.now()
    this.rec.start(250)
  }

  get seconds(): number {
    return this.startedAt ? (Date.now() - this.startedAt) / 1000 : 0
  }

  async stop(): Promise<Recording> {
    const rec = this.rec
    if (!rec) throw new Error(tg('fehler.keine_aufnahme'))
    const seconds = this.seconds
    const done = new Promise<void>((resolve) => {
      rec.onstop = () => resolve()
    })
    rec.stop()
    await done
    this.stream?.getTracks().forEach((t) => t.stop())
    const mimeType = rec.mimeType || 'audio/webm'
    const blob = new Blob(this.chunks, { type: mimeType })
    this.rec = null
    this.stream = null
    this.chunks = []
    if (blob.size === 0) throw new Error(tg('fehler.aufnahme_leer'))
    return { blob, seconds, mimeType }
  }

  cancel(): void {
    try {
      this.rec?.stop()
    } catch {
      /* war schon gestoppt */
    }
    this.stream?.getTracks().forEach((t) => t.stop())
    this.rec = null
    this.stream = null
    this.chunks = []
  }
}
