import { SYMBOL_ARTEN } from './werkzeuge/strom'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { Button, Chip, CodeChip, Input, Select } from '../components/ui'
import { flaecheQm, raumTitel } from '../components/plan/hilfe'
import { objektName } from '../components/plan/lage'
import { BODEN_STANDARD, BODENFARBEN, kontrast, OBJEKTFARBEN, WANDFARBEN, type DatenFarbe } from '../lib/farben'
import { cmText, laengeLesen } from '../lib/geometrie'
import { useSprache } from '../lib/i18n'
import { MATERIALIEN, type Objekt, type Oeffnung, type PlanKiste, type PlanLinie, type PlanSymbol, type Raum, type Tag } from '../lib/types'
import { cx } from '../lib/util'
import {
  eckeEinfuegen,
  eckeEntfernen,
  eckeVerschieben,
  kanteLaengeSetzen,
  kistenImRaum,
  loeschen,
  objektGedreht,
  objektPasst,
  objektSetzen,
  raumAendern,
  raumVon,
  symbolAendern,
  symbolVerschieben,
  type Auswahl,
  type Dok,
} from './dok'
import { oeffnungPasst } from './werkzeuge/oeffnung'
import { FaecherEditor } from './FaecherEditor'

/* Rechte Spalte des Zeichners: was gewaehlt ist, laesst sich hier auf den
 * Zentimeter einstellen. Jede Eingabe gilt beim Verlassen des Felds oder
 * mit Enter und ist eine eigene Aktion (Rueckgaengig, sofort gespeichert).
 * Zahlen mit laengeLesen: "3,45" und "3.45" sind Meter, "345" Zentimeter.
 */

type Aendern = (dok: Dok, auswahl?: Auswahl) => void

export interface EigenschaftenProps {
  dok: Dok
  auswahl: NonNullable<Auswahl>
  projectId: string
  zimmer: Tag[]
  aendern: Aendern
  hinweis: (text: string) => void
  loeschenFragen: (raumId: string, codes: string[]) => void
  neuesZimmer: (raumId: string) => void
  vomPlatz: (k: PlanKiste) => void
}

function Abschnitt({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-b border-line pb-4">
      <h3 className="text-sm font-black uppercase tracking-wider text-muted">{titel}</h3>
      {children}
    </section>
  )
}

function Zeile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      {children}
    </label>
  )
}

/** Laenge in cm; uebernimmt beim Verlassen oder mit Enter. Neu gezeichnet
 *  (key), sobald sich der Wert von aussen aendert, etwa durch Rueckgaengig. */
export function MassFeld(p: MassFeldProps) {
  return <MassFeldKern key={p.wert} {...p} />
}

interface MassFeldProps {
  label: string
  wert: number
  onSetzen: (cm: number) => void
  min?: number
  max?: number
}

function MassFeldKern({ label, wert, onSetzen, min = 1, max = 50000 }: MassFeldProps) {
  const { t, lang } = useSprache()
  const [text, setText] = useState(String(wert))
  const [falsch, setFalsch] = useState(false)
  const setzen = () => {
    const v = laengeLesen(text)
    if (v === null || v < min || v > max) {
      setFalsch(true)
      return
    }
    setFalsch(false)
    if (v !== wert) onSetzen(v)
    setText(String(v))
  }
  return (
    <Zeile label={label}>
      <div className="flex items-center gap-2">
        <Input
          dir="ltr"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={setzen}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') {
              setText(String(wert))
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          className={cx('t-serial w-28 py-2', falsch && 'border-danger')}
          aria-invalid={falsch}
        />
        <span className="t-sub t-serial whitespace-nowrap">{cmText(wert, lang)}</span>
      </div>
      {falsch ? (
        <span className="mt-1 block text-sm font-bold text-danger">{t('zeichner.mass_falsch', { min, max })}</span>
      ) : null}
    </Zeile>
  )
}

/** Ein Textfeld, das beim Verlassen uebernimmt (Name eines Raums oder
 *  Moebels). */
