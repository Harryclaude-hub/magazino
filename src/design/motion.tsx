import { STUFEN, STUFE_SYMBOL, useMotion, type Stufe } from '../lib/bewegung'

/* Schalter fuer die Bewegungsstufe in der Kopfzeile der Startseite.
 *
 * Reine Optik. Die Stufe selbst (Werte, Speichern, Attribut) steht in
 * src/lib/bewegung.ts, damit die Einstellungen nichts aus diesem Ordner
 * brauchen. Nimmt man diese Datei weg, faellt nur dieser Schalter weg.
 */

const STUFE_TEXT: Record<Stufe, { name: string; hinweis: string }> = {
  ruhig: { name: 'Ruhig', hinweis: 'Nichts bewegt sich. Schont den Akku.' },
  normal: {
    name: 'Normal',
    hinweis: 'Der Hintergrund steht fest, der Vordergrund scrollt darüber.',
  },
  voll: { name: 'Voll', hinweis: 'Dazu driftende Kisten und atmende Lichter.' },
}

/** Kleiner Schalter fuer die Kopfzeile der Startseite. */
export function MotionToggle() {
  const { stufe, setStufe } = useMotion()
  const Symbol = STUFE_SYMBOL[stufe]
  const naechste = STUFEN[(STUFEN.indexOf(stufe) + 1) % STUFEN.length]
  return (
    <button
      type="button"
      onClick={() => setStufe(naechste)}
      title={`Bewegung: ${STUFE_TEXT[stufe].name}. ${STUFE_TEXT[stufe].hinweis}`}
      aria-label={`Bewegung umschalten, aktuell ${STUFE_TEXT[stufe].name}`}
      className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-transparent px-3 text-[0.9375rem] font-bold text-ink transition hover:border-line hover:bg-raised active:scale-95"
    >
      <Symbol size={19} />
      <span className="hidden sm:inline">{STUFE_TEXT[stufe].name}</span>
    </button>
  )
}
