import type { Woerterbuch } from '../woerter'

/* Die Siedlung (E83): Liste, Einrichten und die Ansicht in 3D.
 *
 * Wie plan3d.ts steht dieser Baustein NICHT in woerter.ts, sondern laedt
 * mit den Seiten der Siedlung (pages/Siedlungen.tsx und
 * pages/SiedlungAnsicht.tsx rufen woerterNachladen). Beim Start der App
 * kommt davon nichts mit. Was schon vorher zu sehen ist (der Knopf oben
 * und der Schalter in den Einstellungen), steht darum in umzuege.ts.
 *
 * Einfache Woerter: Siedlung, Haus, Stockwerk, Wohnung, Aufzug. Adresse,
 * Namen und Stockwerk der eigenen Wohnung stehen nie hier, nur in der
 * Datenbank. */
export const siedlungWoerter: Woerterbuch = {
  // ------------------------------------------------------------- Liste
  'siedlung.titel': { de: 'Siedlung', ar: 'المجمّع السكني' },
  'siedlung.laden': { de: 'Siedlung laden', ar: 'تحميل المجمّع السكني' },
  'siedlung.laden_hinweis': {
    de: 'Wähle die Datei deiner Siedlung (endet auf .json). Die App trägt die Häuser, alle Wohnungen und die Deko mit deinem Konto ein. Das musst du nur einmal machen.',
    ar: 'اختر ملف مجمّعك السكني (ينتهي بـ .json). يسجّل التطبيق المباني وكل الشقق والديكور بحسابك. يكفي فعل ذلك مرة واحدة.',
  },
  'siedlung.laden_laeuft': { de: 'Siedlung wird eingetragen', ar: 'جارٍ تسجيل المجمّع السكني' },
  'siedlung.geladen': { de: 'Siedlung eingetragen', ar: 'تم تسجيل المجمّع السكني' },
  'siedlung.deko_ok': { de: 'Deko und Schalter sind in deinem Grundriss', ar: 'الديكور والمفاتيح موجودة في مخططك' },
  'siedlung.deko_fehler': {
    de: 'Die Siedlung ist da, aber Deko und Schalter kamen nicht in den Grundriss: {grund}',
    ar: 'المجمّع موجود، لكن الديكور والمفاتيح لم تُضف إلى المخطط: {grund}',
  },
  'siedlung.datei_fehler': { de: 'Die Datei passt nicht: {grund}', ar: 'الملف غير مناسب: {grund}' },
  'siedlung.datei_zu_gross': { de: 'zu groß', ar: 'كبير جدًا' },
  'siedlung.datei_kein_json': { de: 'keine JSON-Datei', ar: 'ليس ملف JSON' },
  'siedlung.datei_falsche_art': { de: 'keine Siedlungs-Datei von Kistly', ar: 'ليس ملف مجمّع سكني من Kistly' },
  'siedlung.zurueck_start': { de: 'Zur Startseite', ar: 'إلى الصفحة الرئيسية' },
  'siedlung.intro': {
    de: 'Die Häuser rund um dein Zuhause in 3D, mit deiner Wohnung darin. Du gehst durch das Haus, das Treppenhaus und mit dem Aufzug.',
    ar: 'المباني حول منزلك بالأبعاد الثلاثية، وشقتك بداخلها. تتجوّل في المبنى وعلى الدرج وفي المصعد.',
  },
  'siedlung.anlegen': { de: 'Siedlung anlegen', ar: 'إنشاء مجمّع سكني' },
  'siedlung.laedt': { de: 'Siedlungen werden geladen', ar: 'جارٍ تحميل المجمّعات السكنية' },
  'siedlung.leer_titel': { de: 'Noch keine Siedlung', ar: 'لا يوجد مجمّع سكني بعد' },
  'siedlung.leer_hinweis': {
    de: 'Such deine Adresse, wähl die Häuser rundherum und setz deine Wohnung hinein. Dann gehst du in 3D durch die Siedlung, das Treppenhaus und den Aufzug.',
    ar: 'ابحث عن عنوانك، واختر المباني من حولك، وضع شقتك فيها. بعدها تتجوّل بالأبعاد الثلاثية في المجمّع وعلى الدرج وفي المصعد.',
  },
  'siedlung.haeuser_zahl': { de: 'Häuser: {n}', ar: 'المباني: {n}' },
  'siedlung.wohnung_in': { de: 'Deine Wohnung: {haus}, {stock}', ar: 'شقتك: {haus}، {stock}' },
  'siedlung.ohne_wohnung': { de: 'Noch ohne eigene Wohnung', ar: 'بدون شقة بعد' },
  'siedlung.ansehen': { de: 'Ansehen', ar: 'عرض' },
  'siedlung.loeschen_titel': { de: 'Siedlung löschen?', ar: 'حذف المجمّع السكني؟' },
  'siedlung.loeschen_text': {
    de: '„{name}“ wird gelöscht. Deine Umzüge und Grundrisse bleiben, wie sie sind.',
    ar: 'سيُحذف «{name}». نقلاتك ومخططاتك تبقى كما هي.',
  },
  'siedlung.geloescht': { de: 'Siedlung gelöscht', ar: 'تم حذف المجمّع السكني' },
  'siedlung.gespeichert': { de: 'Siedlung gespeichert', ar: 'تم حفظ المجمّع السكني' },

  // ------------------------------------------------- Stockwerke, Aussehen
  'siedlung.geschoss_eg': { de: 'Erdgeschoss', ar: 'الطابق الأرضي' },
  'siedlung.geschoss_n': { de: '{n}. Stock', ar: 'الطابق {n}' },
  'siedlung.stil_weiss_loggia': { de: 'Weiß mit Loggien', ar: 'أبيض مع شرفات غائرة' },
  'siedlung.stil_holz': { de: 'Holz', ar: 'خشب' },
  'siedlung.stil_putz': { de: 'Hell verputzt', ar: 'جدران فاتحة' },
  'siedlung.stil_grau': { de: 'Grau', ar: 'رمادي' },

  // ------------------------------------------------------- Einrichten
  'siedlung.einrichten_titel': { de: 'Siedlung einrichten', ar: 'إعداد المجمّع السكني' },
  'siedlung.bearbeiten_titel': { de: 'Siedlung bearbeiten', ar: 'تعديل المجمّع السكني' },
  'siedlung.schritt_von': { de: 'Schritt {nr} von {von}: {name}', ar: 'الخطوة {nr} من {von}: {name}' },
  'siedlung.schritt_adresse': { de: 'Adresse', ar: 'العنوان' },
  'siedlung.schritt_haeuser': { de: 'Häuser', ar: 'المباني' },
  'siedlung.schritt_wohnung': { de: 'Wohnung', ar: 'الشقة' },
  'siedlung.schritt_speichern': { de: 'Speichern', ar: 'الحفظ' },

  // Schritt 1: Adresse
  'siedlung.adresse_platzhalter': { de: 'Straße Hausnummer, Ort', ar: 'الشارع ورقم المبنى، المدينة' },
  'siedlung.adresse_hinweis': {
    de: 'Die Suche fragt OpenStreetMap. Gespeichert wird nur der Punkt auf der Karte, nicht die Adresse.',
    ar: 'البحث يتم عبر OpenStreetMap. يُحفظ فقط الموقع على الخريطة، وليس العنوان.',
  },
  'siedlung.sucht': { de: 'Suche läuft', ar: 'جارٍ البحث' },
  'siedlung.keine_treffer': {
    de: 'Nichts gefunden. Versuch es mit Straße, Hausnummer und Ort.',
    ar: 'لم يُعثر على شيء. جرّب الشارع ورقم المبنى والمدينة.',
  },
  'siedlung.treffer_waehlen': { de: 'Tipp auf den richtigen Ort.', ar: 'اضغط على المكان الصحيح.' },

  // Schritt 2: Haeuser
  'siedlung.haeuser_laden': { de: 'Häuser in der Nähe werden geladen', ar: 'جارٍ تحميل المباني القريبة' },
  'siedlung.haeuser_leer': {
    de: 'Rund um diesen Punkt zeigt die Karte keine Häuser. Such eine andere Adresse.',
    ar: 'لا تُظهر الخريطة مباني حول هذا الموقع. ابحث عن عنوان آخر.',
  },
  'siedlung.haeuser_hinweis': {
    de: 'Tipp auf ein Haus, um es dazuzunehmen oder wegzulassen.',
    ar: 'اضغط على مبنى لإضافته أو استبعاده.',
  },
  'siedlung.haeuser_neu_laden': { de: 'Häuser in der Nähe neu laden', ar: 'إعادة تحميل المباني القريبة' },
  'siedlung.haeuser_gewaehlt': { de: 'Ausgewählt: {n}', ar: 'المختارة: {n}' },
  'siedlung.haus_name': { de: 'Name des Hauses', ar: 'اسم المبنى' },
  'siedlung.haus_vorschlag': { de: 'Haus {nr}', ar: 'المبنى {nr}' },
  'siedlung.geschosse': { de: 'Stockwerke', ar: 'الطوابق' },
  'siedlung.geschosse_nur_eg': { de: '1 (nur Erdgeschoss)', ar: '1 (الطابق الأرضي فقط)' },
  'siedlung.geschosse_zahl': { de: '{n} (Erdgeschoss + {oben})', ar: '{n} (الأرضي + {oben})' },
  'siedlung.stil': { de: 'Aussehen', ar: 'المظهر' },
  'siedlung.weglassen': { de: 'Weglassen', ar: 'استبعاد' },
  'siedlung.mindestens_ein_haus': { de: 'Wähl mindestens ein Haus.', ar: 'اختر مبنى واحدًا على الأقل.' },
  'siedlung.karte': { de: 'Häuser von oben, Norden ist oben', ar: 'المباني من الأعلى، الشمال في الأعلى' },
  'siedlung.norden': { de: 'N', ar: 'ش' },
  'siedlung.massstab': { de: '{m} m', ar: '{m} م' },

  // Schritt 3: Wohnung
  'siedlung.wohnung_frage': { de: 'Welche Wohnung ist deine?', ar: 'أي شقة هي شقتك؟' },
  'siedlung.wohnung_hinweis': {
    de: 'Nimm einen Grundriss aus einem deiner Umzüge. Er bleibt im Umzug, die Siedlung zeigt ihn nur.',
    ar: 'اختر مخططًا من إحدى نقلاتك. يبقى في النقلة، والمجمّع يعرضه فقط.',
  },
  'siedlung.grundrisse_laden': { de: 'Grundrisse werden geladen', ar: 'جارٍ تحميل المخططات' },
  'siedlung.grundrisse_leer': {
    de: 'Du hast noch keinen Grundriss. Zeichne ihn zuerst in einem Umzug, dann setzt du ihn hier ein. Ohne Wohnung geht es auch.',
    ar: 'ليس لديك مخطط بعد. ارسمه أولًا في إحدى النقلات، ثم ضعه هنا. يمكنك المتابعة بدون شقة أيضًا.',
  },
  'siedlung.grundriss': { de: 'Grundriss', ar: 'المخطط' },
  'siedlung.keine_wohnung': { de: 'Keine Wohnung', ar: 'بدون شقة' },
  'siedlung.haus': { de: 'Haus', ar: 'المبنى' },
  'siedlung.stockwerk': { de: 'Stockwerk', ar: 'الطابق' },
  'siedlung.platzieren_hinweis': {
    de: 'Zieh die Wohnung an ihre Stelle im Haus. Die Pfeile schieben in kleinen Schritten, die runden Pfeile drehen.',
    ar: 'اسحب الشقة إلى مكانها في المبنى. الأسهم تحرّكها بخطوات صغيرة، والأسهم الدائرية تدوّرها.',
  },
  'siedlung.drehen_links': { de: 'Nach links drehen', ar: 'تدوير لليسار' },
  'siedlung.drehen_rechts': { de: 'Nach rechts drehen', ar: 'تدوير لليمين' },
  'siedlung.schieben_norden': { de: 'Nach Norden schieben', ar: 'تحريك نحو الشمال' },
  'siedlung.schieben_sueden': { de: 'Nach Süden schieben', ar: 'تحريك نحو الجنوب' },
  'siedlung.schieben_westen': { de: 'Nach Westen schieben', ar: 'تحريك نحو الغرب' },
  'siedlung.schieben_osten': { de: 'Nach Osten schieben', ar: 'تحريك نحو الشرق' },
  'siedlung.in_die_mitte': { de: 'In die Mitte des Hauses', ar: 'إلى منتصف المبنى' },
  'siedlung.ausserhalb': {
    de: 'Die Wohnung ragt aus dem Haus heraus. Schieb sie ganz hinein.',
    ar: 'الشقة تخرج عن حدود المبنى. حرّكها إلى الداخل بالكامل.',
  },
  'siedlung.grundriss_laedt': { de: 'Grundriss wird geladen', ar: 'جارٍ تحميل المخطط' },
  'siedlung.grundriss_fehlt': {
    de: 'Diesen Grundriss gibt es nicht mehr. Wähl einen anderen.',
    ar: 'هذا المخطط لم يعد موجودًا. اختر مخططًا آخر.',
  },
  'siedlung.grundriss_unbekannt': { de: 'Grundriss nicht gefunden', ar: 'المخطط غير موجود' },
  'siedlung.grundriss_ohne_raeume': {
    de: 'Dieser Grundriss hat noch keine Räume. Zeichne sie zuerst.',
    ar: 'هذا المخطط لا يحتوي على غرف بعد. ارسمها أولًا.',
  },
  'siedlung.wohnung_karte': { de: 'Deine Wohnung im Haus, von oben', ar: 'شقتك داخل المبنى، من الأعلى' },

  // Schritt 4: Speichern
  'siedlung.name': { de: 'Name der Siedlung', ar: 'اسم المجمّع السكني' },
  'siedlung.name_vorschlag': { de: 'Meine Siedlung', ar: 'مجمّعي السكني' },
  'siedlung.name_hinweis': { de: 'Ein Name für dich, etwa „Zuhause“.', ar: 'اسم لك، مثل «البيت».' },
  'siedlung.name_fehlt': { de: 'Gib der Siedlung einen Namen.', ar: 'أعطِ المجمّع السكني اسمًا.' },

  // ------------------------------------------------------- Ansicht in 3D
  'siedlung.zur_wohnung': { de: 'Zur Wohnung', ar: 'إلى الشقة' },
  'siedlung.von_oben': { de: 'Von oben', ar: 'من الأعلى' },
  'siedlung.ansicht_laedt': { de: 'Siedlung wird geladen', ar: 'جارٍ تحميل المجمّع السكني' },
  'siedlung.nicht_gefunden': {
    de: 'Diese Siedlung gibt es nicht (mehr).',
    ar: 'هذا المجمّع السكني غير موجود.',
  },
  'siedlung.zur_liste': { de: 'Zu den Siedlungen', ar: 'إلى المجمّعات السكنية' },
  'siedlung.wohnung_fehlt': {
    de: 'Der Grundriss deiner Wohnung fehlt. Die Siedlung wird ohne ihn gezeigt.',
    ar: 'مخطط شقتك غير موجود. يُعرض المجمّع بدونه.',
  },
  'siedlung.3d_fehler': {
    de: 'Die Häuser in 3D konnten nicht geladen werden: {fehler}',
    ar: 'تعذّر تحميل المباني بالأبعاد الثلاثية: {fehler}',
  },
  'siedlung.welt_fehler': {
    de: 'Die Häuser konnten nicht gebaut werden: {fehler}',
    ar: 'تعذّر بناء المباني: {fehler}',
  },
  'siedlung.ebene_jetzt': { de: 'Du bist hier: {name}', ar: 'أنت هنا: {name}' },
  'siedlung.haus_stock': { de: '{haus}, {stock}', ar: '{haus}، {stock}' },
  'siedlung.aufzug': { de: 'Aufzug: Stockwerk wählen', ar: 'المصعد: اختر الطابق' },

  // ------------------------------------------- Liste der Wohnungen (E84)
  'siedlung.wohnungen': { de: 'Wohnungen', ar: 'الشقق' },
  'siedlung.wohnungen_hilfe': {
    de: 'Alle Wohnungen der Siedlung: antippen und hingehen',
    ar: 'كل شقق المجمّع: اضغط وانتقل إليها',
  },
  'siedlung.wohnungen_laedt': { de: 'Die Häuser werden noch gebaut', ar: 'لا يزال بناء المباني جاريًا' },
  'siedlung.wohnungen_suchen': { de: 'Nach Top suchen, etwa 12', ar: 'ابحث برقم الشقة، مثلًا 12' },
  'siedlung.wohnungen_leer': {
    de: 'In dieser Siedlung gibt es noch keine Wohnungen zum Hingehen.',
    ar: 'لا توجد في هذا المجمّع شقق يمكن الانتقال إليها بعد.',
  },
  'siedlung.wohnungen_keine_treffer': { de: 'Keine Wohnung passt zu „{suche}“.', ar: 'لا توجد شقة تطابق «{suche}».' },
  'siedlung.springen_hinweis': {
    de: 'Tipp auf eine Wohnung, dann gehst du dort weiter.',
    ar: 'اضغط على شقة لتتابع التجوّل من هناك.',
  },
  'siedlung.springen': { de: 'Hingehen', ar: 'انتقال' },
  'siedlung.springen_zu': { de: 'Zu {name} gehen', ar: 'الانتقال إلى {name}' },
}
