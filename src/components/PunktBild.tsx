import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button, Loading } from './ui'
import { useSprache } from '../lib/i18n'
import { useSignedUrl } from '../lib/media'
import type { ItemContent, ItemPhoto } from '../lib/types'
import { cx } from '../lib/util'

/* Das Bild zu einem Eintrag der Inhaltsliste.
 *
 * Auf jedem erkannten Ding sitzt ein Punkt. Der gesuchte ist rot und
 * gross, die anderen sind blass. Darunter zwei Knoepfe: ja, das ist es,
 * oder nein.
 *
 * Warum das Bestaetigen ueberhaupt: die Punkte kommen aus der
 * Bilderkennung und sind geschaetzt, nicht gemessen. Ein Punkt, der
 * danebensitzt, sieht genauso sicher aus wie einer, der stimmt. Erst
 * wenn ein Mensch hingesehen hat, weiss man es. Darum drei Zustaende und
 * nicht zwei: ungeprueft ist etwas anderes als "stimmt nicht".
 *
 * Die Antwort geht sofort an die Datenbank, nicht erst beim Schliessen.
 * Wer das Fenster zuwirft, hat trotzdem geantwortet.
 */
export function PunktBild({
  offen,
  onClose,
  eintrag,
  geschwister,
  foto,
  canEdit,
  onAntwort,
}: {
  offen: boolean
  onClose: () => void
  /** Der Eintrag, der gesucht wird. Sein Punkt ist der rote. */
  eintrag: ItemContent | null
  /** Alle anderen Eintraege auf demselben Bild. Sie bekommen blasse
   *  Punkte, damit man sieht, was die Erkennung sonst noch fand. */
  geschwister: ItemContent[]
  foto: ItemPhoto | null
  canEdit: boolean
  onAntwort: (eintrag: ItemContent, wert: boolean | null) => void
}) {
  const { t } = useSprache()
  const url = useSignedUrl('item-photos', foto?.path ?? null)
  const [geladen, setGeladen] = useState(false)

  useEffect(() => {
    if (offen) setGeladen(false)
  }, [offen, foto?.path])

  useEffect(() => {
    if (!offen) return
    function aufEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', aufEscape)
    return () => window.removeEventListener('keydown', aufEscape)
  }, [offen, onClose])

  if (!offen || !eintrag || !foto) return null

  const andere = geschwister.filter(
    (g) => g.id !== eintrag.id && g.photo_id === foto.id && g.punkt_x !== null,
  )

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label={eintrag.text}
    >
      {/* Kopfzeile: was gesucht wird, und der Weg hinaus. */}
      <div className="flex items-start gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <p className="break-words text-lg font-black text-white">
            {eintrag.qty > 1 ? <span className="t-serial">{eintrag.qty}x </span> : null}
            {eintrag.text}
          </p>
          <p className="text-sm font-semibold text-white/70">
            {eintrag.schicht ? t('schichten.schicht_n', { n: eintrag.schicht }) : null}
            {eintrag.schicht && foto.seite ? ' . ' : null}
            {foto.seite}
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

      {/* Das Bild. Die Punkte sitzen in Anteilen darauf, darum liegt der
          Rahmen genau auf dem Bild und nicht auf dem Bildschirm. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-3">
        <div className="relative inline-block max-h-full">
          {url ? (
            <img
              src={url}
              alt={eintrag.text}
              onLoad={() => setGeladen(true)}
              className="max-h-[70vh] max-w-full rounded-xl object-contain"
            />
          ) : (
            <Loading />
          )}

          {geladen && eintrag.punkt_x !== null && eintrag.punkt_y !== null ? (
            <>
              {andere.map((g) => (
                <span
                  key={g.id}
                  title={g.text}
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 bg-white/35"
                  style={{ left: `${Number(g.punkt_x) * 100}%`, top: `${Number(g.punkt_y) * 100}%` }}
                />
              ))}
              {/* Der gesuchte Punkt. Rot, groesser, mit Ring, damit er
                  auch auf einem bunten Bild auffaellt. */}
              <span
                className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-danger shadow-lg"
                style={{
                  left: `${Number(eintrag.punkt_x) * 100}%`,
                  top: `${Number(eintrag.punkt_y) * 100}%`,
                }}
              />
              <span
                className="pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-danger"
                style={{
                  left: `${Number(eintrag.punkt_x) * 100}%`,
                  top: `${Number(eintrag.punkt_y) * 100}%`,
                }}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Ja oder nein. Der aktuelle Stand steht als gedrueckter Knopf da,
          nicht als Text daneben: so sieht man ihn auch mit Kiste in der
          Hand. Noch einmal tippen nimmt die Antwort zurueck. */}
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {eintrag.punkt_x === null ? (
          <p className="mb-3 text-center text-sm font-semibold text-white/70">
            {t('schichten.kein_punkt')}
          </p>
        ) : (
          <p className="mb-3 text-center text-sm font-semibold text-white/70">
            {t('schichten.frage')}
          </p>
        )}
        {canEdit ? (
          <div className="flex gap-2">
            <Button
              full
              size="lg"
              variant={eintrag.bestaetigt === true ? 'primary' : 'outline'}
              className={cx(eintrag.bestaetigt !== true && 'border-white/40 bg-white/10 text-white')}
              onClick={() => onAntwort(eintrag, eintrag.bestaetigt === true ? null : true)}
            >
              <Check size={20} /> {t('schichten.ja')}
            </Button>
            <Button
              full
              size="lg"
              variant={eintrag.bestaetigt === false ? 'danger' : 'outline'}
              className={cx(
                eintrag.bestaetigt !== false && 'border-white/40 bg-white/10 text-white',
              )}
              onClick={() => onAntwort(eintrag, eintrag.bestaetigt === false ? null : false)}
            >
              <X size={20} /> {t('schichten.nein')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
