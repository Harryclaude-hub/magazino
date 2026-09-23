import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Check, Crop, X } from 'lucide-react'
import { Input, Loading } from './ui'
import { useSprache } from '../lib/i18n'
import { signedUrl, type Rahmen } from '../lib/media'
import { rahmenVon } from '../lib/rahmen'
import type { ItemContent, ItemPhoto } from '../lib/types'
import { cx } from '../lib/util'

/* Das Bild zu einem Eintrag der Inhaltsliste.
 *
 * Um das gesuchte Ding liegt ein roter Rahmen, um die anderen erkannten
 * Dinge ein blasser. Aeltere Eintraege ohne Rahmen haben einen Punkt.
 * Darunter zwei Knoepfe: ja, das ist es, oder nein.
 *
 * Warum das Bestaetigen ueberhaupt: Rahmen und Punkte kommen aus der
 * Bilderkennung und sind geschaetzt, nicht gemessen. Erst wenn ein Mensch
 * hingesehen hat, weiss man es. Darum drei Zustaende und nicht zwei:
 * ungeprueft ist etwas anderes als "stimmt nicht".
 *
 * Sitzt der Rahmen daneben, zieht man mit dem Finger einen neuen. Und ein
 * Ding, das die Erkennung uebersehen hat, markiert man hier von Hand: dann
 * gibt es keinen Eintrag, nur das Foto, und nach dem Rahmen einen Namen.
 *
 * Die Antwort geht sofort an die Datenbank, nicht erst beim Schliessen.
 *
 * Rahmen und Punkte sitzen in Anteilen des Bildes. Darum wird die
 * Flaeche, die das Bild auf dem Bildschirm wirklich einnimmt, gemessen:
 * aus der Groesse des Rahmens und dem Seitenverhaeltnis des Bildes, neu
 * bei jeder Groessenaenderung.
 */

type BildZustand = 'laedt' | 'da' | 'fehler'

interface Flaeche {
  links: number
  oben: number
  breite: number
  hoehe: number
}

/** Kleiner als das ist kein Rahmen, sondern ein versehentlicher Tipp. */
const MIN_ANTEIL = 0.02

function geordnet(z: Rahmen): Rahmen {
  return {
    x0: Math.min(z.x0, z.x1),
    y0: Math.min(z.y0, z.y1),
    x1: Math.max(z.x0, z.x1),
    y1: Math.max(z.y0, z.y1),
  }
}

function gueltig(z: Rahmen | null): z is Rahmen {
  if (!z) return false
  const g = geordnet(z)
  return g.x1 - g.x0 >= MIN_ANTEIL && g.y1 - g.y0 >= MIN_ANTEIL
}