type TextFeldProps = { label: string; wert: string; platzhalter?: string; onSetzen: (text: string) => void; laenge?: number; dir?: 'ltr' }

function TextFeld(p: TextFeldProps) {
  return <TextFeldKern key={p.wert} {...p} />
}

function TextFeldKern({ label, wert, platzhalter, onSetzen, laenge = 60, dir }: TextFeldProps) {
  const [text, setText] = useState(wert)
  return (
    <Zeile label={label}>
      <Input
        value={text}
        dir={dir}
        maxLength={laenge}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text.trim() !== wert && onSetzen(text.trim())}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder={platzhalter}
        className="py-2"
      />
    </Zeile>
  )
}

function Farbwahl({
  farben,
  wert,
  onWahl,
  standard,
}: {
  farben: DatenFarbe[]
  wert: string | null
  onWahl: (hex: string | null) => void
  standard: string
}) {
  const { t } = useSprache()
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onWahl(null)}
        aria-pressed={wert === null}
        className={cx(
          'h-9 rounded-lg border-2 px-2.5 text-sm font-bold',
          wert === null ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink',
        )}
      >
        {standard}
      </button>
      {farben.map((f) => (
        <button
          key={f.hex}
          type="button"
          onClick={() => onWahl(f.hex)}
          aria-pressed={wert?.toLowerCase() === f.hex}
          aria-label={t(`plan.farbe.${f.schluessel}`)}
          title={t(`plan.farbe.${f.schluessel}`)}
          className="h-9 w-9 rounded-lg border-[3px]"
          style={{ background: f.hex, borderColor: wert?.toLowerCase() === f.hex ? 'var(--ink)' : 'transparent' }}
        />
      ))}
    </div>
  )
}

function LoeschKnopf({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="text-danger">
      <Trash2 size={16} /> {children}
    </Button>
  )
}

/* ------------------------------------------------------------------ Raum */

