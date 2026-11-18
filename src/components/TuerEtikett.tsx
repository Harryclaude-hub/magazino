import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import { Button, Card, QrCode, SectionTitle } from './ui'
import { useProject } from '../pages/ProjectLayout'
import { useT } from '../lib/i18n'
import { appUrl } from '../lib/util'

/* Tuer-QR zum Drucken (E103). Der Code fuehrt zur Tuer-Seite des Lagers;
 * wer ihn scannt und angemeldet ist, kann sich dort ein- und austragen.
 *
 * Gedruckt wird ein eigenes Plakat, das nur beim Druck sichtbar ist. Der
 * Knopf setzt kurz eine Klasse am body, damit alles andere (auch der
 * Etikettenbogen der Seite) im Druck wegfaellt. */

const DRUCKKLASSE = 'druck-tuer'

export function TuerEtikett() {
  const { project, canEdit } = useProject()
  const t = useT()
  const [druckt, setDruckt] = useState(false)
  const adresse = appUrl(`app/p/${project.id}/tuer`)

  // Druckregeln nur solange der Block da ist.
  useEffect(() => {
    if (!canEdit) return
    const el = document.createElement('style')
    el.setAttribute('data-kistly', 'tuer-druck')
    el.textContent = [
      '.tuer-plakat { display: none }',
      '@media print {',
      `  body.${DRUCKKLASSE} #root { display: none !important }`,
      `  body.${DRUCKKLASSE} .tuer-plakat { display: flex !important }`,
      '  .tuer-plakat, .tuer-plakat * { -webkit-print-color-adjust: exact; print-color-adjust: exact }',
      '}',
    ].join('\n')
    document.head.appendChild(el)
    const fertig = () => {
      document.body.classList.remove(DRUCKKLASSE)
      setDruckt(false)
    }
    window.addEventListener('afterprint', fertig)
    return () => {
      window.removeEventListener('afterprint', fertig)
      document.body.classList.remove(DRUCKKLASSE)
      el.remove()
    }
  }, [canEdit])

  if (!canEdit) return null

  function drucken() {
    document.body.classList.add(DRUCKKLASSE)
    setDruckt(true)
    // Ein Takt Luft, damit das Plakat im Dokument steht, bevor der Dialog aufgeht.
    window.setTimeout(() => window.print(), 50)
  }

  return (
    <>
      <Card className="no-print mb-4 p-4">
        <SectionTitle>{t('lager.etikett_titel')}</SectionTitle>
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-28 shrink-0 rounded-lg border-2 border-ink bg-white p-1.5">
            <QrCode value={adresse} size={256} className="block h-auto w-full" />
          </div>
          <div className="min-w-0 flex-1 basis-56">
            <p className="t-name-lg break-words">{project.name}</p>
            <p className="t-sub mt-1">{t('lager.etikett_hinweis')}</p>
            <Button className="mt-3" loading={druckt} onClick={drucken}>
              <Printer size={18} /> {t('aktion.drucken')}
            </Button>
          </div>
        </div>
      </Card>

      {createPortal(
        <div
          className="tuer-plakat flex-col items-center justify-center gap-[8mm] text-center"
          style={{ minHeight: '95vh', background: '#ffffff', color: '#000000', padding: '10mm', boxSizing: 'border-box' }}
        >
          <p style={{ fontSize: '14mm', fontWeight: 900, lineHeight: 1.1 }}>{project.name}</p>
          <div style={{ width: 'min(120mm, 90%)', border: '2mm solid #000000', borderRadius: '5mm', padding: '4mm', background: '#ffffff' }}>
            <QrCode value={adresse} size={512} className="block h-auto w-full" />
          </div>
          <p style={{ fontSize: '10mm', fontWeight: 800, lineHeight: 1.2 }}>{t('lager.etikett_kopf')}</p>
          <p style={{ fontSize: '6mm' }}>{t('lager.etikett_fuss')}</p>
        </div>,
        document.body,
      )}
    </>
  )
}
