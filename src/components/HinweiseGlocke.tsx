import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCheck, ChevronRight, CircleCheck, Clock, PackageMinus, RotateCw, TriangleAlert } from 'lucide-react'
import { meineHinweise, type Hinweis } from '../lib/api'
import { useSprache } from '../lib/i18n'
import { cx } from '../lib/util'
import type { KopfBlattInfo } from './HeaderAktionen'

/* Hinweise der Glocke in der Kopfzeile.
 *
 * Jede Seite haengt ihre eigene Kopfzeile ein und aus. Damit nicht jede
 * Seite neu fragt, liegt der Stand hier einmal fuer die ganze Sitzung: er
 * wird beim Start geholt, alle 2 Minuten und beim Zurueckkehren in den Tab
 * erneuert (nur wenn er aelter als eine Minute ist), nie bei jedem Render.
 * Ein Konto-Wechsel verwirft den Stand. Datenzugriff nur ueber api.ts. */

const INTERVALL = 2 * 60 * 1000
const FRISCH = 60 * 1000

interface Stand {
  nutzer: string | null
  /** Schluessel der Hinweise, die als gelesen markiert sind (nur auf diesem Geraet). */
  gelesen: string[]
  daten: Hinweis[] | null
  laedt: boolean
  fehler: boolean
  geladenAm: number
}

const LEER: Stand = { nutzer: null, gelesen: [], daten: null, laedt: false, fehler: false, geladenAm: 0 }
let stand: Stand = LEER
const hoerer = new Set<() => void>()
let timer: number | undefined
let unterwegs = false

function setzen(neu: Partial<Stand>): void {
  stand = { ...stand, ...neu }
  hoerer.forEach((h) => h())
}

async function laden(erzwingen = false): Promise<void> {
  if (unterwegs || !stand.nutzer) return
  if (!erzwingen && stand.daten && Date.now() - stand.geladenAm < FRISCH) return
  const fuer = stand.nutzer
  unterwegs = true
  setzen({ laedt: true })
  try {
    const daten = await meineHinweise()
    if (stand.nutzer === fuer) setzen({ daten, fehler: false, geladenAm: Date.now() })
  } catch {
    if (stand.nutzer === fuer) setzen({ fehler: true })
  } finally {
    unterwegs = false
    if (stand.nutzer === fuer) setzen({ laedt: false })
    else void laden(true)
  }
}

function beiSichtbar(): void {
  if (!document.hidden) void laden()
}

function anmelden(h: () => void): () => void {
  hoerer.add(h)
  if (hoerer.size === 1) {
    timer = window.setInterval(() => {
      if (!document.hidden) void laden(true)
    }, INTERVALL)
    document.addEventListener('visibilitychange', beiSichtbar)
  }
  return () => {
    hoerer.delete(h)
    if (hoerer.size === 0) {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', beiSichtbar)
    }
  }
}

/** Stand der Hinweise fuer das angemeldete Konto (nutzerId). */
export function useHinweise(nutzerId: string | null | undefined): Stand & { summe: number; ungelesen: number; nochmal: () => void; alleGelesen: () => void } {
  const s = useSyncExternalStore(anmelden, () => stand)
  useEffect(() => {
    const id = nutzerId ?? null
    if (stand.nutzer !== id) {
      stand = { ...LEER, nutzer: id, gelesen: gelesenLesen(id) }
      hoerer.forEach((h) => h())
    }
    if (id) void laden()
  }, [nutzerId])
  const eigene = s.nutzer === (nutzerId ?? null) ? s.daten ?? [] : []
  const ungelesen = eigene.filter((h) => !s.gelesen.includes(hinweisKey(h)))
  const summe = ungelesen.reduce((n, h) => n + h.anzahl, 0)
  return { ...s, summe, ungelesen: ungelesen.length, nochmal: () => void laden(true), alleGelesen }
}

/* Gelesen heisst: genau dieser Hinweis mit genau dieser Zahl. Aendert sich die
 * Zahl oder kommt ein neuer Hinweis, ist er wieder ungelesen. Der Merker liegt
 * nur im Browser (kein Datenbankzugriff). */
const GELESEN_SCHLUESSEL = 'magazino.hinweise.gelesen.'

export function hinweisKey(h: Hinweis): string {
  return `${h.project_id}:${h.art}:${h.anzahl}`
}