function RaumTeil({ p, raum }: { p: EigenschaftenProps; raum: Raum }) {
  const { t, lang } = useSprache()
  const belegt = new Set(p.dok.raeume.filter((r) => r.id !== raum.id && r.tag_id).map((r) => r.tag_id))
  const frei = p.zimmer.filter((z) => !belegt.has(z.id))
  const setze = (werte: Partial<Raum>) => p.aendern(raumAendern(p.dok, raum.id, werte), { art: 'raum', id: raum.id })
  const boden = raum.bodenfarbe ?? BODEN_STANDARD

  return (
    <>
      <Abschnitt titel={t('zeichner.eig.raum')}>
        <p className="t-name">{raumTitel(raum) || t('plan.raum_ohne_name')}</p>
        <p className="t-sub t-serial">
          {t('plan.m2', { n: String(flaecheQm(raum.punkte)).replace('.', lang === 'ar' ? '.' : ',') })}
        </p>
        <Zeile label={t('zeichner.eig.zimmer')}>
          <Select
            value={raum.tag_id ?? ''}
            onChange={(e) => {
              const tag = p.zimmer.find((z) => z.id === e.target.value) ?? null
              setze({ tag_id: tag?.id ?? null, tag_name: tag?.name ?? null, tag_short: tag?.short ?? null, tag_color: tag?.color ?? null })
            }}
            className="py-2"
          >
            <option value="">{t('zeichner.eig.kein_zimmer')}</option>
            {frei.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </Select>
        </Zeile>
        <Button size="sm" variant="soft" onClick={() => p.neuesZimmer(raum.id)}>
          <Plus size={16} /> {t('zeichner.eig.neues_zimmer')}
        </Button>
        {!raum.tag_id ? (
          <TextFeld
            label={t('zeichner.eig.name')}
            wert={raum.name}
            platzhalter={t('zeichner.eig.name_platzhalter')}
            onSetzen={(name) => setze({ name })}
          />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Chip active={raum.art === 'innen'} onClick={() => setze({ art: 'innen' })}>
            {t('zeichner.eig.innen')}
          </Chip>
          <Chip active={raum.art === 'draussen'} onClick={() => setze({ art: 'draussen' })}>
            {t('zeichner.eig.draussen')}
          </Chip>
        </div>
        <MassFeld label={t('zeichner.eig.raumhoehe')} wert={raum.hoehe_cm} min={50} max={600} onSetzen={(v) => setze({ hoehe_cm: v })} />
      </Abschnitt>

      <Abschnitt titel={t('zeichner.eig.bodenfarbe')}>
        <Farbwahl farben={BODENFARBEN} wert={raum.bodenfarbe} standard={t('zeichner.eig.standard')} onWahl={(hex) => setze({ bodenfarbe: hex })} />
      </Abschnitt>

      <Abschnitt titel={t('zeichner.eig.wandfarben')}>
        <p className="t-sub">{t('zeichner.eig.wandfarben_hilfe')}</p>
        {raum.punkte.map((a, k) => {
          const b = raum.punkte[(k + 1) % raum.punkte.length]
          const farbe = raum.wandfarben?.[k] ?? null
          const k3 = farbe ? kontrast(farbe, boden) : null
          return (
            <div key={k} className="space-y-1.5">
              <p className="text-sm font-bold">
                {t('zeichner.eig.wand_n', { n: k + 1 })}{' '}
                <span className="t-serial text-muted">{Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]))} cm</span>
              </p>
              <Farbwahl
                farben={WANDFARBEN}
                wert={farbe}
                standard={t('zeichner.eig.standard')}
                onWahl={(hex) => {
                  const liste = raum.wandfarben ? [...raum.wandfarben] : raum.punkte.map(() => null)
                  liste[k] = hex
                  setze({ wandfarben: liste.every((f) => !f) ? null : liste })
                }}
              />
              {k3 !== null && k3 < 3 ? (
                <p className="text-sm font-bold text-warn">{t('zeichner.eig.kontrast_schwach', { n: k3.toFixed(1) })}</p>
              ) : null}
            </div>
          )
        })}
      </Abschnitt>

      <LoeschKnopf
        onClick={() => {
          const codes = kistenImRaum(p.dok, raum.id).map((k) => k.code)
          if (codes.length) p.loeschenFragen(raum.id, codes)
          else p.aendern(loeschen(p.dok, { art: 'raum', id: raum.id }), null)
        }}
      >
        {t('zeichner.eig.raum_loeschen')}
      </LoeschKnopf>
    </>
  )
}

function KanteTeil({ p, raum, kante }: { p: EigenschaftenProps; raum: Raum; kante: number }) {
  const { t } = useSprache()
  const n = raum.punkte.length
  const a = raum.punkte[kante]
  const b = raum.punkte[(kante + 1) % n]
  const laenge = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]))
  const farbe = raum.wandfarben?.[kante] ?? null
  return (
    <Abschnitt titel={t('zeichner.eig.wand_von', { n: kante + 1, raum: raumTitel(raum) || t('plan.raum_ohne_name') })}>
      <MassFeld
        label={t('zeichner.eig.laenge')}
        wert={laenge}
        onSetzen={(v) => {
          const neu = kanteLaengeSetzen(p.dok, raum.id, kante, v)
          if (neu) p.aendern(neu, p.auswahl)
          else p.hinweis(t('zeichner.laenge_geht_nicht'))
        }}
      />
      <p className="t-sub">{t('zeichner.eig.laenge_hilfe')}</p>
      <Zeile label={t('zeichner.eig.wandfarbe')}>
        <Farbwahl
          farben={WANDFARBEN}
          wert={farbe}
          standard={t('zeichner.eig.standard')}
          onWahl={(hex) => {
            const liste = raum.wandfarben ? [...raum.wandfarben] : raum.punkte.map(() => null)
            liste[kante] = hex
            p.aendern(raumAendern(p.dok, raum.id, { wandfarben: liste.every((f) => !f) ? null : liste }), p.auswahl)
          }}
        />
      </Zeile>
      <Button
        size="sm"
        variant="soft"
        onClick={() => {
          const neu = eckeEinfuegen(p.dok, raum.id, kante, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])
          if (neu) p.aendern(neu, { art: 'ecke', raumId: raum.id, ecke: kante + 1 })
        }}
      >
        <Plus size={16} /> {t('zeichner.eig.ecke_einfuegen')}
      </Button>
    </Abschnitt>
  )
}

