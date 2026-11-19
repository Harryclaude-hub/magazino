import QRCode from 'qrcode'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { Eye, EyeOff, Loader2, X } from 'lucide-react'
import { contrastOn, cx, initials, parseCode } from '../lib/util'
import { useT } from '../lib/i18n'
import { STATUS_COLOR, type ItemStatus } from '../lib/types'
import { Karton, Plastikkiste, Stapel } from './Designteile'

/* ------------------------------------------------------------------ Logo */

export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Magazino"
    >
      <rect width="512" height="512" rx="116" fill="#1D4ED8" />
      <g fill="none" strokeLinejoin="round" strokeLinecap="round">
        <path d="M132 386 V142 L256 288 L380 142 V386" stroke="#FFFFFF" strokeWidth="46" />
        <path d="M132 430 H380" stroke="#93C5FD" strokeWidth="26" />
      </g>
    </svg>
  )
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Logo size={size} />
      <span className="text-[1.3rem] font-bold tracking-[-0.03em]">Magazino</span>
    </span>
  )
}

/* --------------------------------------------------------------- Buttons */

type ButtonVariant = 'primary' | 'aktiv' | 'ghost' | 'outline' | 'danger' | 'soft'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  full?: boolean
}

/* Die drei Stufen von iOS, dazu Gefahr und Auswahl. Nur Optik, keine
 * Schatten.
 *   primary  gefuellt, die eine Hauptaktion einer Seite (Akzent)
 *   soft     getoent, zweite Stufe (Akzent auf zarter Akzentflaeche)
 *   outline  grau gefuellt, neutrale Aktion (hiess frueher Umriss)
 *   ghost    schlicht, nur Schrift in Akzent, dritte Stufe
 *   aktiv    der gewaehlte Zustand einer Auswahl (etwa der aktuelle Status)
 *   danger   gefuellt in Rot, nur fuer Loeschen und Unumkehrbares
 * Eingedrueckt wird jeder Knopf leicht dunkler und etwas kleiner; das
 * macht die Designschicht (design/oberflaeche.css, Klasse knopf). */
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-[1.05]',
  aktiv: 'bg-tint text-accent-text shadow-[inset_0_0_0_1.5px_var(--accent)]',
  soft: 'bg-tint text-accent-text hover:brightness-[0.97]',
  ghost: 'text-accent-text hover:bg-tint',
  outline: 'bg-feld text-ink hover:brightness-[0.97]',
  danger: 'bg-danger text-paper hover:brightness-110',
}

/* Mindesthoehe statt fester Hoehe: ein langer Name bricht um und schiebt
 * den Knopf hoeher, statt herauszuragen. */
const SIZES = {
  sm: 'min-h-10 py-1.5 px-3.5 text-[0.9375rem] gap-1.5',
  md: 'min-h-12 py-2 px-5 text-base gap-2',
  lg: 'min-h-[3.25rem] py-2.5 px-7 text-base gap-2.5',
  icon: 'h-12 w-12 justify-center',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  full,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        // leading-tight statt leading-none: sonst stossen Umlaute und arabische
        // Zeichen oben und unten an (E76). Langer Text darf umbrechen.
        'knopf inline-flex max-w-full items-center justify-center rounded-knopf text-center font-semibold leading-tight transition select-none',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        VARIANT[variant],
        SIZES[size],
        full && 'w-full',
        className,
      )}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  tone?: 'default' | 'danger'
  size?: 'sm' | 'md'
}

/** Symbolknopf: runde graue Flaeche mit Symbol in Akzent, wie die Knoepfe
 *  einer iOS-Kopfzeile. Ein nacktes Symbol liest sich nicht als Knopf,
 *  darum hat jedes eine Flaeche. */
export function IconButton({
  label,
  tone = 'default',
  size = 'md',
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      aria-label={label}
      title={label}
      className={cx(
        'knopf inline-flex shrink-0 items-center justify-center rounded-full transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'h-10 w-10' : 'h-11 w-11',
        tone === 'danger'
          ? 'bg-danger/10 text-danger hover:bg-danger/15'
          : 'bg-feld text-accent hover:brightness-[0.96]',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ---------------------------------------------------------------- Felder */

export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label?: string
  hint?: string
  error?: string | null
  children: ReactNode
  required?: boolean
}) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block px-1 text-sm font-semibold text-muted">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="mt-1.5 block px-1 text-sm font-medium text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block px-1 text-sm text-muted">{hint}</span>
      ) : null}
    </label>
  )
}

