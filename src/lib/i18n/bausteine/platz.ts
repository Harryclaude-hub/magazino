import type { Woerterbuch } from '../woerter'

/* Kiste platzieren am Handy (Etappe 3, START 5.7): Zimmer waehlen, Stelle
 * tippen, Unterlage waehlen, speichern.
 *
 * Wie der Zeichner-Baustein steht dieser NICHT in woerter.ts, sondern
 * laedt mit dem Code-Teil des Ablaufs (pages/PlatzWahl.tsx ruft
 * woerterNachladen). Geprueft wird er wie alle anderen
 * (scripts/woerter-pruefen.mjs). Arabische Saetze liest Karam gegen. */
export const platzWoerter: Woerterbuch = {
  'platz.titel': { de: 'Platz wählen', ar: 'اختيار الموضع' },
  'platz.laedt': { de: 'Zimmer werden geladen', ar: 'جارٍ تحميل الغرف' },
  'platz.raum_laedt': { de: 'Zimmer wird geladen', ar: 'جارٍ تحميل الغرفة' },
  'platz.zimmer_waehlen': { de: 'In welchem Zimmer steht die Kiste?', ar: 'في أي غرفة يوجد الصندوق؟' },
  'platz.anderes_zimmer': { de: 'Anderes Zimmer', ar: 'غرفة أخرى' },
  'platz.nicht_gezeichnet': { de: 'Noch kein Zimmer gezeichnet', ar: 'لم تُرسم أي غرفة بعد' },
  'platz.nicht_gezeichnet_hinweis': {
    de: 'Zeichnen geht am Computer. Danach kannst du hier jede Kiste mit wenigen Tipps hinstellen.',
    ar: 'الرسم متاح على الحاسوب. بعدها يمكنك هنا وضع أي صندوق ببضع نقرات.',
  },
  'platz.spaeter': { de: 'Später', ar: 'لاحقًا' },
  'platz.moebel': { de: 'Möbel bekommen ihren Platz im Grundriss', ar: 'قطع الأثاث تأخذ مكانها في المخطط' },
  'platz.moebel_hinweis': {
    de: 'Zeichne das Möbel am Computer und verknüpfe es mit diesem Eintrag.',
    ar: 'ارسم قطعة الأثاث على الحاسوب واربطها بهذا الإدخال.',
  },
  'platz.nur_ansehen': {
    de: 'Plätze setzen dürfen nur Bearbeiter. Hier siehst du das Zimmer.',
    ar: 'تحديد المواضع مسموح للمحرّرين فقط. هنا ترى الغرفة.',
  },
  'platz.jetzt': { de: 'Steht jetzt: {satz}', ar: 'موضعه الآن: {satz}' },
  'platz.tippen': { de: 'Tippe, wo die Kiste steht.', ar: 'اضغط على مكان الصندوق.' },
  'platz.tippen_hinweis': {
    de: 'Mit zwei Fingern zoomen. Die Stelle wird auf 5 cm gerundet.',
    ar: 'كبّر بإصبعين. يُقرَّب الموضع إلى 5 سم.',
  },
  'platz.plan_label': { de: 'Zimmer von oben, zum Tippen', ar: 'الغرفة من الأعلى، للضغط' },
  'platz.stelle': { de: '{x} cm von links, {y} cm von oben', ar: '{x} سم من اليسار، {y} سم من الأعلى' },
  'platz.draussen': {
    de: 'Diese Stelle liegt außerhalb des Zimmers. Tippe innerhalb der Wände.',
    ar: 'هذا الموضع خارج الغرفة. اضغط داخل الجدران.',
  },
  'platz.feineinstellung': { de: 'Feineinstellung', ar: 'ضبط دقيق' },
  'platz.von_links': { de: 'von links (cm)', ar: 'من اليسار (سم)' },
  'platz.von_oben': { de: 'von oben (cm)', ar: 'من الأعلى (سم)' },
  'platz.zahl_falsch': {
    de: 'Bitte eine Länge wie 345 oder 3,45 eingeben.',
    ar: 'أدخل طولًا مثل 345 أو 3,45 من فضلك.',
  },
  'platz.schieben': { de: '{achse} um {n} cm', ar: '{achse} بمقدار {n} سم' },
  'platz.drehen': { de: 'Drehen', ar: 'تدوير' },
  'platz.masse': { de: 'Kiste {masse}', ar: 'الصندوق {masse}' },
  'platz.letzte': { de: 'Zuletzt benutzt', ar: 'المستخدَم مؤخرًا' },
  'platz.unterlage_titel': { de: 'Worauf steht sie?', ar: 'على ماذا يوضع؟' },
  'platz.unterlage_leer': {
    de: 'Tippe zuerst im Plan, wo die Kiste steht.',
    ar: 'اضغط أولًا في المخطط على مكان الصندوق.',
  },
  'platz.boden': { de: 'Boden, {von} bis {bis} cm', ar: 'الأرض، من {von} إلى {bis} سم' },
  'platz.auf_kiste': { de: 'auf {code}, {von} bis {bis} cm', ar: 'على {code}، من {von} إلى {bis} سم' },
  'platz.auf_objekt': { de: 'auf {name}, {von} bis {bis} cm', ar: 'على {name}، من {von} إلى {bis} سم' },
  'platz.regal': { de: '{name}: Fach wählen', ar: '{name}: اختر الخانة' },
  'platz.fach': {
    de: 'Fach {ebene} (Ebene {ebene}), {von} bis {bis} cm',
    ar: 'الخانة {ebene} (المستوى {ebene})، من {von} إلى {bis} سم',
  },
  'platz.fach_spalte': {
    de: 'Fach {ebene}/{spalte} (Ebene {ebene}, Spalte {spalte}), {von} bis {bis} cm',
    ar: 'الخانة {ebene}/{spalte} (المستوى {ebene}، العمود {spalte})، من {von} إلى {bis} سم',
  },
  'platz.passt_nicht': { de: 'Passt nicht: Platz nur bis {grenze} cm', ar: 'لا يتسع: المساحة حتى {grenze} سم فقط' },
  'platz.ragt_vor': { de: 'ragt {cm} cm aus dem Fach heraus', ar: 'يبرز {cm} سم خارج الخانة' },
  'platz.ueberstand_zu_gross': {
    de: 'Passt nicht: ragt {cm} cm heraus, erlaubt sind {max} cm',
    ar: 'لا يتسع: يبرز {cm} سم، والمسموح {max} سم',
  },
  'platz.ueberlappt': {
    de: 'Achtung, hier steht schon etwas: {codes}. Speichern geht trotzdem.',
    ar: 'انتبه، يوجد شيء هنا بالفعل: {codes}. الحفظ ممكن رغم ذلك.',
  },
  'platz.speichern': { de: 'Hier hinstellen', ar: 'ضعه هنا' },
  'platz.gespeichert': { de: '{code} steht jetzt: {satz}', ar: '{code} موضعه الآن: {satz}' },
  'platz.naechste': { de: 'Nächste Kiste ({n} übrig)', ar: 'الصندوق التالي (باقي {n})' },
  'platz.reihe': { de: 'Kiste {nr} von {n}', ar: 'الصندوق {nr} من {n}' },
}