function EckeTeil({ p, raum, ecke }: { p: EigenschaftenProps; raum: Raum; ecke: number }) {
  const { t } = useSprache()
  const q = raum.punkte[ecke]
  return (
    <Abschnitt titel={t('zeichner.eig.ecke_n', { n: ecke + 1 })}>
      <MassFeld label={t('zeichner.eig.von_links')} wert={q[0]} min={0} onSetzen={(v) => p.aendern(eckeVerschieben(p.dok, raum.id, ecke, [v, q[1]]), p.auswahl)} />
      <MassFeld label={t('zeichner.eig.von_oben')} wert={q[1]} min={0} onSetzen={(v) => p.aendern(eckeVerschieben(p.dok, raum.id, ecke, [q[0], v]), p.auswahl)} />
      <LoeschKnopf
        onClick={() => {
          const neu = eckeEntfernen(p.dok, raum.id, ecke)
          if (neu) p.aendern(neu, { art: 'raum', id: raum.id })
          else p.hinweis(t('zeichner.ecke_bleibt'))
        }}
      >
        {t('zeichner.eig.ecke_entfernen')}
      </LoeschKnopf>
    </Abschnitt>
  )
}

/** Steckdose, Licht oder Schalter: Art wechseln, Lage, Loeschen. */
function SymbolTeil({ p, s }: { p: EigenschaftenProps; s: PlanSymbol }) {
  const { t } = useSprache()
  return (
    <Abschnitt titel={t(`zeichner.strom.${s.art}`)}>
      <div className="flex flex-wrap gap-1.5">
        {SYMBOL_ARTEN.map((a) => (
          <Button key={a} size="sm" variant={a === s.art ? 'aktiv' : 'outline'} onClick={() => p.aendern(symbolAendern(p.dok, s.id, a), p.auswahl)}>
            {t(`zeichner.strom.${a}`)}
          </Button>
        ))}
      </div>
      <MassFeld label={t('zeichner.eig.von_links')} wert={s.x} onSetzen={(v) => p.aendern(symbolVerschieben(p.dok, s.id, v - s.x, 0), p.auswahl)} />
      <MassFeld label={t('zeichner.eig.von_oben')} wert={s.y} onSetzen={(v) => p.aendern(symbolVerschieben(p.dok, s.id, 0, v - s.y), p.auswahl)} />
      <LoeschKnopf onClick={() => p.aendern(loeschen(p.dok, { art: 'symbol', id: s.id }), null)}>{t('zeichner.strom.loeschen')}</LoeschKnopf>
    </Abschnitt>
  )
}

/** Gestrichelte Hilfslinie: Laenge (der Anfang bleibt) und Loeschen. */
function LinieTeil({ p, l }: { p: EigenschaftenProps; l: PlanLinie }) {
  const { t } = useSprache()
  const laenge = Math.round(Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]))
  const setzeLaenge = (v: number) => {
    const alt = laenge || 1
    const b: [number, number] = [
      Math.round(l.a[0] + ((l.b[0] - l.a[0]) * v) / alt),
      Math.round(l.a[1] + ((l.b[1] - l.a[1]) * v) / alt),
    ]
    p.aendern(
      { ...p.dok, grundriss: { ...p.dok.grundriss, linien: (p.dok.grundriss.linien ?? []).map((x) => (x.id === l.id ? { ...x, b } : x)) } },
      p.auswahl,
    )
  }
  return (
    <Abschnitt titel={t('zeichner.werkzeug.linie')}>
      <p className="t-sub">{t('zeichner.eig.linie_hinweis')}</p>
      <MassFeld label={t('zeichner.eig.laenge')} wert={laenge} min={1} onSetzen={setzeLaenge} />
      <LoeschKnopf onClick={() => p.aendern(loeschen(p.dok, { art: 'linie', id: l.id }), null)}>
        {t('zeichner.eig.linie_loeschen')}
      </LoeschKnopf>
    </Abschnitt>
  )
}

