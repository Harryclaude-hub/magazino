import { useEffect, useState, type FormEvent } from 'react'
import { Button, Chip, ErrorBox, Field, Input, Modal, Switch } from './ui'
import { aendereEigeneGroesse, eigeneGroesseFolgen, legeEigeneGroesseAn, type EigeneGroesseWerte } from '../lib/api'
import { useSprache } from '../lib/i18n'
import { laengeLesen } from '../lib/geometrie'
import type { EigeneGroesse, GroessenFolgen } from '../lib/types'

/* Eine eigene Groesse anlegen oder aendern (START 5.1a).
 *
 * Laengen nimmt das Feld so, wie Menschen sie tippen: 60 sind Zentimeter,
 * 0,6 sind Meter, auch mit arabischen Ziffern (laengeLesen). Gespeichert
 * wird in ganzen cm.
 *
 * Die Stufe 1 bis 10 in der Nummer rechnet nur die Datenbank. Aendern sich
 * die Masse einer benutzten Groesse, fragt der Dialog vorher, was das
 * ausloest (eigene_groesse_folgen), und speichert erst beim zweiten Tipp.
 * Lehnt die Datenbank ab (etwa: eine Kiste passte nicht mehr unter die
 * Decke), steht ihr Satz hier im Dialog. */

type Feld = 'name' | 'laenge' | 'breite' | 'hoehe' | 'aw' | 'ad'

interface Stand {
  name: string
  art: EigeneGroesse['art']
  laenge: string
  breite: string
  hoehe: string
  lForm: boolean
  aw: string
  ad: string
}

function standAus(g: EigeneGroesse | null, art: EigeneGroesse['art']): Stand {
  return {
    name: g?.name ?? '',
    art: g?.art ?? art,
    laenge: g ? String(g.laenge_cm) : '',
    breite: g ? String(g.breite_cm) : '',
    hoehe: g ? String(g.hoehe_cm) : '',
    lForm: g ? g.ausschnitt_breite_cm !== null : false,
    aw: g?.ausschnitt_breite_cm != null ? String(g.ausschnitt_breite_cm) : '',
    ad: g?.ausschnitt_tiefe_cm != null ? String(g.ausschnitt_tiefe_cm) : '',
  }
}