/* Eingabefeld wie in iOS: graue Flaeche ohne Rahmen, beim Fokus ein Ring in
 * Akzent. Der Rand ist durchsichtig da, damit beim Fokus nichts springt. */
const FIELD_BASE =
  'w-full rounded-[12px] border border-transparent bg-feld px-4 py-3 text-base text-ink ' +
  'placeholder:text-muted outline-none transition focus:border-accent ' +
  'focus:ring-[3px] focus:ring-accent/25 disabled:opacity-50 aria-[invalid=true]:border-danger'

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input {...rest} className={cx(FIELD_BASE, className)} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(FIELD_BASE, 'min-h-[92px] resize-y', className)} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx(FIELD_BASE, 'feld-auswahl appearance-none pe-10', className)}>
      {children}
    </select>
  )
}

/** Passwortfeld mit Auge.
 *
 *  Das Auge sitzt im Feld am Ende der Zeile (rechts, bei Arabisch links:
 *  end-1.5 und pe-11 statt right und pr). Es ist ein eigener Knopf mit
 *  type="button", schickt also nie das Formular ab, und ist mit Tab und
 *  Enter oder Leertaste bedienbar.
 *
 *  Mit Maus oder Finger nimmt der Knopf dem Feld weder Fokus noch
 *  Schreibmarke: mousedown wird abgefangen (kein blur, also auch keine
 *  Pruefung beim Verlassen), die Auswahl gemerkt und nach dem Umschalten
 *  der Feldart wieder gesetzt. Mit der Tastatur bleibt der Fokus auf dem
 *  Knopf, sonst schickte das naechste Enter das Formular ab.
 *
 *  verbergen: wechselt dieser Wert (etwa nach erfolgreichem Absenden), ist
 *  das Feld wieder verdeckt. */