function OeffnungTeil({ p, o }: { p: EigenschaftenProps; o: Oeffnung }) {
  const { t } = useSprache()
  const raum = raumVon(p.dok, o.raum_id)
  const setze = (werte: Partial<Oeffnung>) => {
    const neu = { ...o, ...werte }
    if (raum && !oeffnungPasst(p.dok, neu, raum)) {
      p.hinweis(t(`zeichner.${o.art}_passt_nicht`))
      return
    }
    p.aendern({ ...p.dok, oeffnungen: p.dok.oeffnungen.map((x) => (x.id === o.id ? neu : x)) }, p.auswahl)
  }
  return (
    <Abschnitt titel={t(`plan.${o.art}`)}>
      {o.art !== 'fenster' ? (
        <Zeile label={t('zeichner.eig.oeffnung_art')}>
          <div className="flex gap-2">
            <Chip active={o.art === 'tuer'} onClick={() => setze({ art: 'tuer' })}>
              {t('plan.tuer')}
            </Chip>
            <Chip active={o.art === 'durchgang'} onClick={() => setze({ art: 'durchgang' })}>
              {t('plan.durchgang')}
            </Chip>
          </div>
        </Zeile>
      ) : null}
      <MassFeld label={t('zeichner.eig.abstand')} wert={o.abstand_cm} min={0} onSetzen={(v) => setze({ abstand_cm: v })} />
      <MassFeld label={t('zeichner.eig.breite')} wert={o.breite_cm} min={20} max={600} onSetzen={(v) => setze({ breite_cm: v })} />
      <MassFeld label={t('zeichner.eig.hoehe')} wert={o.hoehe_cm} min={20} max={600} onSetzen={(v) => setze({ hoehe_cm: v })} />
      {o.art === 'fenster' ? (
        <MassFeld label={t('zeichner.eig.bruestung')} wert={o.bruestung_cm} min={0} max={400} onSetzen={(v) => setze({ bruestung_cm: v })} />
      ) : null}
      {o.art === 'tuer' ? (
        <>
          <Zeile label={t('zeichner.eig.anschlag')}>
            <div className="flex gap-2">
              <Chip active={o.anschlag === 'links'} onClick={() => setze({ anschlag: 'links' })}>
                {t('zeichner.eig.links')}
              </Chip>
              <Chip active={o.anschlag === 'rechts'} onClick={() => setze({ anschlag: 'rechts' })}>
                {t('zeichner.eig.rechts')}
              </Chip>
            </div>
          </Zeile>
          <Zeile label={t('zeichner.eig.aufschlag')}>
            <div className="flex gap-2">
              <Chip active={o.aufschlag === 'innen'} onClick={() => setze({ aufschlag: 'innen' })}>
                {t('zeichner.eig.nach_innen')}
              </Chip>
              <Chip active={o.aufschlag === 'aussen'} onClick={() => setze({ aufschlag: 'aussen' })}>
                {t('zeichner.eig.nach_aussen')}
              </Chip>
            </div>
          </Zeile>
        </>
      ) : null}
      <LoeschKnopf onClick={() => p.aendern(loeschen(p.dok, { art: 'oeffnung', id: o.id }), null)}>
        {t('aktion.loeschen')}
      </LoeschKnopf>
    </Abschnitt>
  )
}

