import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react'
import { Armchair, Bed, Info, Move } from 'lucide-react'
import { useSprache } from '../../lib/i18n'
import { cx } from '../../lib/util'
import { menueEintraege, menueLage, type MenueEintrag } from './moebelInfo'

/* Kontextmenue beim Begehen (E92): Rechtsklick (am Handy langes Druecken)
 * auf ein Moebel, Regal oder einen Schrank. Steht in der 3D-Flaeche am
 * Zeiger, ganz im sichtbaren Bereich (menueLage), auch im Vollbild, ohne
 * Portal (alles an body laege im Vollbild unsichtbar dahinter). Die Lage
 * wird nie gespiegelt: links und oben am Zeiger, in jeder Sprache (die
 * 3D-Flaeche ist ltr). Nur die Eintraege lesen sich in ihrer Sprache
 * (im Arabischen Zeichen rechts, Wort daneben).
 *
 * Nacharbeit E92: Laesst sich das Moebel gerade nicht tragen, weil es
 * gesperrt ist (Mauer, Spiegel, Geraet), steht Verschieben ausgegraut da,
 * darunter der Grund wie beim Hinweis aus E89. Bei einem Bett heisst der
 * Eintrag Hinlegen (Bett-Zeichen) statt Hinsetzen.
 *
 * Tastatur: der erste Eintrag hat beim Oeffnen den Fokus, Pfeil hoch und
 * runter (auch Pos1 und Ende) wandern, Enter waehlt, Tab schliesst. Esc,
 * ein Druck daneben, Gehen und das Mausrad schliessen es; das regelt
 * Raum3D (mit dem Motor). Pfeiltasten bleiben im Menue, damit man nicht
 * losgeht; W A S D gehen weiter an den Motor (und schliessen es dann).
 */

const ZEICHEN: Record<MenueEintrag, typeof Info> = {
  details: Info,
  verschieben: Move,
  hinsetzen: Armchair,
  hinlegen: Bed,
}

const NAME: Record<MenueEintrag, string> = {
  details: 'plan3d.menue_details',
  verschieben: 'plan3d.menue_verschieben',
  hinsetzen: 'plan3d.menue_hinsetzen',
  hinlegen: 'plan3d.menue_hinlegen',
}

export interface MoebelMenueProps {
  /** Stelle am Bildschirm (CSS-Pixel in der 3D-Flaeche) und was geht. */
  x: number
  y: number
  tragbar: boolean
  /** Tragen ginge, aber nicht dieses (Verschieben ausgegraut mit Grund). */
  gesperrt?: boolean
  sitzbar: boolean
  /** Der Platz ist ein Liegeplatz: Hinlegen statt Hinsetzen. */
  liegen?: boolean
  /** Name des Moebels (fuer Vorleser), leer: ohne. */
  name: string
  onWahl(e: MenueEintrag): void
  onZu(): void
}

/** Nichts, was im Menue passiert, darf in der Szene ankommen. */
function anhalten(e: SyntheticEvent) {
  e.stopPropagation()
}

export default function MoebelMenue({ x, y, tragbar, gesperrt = false, sitzbar, liegen = false, name, onWahl, onZu }: MoebelMenueProps) {
  const { t, dir } = useSprache()
  const kasten = useRef<HTMLDivElement>(null)
  const knoepfe = useRef<(HTMLButtonElement | null)[]>([])
  const eintraege = menueEintraege({ tragbar, gesperrt, sitzbar, liegen })
  // Erst gemessen, dann gezeigt: so springt es nicht sichtbar an den Rand.
  const [lage, setLage] = useState<{ links: number; oben: number } | null>(null)

  useLayoutEffect(() => {
    const el = kasten.current
    const flaeche = el?.offsetParent as HTMLElement | null
    if (!el || !flaeche) return
    setLage(menueLage(x, y, el.offsetWidth, el.offsetHeight, flaeche.clientWidth, flaeche.clientHeight))
  }, [x, y, eintraege.length])

  // Beim Oeffnen der erste Eintrag (ohne zu rollen).
  useEffect(() => {
    if (lage) knoepfe.current[0]?.focus({ preventScroll: true })
  }, [lage])

  function tasten(e: KeyboardEvent<HTMLDivElement>) {
    const liste = knoepfe.current.filter((b): b is HTMLButtonElement => !!b)
    const i = liste.findIndex((b) => b === document.activeElement)
    const zu = (n: number) => liste[(n + liste.length) % liste.length]?.focus({ preventScroll: true })
    switch (e.key) {
      case 'ArrowDown':
        zu(i + 1)
        break
      case 'ArrowUp':
        zu(i < 0 ? liste.length - 1 : i - 1)
        break
      case 'Home':
        zu(0)
        break
      case 'End':
        zu(liste.length - 1)
        break
      case 'Tab':
        onZu()
        break
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Enter':
        // Enter waehlt ueber den Knopf selbst (click); links und rechts
        // sollen nur nicht losgehen.
        e.stopPropagation()
        return
      default:
        // W A S D und alles andere gehen weiter (Gehen schliesst das Menue).
        return
    }
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      ref={kasten}
      role="menu"
      aria-label={name ? t('plan3d.menue', { name }) : undefined}
      aria-orientation="vertical"
      dir={dir}
      data-moebel-menue=""
      onPointerDown={anhalten}
      onKeyDown={tasten}
      onContextMenu={(e) => {
        // Kein Menue des Browsers ueber dem eigenen.
        e.preventDefault()
        e.stopPropagation()
      }}
      // Physisch links und oben (left, top), nie gespiegelt, auch mit dir rtl.
      style={lage ? { left: lage.links, top: lage.oben } : { left: x, top: y, visibility: 'hidden' }}
      className="absolute z-50 flex min-w-40 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-xl border border-line bg-surface/95 p-1 text-ink shadow-lg"
    >
      {eintraege.map((e, i) => {
        const Zeichen = ZEICHEN[e]
        // Gesperrt: bleibt mit Pfeilen erreichbar (aria-disabled), waehlt
        // aber nichts und sagt den Grund.
        const aus = e === 'verschieben' && !tragbar
        return (
          <button
            key={e}
            ref={(b) => {
              knoepfe.current[i] = b
            }}
            type="button"
            role="menuitem"
            tabIndex={i === 0 ? 0 : -1}
            data-menue={e}
            aria-disabled={aus || undefined}
            onClick={() => {
              if (!aus) onWahl(e)
            }}
            className={cx(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm font-bold',
              'focus-visible:bg-raised focus-visible:outline-2 focus-visible:outline-ink',
              aus ? 'cursor-default text-muted' : 'hover:bg-raised',
            )}
          >
            <Zeichen size={16} className="shrink-0" aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span dir="auto" className="truncate">
                {t(NAME[e])}
              </span>
              {aus ? (
                <span dir="auto" data-menue-grund="" className="text-xs font-normal">
                  {t('plan3d.moebel_gesperrt')}
                </span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