export function PunktBild({
  offen,
  onClose,
  eintrag,
  geschwister,
  foto,
  canEdit,
  onAntwort,
  onRahmen,
  onNeu,
}: {
  offen: boolean
  onClose: () => void
  /** Der gesuchte Eintrag. null heisst: auf diesem Foto ein neues Ding
   *  von Hand markieren. */
  eintrag: ItemContent | null
  /** Alle Eintraege der Kiste. Die auf demselben Foto werden blass
   *  gezeigt, damit man sieht, was sonst noch erkannt wurde. */
  geschwister: ItemContent[]
  foto: ItemPhoto | null
  canEdit: boolean
  onAntwort: (eintrag: ItemContent, wert: boolean | null) => void
  /** Einen neu gezogenen Rahmen fuer den Eintrag speichern. */
  onRahmen?: (eintrag: ItemContent, rahmen: Rahmen) => Promise<void>
  /** Ein von Hand markiertes Ding als neuen Eintrag anlegen. */
  onNeu?: (name: string, rahmen: Rahmen) => Promise<void>
}) {
  const { t } = useSprache()
  const pfad = offen ? (foto?.path ?? null) : null

  const [url, setUrl] = useState<string | null>(null)
  const [zustand, setZustand] = useState<BildZustand>('laedt')
  const [versuch, setVersuch] = useState(0)
  const [natur, setNatur] = useState<{ b: number; h: number } | null>(null)
  const [flaeche, setFlaeche] = useState<Flaeche | null>(null)
  const rahmen = useRef<HTMLDivElement>(null)

  const [ziehen, setZiehen] = useState(false)
  const [zug, setZug] = useState<Rahmen | null>(null)
  const [name, setName] = useState('')
  const [speichert, setSpeichert] = useState(false)

  const neu = eintrag === null
  const eintragId = eintrag?.id ?? null

  /* Beim Oeffnen von vorn: kein halber Rahmen vom letzten Mal. Ein neues
   * Ding beginnt gleich im Ziehen. Haengt an der Kennung, nicht am
   * Objekt: eine Antwort ersetzt das Objekt und soll nichts zuruecksetzen. */
  useEffect(() => {
    if (!offen) return
    setZiehen(eintragId === null)
    setZug(null)
    setName('')
    setSpeichert(false)
  }, [offen, eintragId])

  /* Die Adresse holen. Drei Zustaende, damit ein Bild, das nicht kommt,
   * als Fehler dasteht und nicht als ewiges Laden. */
  useEffect(() => {
    setUrl(null)
    setNatur(null)
    setFlaeche(null)
    if (!pfad) return
    let alive = true
    setZustand('laedt')
    void signedUrl('item-photos', pfad).then((u) => {
      if (!alive) return
      if (u) setUrl(u)
      else setZustand('fehler')
    })
    return () => {
      alive = false
    }
  }, [pfad, versuch])

  /* Wo das Bild im Rahmen wirklich liegt. object-contain laesst links und
   * rechts oder oben und unten Rand, je nach Seitenverhaeltnis. */
  useEffect(() => {
    const el = rahmen.current
    if (!el || !natur) return
    function messen() {
      if (!el || !natur) return
      const rb = el.clientWidth
      const rh = el.clientHeight
      if (rb === 0 || rh === 0) return
      const massstab = Math.min(rb / natur.b, rh / natur.h)
      const breite = natur.b * massstab
      const hoehe = natur.h * massstab
      setFlaeche({ links: (rb - breite) / 2, oben: (rh - hoehe) / 2, breite, hoehe })
    }
    messen()
    const beobachter = new ResizeObserver(messen)
    beobachter.observe(el)
    return () => beobachter.disconnect()
  }, [natur])

  useEffect(() => {
    if (!offen) return
    function aufEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', aufEscape)
    return () => window.removeEventListener('keydown', aufEscape)
  }, [offen, onClose])

  if (!offen || (!eintrag && !foto)) return null

  const eigenerRahmen = eintrag ? rahmenVon(eintrag) : null
  const hatPunkt = eintrag !== null && eintrag.punkt_x !== null && eintrag.punkt_y !== null
  const andere = foto
    ? geschwister.filter(
        (g) => g.id !== eintrag?.id && g.photo_id === foto.id && (g.box_x0 !== null || g.punkt_x !== null),
      )
    : []
  /* Fragen und Antworten gibt es nur, wenn es etwas zu pruefen gibt: ein
   * Bild, das da ist, und einen Rahmen oder Punkt darauf. */
  const fragen =
    canEdit &&
    !ziehen &&
    foto !== null &&
    eintrag !== null &&
    (eigenerRahmen !== null || hatPunkt) &&
    zustand === 'da'

  function anteil(e: PointerEvent<HTMLDivElement>): { x: number; y: number } {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    }
  }

  async function speichern() {
    if (!gueltig(zug) || speichert) return
    const r = geordnet(zug)
    setSpeichert(true)
    try {
      if (neu) {
        if (!name.trim() || !onNeu) return
        await onNeu(name.trim(), r)
        onClose()
      } else if (eintrag && onRahmen) {
        await onRahmen(eintrag, r)
        setZiehen(false)
        setZug(null)
      }
    } finally {
      setSpeichert(false)
    }
  }

  const titel = neu ? t('schichten.markieren_titel') : (eintrag?.text ?? '')

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label={titel}
    >
      {/* Kopfzeile: was gesucht wird, und der Weg hinaus. */}
      <div className="flex items-start gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <p className="break-words text-lg font-black text-white">
            {eintrag && eintrag.qty > 1 ? <><span className="t-serial">{eintrag.qty}x</span>{' '}</> : null}
            {titel}
          </p>
          <p className="text-sm font-semibold text-white/70">
            {(eintrag?.schicht ?? foto?.schicht)
              ? t('schichten.schicht_n', { n: (eintrag?.schicht ?? foto?.schicht) as number })
              : null}
            {(eintrag?.schicht ?? foto?.schicht) && foto?.seite ? ' . ' : null}
            {foto?.seite}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('aktion.schliessen')}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-white transition active:scale-95"
        >
          <X size={22} />
        </button>
      </div>

      {/* Das Bild. Der Rahmen nimmt den ganzen freien Platz, das Bild
          liegt mit object-contain darin, und Rahmen und Punkte liegen in
          einer Flaeche, die genau so gross ist wie das sichtbare Bild. */}
      <div ref={rahmen} className="relative mx-3 min-h-0 flex-1">
        {!foto || zustand === 'fehler' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-base font-bold text-white">{t('kisten.bild_fehlt')}</p>
            {foto ? (
              <button
                type="button"
                onClick={() => setVersuch((v) => v + 1)}
                className="rounded-xl border-2 border-white/60 px-4 py-2 font-bold text-white transition hover:bg-white/15 active:scale-95"
              >
                {t('aktion.nochmal')}
              </button>
            ) : null}
          </div>
        ) : null}

        {foto && url && zustand !== 'fehler' ? (
          <img
            src={url}
            alt={titel}
            onLoad={(e) => {
              const img = e.currentTarget
              setNatur({ b: img.naturalWidth, h: img.naturalHeight })
              setZustand('da')
            }}
            onError={() => setZustand('fehler')}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : null}

        {foto && zustand === 'laedt' ? (
          <div className="absolute inset-0 grid place-items-center text-white">
            <Loading />
          </div>
        ) : null}

        {zustand === 'da' && flaeche ? (
          <div
            className={cx('absolute', ziehen ? 'cursor-crosshair' : 'pointer-events-none')}
            style={{
              left: flaeche.links,
              top: flaeche.oben,
              width: flaeche.breite,
              height: flaeche.hoehe,
              touchAction: ziehen ? 'none' : undefined,
            }}
            onPointerDown={(e) => {
              if (!ziehen) return
              e.currentTarget.setPointerCapture(e.pointerId)
              const p = anteil(e)
              setZug({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
            }}
            onPointerMove={(e) => {
              if (!ziehen || !zug || !e.currentTarget.hasPointerCapture(e.pointerId)) return
              const p = anteil(e)
              setZug({ ...zug, x1: p.x, y1: p.y })
            }}
            onPointerUp={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId)
              }
            }}
          >
            {/* Die anderen Dinge auf dem Bild, blass. */}
            {!ziehen
              ? andere.map((g) => {
                  const r = rahmenVon(g)
                  return r ? (
                    <RahmenFeld key={g.id} r={r} art="blass" titel={g.text} />
                  ) : (
                    <span
                      key={g.id}
                      title={g.text}
                      className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 bg-white/35"
                      style={{ left: `${Number(g.punkt_x) * 100}%`, top: `${Number(g.punkt_y) * 100}%` }}
                    />
                  )
                })
              : null}

            {/* Das gesuchte Ding: rot, mit hellem Rand, damit es auf jedem
                Bild auffaellt. Beim Ziehen der neue Rahmen. */}
            {ziehen && zug ? <RahmenFeld r={geordnet(zug)} art="neu" /> : null}
            {!ziehen && eigenerRahmen ? <RahmenFeld r={eigenerRahmen} art="gesucht" /> : null}
            {!ziehen && !eigenerRahmen && hatPunkt && eintrag ? (
              <>
                <span
                  className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-danger shadow-lg"
                  style={{
                    left: `${Number(eintrag.punkt_x) * 100}%`,
                    top: `${Number(eintrag.punkt_y) * 100}%`,
                  }}
                />
                <span
                  className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-danger"
                  style={{
                    left: `${Number(eintrag.punkt_x) * 100}%`,
                    top: `${Number(eintrag.punkt_y) * 100}%`,
                  }}
                />
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Unten: fragen, oder Rahmen ziehen und speichern. Feste Farben,
          der Grund hier ist immer schwarz. */}
      <div className="space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {ziehen ? (
          <>
            <p className="text-center text-sm font-semibold text-white/80">
              {t('schichten.ziehen_hinweis')}
            </p>
            {neu ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('schichten.markieren_name')}
                aria-label={t('schichten.markieren_name')}
              />
            ) : null}
            <div className="flex gap-2">
              <DunklerKnopf
                gewaehlt
                farbe="ok"
                disabled={!gueltig(zug) || speichert || (neu && !name.trim())}
                onClick={() => void speichern()}
              >
                <Check size={20} /> {t('aktion.speichern')}
              </DunklerKnopf>
              <DunklerKnopf
                gewaehlt={false}
                farbe="danger"
                onClick={() => {
                  if (neu) onClose()
                  else {
                    setZiehen(false)
                    setZug(null)
                  }
                }}
              >
                <X size={20} /> {t('aktion.abbrechen')}
              </DunklerKnopf>
            </div>
          </>
        ) : (
          <>
            {/* Die Frage nur, wenn man auch antworten kann. Wer nur
                schaut (Rolle Betrachter, oder aus der Suche), saehe sonst
                eine Frage ohne Knoepfe. */}
            {fragen || !(eigenerRahmen || hatPunkt) ? (
              <p className="text-center text-sm font-semibold text-white/70">
                {fragen ? t('schichten.frage') : t('schichten.kein_punkt')}
              </p>
            ) : !canEdit && eintrag?.bestaetigt === false ? (
              <p className="text-center text-sm font-bold text-[#fca5a5]">
                {t('schichten.verneint')}
              </p>
            ) : null}
            {fragen && eintrag ? (
              <div className="flex gap-2">
                <DunklerKnopf
                  gewaehlt={eintrag.bestaetigt === true}
                  farbe="ok"
                  onClick={() => onAntwort(eintrag, eintrag.bestaetigt === true ? null : true)}
                >
                  <Check size={20} /> {t('schichten.ja')}
                </DunklerKnopf>
                <DunklerKnopf
                  gewaehlt={eintrag.bestaetigt === false}
                  farbe="danger"
                  onClick={() => onAntwort(eintrag, eintrag.bestaetigt === false ? null : false)}
                >
                  <X size={20} /> {t('schichten.nein')}
                </DunklerKnopf>
              </div>
            ) : null}
            {canEdit && eintrag && foto && zustand === 'da' && onRahmen ? (
              <button
                type="button"
                onClick={() => {
                  setZiehen(true)
                  setZug(null)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-white/40 px-3 py-3 text-base font-bold text-white transition hover:border-white hover:bg-white/10 active:scale-[0.99]"
              >
                <Crop size={18} /> {eigenerRahmen ? t('schichten.rahmen_neu') : t('schichten.rahmen_ziehen')}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

/** Ein Rahmen im Bild. Gesucht: rot mit hellem Aussenrand. Blass: die
 *  anderen Dinge. Neu: der Rahmen, der gerade gezogen wird. */
function RahmenFeld({
  r,
  art,
  titel,
}: {
  r: Rahmen
  art: 'gesucht' | 'blass' | 'neu'
  titel?: string
}) {
  return (
    <span
      title={titel}
      className={cx(
        'pointer-events-none absolute rounded-md',
        art === 'gesucht' && 'border-4 border-danger shadow-[0_0_0_3px_rgba(255,255,255,0.9)]',
        art === 'blass' && 'border-2 border-white/70 bg-white/10',
        art === 'neu' && 'border-4 border-dashed border-white bg-white/15',
      )}
      style={{
        left: `${r.x0 * 100}%`,
        top: `${r.y0 * 100}%`,
        width: `${(r.x1 - r.x0) * 100}%`,
        height: `${(r.y1 - r.y0) * 100}%`,
      }}
    />
  )
}

/** Ein Knopf auf schwarzem Grund. Gewaehlt ist er voll gefaerbt mit
 *  weisser Schrift, sonst durchsichtig mit weissem Rand. Beim Ueberfahren
 *  bleibt die Schrift weiss, in beiden Farbmodi. */
function DunklerKnopf({
  gewaehlt,
  farbe,
  disabled,
  onClick,
  children,
}: {
  gewaehlt: boolean
  farbe: 'ok' | 'danger'
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={gewaehlt}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-3 text-base font-black text-white transition active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        /* Feste, dunkle Farben statt der Farben des Farbmodus: der Grund
         * hier ist immer schwarz, und im dunklen Modus waeren ok und danger
         * so hell, dass weisse Schrift darauf verschwindet. */
        gewaehlt
          ? farbe === 'ok'
            ? 'border-[#15803d] bg-[#15803d]'
            : 'border-[#b91c1c] bg-[#b91c1c]'
          : 'border-white/50 bg-white/10 hover:border-white hover:bg-white/20',
      )}
    >
      {children}
    </button>
  )
}
