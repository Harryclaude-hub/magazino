import { supabase, errText } from './supabase'
import { tg } from './i18n'
import { compressImage } from './media'
import type { ErkanntesDing, ItemPhoto, PhotoAnalyse } from './types'

/* Bilderkennung.
 *
 * Der ganze Weg zur Erkennung laeuft ueber diese Datei. Der Schluessel
 * liegt auf dem Server, hier gibt es nur den Aufruf.
 *
 * Was zurueckkommt, uebernimmt die Oberflaeche seit E75 gleich in die
 * Inhaltsliste (Karam: scannen, Liste steht, suchbar). Jede Zeile traegt
 * die Herkunft 'bild' und bleibt so von Hand Eingetragenem unterscheidbar.
 *
 * Zeit (E75): hoechstens 20 Sekunden je Foto. Die App schickt dafuer eine
 * auf 1024 Pixel verkleinerte Fassung mit und wartet nicht laenger.
 */

export type Erkennungsart = 'kiste' | 'moebel' | 'zimmer'

export interface BildErgebnis {
  photo_id: string
  status: 'fertig' | 'fehler'
  /** true heisst: kam aus dem Speicher und hat nichts gekostet. */
  aus_speicher: boolean
  dinge: ErkanntesDing[]
  /** Die 20 Sekunden waren um, bevor die Liste fertig war (E75). */
  unvollstaendig?: boolean
  fehler?: string
  /** Kennung des Fehlers, fuer einen eigenen Satz (bildki.fehler.*). */
  code?: string
}

export interface ErkennungsAntwort {
  ergebnisse: BildErgebnis[]
  /** Bilder, die es nicht gibt oder die zu einem anderen Umzug gehoeren. */
  uebergangen: string[]
  /** Wie viele wegen der Tagesgrenze liegen geblieben sind. */
  uebersprungen_wegen_grenze: number
  /** null, wenn in diesem Durchgang kein Aufruf eine Antwort brachte:
   *  dann ist der Rest unbekannt, nicht null. */
  rest_projekt: number | null
  rest_nutzer: number | null
  modell: string
  sprache: 'de' | 'ar'
}

/** Ein Fehler, der einen eigenen Text in der Oberflaeche verdient.
 *  Der Code kommt von der Edge Function. */
export class BildFehler extends Error {
  code: string
  constructor(code: string, nachricht: string) {
    super(nachricht)
    this.code = code
    this.name = 'BildFehler'
  }
}

/** Hoechstens so viele Bilder je Durchgang. Die Edge Function nimmt
 *  dieselbe Zahl, bekommt aber jedes Foto einzeln (siehe bilderLesen). */
export const MAX_BILDER_JE_LAUF = 4

/** So viele Fotos werden gleichzeitig gelesen. Seit E75 braucht ein
 *  Aufruf hoechstens 20 Sekunden, da reichen auch geteilte 150 Sekunden
 *  eines Supabase-Arbeiters: alle auf einmal, damit vier Fotos nicht 80
 *  Sekunden dauern. */
const GLEICHZEITIG = 4

/** So lange wartet die App auf ein Foto, dann gilt es als zu langsam. */
const WARTEN_MS = 20_000

/** Kantenlaenge der Fassung, die zur Erkennung geht. Kleiner liest das
 *  Modell schneller, und Dinge in einer Kiste sind auch so gut zu sehen. */
const KI_PIXEL = 1024

/** Ein Foto als kleine JPEG-Fassung (data:-Adresse). null, wenn es nicht
 *  geht; dann nimmt die Erkennung das gespeicherte Foto. */
export async function kiFassung(url: string): Promise<string | null> {
  try {
    const roh = await fetch(url)
    if (!roh.ok) return null
    const blob = await roh.blob()
    const klein = await compressImage(new File([blob], 'foto.jpg', { type: blob.type || 'image/jpeg' }), KI_PIXEL, 0.8)
    return await new Promise<string | null>((res) => {
      const leser = new FileReader()
      leser.onload = () => res(typeof leser.result === 'string' ? leser.result : null)
      leser.onerror = () => res(null)
      leser.readAsDataURL(klein)
    })
  } catch {
    return null
  }
}

