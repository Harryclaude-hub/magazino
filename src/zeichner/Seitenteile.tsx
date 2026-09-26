import { useMemo, useState } from 'react'
import { Check, Circle, CircleHelp, Package, X } from 'lucide-react'
import { FachAnsicht } from '../components/plan/FachAnsicht'
import { objektName } from '../components/plan/lage'
import { Button, CodeChip, ErrorBox, Input, Spinner } from '../components/ui'
import { UEBERSTAND_MAX_CM, type Unterlage } from '../lib/geometrie'
import { useSprache } from '../lib/i18n'
import type { EigeneGroesse, Item, SymbolArt } from '../lib/types'
import { cx } from '../lib/util'
import { MassFeld } from './Eigenschaften'
import { FaecherEditor } from './FaecherEditor'
import { ausEigenerGroesse, KATALOG, KATALOG_BAD, KATALOG_KUECHE, KATALOG_SCHLAFEN, KATALOG_SONST } from './katalog'
import { MoebelVorschau } from '../components/plan/moebelSymbol'
import { SYMBOL_ARTEN } from './werkzeuge/strom'
import type { Dok, Vorlage } from './dok'
import type { KisteInHand, WerkzeugName } from './werkzeuge/typen'

/* Die rechte Spalte des Zeichners, je nach Werkzeug: Assistent, Katalog
 * und Vorlage fuer Moebel, Regal, Schrank, Kisten ohne Platz und die
 * Auswahl der Unterlage. */

export function Kopf({ titel, hilfe }: { titel: string; hilfe?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-black uppercase tracking-wider text-muted">{titel}</h3>
      {hilfe ? <p className="t-sub mt-1">{hilfe}</p> : null}
    </div>
  )
}

/* ------------------------------------------------------------ Assistent */

/** "So geht es" weggeklickt? Nur eine Bequemlichkeit je Geraet: ohne
 *  Speicher ist der Kasten einfach wieder offen. */
const ASSISTENT_ZU = 'kistly.zeichner.assistent_zu'

function assistentZuGemerkt(): boolean {
  try {
    return localStorage.getItem(ASSISTENT_ZU) === '1'
  } catch {
    return false
  }
}

function assistentZuMerken(zu: boolean) {
  try {
    if (zu) localStorage.setItem(ASSISTENT_ZU, '1')
    else localStorage.removeItem(ASSISTENT_ZU)
  } catch {
    /* ohne Speicher gilt es nur bis zum Neuladen */
  }
}

