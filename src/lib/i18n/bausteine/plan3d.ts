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
    de: 'Ziehen dreht die Wohnung, rechte Maustaste verschiebt, Mausrad zoomt. Möbel verschieben: "Hand" wählen.',
    ar: 'السحب يدوّر الشقة، الزر الأيمن يحرّك، العجلة تكبّر وتصغّر. لنقل الأثاث: اختر "يد".',
  },
  'plan3d.bedienung_handy': {
    de: 'Ein Finger dreht, zwei Finger verschieben und zoomen.',
    ar: 'إصبع واحد يدوّر، وإصبعان يحرّكان ويكبّران ويصغّران.',
  },
  'plan3d.modus': { de: 'Linke Maustaste', ar: 'زر الفأرة الأيسر' },
  'plan3d.hand': { de: 'Hand', ar: 'يد' },
  'plan3d.begehen': { de: 'Begehen', ar: 'تجوّل' },
  'plan3d.licht': { de: 'Licht', ar: 'الإضاءة' },
  'plan3d.licht_tag': { de: 'Tag', ar: 'نهار' },
  'plan3d.licht_abend': { de: 'Abend', ar: 'مساء' },
  'plan3d.licht_auto': { de: 'Automatisch', ar: 'تلقائي' },
  'plan3d.licht_raeume': { de: 'Licht je Zimmer', ar: 'الإضاءة لكل غرفة' },
  'plan3d.licht_schalter_hilfe': {
    de: 'Licht pro Zimmer an und aus. Ein Klick auf einen Lichtschalter an der Wand geht auch.',
    ar: 'تشغيل الإضاءة وإطفاؤها لكل غرفة. يمكن أيضًا النقر على مفتاح الإضاءة على الجدار.',
  },
  'plan3d.licht_alle_an': { de: 'Alle an', ar: 'تشغيل الكل' },
  'plan3d.licht_alle_aus': { de: 'Alle aus', ar: 'إطفاء الكل' },
  'plan3d.licht_an': { de: 'an', ar: 'مضاءة' },
  'plan3d.licht_aus': { de: 'aus', ar: 'مطفأة' },
  'plan3d.teppiche': { de: 'Teppiche', ar: 'السجاد' },
  'plan3d.deko': { de: 'Deko', ar: 'الديكور' },
  'plan3d.aufstehen': { de: 'Aufstehen', ar: 'انهض' },
  'plan3d.ablegen': { de: 'Ablegen', ar: 'ضعه' },
  'plan3d.mikro_an': { de: 'Mikrofon an', ar: 'تشغيل الميكروفون' },
  'plan3d.mikro_aus': { de: 'Mikrofon aus', ar: 'إيقاف الميكروفون' },
  'plan3d.mikro_hilfe': {
    de: 'Mit Mikrofon hören dich alle, die gerade auch durch die Wohnung gehen, lauter, je näher sie stehen.',
    ar: 'مع الميكروفون يسمعك كل من يتجول في الشقة الآن، وبصوت أعلى كلما اقتربوا.',
  },
  'plan3d.leute_da': { de: 'Mit dir in der Wohnung: {n}', ar: 'معك في الشقة: {n}' },
  'plan3d.ton_tippen': { de: 'Einmal tippen, dann hörst du die anderen.', ar: 'انقر مرة لتسمع الآخرين.' },
  'plan3d.vollbild': { de: 'Vollbild', ar: 'ملء الشاشة' },
  'plan3d.vollbild_ende': { de: 'Vollbild beenden', ar: 'إنهاء ملء الشاشة' },
  'plan3d.leiste_zu': { de: 'Knöpfe einklappen', ar: 'طي الأزرار' },
  'plan3d.leiste_auf': { de: 'Knöpfe zeigen', ar: 'إظهار الأزرار' },
  'plan3d.begehen_ende': { de: 'Begehen beenden', ar: 'إنهاء التجوّل' },
  'plan3d.begehen_hilfe': {
    de: 'Durch die Wohnung gehen, als wärst du drin.',
    ar: 'تجوّل في الشقة كأنك بداخلها.',
  },
  'plan3d.begehen_bedienung': {
    de: 'W A S D oder Pfeiltasten gehen, Umschalt rennt, Leertaste springt, ziehen schaut umher. E steigt ein. Antippen: hinsetzen, hinlegen, aufheben, Fernseher und Wasser an. Rechtsklick auf ein Möbel: verschieben. Esc beendet.',
    ar: 'W A S D أو مفاتيح الأسهم للمشي، Shift للركض، المسافة للقفز، السحب للنظر حولك. E للركوب. النقر: اجلس، استلقِ، التقط، شغّل التلفاز والماء. النقر بالزر الأيمن على قطعة أثاث: انقلها. Esc للإنهاء.',
  },
  'plan3d.begehen_bedienung_handy': {
    de: 'Links den Knopf schieben zum Gehen, mit dem Finger ziehen zum Umschauen. Die Knöpfe darüber: springen, einsteigen. Antippen: hinsetzen, hinlegen, aufheben, Fernseher und Wasser an. Lange auf ein Möbel drücken: verschieben.',
    ar: 'ادفع الزر يسارًا للمشي، واسحب بإصبعك للنظر حولك. الأزرار فوقه: اقفز، اركب. النقر: اجلس، استلقِ، التقط، شغّل التلفاز والماء. اضغط مطولًا على قطعة أثاث: انقلها.',
  },
  // E87: Springen, Fahren, Dinge hinstellen (Knoepfe beim Begehen).
  'plan3d.aktionen': { de: 'Was du gerade tun kannst', ar: 'ما يمكنك فعله الآن' },
  'plan3d.springen': { de: 'Springen', ar: 'اقفز' },
  'plan3d.einsteigen': { de: 'Einsteigen', ar: 'اركب' },
  'plan3d.aussteigen': { de: 'Aussteigen', ar: 'انزل' },
  // E87b: rundherum ist alles zu, man bleibt sitzen.
  'plan3d.aussteigen_kein_platz': {
    de: 'Hier ist kein Platz zum Aussteigen. Fahr ein Stück weiter.',
    ar: 'لا يوجد مكان للنزول هنا. تقدّم بالسيارة قليلًا.',
  },
  'plan3d.aussteigen_kein_platz_esc': {
    de: 'Hier ist kein Platz zum Aussteigen. Fahr ein Stück weiter, oder drück noch einmal Esc, dann endet das Begehen.',
    ar: 'لا يوجد مكان للنزول هنا. تقدّم بالسيارة قليلًا، أو اضغط Esc مرة أخرى لإنهاء التجوّل.',
  },
  'plan3d.sicht': { de: 'Sicht', ar: 'المنظر' },
  'plan3d.sicht_hinten': { de: 'Sicht von hinten', ar: 'المنظر من الخلف' },
  'plan3d.blaulicht': { de: 'Blaulicht', ar: 'ضوء الطوارئ' },
  'plan3d.hinstellen': { de: 'Hinstellen', ar: 'ضعه هنا' },
  'plan3d.ding_drehen': { de: 'Drehen', ar: 'دوّره' },
  'plan3d.kmh_name': { de: 'Geschwindigkeit in km/h', ar: 'السرعة بالكيلومتر في الساعة' },
  'plan3d.knueppel_fahren': {
    de: 'Fahren: nach vorn schieben fährt, zur Seite lenkt',
    ar: 'القيادة: الدفع للأمام يقود، والدفع للجانب يوجّه',
  },
  'plan3d.fahren_bedienung': {
    de: 'W und S Gas und Bremse, A und D lenken, ziehen schaut umher. E oder Esc steigt aus, V wechselt die Sicht, B schaltet das Blaulicht.',
    ar: 'W وS للتسارع والفرامل، A وD للتوجيه، السحب للنظر حولك. E أو Esc للنزول، V لتغيير المنظر، B لضوء الطوارئ.',
  },
  'plan3d.fahren_bedienung_handy': {
    de: 'Den Knopf links schieben: nach vorn fährt, zur Seite lenkt. Die Knöpfe darüber: aussteigen, Sicht, Blaulicht.',
    ar: 'ادفع الزر يسارًا: للأمام للقيادة، وللجانب للتوجيه. الأزرار فوقه: انزل، المنظر، ضوء الطوارئ.',
  },
  'plan3d.halten_bedienung': {
    de: 'Klick stellt das Ding dorthin, wohin du zeigst. R oder Mausrad dreht es, Ablegen legt es vor dir ab. Esc beendet.',
    ar: 'النقر يضع الشيء حيث تشير. R أو عجلة الفأرة لتدويره، و«ضعه» يضعه أمامك. Esc للإنهاء.',
  },
  'plan3d.halten_bedienung_handy': {
    de: 'Tipp auf die Stelle, an die das Ding soll, oder Hinstellen für die Mitte (Kreuz). Drehen dreht es, Ablegen legt es vor dir ab.',
    ar: 'انقر على المكان الذي تريد وضع الشيء فيه، أو «ضعه هنا» للمنتصف (العلامة). «دوّره» يدوّره، و«ضعه» يضعه أمامك.',
  },
  /* E89: Möbel tragen beim Begehen. */
  'plan3d.moebel_verschoben.eins': { de: '{n} Möbelstück verschoben', ar: 'قطعة أثاث منقولة: {n}' },
  'plan3d.moebel_verschoben.viele': { de: '{n} Möbel verschoben', ar: 'قطع أثاث منقولة: {n}' },
  'plan3d.moebel_tragen_hinweis': {
    de: 'Klick: abstellen · R: drehen · Esc: zurück',
    ar: 'النقر: ضعها · R: دوّرها · Esc: أعدها',
  },
  'plan3d.moebel_tragen_hinweis_handy': { de: 'Tippen: abstellen', ar: 'انقر: ضعها' },
  'plan3d.moebel_hier_nicht': {
    de: 'Hier nicht: Wand oder außerhalb der Räume.',
    ar: 'ليس هنا: جدار أو خارج الغرف.',
  },
  'plan3d.moebel_abstellen': { de: 'Abstellen', ar: 'ضعها' },
  'plan3d.moebel_zuruecksetzen': { de: 'Zurücksetzen', ar: 'إعادة إلى الأصل' },
  'plan3d.moebel_zuruecksetzen_hilfe': {
    de: 'Alle Möbel zurück an ihren Platz im Plan',
    ar: 'أعد كل قطع الأثاث إلى مكانها في المخطط',
  },
  'plan3d.moebel_speichern_hilfe': {
    de: 'Die neue Stellung der Möbel in den Grundriss übernehmen',
    ar: 'اعتمد المواضع الجديدة للأثاث في المخطط',
  },
  'plan3d.moebel_speichern_fehler': { de: 'Speichern ging nicht: {fehler}', ar: 'تعذّر الحفظ: {fehler}' },
  'plan3d.moebel_gesperrt': { de: 'Das lässt sich nicht verschieben', ar: 'لا يمكن نقل هذا' },
  'plan3d.verschiebungen_verworfen': { de: 'Verschiebungen verworfen', ar: 'أُلغيت تغييرات مواضع الأثاث' },
  'plan3d.gehen_vor': { de: 'Vorwärts gehen', ar: 'امشِ للأمام' },
  'plan3d.knueppel': { de: 'Gehen: in die Richtung schieben', ar: 'المشي: ادفع في الاتجاه' },
  'plan3d.gehen_zurueck': { de: 'Rückwärts gehen', ar: 'امشِ للخلف' },
  'plan3d.gehen_links': { de: 'Nach links gehen', ar: 'امشِ لليسار' },
  'plan3d.gehen_rechts': { de: 'Nach rechts gehen', ar: 'امشِ لليمين' },
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