/** Kennungen, die Supabase selbst schickt, wenn es eine Funktion wegen
 *  Zeit oder Rechenlast beendet. Sie stehen im Koerper als code. */
const PLATTFORM_ZEIT = new Set(['WORKER_RESOURCE_LIMIT', 'WORKER_LIMIT', 'IDLE_TIMEOUT'])

/** Fehler, bei denen kein weiteres Foto etwas bringt: dann wird der ganze
 *  Durchgang abgebrochen statt viermal dasselbe zu melden (und viermal zu
 *  buchen). Gilt fuer geworfene Fehler UND fuer ein Foto, das mit so einer
 *  Kennung als gescheitert zurueckkommt. */
const FUER_ALLE = new Set([
  'kein_schluessel',
  'schluessel_falsch',
  'nur_lesen',
  'kein_mitglied',
  'abgemeldet',
  'netz',
])

/** Die festen Saetze von supabase-js. Sie sagen nichts ueber die Ursache
 *  und werden darum nie als Grund gezeigt. */
const LEERE_SAETZE = new Set([
  'Edge Function returned a non-2xx status code',
  'Relay Error invoking the Edge Function',
  'Failed to send a request to the Edge Function',
])

/** Einen Satz aus dem Woerterbuch, falls es fuer die Kennung einen gibt. */
function satzFuer(code: string): string | null {
  const key = `bildki.fehler.${code}`
  const satz = tg(key)
  return satz && satz !== key ? satz : null
}

/** Aus dem Fehler von functions.invoke einen verstaendlichen machen.
 *
 *  Die Edge Function schickt bei einem Fehler einen eigenen Text und eine
 *  Kennung mit. Beendet Supabase die Funktion aber hart, etwa nach 150
 *  Sekunden, kommt gar kein JSON zurueck, nur ein Status (546 oder 504).
 *  Dann stand vorher "Edge Function returned a non-2xx status code" auf
 *  dem Schirm. Jetzt gibt es auch dafuer einen Satz. */
async function alsBildFehler(error: unknown): Promise<BildFehler> {
  let code = 'unbekannt'
  let text = errText(error)
  const ctx = (error as { context?: unknown }).context
  if (ctx instanceof Response) {
    type Koerper = { error?: string; code?: string; message?: string }
    let koerper: Koerper | null = null
    try {
      koerper = JSON.parse(await ctx.clone().text()) as Koerper
    } catch {
      /* Kein JSON: dann entscheidet der Status allein. */
    }
    if (koerper?.error || koerper?.message) text = (koerper.error ?? koerper.message) as string
    /* Zuerst der Status: bei 546 und 504 hat Supabase die Funktion beendet,
     * was auch immer im Koerper steht. Dann die Kennung der Funktion, dann
     * die der Plattform. */
    if (ctx.status === 546 || ctx.status === 504 || ctx.status === 408) code = 'zeit'
    else if (ctx.status === 401) code = 'abgemeldet'
    else if (koerper?.code && satzFuer(koerper.code)) code = koerper.code
    else if (koerper?.code && PLATTFORM_ZEIT.has(koerper.code)) code = 'zeit'
    else if (koerper?.code && /^[a-z_]+$/.test(koerper.code)) code = koerper.code
    else if (ctx.status === 429 || ctx.status === 502 || ctx.status === 503) code = 'dienst_voll'
  } else if ((error as { name?: string }).name === 'FunctionsFetchError') {
    code = 'netz'
  }
  /* Wo es einen eigenen Satz gibt, steht der da, in der Sprache der Seite.
   * Sonst der allgemeine Satz, und dahinter der Grund des Servers, damit
   * man sieht, was los war. Die festen Saetze von supabase-js sind kein
   * Grund und fallen weg. */
  const satz = code !== 'unbekannt' ? satzFuer(code) : null
  if (satz) return new BildFehler(code, satz)
  const allgemein = satzFuer('unbekannt') ?? text
  const grund = LEERE_SAETZE.has(text) ? '' : text
  return new BildFehler(code, grund && grund !== allgemein ? `${allgemein} (${grund})` : allgemein)
}