function ObjektTeil({ p, o }: { p: EigenschaftenProps; o: Objekt }) {
  const { t } = useSprache()
  const raum = raumVon(p.dok, o.raum_id)
  const setze = (neu: Objekt) => {
    if (raum && !objektPasst(neu, raum)) {
      p.hinweis(t('zeichner.objekt_passt_nicht'))
      return
    }
    p.aendern(objektSetzen(p.dok, neu), p.auswahl)
  }
  // L-Form in verstaendlichen Massen: ragt = wie weit der Schenkel ueber den
  // langen Teil heraussteht, schenkel = seine Breite, lang = Tiefe des langen Teils.
  const l =
    o.form === 'l' && o.ausschnitt_breite_cm && o.ausschnitt_tiefe_cm
      ? { ragt: o.ausschnitt_tiefe_cm, schenkel: o.breite_cm - o.ausschnitt_breite_cm, lang: o.tiefe_cm - o.ausschnitt_tiefe_cm }
      : null

  return (
    <>
      <Abschnitt titel={t(`plan.${o.art}`)}>
        <TextFeld
          label={t('zeichner.eig.name')}
          wert={o.name}
          platzhalter={objektName(t, { ...o, name: '' })}
          onSetzen={(name) => p.aendern(objektSetzen(p.dok, { ...o, name }), p.auswahl)}
        />
        {/* Beim L bleibt der Ausschnitt kleiner als das Moebel (Regel der
            Datenbank). Breite und Tiefe aendern dort das ganze Moebel, der
            Schenkel behaelt seine Breite und der lange Teil seine Tiefe. */}
        <MassFeld
          label={t('zeichner.eig.breite')}
          wert={o.breite_cm}
          min={l ? Math.max(5, l.schenkel + 1) : 5}
          max={2000}
          onSetzen={(v) => setze(l ? { ...o, breite_cm: v, ausschnitt_breite_cm: v - l.schenkel } : { ...o, breite_cm: v })}
        />
        <MassFeld
          label={t('zeichner.eig.tiefe')}
          wert={o.tiefe_cm}
          min={l ? Math.max(5, l.lang + 1) : 5}
          max={2000}
          onSetzen={(v) => setze(l ? { ...o, tiefe_cm: v, ausschnitt_tiefe_cm: v - l.lang } : { ...o, tiefe_cm: v })}
        />
        {o.art === 'moebel' ? (
          <MassFeld label={t('zeichner.eig.hoehe')} wert={o.hoehe_cm} min={1} max={600} onSetzen={(v) => setze({ ...o, hoehe_cm: v })} />
        ) : null}
        {/* Haengend (0039): Unterkante ueber dem Boden, oben begrenzt durch die Raumhoehe. */}
        <MassFeld
          label={t('zeichner.eig.boden')}
          wert={o.boden_cm ?? 0}
          min={0}
          max={Math.max(0, (raum?.hoehe_cm ?? 1000) - o.hoehe_cm)}
          onSetzen={(v) => setze({ ...o, boden_cm: v })}
        />
        <p className="t-sub -mt-1 text-sm">{t('zeichner.eig.boden_hilfe')}</p>
        <Zeile label={t('zeichner.eig.drehung', { n: o.drehung })}>
          <div className="flex gap-2">
            <Button size="sm" variant="soft" onClick={() => setze(objektGedreht(o, -1))} aria-label={t('zeichner.eig.drehen_links')}>
              <RotateCcw size={16} /> Q
            </Button>
            <Button size="sm" variant="soft" onClick={() => setze(objektGedreht(o, 1))} aria-label={t('zeichner.eig.drehen_rechts')}>
              <RotateCw size={16} /> E
            </Button>
          </div>
        </Zeile>
        {o.art === 'moebel' ? (
          <Zeile label={t('zeichner.eig.form')}>
            <div className="flex gap-2">
              <Chip
                active={o.form === 'rechteck'}
                onClick={() => setze({ ...o, form: 'rechteck', ausschnitt_breite_cm: null, ausschnitt_tiefe_cm: null, ausschnitt_ecke: null })}
              >
                {t('zeichner.eig.rechteck')}
              </Chip>
              <Chip
                active={o.form === 'l'}
                onClick={() =>
                  o.form === 'l'
                    ? undefined
                    : setze({
                        ...o,
                        form: 'l',
                        ausschnitt_breite_cm: Math.max(1, Math.round(o.breite_cm / 3)),
                        ausschnitt_tiefe_cm: Math.max(1, Math.round(o.tiefe_cm / 2)),
                        ausschnitt_ecke: 'ro',
                      })
                }
              >
                {t('zeichner.eig.l_form')}
              </Chip>
            </div>
          </Zeile>
        ) : null}
        {l ? (
          <>
            {/* Verstaendliche Masse statt des Ausschnitts: wie weit der Schenkel
                heraussteht, wie breit er ist, wie tief der lange Teil ist. */}
            <MassFeld
              label={t('zeichner.eig.l_ragt')}
              wert={l.ragt}
              min={1}
              max={2000 - l.lang}
              onSetzen={(v) => setze({ ...o, tiefe_cm: l.lang + v, ausschnitt_tiefe_cm: v })}
            />
            <MassFeld
              label={t('zeichner.eig.l_schenkel')}
              wert={l.schenkel}
              min={1}
              max={o.breite_cm - 1}
              onSetzen={(v) => setze({ ...o, ausschnitt_breite_cm: o.breite_cm - v })}
            />
            <MassFeld
              label={t('zeichner.eig.l_lang')}
              wert={l.lang}
              min={1}
              max={2000 - l.ragt}
              onSetzen={(v) => setze({ ...o, tiefe_cm: v + l.ragt })}
            />
            <Zeile label={t('zeichner.eig.ausschnitt_ecke')}>
              <div className="flex flex-wrap gap-2">
                {(['lo', 'ro', 'ru', 'lu'] as const).map((e) => (
                  <Chip key={e} active={o.ausschnitt_ecke === e} onClick={() => setze({ ...o, ausschnitt_ecke: e })}>
                    {t(`zeichner.eig.ecke_${e}`)}
                  </Chip>
                ))}
              </div>
            </Zeile>
          </>
        ) : null}
        {/* Material (0040): wie es in 3D aussieht. */}
        <Zeile label={t('zeichner.eig.material')}>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={!o.material} onClick={() => p.aendern(objektSetzen(p.dok, { ...o, material: null }), p.auswahl)}>
              {t('zeichner.eig.standard')}
            </Chip>
            {MATERIALIEN.map((m) => (
              <Chip key={m} active={o.material === m} onClick={() => p.aendern(objektSetzen(p.dok, { ...o, material: m }), p.auswahl)}>
                {t(`zeichner.material.${m}`)}
              </Chip>
            ))}
          </div>
        </Zeile>
        <Zeile label={t('zeichner.eig.farbe')}>
          <Farbwahl farben={OBJEKTFARBEN} wert={o.farbe} standard={t('zeichner.eig.standard')} onWahl={(hex) => p.aendern(objektSetzen(p.dok, { ...o, farbe: hex }), p.auswahl)} />
        </Zeile>
      </Abschnitt>

      {o.art !== 'moebel' ? (
        <Abschnitt titel={t('zeichner.faecher.titel')}>
          <FaecherEditor
            wert={{ brett_cm: o.brett_cm ?? [0], hoehe_cm: o.hoehe_cm, spalten: o.spalten }}
            breite_cm={o.breite_cm}
            name={o.name}
            art={o.art}
            onSetzen={(f) => setze({ ...o, brett_cm: f.brett_cm, hoehe_cm: f.hoehe_cm, spalten: f.spalten })}
          />
        </Abschnitt>
      ) : null}

      <LoeschKnopf onClick={() => p.aendern(loeschen(p.dok, { art: 'objekt', id: o.id }), null)}>
        {t('zeichner.eig.objekt_loeschen')}
      </LoeschKnopf>
    </>
  )
}