function gelesenLesen(nutzer: string | null): string[] {
  if (!nutzer) return []
  try {
    const roh = localStorage.getItem(GELESEN_SCHLUESSEL + nutzer)
    const a: unknown = roh ? JSON.parse(roh) : []
    return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string').slice(0, 200) : []
  } catch {
    return []
  }
}

function alleGelesen(): void {
  if (!stand.nutzer || !stand.daten) return
  const keys = stand.daten.map(hinweisKey)
  try {
    localStorage.setItem(GELESEN_SCHLUESSEL + stand.nutzer, JSON.stringify(keys))
  } catch {
    /* ohne Speicher gilt der Merker nur bis zum Neuladen */
  }
  setzen({ gelesen: keys })
}

const REIHENFOLGE: Record<Hinweis['art'], number> = { ueberfaellig: 0, bald: 1, knapp: 2 }

function zeile(h: Hinweis, tn: (k: string, n: number) => string): { text: string; ziel: string; icon: ReactNode; ton: string } {
  const base = `/app/p/${h.project_id}`
  if (h.art === 'ueberfaellig') {
    return { text: tn('kopf.hinweis_ueberfaellig', h.anzahl), ziel: `${base}/ausleihen`, icon: <TriangleAlert size={18} />, ton: 'bg-danger/10 text-danger' }
  }
  if (h.art === 'bald') {
    return { text: tn('kopf.hinweis_bald', h.anzahl), ziel: `${base}/ausleihen`, icon: <Clock size={18} />, ton: 'bg-warn/10 text-warn' }
  }
  return { text: tn('kopf.hinweis_knapp', h.anzahl), ziel: `${base}/bestand`, icon: <PackageMinus size={18} />, ton: 'bg-warn/10 text-warn' }
}

/** Inhalt des Blatts der Glocke. Laden, Fehler, leer und Liste sind vier
 *  verschiedene Zustaende. */
export function HinweiseInhalt({ s, b }: { s: ReturnType<typeof useHinweise>; b: KopfBlattInfo }) {
  const { t, tn } = useSprache()
  const liste = [...(s.daten ?? [])].sort((x, y) => REIHENFOLGE[x.art] - REIHENFOLGE[y.art] || x.lager.localeCompare(y.lager, 'de'))

  const fehlerZeile = s.fehler ? (
    <div role="alert" className="flex items-center gap-2 rounded-[14px] bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
      <span className="min-w-0 flex-1">{t('kopf.hinweise_fehler')}</span>
      <button
        type="button"
        onClick={s.nochmal}
        className="knopf inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 text-sm font-medium text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <RotateCw size={14} aria-hidden="true" />
        {t('kopf.hinweise_nochmal')}
      </button>
    </div>
  ) : null

  if (!s.daten) {
    if (s.fehler) return <>{fehlerZeile}</>
    return (
      <p role="status" className="flex items-center gap-2 px-3.5 py-6 text-sm text-muted">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden="true" />
        {t('kopf.hinweise_laedt')}
      </p>
    )
  }
  if (liste.length === 0) {
    return (
      <>
        {fehlerZeile}
        <div className="flex flex-col items-center gap-1 rounded-[14px] bg-surface px-4 py-7 text-center">
          <CircleCheck size={28} className="text-ok" aria-hidden="true" />
          <p className="t-name mt-1">{t('kopf.hinweise_leer')}</p>
          <p className="text-sm text-muted">{t('kopf.hinweise_leer_text')}</p>
        </div>
      </>
    )
  }
  return (
    <>
      {fehlerZeile}
      {s.ungelesen > 0 ? (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={s.alleGelesen}
            className="knopf inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-accent-text hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <CheckCheck size={16} aria-hidden="true" />
            {t('kopf.hinweise_alle_gelesen')}
          </button>
        </div>
      ) : null}
      <ul className="gruppe overflow-hidden rounded-[14px] bg-surface">
        {liste.map((h) => {
          const z = zeile(h, tn)
          const gelesen = s.gelesen.includes(hinweisKey(h))
          return (
            <li key={`${h.project_id}:${h.art}`} className={gelesen ? 'opacity-60' : undefined}>
              <Link
                to={z.ziel}
                onClick={b.zu}
                className="flex min-h-14 items-center gap-3 px-3.5 py-2 transition-colors active:bg-feld hover:bg-feld focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
              >
                <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', z.ton)}>{z.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.95rem] font-medium leading-tight text-ink">{z.text}</span>
                  <span className="block truncate text-sm text-muted">{h.lager}</span>
                </span>
                <ChevronRight size={18} className="spiegeln shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