/** Ein Foto lesen, in einem eigenen Aufruf. */
async function einBild(
  projectId: string,
  photoId: string,
  was: Erkennungsart,
  sprache: 'de' | 'ar',
  bild: string | null,
): Promise<ErkennungsAntwort> {
  const { data, error } = await supabase.functions.invoke('bild-analyse', {
    body: { project_id: projectId, photo_ids: [photoId], was, sprache, ...(bild ? { bild } : {}) },
    signal: AbortSignal.timeout(WARTEN_MS),
  })
  if (error) {
    const name = (error as { name?: string; context?: unknown }).name
    const ctx = (error as { context?: unknown }).context
    if (name === 'AbortError' || name === 'TimeoutError' || (ctx instanceof DOMException && ctx.name === 'TimeoutError')) {
      throw new BildFehler('zeit', satzFuer('zeit') ?? errText(error))
    }
    throw await alsBildFehler(error)
  }
  return data as ErkennungsAntwort
}

/**
 * Fotos auswerten lassen.
 *
 * Jedes Foto geht in einem eigenen Aufruf an die Edge Function, eins nach
 * dem anderen (GLEICHZEITIG = 1, der Grund steht dort). Vorher gingen bis
 * zu vier in einem Aufruf, und Supabase
 * beendet einen Aufruf nach 150 Sekunden hart: brauchte das Modell fuer
 * ein Bild eine Minute, kam fuer alle vier nur ein Fehler zurueck.
 *
 * Scheitert ein Foto, steht es als Fehler in den Ergebnissen, die anderen
 * laufen weiter. Nur Fehler, die fuer alle gelten (kein Schluessel, keine
 * Rechte, kein Netz), brechen den Durchgang ab.
 *
 * @param sprache Die Sprache, in der die Erkennung antworten soll. Was
 *   sie liefert, ist danach Nutzerinhalt und wird nie mehr uebersetzt.
 * @param onFortschritt Wird vor dem ersten und nach jedem Foto gerufen,
 *   mit der Zahl der schon versuchten Fotos.
 */
export async function bilderLesen(
  projectId: string,
  photoIds: string[],
  was: Erkennungsart,
  sprache: 'de' | 'ar',
  onFortschritt?: (fertig: number, gesamt: number) => void,
  /** Liefert die kleine Fassung eines Fotos (kiFassung), wenn moeglich. */
  fassung?: (photoId: string) => Promise<string | null>,
): Promise<ErkennungsAntwort> {
  if (photoIds.length === 0) {
    throw new BildFehler('leer', tg('bildki.keine_bilder'))
  }
  const liste = photoIds.slice(0, MAX_BILDER_JE_LAUF)
  const gesamt: ErkennungsAntwort = {
    ergebnisse: [],
    uebergangen: [],
    uebersprungen_wegen_grenze: 0,
    rest_projekt: null,
    rest_nutzer: null,
    modell: '',
    sprache,
  }
  let fertig = 0
  let naechstes = 0
  /* In einem Objekt, weil die Arbeiter es aendern: eine einfache Variable
   * hielte TypeScript nach dem Warten fuer immer noch null. */
  const stand: { abbruch: BildFehler | null } = { abbruch: null }
  onFortschritt?.(0, liste.length)

  async function arbeiter() {
    while (stand.abbruch === null && naechstes < liste.length) {
      const id = liste[naechstes++]
      try {
        const a = await einBild(projectId, id, was, sprache, fassung ? await fassung(id) : null)
        gesamt.ergebnisse.push(...a.ergebnisse)
        gesamt.uebergangen.push(...a.uebergangen)
        gesamt.uebersprungen_wegen_grenze += a.uebersprungen_wegen_grenze
        // Der Rest nach dem zuletzt fertigen Foto ist der aktuelle.
        gesamt.rest_projekt = a.rest_projekt
        gesamt.rest_nutzer = a.rest_nutzer
        gesamt.modell = a.modell
        // Ein falscher Schluessel trifft jedes Foto gleich: nicht weiter
        // fragen und buchen.
        const alle = a.ergebnisse.find((e) => e.status === 'fehler' && e.code && FUER_ALLE.has(e.code))
        if (alle?.code) stand.abbruch = new BildFehler(alle.code, satzFuer(alle.code) ?? alle.fehler ?? '')
      } catch (err) {
        const f = err instanceof BildFehler ? err : await alsBildFehler(err)
        if (FUER_ALLE.has(f.code)) stand.abbruch = f
        gesamt.ergebnisse.push({
          photo_id: id,
          status: 'fehler',
          aus_speicher: false,
          dinge: [],
          fehler: f.message,
          code: f.code,
        })
      } finally {
        fertig++
        onFortschritt?.(fertig, liste.length)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(GLEICHZEITIG, liste.length) }, arbeiter))
  /* Ein Fehler fuer alle, und kein Foto ist durchgekommen: dann wird er
   * geworfen, und die Oberflaeche zeigt ihren eigenen Hinweis (etwa "die
   * Erkennung ist noch nicht eingeschaltet"). War schon ein Foto fertig,
   * kommen dessen Vorschlaege zurueck, und der Fehler steht als
   * gescheitertes Foto in den Ergebnissen. */
  const abbruch = stand.abbruch
  if (abbruch && gesamt.ergebnisse.every((e) => e.status !== 'fertig')) throw abbruch
  return gesamt
}

