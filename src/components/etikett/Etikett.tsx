import type { CSSProperties, ReactNode } from 'react'
import { QrCode } from '../ui'
import { useT } from '../../lib/i18n'
import { planeEtikett, type InhaltsZeile } from '../../lib/etikett'

/* Ein Kistenetikett. Das Etikett kennt nur seine Masse in Millimetern und
 * seine Daten. Wie gross die Schrift wird und wie viele Zeilen Inhalt
 * Platz haben, rechnet planeEtikett (lib/etikett.ts); hier wird nur
 * gesetzt. Jede Zeile kuerzt mit "...", nichts laeuft ueber den Rand.
 *
 * Farben stehen fest (Schwarz auf Weiss), weil Papier kein Dunkelmodus hat. */

export interface EtikettDaten {
  id: string
  /** Wie die Datenbank sie vergeben hat, zum Beispiel W-3-007. */
  code: string
  titel: string | null
  bereichName: string | null
  bereichFarbe: string | null
  inhalt: InhaltsZeile[]
  /** Name des Lagers, klein unten auf dem Etikett. */
  lagerName: string
  /** Platz im Regal, schon als Text. */
  platz: string | null
  /** Adresse, die der QR-Code traegt. */
  qrWert: string
}

export interface EtikettOptionen {
  inhalt: boolean
  platz: boolean
  lager: boolean
  rahmen: boolean
}

function mm(v: number): string {
  return `${v.toFixed(2)}mm`
}

export const PAPIER_STIL: CSSProperties = {
  background: '#ffffff',
  color: '#000000',
  boxSizing: 'border-box',
  overflow: 'hidden',
}

export function QrFeld({ wert, groesse }: { wert: string; groesse: number }) {
  if (groesse <= 0) return null
  return (
    <div style={{ width: mm(groesse), height: mm(groesse), flexShrink: 0, background: '#ffffff' }}>
      <QrCode value={wert} size={512} className="block h-full w-full" margin={1} />
    </div>
  )
}

/** Die Nummer. Steht immer von links nach rechts und genau so, wie die
 *  Datenbank sie vergibt. */
function Nummer({ code, fs }: { code: string; fs: number }) {
  return (
    <div
      className="t-serial"
      dir="ltr"
      style={{ fontSize: mm(fs), lineHeight: 1.05, whiteSpace: 'nowrap', color: '#000000' }}
    >
      {code}
    </div>
  )
}