function KisteTeil({ p, k }: { p: EigenschaftenProps; k: PlanKiste }) {
  const { t } = useSprache()
  const [fragen, setFragen] = useState(false)
  const obj = k.unterlage_objekt_id ? p.dok.objekte.find((o) => o.id === k.unterlage_objekt_id) : null
  const unter = k.unterlage_item_id ? p.dok.kisten.find((x) => x.id === k.unterlage_item_id) : null
  const auf = p.dok.kisten.filter((x) => x.unterlage_item_id === k.id).map((x) => x.code)
  let wo: string
  if (k.unterlage_art === 'fach' && obj) {
    wo = t('lage.satz_fach', { name: objektName(t, obj), ebene: k.fach_ebene ?? 0, spalte: k.fach_spalte ?? 1, von: k.unten_cm, bis: k.oben_cm })
  } else if (k.unterlage_art === 'objekt' && obj) {
    wo = t('lage.satz_objekt', { name: objektName(t, obj), von: k.unten_cm, bis: k.oben_cm })
  } else if (k.unterlage_art === 'kiste') {
    wo = t('lage.satz_kiste', { code: `⁨${unter?.code ?? '?'}⁩`, von: k.unten_cm, bis: k.oben_cm })
  } else {
    wo = t('lage.satz_boden', { von: k.unten_cm, bis: k.oben_cm })
  }
  return (
    <Abschnitt titel={t('begriff.kiste')}>
      <div className="flex flex-wrap items-center gap-2">
        <CodeChip code={k.code} />
        {k.title ? <span className="font-bold">{k.title}</span> : null}
      </div>
      <p className="t-name">{wo}</p>
      <p className="t-sub t-serial">
        {k.laenge_cm} x {k.breite_cm} x {k.hoehe_cm} cm
      </p>
      {auf.length ? <p className="t-sub">{t('zeichner.eig.darauf', { codes: auf.join(', ') })}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Link to={`/app/p/${p.projectId}/kisten/${k.id}`}>
          <Button size="sm" variant="outline">
            {t('suche.zur_kiste')}
          </Button>
        </Link>
      </div>
      {fragen ? (
        <div className="space-y-2 rounded-xl border-2 border-danger/30 p-3">
          <p className="text-sm">
            {auf.length ? t('zeichner.eig.vom_platz_frage_auf', { codes: auf.join(', ') }) : t('zeichner.eig.vom_platz_frage')}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setFragen(false)}>
              {t('aktion.abbrechen')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setFragen(false)
                p.vomPlatz(k)
              }}
            >
              {t('zeichner.eig.vom_platz')}
            </Button>
          </div>
        </div>
      ) : (
        <LoeschKnopf onClick={() => setFragen(true)}>{t('zeichner.eig.vom_platz')}</LoeschKnopf>
      )}
    </Abschnitt>
  )
}