/** Was schon einmal erkannt wurde, ohne neu zu fragen. Fuer die Anzeige,
 *  bevor jemand auf den Knopf drueckt. */
export async function vorhandeneErkennungen(
  photoIds: string[],
  sprache: 'de' | 'ar',
): Promise<Map<string, PhotoAnalyse>> {
  const out = new Map<string, PhotoAnalyse>()
  if (photoIds.length === 0) return out
  const step = 200
  for (let i = 0; i < photoIds.length; i += step) {
    const res = await supabase
      .from('photo_analyses')
      .select('*')
      .in('photo_id', photoIds.slice(i, i + step))
      .eq('sprache', sprache)
    if (res.error) throw new Error(tg('fehler.erkennung_laden', { grund: errText(res.error) }))
    for (const row of (res.data ?? []) as PhotoAnalyse[]) out.set(row.photo_id, row)
  }
  return out
}

/** Eine Erkennung wegwerfen, damit dasselbe Bild neu gelesen wird. Kostet
 *  beim naechsten Lauf wieder Geld, darum fragt die Oberflaeche vorher. */
export async function erkennungVerwerfen(photoId: string, sprache: 'de' | 'ar'): Promise<void> {
  const { error } = await supabase
    .from('photo_analyses')
    .delete()
    .eq('photo_id', photoId)
    .eq('sprache', sprache)
  if (error) throw new Error(tg('fehler.erkennung_verwerfen', { grund: errText(error) }))
}

/** Wie viele Auswertungen heute noch frei sind. */
export async function restGuthaben(
  projectId: string,
  userId: string,
): Promise<{ projekt: number; nutzer: number }> {
  const { data, error } = await supabase.rpc('bild_lesen_rest', {
    p_project: projectId,
    p_user: userId,
  })
  if (error) throw new Error(tg('fehler.rest_laden', { grund: errText(error) }))
  const zeile = Array.isArray(data) ? data[0] : data
  return { projekt: Number(zeile?.rest_projekt ?? 0), nutzer: Number(zeile?.rest_nutzer ?? 0) }
}

/* ------------------------------------------------------------ Anzeigen */

/** Drei grobe Stufen statt einer Prozentzahl.
 *
 *  Die Sicherheit ist eine Selbsteinschaetzung des Modells, keine
 *  Messung. "87 Prozent" liest sich wie ein Messwert und ist keiner.
 *  Drei Stufen sagen dasselbe, ohne mehr zu behaupten, als da ist. */
export type Stufe = 'sicher' | 'wahrscheinlich' | 'unsicher'

export function stufeVon(sicherheit: number): Stufe {
  if (sicherheit >= 0.8) return 'sicher'
  if (sicherheit >= 0.5) return 'wahrscheinlich'
  return 'unsicher'
}

/** Alle Fotos, die zu dieser Art gehoeren. Anleitungen bleiben draussen:
 *  auf einem Blatt Papier steht kein Kisteninhalt. */
export function lesbareFotos(fotos: ItemPhoto[]): ItemPhoto[] {
  return fotos.filter((f) => f.art === 'foto')
}