export function PasswordInput({
  className,
  id,
  verbergen,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { verbergen?: number }) {
  const [show, setShow] = useState(false)
  // Wechsel von aussen: im Rendern angleichen statt in einem Effekt.
  const [runde, setRunde] = useState(verbergen)
  if (runde !== verbergen) {
    setRunde(verbergen)
    setShow(false)
  }
  const t = useT()
  const eigeneId = useId()
  const feldId = id ?? eigeneId
  const feld = useRef<HTMLInputElement>(null)
  const merk = useRef<{ start: number | null; ende: number | null } | null>(null)

  function merken() {
    const el = feld.current
    merk.current =
      el && document.activeElement === el ? { start: el.selectionStart, ende: el.selectionEnd } : null
  }

  // Nach dem Umschalten Fokus und Auswahl zurueck ins Feld (nur Zeiger).
  useLayoutEffect(() => {
    const m = merk.current
    merk.current = null
    const el = feld.current
    if (!m || !el) return
    el.focus({ preventScroll: true })
    const { start, ende } = m
    if (start == null || ende == null) return
    const setzen = () => {
      try {
        el.setSelectionRange(start, ende)
      } catch {
        /* Feldart ohne Auswahl, dann bleibt die Marke, wo sie ist */
      }
    }
    setzen()
    /* Chrome setzt die Auswahl nach einem echten Klick und dem Wechsel der
     * Feldart noch einmal auf 0 zurueck (im Browser nachgeprueft). Darum
     * einen Takt spaeter ein zweites Mal, solange das Feld den Fokus hat. */
    const zeit = window.setTimeout(() => {
      if (el.isConnected && document.activeElement === el) setzen()
    }, 0)
    return () => window.clearTimeout(zeit)
  }, [show])

  const label = show ? t('konto.passwort_verbergen') : t('konto.passwort_anzeigen')
  return (
    <div className="relative">
      <input
        {...rest}
        ref={feld}
        id={feldId}
        type={show ? 'text' : 'password'}
        // Sichtbar heisst nicht aenderbar: keine Grossschreibung, keine
        // Autokorrektur, keine Rechtschreibpruefung auf dem Handy.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cx(FIELD_BASE, 'pe-12', className)}
      />
      <button
        type="button"
        // Merken schon bei pointerdown (Finger: mousedown kommt erst am
        // Ende des Tippens). preventDefault auf mousedown haelt den Fokus im
        // Feld; auf pointerdown wuerde es mousedown ganz unterdruecken.
        onPointerDown={merken}
        onMouseDown={(e) => {
          e.preventDefault()
          if (!merk.current) merken()
        }}
        onClick={(e) => {
          // detail 0: per Tastatur ausgeloest, dann bleibt der Fokus hier.
          if (e.detail === 0) merk.current = null
          setShow((s) => !s)
        }}
        disabled={rest.disabled}
        aria-label={label}
        title={label}
        aria-pressed={show}
        aria-controls={feldId}
        className={cx(
          'absolute end-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center',
          'rounded-full text-muted transition hover:bg-feld hover:text-ink',
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        {show ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
      </button>
    </div>
  )
}

/** Schalter wie in iOS: 51 mal 31, runder weisser Knopf. Die Flaeche ist
 *  --schalter-an (Standard: Akzent) und --schalter-aus; die Feder beim
 *  Umlegen kommt aus der Designschicht (Klasse schalter-knopf). */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-base font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-sm text-muted">{hint}</span> : null}
      </label>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors disabled:opacity-40',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          checked ? 'bg-[var(--schalter-an)]' : 'bg-[var(--schalter-aus)]',
        )}
      >
        <span
          className={cx(
            'schalter-knopf absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white transition-transform',
            'shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16),0_3px_1px_rgba(0,0,0,0.06)]',
            checked ? 'translate-x-[20px]' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}

/** Umschalter mit zwei bis vier Stufen (iOS: Segmented Control), fuer
 *  Ansichten und Filter, die sich gegenseitig ausschliessen. Die gewaehlte
 *  Stufe ist eine helle Kapsel auf grauer Bahn. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  /** Name der Gruppe fuer Vorleseprogramme. */
  label: string
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx('inline-flex w-full gap-0.5 rounded-[10px] bg-feld p-0.5', className)}
    >
      {options.map((o) => {
        const an = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={an}
            onClick={() => onChange(o.value)}
            className={cx(
              'knopf min-h-9 min-w-0 flex-1 rounded-[8px] px-3 py-1.5 text-[0.9375rem] leading-tight text-ink transition',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
              an
                ? 'bg-surface font-semibold shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.1)]'
                : 'font-medium',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- Kacheln */

export function Card({
  children,
  className,
  as: As = 'div',
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <As
      {...rest}
      className={cx('rounded-karte border border-line bg-surface shadow-karte', className)}
    >
      {children}
    </As>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 size={18} className={cx('animate-spin text-muted', className)} />
}

export function Loading({ label }: { label?: string }) {
  const t = useT()
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-base text-muted">
      <Spinner />
      {label ?? t('zustand.laedt')}
    </div>
  )
}

export function ErrorBox({ error, onRetry }: { error: string; onRetry?: () => void }) {
  const t = useT()
  return (
    <div role="alert" className="rounded-karte bg-danger/8 p-4">
      <p className="t-name text-danger">{t('zustand.fehler')}</p>
      <p className="mt-1 text-base text-ink">{error}</p>
      {onRetry ? (
        <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
          {t('aktion.nochmal')}
        </Button>
      ) : null}
    </div>
  )
}

export function Empty({
  title,
  hint,
  action,
  icon,
  zeichnung = 'karton',
}: {
  title: string
  hint?: string
  action?: ReactNode
  icon?: ReactNode
  /** Kleine Zeichnung aus der Designschicht. Fehlt die Schicht, steht
   *  statt ihrer das Symbol da. 'keine' zeigt immer nur das Symbol. */
  zeichnung?: 'karton' | 'stapel' | 'plastik' | 'keine'
}) {
  const Bild =
    zeichnung === 'karton'
      ? Karton
      : zeichnung === 'stapel'
        ? Stapel
        : zeichnung === 'plastik'
          ? Plastikkiste
          : null
  return (
    <div className="leer flex flex-col items-center justify-center px-6 py-12 text-center">
      {Bild ? (
        <Bild className="leer-bild mb-4 h-24 w-28" />
      ) : icon ? (
        <div className="mb-3 text-muted">{icon}</div>
      ) : null}
      <p className="t-name-lg">{title}</p>
      {hint ? <p className="mt-1.5 max-w-sm text-base text-muted">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

/** Skelett beim Laden: graue Karten in der Form dessen, was gleich kommt.
 *  Der Satz steht fuer Vorleseprogramme trotzdem da. */
export function Skelett({
  label,
  art = 'liste',
  anzahl = 5,
}: {
  label?: string
  /** liste: Zeilen wie in einer Kistenliste. seite: Kopf und zwei Karten. */
  art?: 'liste' | 'seite'
  anzahl?: number
}) {
  const t = useT()
  return (
    <div role="status" aria-busy="true" className="skelett-flaeche">
      <span className="sr-only">{label ?? t('zustand.laedt')}</span>
      {art === 'liste' ? (
        <div className="overflow-hidden rounded-karte border border-line bg-surface">
          {Array.from({ length: anzahl }, (_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="flex items-center gap-3 border-b border-line px-3 py-4 last:border-b-0"
            >
              <span className="skelett h-12 w-2 shrink-0" />
              <span className="min-w-0 flex-1 space-y-2.5">
                <span className="skelett h-6 w-28" />
                <span className="skelett h-4 w-3/5" />
              </span>
              <span className="skelett h-8 w-24 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div aria-hidden="true" className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-karte border border-line bg-surface p-4 lg:order-3">
            <span className="skelett h-12 w-48" />
            <span className="skelett mt-4 h-5 w-2/3" />
            <span className="skelett mt-5 h-11 w-full rounded-full" />
          </div>
          <div className="space-y-3 rounded-karte border border-line bg-surface p-4 lg:order-1">
            {Array.from({ length: anzahl }, (_, i) => (
              <span key={i} className="skelett h-6" style={{ width: `${88 - ((i * 17) % 40)}%` }} />
            ))}
          </div>
          <div className="rounded-karte border border-line bg-surface p-4 lg:order-2">
            <span className="skelett aspect-[4/3] w-full" />
          </div>
        </div>
      )}
    </div>
  )
}

export function Badge({
  children,
  color,
  className,
}: {
  children: ReactNode
  color?: string
  className?: string
}) {
  const style = color ? { background: color, color: contrastOn(color) } : undefined
  return (
    <span
      style={style}
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold leading-4',
        !color && 'bg-raised text-ink',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Avatar({
  name,
  size = 36,
  src,
  color,
}: {
  name: string | null | undefined
  size?: number
  src?: string | null
  color?: string
}) {
  const bg = color ?? '#636366'
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: bg,
        color: contrastOn(bg),
        fontSize: size * 0.38,
      }}
    >
      {initials(name)}
    </span>
  )
}

/* ------------------------------------------------------------- Code-Chip */

/** Zeigt W-3-007. Die Groessenziffer steht immer rot, wie abgesprochen. */
export function CodeChip({
  code,
  size = 'md',
  className,
}: {
  code: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const p = parseCode(code)
  const cls = {
    sm: 'text-[0.8125rem] px-2 py-0.5',
    md: 'text-[1.0625rem] px-2.5 py-1',
    lg: 'text-2xl px-3 py-1.5',
    xl: 'text-4xl px-4 py-2',
  }[size]
  if (!p.ok) {
    return (
      <span className={cx('t-serial rounded-lg border border-line bg-raised', cls, className)}>
        {code}
      </span>
    )
  }
  return (
    <span
      className={cx(
        't-serial inline-flex items-baseline rounded-lg border border-line bg-raised',
        cls,
        className,
      )}
    >
      <span>{p.prefix}</span>
      <span className="opacity-40">-</span>
      <span className="text-danger">{p.size}</span>
      <span className="opacity-40">-</span>
      <span>{p.seq}</span>
    </span>
  )
}

export function StatusPill({
  status,
  size = 'md',
  onClick,
}: {
  status: ItemStatus
  size?: 'sm' | 'md'
  onClick?: () => void
}) {
  const color = STATUS_COLOR[status]
  const t = useT()
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      className={cx(
        'pille inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold text-ink',
        size === 'sm' ? 'px-2.5 py-1 text-[0.8125rem]' : 'px-3.5 py-1.5 text-[0.9375rem]',
        onClick && 'knopf transition hover:brightness-95',
      )}
      /* Die Schrift steht in Tinte, nicht in der Statusfarbe: Gelb und
       * Gruen als Schrift auf hellem Grund erreichen keine 4,5:1. Die Farbe
       * traegt der Punkt, der Rand und die leichte Toenung. */
      style={{ background: `${color}24`, borderColor: `${color}80` }}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      {t(`status.${status}`)}
    </Tag>
  )
}

/* ------------------------------------------------------------------- QR */

export function QrCode({
  value,
  size = 160,
  className,
  margin = 1,
}: {
  value: string
  size?: number
  className?: string
  margin?: number
}) {
  const path = useMemo(() => {
    try {
      const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
      const n = qr.modules.size
      const d = qr.modules.data
      let out = ''
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (d[y * n + x]) out += `M${x + margin} ${y + margin}h1v1h-1z`
        }
      }
      return { d: out, n: n + margin * 2 }
    } catch (err) {
      console.warn('[qr] konnte nicht erzeugt werden', err)
      return null
    }
  }, [value, margin])

  if (!path) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-raised text-[10px] text-muted"
        style={{ width: size, height: size }}
      >
        QR-Fehler
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${path.n} ${path.n}`}
      width={size}
      height={size}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR ${value}`}
    >
      <rect width={path.n} height={path.n} fill="#ffffff" />
      <path d={path.d} fill="#000000" />
    </svg>
  )
}

/** QR-Code mit Rahmen und der Nummer darunter. So ist auf einen Blick klar,
 *  zu welcher Kiste der Code gehoert, auch wenn das Etikett schief klebt. */
export function QrPanel({
  value,
  code,
  size = 190,
  caption,
  className,
}: {
  value: string
  code?: string
  size?: number
  caption?: string
  className?: string
}) {
  return (
    <div
      className={cx(
        'inline-flex flex-col items-center gap-2 rounded-[20px] bg-white p-3 shadow-karte ring-1 ring-black/10',
        className,
      )}
    >
      <QrCode value={value} size={size} />
      {code ? (
        <span className="t-serial text-center text-xl leading-none text-black">
          {(() => {
            const p = parseCode(code)
            if (!p.ok) return code
            return (
              <>
                {p.prefix}
                <span className="opacity-35">-</span>
                <span style={{ color: '#E11D48' }}>{p.size}</span>
                <span className="opacity-35">-</span>
                {p.seq}
              </>
            )
          })()}
        </span>
      ) : null}
      {caption ? (
        <span className="max-w-[16ch] text-center text-[0.8125rem] font-bold leading-tight text-black">
          {caption}
        </span>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------------- Dialog */

/** Zwei Arten, wie in iOS:
 *  - blatt (Standard): am Handy ein Bottom Sheet mit Griff, von unten
 *    kommend und mit dem Finger nach unten wegziehbar; am Computer ein
 *    zentriertes Blatt.
 *  - alert: schmales, zentriertes Fenster fuer eine kurze Rueckfrage, die
 *    Knoepfe stehen unten nebeneinander, getrennt durch Haarlinien.
 *  Beide liegen auf einem abgedunkelten, leicht unscharfen Grund. Esc und
 *  der Schliessen-Knopf gehen immer; das Wegziehen ist nur eine Abkuerzung
 *  fuer Finger. Die Bewegung selbst (Feder beim Kommen) steckt in
 *  design/oberflaeche.css, hier nur die Klassen d-schleier, d-blatt, d-alert. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  art = 'blatt',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  art?: 'blatt' | 'alert'
}) {
  const t = useT()
  const alert = art === 'alert'
  const blatt = useRef<HTMLDivElement>(null)
  const zieh = useRef<{ y0: number; y: number; zeit: number; tempo: number } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  /* Der Fokus geht ins Blatt (ausser ein Feld darin hat ihn schon) und beim
   * Schliessen zurueck zu dem, was das Blatt geoeffnet hat. */
  useEffect(() => {
    if (!open) return
    const vorher = document.activeElement
    const el = blatt.current
    if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true })
    return () => {
      if (vorher instanceof HTMLElement && vorher.isConnected) vorher.focus({ preventScroll: true })
    }
  }, [open])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  /* Wegziehen am Handy: das Blatt folgt dem Finger eins zu eins, nach oben
   * zaeh wie ein Gummiband. Beim Loslassen zaehlt, wohin die Bewegung
   * laeuft (Auslauf aus der Geschwindigkeit, wie bei Apple), nicht nur
   * wo der Finger steht: ein kurzer Wisch reicht. Sonst federt es zurueck. */
  function ziehStart(e: React.PointerEvent<HTMLDivElement>) {
    if (alert || e.pointerType === 'mouse' || !window.matchMedia('(max-width: 639px)').matches) return
    if ((e.target as HTMLElement).closest('button')) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ohne Festhalten geht es auch, nur ausserhalb des Blatts nicht */
    }
    zieh.current = { y0: e.clientY, y: e.clientY, zeit: e.timeStamp, tempo: 0 }
    window.clearTimeout(timer.current)
    if (blatt.current) {
      // Ein noch laufendes Kommen des Blatts endet hier: der Finger zaehlt.
      blatt.current.getAnimations().forEach((a) => a.cancel())
      blatt.current.style.transition = 'none'
    }
  }
  function ziehBewegt(e: React.PointerEvent<HTMLDivElement>) {
    const z = zieh.current
    const el = blatt.current
    if (!z || !el) return
    z.tempo = (e.clientY - z.y) / Math.max(1, e.timeStamp - z.zeit)
    z.y = e.clientY
    z.zeit = e.timeStamp
    const dy = e.clientY - z.y0
    el.style.transform = `translateY(${dy >= 0 ? dy : -Math.sqrt(-dy) * 2}px)`
  }
  function ziehEnde() {
    const z = zieh.current
    const el = blatt.current
    zieh.current = null
    if (!z || !el) return
    const still =
      document.documentElement.dataset.motion === 'ruhig' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ziel = z.y - z.y0 + z.tempo * 499
    if (ziel > el.offsetHeight * 0.45) {
      if (still) {
        onClose()
        return
      }
      el.style.transition = 'transform 220ms var(--kurve)'
      el.style.transform = 'translateY(100%)'
      timer.current = window.setTimeout(onClose, 200)
    } else {
      el.style.transition = still ? 'none' : 'transform 350ms var(--feder-blatt)'
      el.style.transform = ''
    }
  }

  if (!open) return null
  /* Ueber ein Portal direkt an body: eine Spalte mit sticky bildet eine
   * eigene Ebene, darin half z-50 nicht gegen die Kopfzeile. */
  return createPortal(
    <div
      className={cx(
        'fixed inset-0 z-50 flex justify-center',
        alert ? 'items-center p-6' : 'items-end sm:items-center sm:p-6',
      )}
    >
      <div
        className="d-schleier absolute inset-0 bg-[var(--schleier)] backdrop-blur-[3px]"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={blatt}
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          'd-blatt relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface text-ink shadow-dialog outline-none',
          alert
            ? 'd-alert max-w-[17.5rem] rounded-[20px]'
            : cx('rounded-t-[20px] sm:rounded-[20px]', wide ? 'sm:max-w-2xl' : 'sm:max-w-md'),
        )}
      >
        {alert ? (
          <h2 className="t-name px-5 pt-5 text-center">{title}</h2>
        ) : (
          <div
            className="shrink-0 touch-none border-b border-line px-4 sm:touch-auto"
            onPointerDown={ziehStart}
            onPointerMove={ziehBewegt}
            onPointerUp={ziehEnde}
            onPointerCancel={ziehEnde}
          >
            <span className="kopf-griff sm:hidden" aria-hidden="true" />
            <div className="flex items-center gap-3 pb-3 pt-1.5 sm:pt-3.5">
              <span className="w-9 shrink-0" aria-hidden="true" />
              <h2 className="t-name line-clamp-2 min-w-0 flex-1 text-center">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('aktion.schliessen')}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-feld text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent after:absolute after:-inset-1 after:content-['']"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        <div
          className={cx(
            'scrollbar-thin flex-1 overflow-y-auto overscroll-contain',
            alert
              ? 'px-5 pb-5 pt-1.5 text-center'
              : cx('px-5 py-4', !footer && 'max-sm:pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]'),
          )}
        >
          {children}
        </div>
        {footer ? (
          alert ? (
            <div className="grid auto-cols-fr grid-flow-col border-t border-line">{footer}</div>
          ) : (
            <div className="safe-bottom flex flex-wrap justify-end gap-2.5 border-t border-line px-5 py-3 max-sm:[&>*]:flex-1">
              {footer}
            </div>
          )
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  danger = true,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  onClose: () => void
  danger?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const t = useT()
  /* Alert wie in iOS: die Rueckfrage in der Mitte, Abbrechen in Akzent,
   * die Entscheidung daneben halbfett (rot, wenn sie etwas loescht). */
  const knopf =
    'flex min-h-12 items-center justify-center gap-2 px-3 text-base transition active:bg-feld ' +
    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent'
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      art="alert"
      footer={
        <>
          <button type="button" onClick={onClose} className={cx(knopf, 'font-medium text-accent-text')}>
            {t('aktion.abbrechen')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm()
                onClose()
              } finally {
                setBusy(false)
              }
            }}
            className={cx(
              knopf,
              'border-s border-line font-semibold disabled:opacity-45',
              danger ? 'text-danger' : 'text-accent-text',
            )}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {confirmLabel ?? t('aktion.loeschen')}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink">{body}</p>
    </Modal>
  )
}

/* --------------------------------------------------------------- Hinweise */

type ToastKind = 'ok' | 'error' | 'info'
interface Toast {
  id: string
  kind: ToastKind
  text: string
}
const ToastCtx = createContext<{
  push: (text: string, kind?: ToastKind) => void
} | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const timers = useRef<Record<string, number>>({})

  const push = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = crypto.randomUUID()
    setItems((list) => [...list.slice(-3), { id, kind, text }])
    timers.current[id] = window.setTimeout(() => {
      setItems((list) => list.filter((t) => t.id !== id))
      delete timers.current[id]
    }, kind === 'error' ? 6000 : 3200)
  }, [])

  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout)
    },
    [],
  )

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[var(--nav-h,0px)] z-[100] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cx(
              'animate-in pointer-events-auto max-w-sm rounded-2xl px-4 py-3 text-[0.9375rem] font-medium shadow-dialog',
              t.kind === 'ok' && 'bg-ok text-paper',
              t.kind === 'error' && 'bg-danger text-paper',
              t.kind === 'info' && 'bg-surface text-ink ring-1 ring-line',
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast ausserhalb von ToastProvider')
  return ctx.push
}

/* ------------------------------------------------------------- Tabs, Chips */

/** Auswahlkapsel fuer Filter. Ruhig: graue Flaeche, gewaehlt gefuellt in
 *  Akzent. Fuer Gruppen, die sich ausschliessen, gibt es Segmented. */
export function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  color?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'knopf inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[0.9375rem] transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        active
          ? 'bg-accent font-semibold text-accent-ink'
          : 'bg-feld font-medium text-ink hover:brightness-[0.96]',
      )}
    >
      {color ? (
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      ) : null}
      {children}
    </button>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    // Titel eines Abschnitts wie die Zwischenueberschrift in iOS: Title 3,
    // halbfett, ohne Linie und ohne Zierstrich. Die Gliederung kommt aus
    // Groesse und Abstand.
    <div className="mb-2.5 mt-1 flex items-center justify-between gap-3">
      <h2 className="min-w-0 text-[1.18rem] font-bold leading-tight tracking-[-0.024em] text-ink">
        {children}
      </h2>
      {action}
    </div>
  )
}