export function Assistent({
  dok,
  onWerkzeug,
}: {
  dok: Dok
  onWerkzeug: (name: WerkzeugName, rechteck?: boolean) => void
}) {
  const { t } = useSprache()
  const [zu, setZu] = useState(assistentZuGemerkt)
  const umschalten = (neu: boolean) => {
    setZu(neu)
    assistentZuMerken(neu)
  }
  const zuHoch =
    dok.objekte.some((o) => o.hoehe_cm > (dok.raeume.find((r) => r.id === o.raum_id)?.hoehe_cm ?? Infinity)) ||
    dok.kisten.some((k) => k.oben_cm > k.grenze_cm)
  const schritte: { text: string; hilfe: string; fertig: boolean; knopf?: () => void; knopfText?: string }[] = [
    {
      text: t('zeichner.assistent.umriss'),
      hilfe: t('zeichner.assistent.umriss_hilfe'),
      fertig: dok.raeume.length > 0,
      knopf: () => onWerkzeug('raum', true),
      knopfText: t('zeichner.werkzeug.rechteck'),
    },
    {
      text: t('zeichner.assistent.teilen'),
      hilfe: t('zeichner.assistent.teilen_hilfe'),
      fertig: dok.raeume.length > 1,
      knopf: () => onWerkzeug('teilen'),
      knopfText: t('zeichner.werkzeug.teilen'),
    },
    {
      text: t('zeichner.assistent.zimmer'),
      hilfe: t('zeichner.assistent.zimmer_hilfe'),
      fertig: dok.raeume.length > 0 && dok.raeume.every((r) => r.tag_id || r.name.trim()),
    },
    {
      text: t('zeichner.assistent.oeffnungen'),
      hilfe: t('zeichner.assistent.oeffnungen_hilfe'),
      fertig: dok.oeffnungen.some((o) => o.art === 'tuer'),
      knopf: () => onWerkzeug('tuer'),
      knopfText: t('zeichner.werkzeug.tuer'),
    },
    {
      text: t('zeichner.assistent.hoehen'),
      hilfe: t('zeichner.assistent.hoehen_hilfe'),
      fertig: dok.raeume.length > 0 && !zuHoch,
    },
  ]
  if (zu) {
    return (
      <Button size="sm" variant="soft" onClick={() => umschalten(false)}>
        <CircleHelp size={16} />
        {t('zeichner.assistent.zeigen')}
      </Button>
    )
  }
  return (
    <div>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Kopf titel={t('zeichner.assistent.titel')} hilfe={t('zeichner.assistent.einleitung')} />
        </div>
        <button
          type="button"
          onClick={() => umschalten(true)}
          aria-label={t('zeichner.assistent.ausblenden')}
          title={t('zeichner.assistent.ausblenden')}
          className="-me-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-raised hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>
      <ol className="space-y-3">
        {schritte.map((s, i) => (
          <li key={i} className="flex gap-2.5">
            <span className={cx('mt-0.5 shrink-0', s.fertig ? 'text-ok' : 'text-muted')}>
              {s.fertig ? <Check size={20} /> : <Circle size={20} />}
            </span>
            <div className="min-w-0">
              <p className="font-bold">
                <span className="t-serial">{i + 1}</span> {s.text}
              </p>
              <p className="t-sub">{s.hilfe}</p>
              {s.knopf && !s.fertig ? (
                <Button size="sm" variant="soft" className="mt-1.5" onClick={s.knopf}>
                  {s.knopfText}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* -------------------------------------------------------------- Vorlagen */

export function MoebelKatalog({
  wahl,
  onWahl,
  eigene,
  eigeneFehler,
  eigeneNochmal,
}: {
  wahl: Vorlage | null
  onWahl: (v: Vorlage) => void
  eigene: EigeneGroesse[] | null
  eigeneFehler: string | null
  eigeneNochmal: () => void
}) {
  const { t } = useSprache()
  const knopf = (v: Vorlage, name: string) => (
    <button
      key={v.schluessel}
      type="button"
      onClick={() => onWahl({ ...v, name })}
      aria-pressed={wahl?.schluessel === v.schluessel}
      className={cx(
        'flex w-full items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-start transition',
        wahl?.schluessel === v.schluessel ? 'border-ink bg-ink text-paper' : 'border-line bg-surface hover:border-ink/35',
      )}
    >
      <MoebelVorschau v={v} name={name} />
      <span className="min-w-0 flex-1 truncate font-bold">{name}</span>
      <span className="t-serial shrink-0 text-sm opacity-80">
        {v.breite_cm} x {v.tiefe_cm}
      </span>
    </button>
  )
  const moebel = (eigene ?? []).filter((g) => g.art === 'moebel')
  return (
    <div className="space-y-4">
      <div>
        <Kopf titel={t('zeichner.katalog.titel')} hilfe={t('zeichner.katalog.hilfe')} />
        <div className="space-y-1.5">{KATALOG.map((v) => knopf(v, t(`zeichner.katalog.${v.schluessel}`)))}</div>
      </div>
      <div>
        <Kopf titel={t('zeichner.katalog.schlafen_titel')} />
        <div className="space-y-1.5">{KATALOG_SCHLAFEN.map((v) => knopf(v, t(`zeichner.katalog.${v.schluessel}`)))}</div>
      </div>
      <div>
        <Kopf titel={t('zeichner.katalog.bad_titel')} />
        <div className="space-y-1.5">{KATALOG_BAD.map((v) => knopf(v, t(`zeichner.katalog.${v.schluessel}`)))}</div>
      </div>
      <div>
        <Kopf titel={t('zeichner.katalog.kueche_titel')} hilfe={t('zeichner.katalog.kueche_hilfe')} />
        <div className="space-y-1.5">{KATALOG_KUECHE.map((v) => knopf(v, t(`zeichner.katalog.${v.schluessel}`)))}</div>
      </div>
      <div>
        <Kopf titel={t('zeichner.katalog.sonst_titel')} />
        <div className="space-y-1.5">{KATALOG_SONST.map((v) => knopf(v, t(`zeichner.katalog.${v.schluessel}`)))}</div>
      </div>
      <div>
        <Kopf titel={t('zeichner.katalog.eigene')} />
        {eigeneFehler ? (
          <ErrorBox error={eigeneFehler} onRetry={eigeneNochmal} />
        ) : eigene === null ? (
          <div className="space-y-1.5">
            {[0, 1].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-raised" />
            ))}
          </div>
        ) : moebel.length === 0 ? (
          <p className="t-sub">{t('zeichner.katalog.eigene_leer')}</p>
        ) : (
          <div className="space-y-1.5">{moebel.map((g) => knopf(ausEigenerGroesse(g), g.name))}</div>
        )}
      </div>
    </div>
  )
}

export function RegalVorlage({ wert, onAendern }: { wert: Vorlage; onAendern: (v: Vorlage) => void }) {
  const { t } = useSprache()
  return (
    <div className="space-y-3">
      <Kopf titel={t(wert.art === 'regal' ? 'zeichner.vorlage.regal' : 'zeichner.vorlage.schrank')} hilfe={t('zeichner.vorlage.hilfe')} />
      <MassFeld label={t('zeichner.eig.breite')} wert={wert.breite_cm} min={5} max={2000} onSetzen={(v) => onAendern({ ...wert, breite_cm: v })} />
      <MassFeld label={t('zeichner.eig.tiefe')} wert={wert.tiefe_cm} min={5} max={2000} onSetzen={(v) => onAendern({ ...wert, tiefe_cm: v })} />
      <FaecherEditor
        wert={{ brett_cm: wert.brett_cm ?? [0], hoehe_cm: wert.hoehe_cm, spalten: wert.spalten }}
        breite_cm={wert.breite_cm}
        name={wert.name}
        art={wert.art}
        onSetzen={(f) => onAendern({ ...wert, brett_cm: f.brett_cm, hoehe_cm: f.hoehe_cm, spalten: f.spalten })}
      />
    </div>
  )
}

/* ------------------------------------------------------------ Kisten */

export function KistenListe({
  liste,
  fehler,
  nochmal,
  inHand,
  masse,
  onNehmen,
}: {
  liste: Item[] | null
  fehler: string | null
  nochmal: () => void
  inHand: KisteInHand | null
  masse: (i: Item) => { laenge_cm: number; breite_cm: number; hoehe_cm: number }
  onNehmen: (k: KisteInHand) => void
}) {
  const { t } = useSprache()
  const [q, setQ] = useState('')
  const gefiltert = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!liste) return null
    return s ? liste.filter((i) => i.code.toLowerCase().includes(s) || (i.title ?? '').toLowerCase().includes(s)) : liste
  }, [liste, q])
  return (
    <div className="space-y-3">
      <Kopf titel={t('zeichner.kisten.titel')} hilfe={t('zeichner.kisten.hilfe')} />
      {inHand ? (
        <div className="rounded-xl border-2 border-ink p-2.5">
          <p className="text-sm font-bold">{t('zeichner.kisten.in_der_hand')}</p>
          <div className="mt-1 flex items-center gap-2">
            <CodeChip code={inHand.code} size="sm" />
            <span className="t-serial text-sm text-muted">
              {inHand.laenge_cm} x {inHand.breite_cm} x {inHand.hoehe_cm}
            </span>
          </div>
          <p className="t-sub mt-1">{t('zeichner.kisten.klick_setzt')}</p>
        </div>
      ) : null}
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('zeichner.kisten.suchen')} className="py-2" />
      {fehler ? (
        <ErrorBox error={fehler} onRetry={nochmal} />
      ) : gefiltert === null ? (
        <div className="flex items-center gap-2 text-muted">
          <Spinner /> {t('zustand.laedt')}
        </div>
      ) : gefiltert.length === 0 ? (
        <p className="t-sub">{liste && liste.length === 0 ? t('zeichner.kisten.alle_haben_platz') : t('zustand.nichts_gefunden')}</p>
      ) : (
        <ul className="space-y-1.5">
          {gefiltert.map((i) => {
            const m = masse(i)
            const an = inHand?.id === i.id
            return (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => onNehmen({ id: i.id, code: i.code, ...m })}
                  aria-pressed={an}
                  className={cx(
                    'flex w-full items-center gap-2 rounded-xl border-2 px-2.5 py-2 text-start transition',
                    an ? 'border-ink bg-raised' : 'border-line bg-surface hover:border-ink/35',
                  )}
                >
                  <Package size={16} className="shrink-0 text-muted" />
                  <CodeChip code={i.code} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">{i.title ?? ''}</span>
                  <span className="t-serial shrink-0 text-xs text-muted">
                    {m.laenge_cm}x{m.breite_cm}x{m.hoehe_cm}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function UnterlagenWahl({
  dok,
  code,
  liste,
  wahl,
  onWahl,
  ueberlappt,
  busy,
  fehler,
  onSetzen,
  onAbbrechen,
}: {
  dok: Dok
  code: string
  liste: Unterlage[]
  wahl: number
  onWahl: (i: number) => void
  ueberlappt: string[]
  busy: boolean
  fehler: string | null
  onSetzen: () => void
  onAbbrechen: () => void
}) {
  const { t } = useSprache()
  const text = (u: Unterlage) => {
    const von = u.unten_cm
    const bis = u.oben_cm
    const o = u.objektId ? dok.objekte.find((x) => x.id === u.objektId) : null
    if (u.art === 'fach' && o) return t('zeichner.unterlage.fach', { name: objektName(t, o), ebene: u.ebene ?? 0, spalte: u.spalte ?? 1, von, bis })
    if (u.art === 'objekt' && o) return t('zeichner.unterlage.objekt', { name: objektName(t, o), von, bis })
    if (u.art === 'kiste') return t('zeichner.unterlage.kiste', { code: `⁨${u.text}⁩`, von, bis })
    return t('zeichner.unterlage.boden', { von, bis })
  }
  const gewaehlt = liste[wahl]
  const fachObjekt = gewaehlt?.art === 'fach' ? dok.objekte.find((o) => o.id === gewaehlt.objektId) : null
  return (
    <div className="space-y-3">
      <Kopf titel={t('zeichner.unterlage.titel', { code })} hilfe={t('zeichner.unterlage.hilfe')} />
      <ul className="space-y-1.5">
        {liste.map((u, i) => (
          <li key={`${u.art}-${u.itemId ?? u.objektId ?? ''}-${u.ebene ?? ''}-${u.spalte ?? ''}`}>
            <button
              type="button"
              disabled={!u.passt}
              onClick={() => onWahl(i)}
              aria-pressed={i === wahl}
              className={cx(
                'w-full rounded-xl border-2 px-3 py-2 text-start transition disabled:cursor-not-allowed disabled:opacity-50',
                i === wahl ? 'border-ink bg-ink text-paper' : 'border-line bg-surface hover:border-ink/35',
              )}
            >
              <span className="block font-bold">{text(u)}</span>
              {!u.passt ? (
                <span className="block text-sm">
                  {u.grund === 'ueberstand'
                    ? t('zeichner.unterlage.ueberstand_zu_gross', { cm: u.ueberstand_cm ?? 0, max: UEBERSTAND_MAX_CM })
                    : t('zeichner.unterlage.passt_nicht', { grenze: u.grenze_cm })}
                </span>
              ) : u.ueberstand_cm ? (
                <span className="block text-sm">{t('zeichner.unterlage.ragt_vor', { cm: u.ueberstand_cm })}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {fachObjekt && gewaehlt ? (
        <FachAnsicht
          objekt={fachObjekt}
          kisten={dok.kisten}
          auswahl={{ ebene: gewaehlt.ebene ?? 0, spalte: gewaehlt.spalte ?? 0 }}
          onFach={(e, s) => {
            const i = liste.findIndex((u) => u.art === 'fach' && u.objektId === fachObjekt.id && u.ebene === e && u.spalte === s)
            if (i >= 0 && liste[i].passt) onWahl(i)
          }}
          maxHoehe="14rem"
        />
      ) : null}
      {ueberlappt.length ? (
        <p className="rounded-xl border-2 border-warn/40 bg-warn/10 px-3 py-2 text-sm font-bold text-warn">
          {t('zeichner.unterlage.ueberlappt', { codes: ueberlappt.join(', ') })}
        </p>
      ) : null}
      {fehler ? <ErrorBox error={fehler} /> : null}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onAbbrechen}>
          {t('aktion.abbrechen')}
        </Button>
        <Button size="sm" loading={busy} disabled={!gewaehlt?.passt} onClick={onSetzen}>
          {t('zeichner.unterlage.hinstellen')}
        </Button>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Strom */

export function StromWahl({ wahl, onWahl }: { wahl: SymbolArt; onWahl: (a: SymbolArt) => void }) {
  const { t } = useSprache()
  return (
    <div>
      <Kopf titel={t('zeichner.strom.titel')} hilfe={t('zeichner.strom.hilfe')} />
      <div className="space-y-1.5">
        {SYMBOL_ARTEN.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onWahl(a)}
            aria-pressed={wahl === a}
            className={cx(
              'flex w-full items-center rounded-xl border-2 px-3 py-2 text-start font-bold transition',
              wahl === a ? 'border-ink bg-ink text-paper' : 'border-line bg-surface hover:border-ink/35',
            )}
          >
            {t(`zeichner.strom.${a}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