export function Eigenschaften(p: EigenschaftenProps) {
  const a = p.auswahl
  switch (a.art) {
    case 'raum': {
      const r = raumVon(p.dok, a.id)
      return r ? <RaumTeil key={r.id} p={p} raum={r} /> : null
    }
    case 'kante': {
      const r = raumVon(p.dok, a.raumId)
      return r ? <KanteTeil key={`${r.id}-${a.kante}`} p={p} raum={r} kante={a.kante} /> : null
    }
    case 'ecke': {
      const r = raumVon(p.dok, a.raumId)
      return r ? <EckeTeil key={`${r.id}-${a.ecke}`} p={p} raum={r} ecke={a.ecke} /> : null
    }
    case 'oeffnung': {
      const o = p.dok.oeffnungen.find((x) => x.id === a.id)
      return o ? <OeffnungTeil key={o.id} p={p} o={o} /> : null
    }
    case 'objekt': {
      const o = p.dok.objekte.find((x) => x.id === a.id)
      return o ? <ObjektTeil key={o.id} p={p} o={o} /> : null
    }
    case 'kiste': {
      const k = p.dok.kisten.find((x) => x.id === a.id)
      return k ? <KisteTeil key={k.id} p={p} k={k} /> : null
    }
    case 'linie': {
      const l = (p.dok.grundriss.linien ?? []).find((x) => x.id === a.id)
      return l ? <LinieTeil key={l.id} p={p} l={l} /> : null
    }
    case 'symbol': {
      const s = (p.dok.grundriss.symbole ?? []).find((x) => x.id === a.id)
      return s ? <SymbolTeil key={s.id} p={p} s={s} /> : null
    }
  }
}
