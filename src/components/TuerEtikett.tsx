import type { CSSProperties } from 'react'
import { useT } from '../lib/i18n'
import { planeTuer } from '../lib/etikett'
import { PAPIER_STIL, QrFeld } from './etikett/Etikett'

/* Das Tuer-Etikett des Lagers: ein grosser QR-Code, der zur Tuer-Seite fuehrt
 * (/app/p/<id>/tuer). Wer ihn scannt und angemeldet ist, kann sich dort ein-
 * und austragen. Es wird in denselben Formaten gedruckt wie die Kistenetiketten
 * (pages/Labels.tsx); die Schrift richtet sich nach dem Platz. */

function mm(v: number): string {
  return `${v.toFixed(2)}mm`
}

export function TuerEtikett({
  name,
  adresse,
  w,
  h,
  mini,
  rahmen,
}: {
  name: string
  adresse: string
  w: number
  h: number
  mini: boolean
  rahmen: boolean
}) {
  const t = useT()
  const p = planeTuer(w, h, name, mini)

  const huelle: CSSProperties = {
    ...PAPIER_STIL,
    width: mm(w),
    height: mm(h),
    padding: mm(p.pad),
    border: rahmen ? '0.2mm solid #8a8a8a' : 'none',
    display: 'flex',
    flexDirection: p.quer ? 'row' : 'column',
    alignItems: 'center',
    gap: mm(p.luecke),
    fontFamily: 'var(--font-sans)',
    lineHeight: 1.15,
    textAlign: p.quer ? 'start' : 'center',
  }

  const text = (
    <div
      style={{
        minWidth: 0,
        width: p.quer ? undefined : '100%',
        flex: p.quer ? 1 : undefined,
        display: 'flex',
        flexDirection: 'column',
        gap: mm(p.luecke * 0.4),
      }}
    >
      <div
        style={{
          fontSize: mm(p.fsName),
          fontWeight: 800,
          lineHeight: 1.1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: p.nameZeilen,
          overflowWrap: 'anywhere',
        }}
      >
        {name}
      </div>
      {mini ? null : (
        <>
          <div style={{ fontSize: mm(p.fsKopf), fontWeight: 700, lineHeight: 1.2 }}>
            {t('lager.etikett_kopf')}
          </div>
          <div style={{ fontSize: mm(p.fsFuss), color: '#333333', lineHeight: 1.2 }}>
            {t('lager.etikett_fuss')}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div style={huelle}>
      {p.quer ? (
        <>
          <QrFeld wert={adresse} groesse={p.qr} />
          {text}
        </>
      ) : (
        <>
          {text}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
            <QrFeld wert={adresse} groesse={p.qr} />
          </div>
        </>
      )}
    </div>
  )
}
