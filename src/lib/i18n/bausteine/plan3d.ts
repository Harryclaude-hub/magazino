import type { Woerterbuch } from '../woerter'

/* Die 3D-Ansicht am Computer (Etappe 4, START 5.5).
 *
 * Wie der Zeichner-Baustein steht dieser NICHT in woerter.ts, sondern
 * laedt mit dem Knopf (components/plan3d/oeffnen.tsx ruft
 * woerterNachladen). Am Handy gibt es sie im Grundriss und im Lageplan. Geprueft wird er
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
  'plan3d.bedienung_ziehen': {
    de: 'Möbel ziehen verschiebt es. Sonst: Ziehen dreht, rechte Maustaste verschiebt, Mausrad zoomt.',
    ar: 'سحب قطعة الأثاث ينقلها. غير ذلك: السحب يدوّر، الزر الأيمن يحرّك، العجلة تكبّر وتصغّر.',
  },
  'plan3d.bedienung_handy': {
    de: 'Ein Finger dreht, zwei Finger verschieben und zoomen.',
    ar: 'إصبع واحد يدوّر، وإصبعان يحرّكان ويكبّران ويصغّران.',
  },
  'plan3d.modus': { de: 'Linke Maustaste', ar: 'زر الفأرة الأيسر' },
  'plan3d.hand': { de: 'Hand', ar: 'يد' },
  'plan3d.drehen': { de: 'Drehen', ar: 'تدوير' },
  'plan3d.hand_hilfe': {
    de: 'Greifen und verschieben: nach oben, unten, links, rechts. Rechte Maustaste dreht.',
    ar: 'الإمساك والتحريك: للأعلى والأسفل واليسار واليمين. الزر الأيمن يدوّر.',
  },
  'plan3d.drehen_hilfe': {
    de: 'Ziehen dreht die Wohnung. Rechte Maustaste verschiebt.',
    ar: 'السحب يدوّر الشقة. الزر الأيمن يحرّك.',
  },
  'plan3d.bedienung_hand': {
    de: 'Ziehen verschiebt, rechte Maustaste dreht, Mausrad zoomt.',
    ar: 'السحب يحرّك، الزر الأيمن يدوّر، العجلة تكبّر وتصغّر.',
  },
  'plan3d.bedienung_ziehen_hand': {
    de: 'Möbel ziehen verschiebt es. Sonst: Ziehen verschiebt die Ansicht, rechte Maustaste dreht, Mausrad zoomt.',
    ar: 'سحب قطعة الأثاث ينقلها. غير ذلك: السحب يحرّك العرض، الزر الأيمن يدوّر، العجلة تكبّر وتصغّر.',
  },
  'plan3d.bedienung_handy_hand': {
    de: 'Ein Finger verschiebt, zwei Finger drehen und zoomen.',
    ar: 'إصبع واحد يحرّك، وإصبعان يدوّران ويكبّران.',
  },
  'plan3d.leer': { de: 'Hier ist noch nichts gezeichnet.', ar: 'لم يُرسم شيء هنا بعد.' },
  'plan3d.umschalter': { de: 'Ansicht', ar: 'العرض' },
  'plan3d.zwei_d': { de: '2D', ar: 'ثنائي الأبعاد' },
  'plan3d.drei_d': { de: '3D', ar: 'ثلاثي الأبعاد' },
  'plan3d.leinwand': { de: 'Grundriss in 3D', ar: 'المخطط بالأبعاد الثلاثة' },
}