export function EigeneGroesseDialog({
  offen,
  projectId,
  groesse,
  artVorgabe = 'kiste',
  onClose,
  onGespeichert,
}: {
  offen: boolean
  projectId: string
  /** null = neu anlegen. */
  groesse: EigeneGroesse | null
  artVorgabe?: EigeneGroesse['art']
  onClose: () => void
  onGespeichert: (g: EigeneGroesse) => void
}) {
  const { t } = useSprache()
  const [stand, setStand] = useState<Stand>(() => standAus(groesse, artVorgabe))
  const [feldFehler, setFeldFehler] = useState<Partial<Record<Feld, string>>>({})
  const [fehler, setFehler] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /* Die Folgen gelten nur fuer genau diese Masse. */
  const [folgen, setFolgen] = useState<{ schluessel: string; daten: GroessenFolgen } | null>(null)

  // Beim Oeffnen frisch aus der Groesse, nicht der Stand vom letzten Mal.
  useEffect(() => {
    if (!offen) return
    setStand(standAus(groesse, artVorgabe))
    setFeldFehler({})
    setFehler(null)
    setFolgen(null)
    setBusy(false)
  }, [offen, groesse, artVorgabe])

  const setze = (teil: Partial<Stand>) => setStand((s) => ({ ...s, ...teil }))

  /** Die cm unter dem Feld, sobald die Eingabe lesbar ist. */
  function cmHinweis(text: string): string | undefined {
    const cm = laengeLesen(text)
    return cm !== null && String(cm) !== text.trim() ? t('groessen.eigene_in_cm', { cm }) : undefined
  }

  function pruefen(): EigeneGroesseWerte | null {
    const f: Partial<Record<Feld, string>> = {}
    const name = stand.name.trim()
    if (name.length < 1 || name.length > 60) f.name = t('groessen.eigene_fehler_name')
    const mass = (text: string, feld: Feld): number => {
      const cm = laengeLesen(text)
      if (cm === null || cm < 1 || cm > 1000) {
        f[feld] = t('groessen.eigene_fehler_mass')
        return 0
      }
      return cm
    }
    const laenge = mass(stand.laenge, 'laenge')
    const breite = mass(stand.breite, 'breite')
    const hoehe = mass(stand.hoehe, 'hoehe')
    let aw: number | null = null
    let ad: number | null = null
    if (stand.art === 'moebel' && stand.lForm) {
      aw = laengeLesen(stand.aw)
      ad = laengeLesen(stand.ad)
      if (aw === null || aw < 1 || (laenge > 0 && aw > laenge - 1)) f.aw = t('groessen.eigene_fehler_ausschnitt')
      if (ad === null || ad < 1 || (breite > 0 && ad > breite - 1)) f.ad = t('groessen.eigene_fehler_ausschnitt')
    }
    setFeldFehler(f)
    if (Object.keys(f).length > 0) return null
    return {
      name,
      art: stand.art,
      laenge_cm: laenge,
      breite_cm: breite,
      hoehe_cm: hoehe,
      ausschnitt_breite_cm: aw,
      ausschnitt_tiefe_cm: ad,
    }
  }

  const schluessel = (w: EigeneGroesseWerte) => `${w.laenge_cm}x${w.breite_cm}x${w.hoehe_cm}`

  async function speichern(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setFehler(null)
    const w = pruefen()
    if (!w) return
    setBusy(true)
    try {
      if (groesse) {
        const masseNeu =
          w.laenge_cm !== groesse.laenge_cm ||
          w.breite_cm !== groesse.breite_cm ||
          w.hoehe_cm !== groesse.hoehe_cm
        /* Erst fragen, was die neuen Masse ausloesen. Betrifft es Kisten,
         * steht das da, und erst der naechste Tipp speichert. */
        if (masseNeu && folgen?.schluessel !== schluessel(w)) {
          const daten = await eigeneGroesseFolgen(groesse.id, w.laenge_cm, w.breite_cm, w.hoehe_cm)
          setFolgen({ schluessel: schluessel(w), daten })
          if (daten.kisten + daten.moebel > 0) return
        }
        onGespeichert(await aendereEigeneGroesse(groesse.id, w))
      } else {
        onGespeichert(await legeEigeneGroesseAn(projectId, w))
      }
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const aktuelleFolgen = (() => {
    if (!folgen || !groesse) return null
    const l = laengeLesen(stand.laenge)
    const b = laengeLesen(stand.breite)
    const h = laengeLesen(stand.hoehe)
    return folgen.schluessel === `${l}x${b}x${h}` ? folgen.daten : null
  })()
  const wartetAufJa = aktuelleFolgen !== null && aktuelleFolgen.kisten + aktuelleFolgen.moebel > 0

  const massFeld = (feld: 'laenge' | 'breite' | 'hoehe', label: string) => (
    <Field label={label} error={feldFehler[feld]} hint={cmHinweis(stand[feld])}>
      <Input
        inputMode="decimal"
        dir="ltr"
        className="t-serial"
        value={stand[feld]}
        onChange={(e) => setze({ [feld]: e.target.value } as Partial<Stand>)}
      />
    </Field>
  )

  return (
    <Modal
      open={offen}
      onClose={onClose}
      title={groesse ? t('groessen.eigene_aendern') : t('groessen.eigene_anlegen')}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button form="eigene-groesse-form" type="submit" loading={busy}>
            {wartetAufJa ? t('groessen.eigene_bestaetigen') : t('aktion.speichern')}
          </Button>
        </>
      }
    >
      <form id="eigene-groesse-form" onSubmit={(e) => void speichern(e)} className="space-y-4">
        {fehler ? <ErrorBox error={fehler} /> : null}

        <Field label={t('groessen.eigene_name')} error={feldFehler.name}>
          <Input
            value={stand.name}
            maxLength={60}
            onChange={(e) => setze({ name: e.target.value })}
            placeholder={t('groessen.eigene_name_platzhalter')}
            autoFocus
          />
        </Field>

        <div>
          <p className="mb-2 text-[0.9375rem] font-bold">{t('groessen.eigene_art')}</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={stand.art === 'kiste'} onClick={() => setze({ art: 'kiste', lForm: false })}>
              {t('groessen.eigene_art_kiste')}
            </Chip>
            <Chip active={stand.art === 'moebel'} onClick={() => setze({ art: 'moebel' })}>
              {t('groessen.eigene_art_moebel')}
            </Chip>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {massFeld('laenge', t('groessen.eigene_laenge'))}
          {massFeld('breite', t('groessen.eigene_breite'))}
          {massFeld('hoehe', t('groessen.eigene_hoehe'))}
        </div>
        <p className="t-sub">{t('groessen.eigene_eingabe_hinweis')}</p>

        {stand.art === 'moebel' ? (
          <>
            <Switch
              checked={stand.lForm}
              onChange={(lForm) => setze({ lForm })}
              label={t('groessen.eigene_l_form')}
              hint={t('groessen.eigene_l_form_hinweis')}
            />
            {stand.lForm ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t('groessen.eigene_ausschnitt_breite')}
                  error={feldFehler.aw}
                  hint={cmHinweis(stand.aw) ?? t('groessen.eigene_ausschnitt')}
                >
                  <Input
                    inputMode="decimal"
                    dir="ltr"
                    className="t-serial"
                    value={stand.aw}
                    onChange={(e) => setze({ aw: e.target.value })}
                  />
                </Field>
                <Field
                  label={t('groessen.eigene_ausschnitt_tiefe')}
                  error={feldFehler.ad}
                  hint={cmHinweis(stand.ad)}
                >
                  <Input
                    inputMode="decimal"
                    dir="ltr"
                    className="t-serial"
                    value={stand.ad}
                    onChange={(e) => setze({ ad: e.target.value })}
                  />
                </Field>
              </div>
            ) : null}
          </>
        ) : null}

        {aktuelleFolgen && wartetAufJa ? (
          <p
            role="status"
            className="rounded-2xl border-2 border-warn/40 bg-warn/10 px-4 py-3 text-[0.9375rem] font-bold"
          >
            {t('groessen.eigene_folgen', {
              kisten: aktuelleFolgen.kisten,
              moebel: aktuelleFolgen.moebel,
              neu: aktuelleFolgen.neue_nummer,
              stufe: aktuelleFolgen.stufe_neu,
            })}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