export function Etikett({
  daten,
  w,
  h,
  mini,
  optionen,
}: {
  daten: EtikettDaten
  w: number
  h: number
  mini: boolean
  optionen: EtikettOptionen
}) {
  const t = useT()
  const zeigePlatz = optionen.platz && !!daten.platz
  const zeigeFuss = optionen.lager || zeigePlatz
  const p = planeEtikett({
    w,
    h,
    mini,
    code: daten.code,
    titel: daten.titel,
    bereich: !!daten.bereichName,
    inhalt: daten.inhalt,
    zeigeInhalt: optionen.inhalt,
    zeigeFuss,
  })

  const huelle: CSSProperties = {
    ...PAPIER_STIL,
    width: mm(w),
    height: mm(h),
    padding: mm(p.pad),
    border: optionen.rahmen ? '0.2mm solid #8a8a8a' : 'none',
    display: 'flex',
    flexDirection: p.quer ? 'row' : 'column',
    gap: mm(p.luecke),
    fontFamily: 'var(--font-sans)',
    lineHeight: 1.2,
  }

  /* ---- Mini: nur Nummer und QR-Code */
  if (p.mini) {
    return (
      <div
        style={{
          ...huelle,
          alignItems: 'center',
          justifyContent: p.quer ? 'flex-start' : 'center',
          flexDirection: p.quer ? 'row' : 'column',
        }}
      >
        <QrFeld wert={daten.qrWert} groesse={p.qr} />
        <div style={{ minWidth: 0, flex: p.quer ? 1 : undefined }}>
          <Nummer code={daten.code} fs={p.fsCode} />
        </div>
      </div>
    )
  }

  /* ---- Bausteine des Textes */
  const bereich = daten.bereichName ? (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: mm(p.fsBereich * 0.35),
        marginTop: mm(p.luecke * 0.5),
        fontSize: mm(p.fsBereich),
        fontWeight: 700,
        lineHeight: 1.3,
        minWidth: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          width: mm(p.fsBereich * 0.8),
          height: mm(p.fsBereich * 0.8),
          borderRadius: '50%',
          background: daten.bereichFarbe ?? '#000000',
          flexShrink: 0,
        }}
      />
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {daten.bereichName}
      </span>
    </div>
  ) : null

  const titel =
    p.titelZeilen > 0 && daten.titel ? (
      <div
        style={{
          marginTop: mm(p.luecke * 0.5),
          fontSize: mm(p.fsTitel),
          fontWeight: 600,
          lineHeight: 1.2,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: p.titelZeilen,
          maxHeight: mm(p.titelZeilen * p.fsTitel * 1.2),
          overflowWrap: 'anywhere',
        }}
      >
        {daten.titel}
      </div>
    ) : null

  const kopf: ReactNode = (
    <>
      <Nummer code={daten.code} fs={p.fsCode} />
      {bereich}
      {titel}
    </>
  )

  const zeigeListe = optionen.inhalt && p.zeilenProSpalte > 0 && (p.sichtbar > 0 || p.weitere > 0)
  let inhalt: ReactNode = null
  if (zeigeListe) {
    const gesamt = p.sichtbar + (p.weitere > 0 ? 1 : 0)
    const zeilen = Math.min(p.zeilenProSpalte, Math.ceil(gesamt / p.inhaltSpalten))
    inhalt = (
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'grid',
          gridAutoFlow: 'column',
          gridTemplateRows: `repeat(${zeilen}, ${mm(p.fsInhalt * 1.4)})`,
          gridTemplateColumns: `repeat(${p.inhaltSpalten}, minmax(0, 1fr))`,
          columnGap: mm(p.luecke),
          fontSize: mm(p.fsInhalt),
          lineHeight: 1.4,
          height: mm(zeilen * p.fsInhalt * 1.4),
          overflow: 'hidden',
          marginTop: p.quer ? mm(p.luecke * 0.5) : 0,
        }}
      >
        {daten.inhalt.slice(0, p.sichtbar).map((z, i) => (
          <li
            key={i}
            style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {z.menge !== 1 ? <b className="t-serial">{z.menge}&times; </b> : null}
            {z.text}
          </li>
        ))}
        {p.weitere > 0 ? (
          <li
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 700,
              color: '#444444',
            }}
          >
            {t('etiketten.weitere', { n: p.weitere })}
          </li>
        ) : null}
      </ul>
    )
  }

  const fuss = zeigeFuss ? (
    <div
      style={{
        marginTop: 'auto',
        borderTop: '0.2mm solid #b5b5b5',
        paddingTop: mm(p.luecke * 0.5),
        display: 'flex',
        justifyContent: 'space-between',
        gap: mm(p.luecke),
        fontSize: mm(p.fsFuss),
        lineHeight: 1.3,
        color: '#333333',
        minWidth: 0,
      }}
    >
      {optionen.lager ? (
        <span style={{ minWidth: 0, flex: '1 1 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {daten.lagerName}
        </span>
      ) : null}
      {zeigePlatz ? (
        <span
          style={{
            minWidth: 0,
            maxWidth: optionen.lager ? '65%' : '100%',
            marginInlineStart: 'auto',
            fontWeight: 700,
            color: '#000000',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {daten.platz}
        </span>
      ) : null}
    </div>
  ) : null

  if (p.quer) {
    return (
      <div style={huelle}>
        <QrFeld wert={daten.qrWert} groesse={p.qr} />
        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {kopf}
          {inhalt}
          {fuss}
        </div>
      </div>
    )
  }

  return (
    <div style={huelle}>
      <div style={{ display: 'flex', gap: mm(p.luecke), height: mm(p.qr), flexShrink: 0 }}>
        <QrFeld wert={daten.qrWert} groesse={p.qr} />
        <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>{kopf}</div>
      </div>
      {inhalt}
      {fuss}
    </div>
  )
}
