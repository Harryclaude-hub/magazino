import type { Woerterbuch } from '../woerter'

/* Die 3D-Ansicht am Computer (Etappe 4, START 5.5).
 *
 * Wie der Zeichner-Baustein steht dieser NICHT in woerter.ts, sondern
 * laedt mit dem Knopf (components/plan3d/oeffnen.tsx ruft
 * woerterNachladen). Das Handy zeigt die 3D-Ansicht nie. Geprueft wird er
 * wie alle anderen (scripts/woerter-pruefen.mjs). */
export const plan3dWoerter: Woerterbuch = {
  'plan3d.oeffnen': { de: 'In 3D ansehen', ar: 'عرض ثلاثي الأبعاد' },
  'plan3d.titel': { de: '3D-Ansicht', ar: 'العرض الثلاثي الأبعاد' },
  'plan3d.laedt': { de: '3D-Ansicht wird geladen', ar: 'جارٍ تحميل العرض الثلاثي الأبعاد' },
  'plan3d.geht_nicht': {
    de: 'Dieser Browser kann keine 3D-Grafik (WebGL) zeigen. Der Plan von oben funktioniert weiter.',
    ar: 'هذا المتصفح لا يستطيع عرض الرسومات الثلاثية الأبعاد (WebGL). المخطط من الأعلى يعمل كالمعتاد.',
  },
  'plan3d.fehler': {
    de: 'Die 3D-Ansicht konnte nicht geladen werden: {fehler}',
    ar: 'تعذّر تحميل العرض الثلاثي الأبعاد: {fehler}',
  },
  'plan3d.ansicht_oben': { de: 'Von oben', ar: 'من الأعلى' },
  'plan3d.ansicht_schraeg': { de: 'Schräg', ar: 'بزاوية' },
  'plan3d.zur_kiste': { de: 'Zur Kiste', ar: 'إلى الصندوق' },
  'plan3d.waende_halb': { de: 'Wände zur Kamera durchsichtig', ar: 'الجدران المواجهة للكاميرا شفافة' },
  'plan3d.schliessen': { de: '3D schließen', ar: 'إغلاق العرض الثلاثي الأبعاد' },
  'plan3d.bedienung': {
    de: 'Ziehen dreht, rechte Maustaste verschiebt, Mausrad zoomt.',
    ar: 'السحب يدوّر، الزر الأيمن للفأرة يحرّك، عجلة الفأرة تكبّر وتصغّر.',
  },
  'plan3d.leer': { de: 'Hier ist noch nichts gezeichnet.', ar: 'لم يُرسم شيء هنا بعد.' },
  'plan3d.umschalter': { de: 'Ansicht', ar: 'العرض' },
  'plan3d.zwei_d': { de: '2D', ar: 'ثنائي الأبعاد' },
  'plan3d.drei_d': { de: '3D', ar: 'ثلاثي الأبعاد' },
  'plan3d.leinwand': { de: 'Grundriss in 3D', ar: 'المخطط بالأبعاد الثلاثة' },
}
