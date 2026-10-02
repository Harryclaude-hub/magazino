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
  // E87: die Liste heisst "Orte" (Wohnungen, Geschaefte, Feuerwehr, Spital).
  'siedlung.orte': { de: 'Orte', ar: 'الأماكن' },
  'siedlung.orte_hilfe': {
    de: 'Wohnungen, Geschäfte und andere Orte: antippen und hingehen',
    ar: 'الشقق والمحلات وأماكن أخرى: اضغط وانتقل إليها',
  },
  'siedlung.orte_laedt': { de: 'Die Häuser werden noch gebaut', ar: 'لا يزال بناء المباني جاريًا' },
  'siedlung.orte_suchen': { de: 'Suchen, etwa Top 12 oder Feuerwehr', ar: 'ابحث، مثلًا الشقة 12 أو الإطفاء' },
  'siedlung.orte_leer': {
    de: 'In dieser Siedlung gibt es noch keine Orte zum Hingehen.',
    ar: 'لا توجد في هذا المجمّع أماكن يمكن الانتقال إليها بعد.',
  },
  'siedlung.orte_keine_treffer': { de: 'Kein Ort passt zu „{suche}“.', ar: 'لا يوجد مكان يطابق «{suche}».' },
  'siedlung.springen_hinweis': {
    de: 'Tipp auf einen Ort, dann gehst du dort weiter.',
    ar: 'اضغط على مكان لتتابع التجوّل من هناك.',
  },
  'siedlung.springen': { de: 'Hingehen', ar: 'انتقال' },
  'siedlung.springen_zu': { de: 'Zu {name} gehen', ar: 'الانتقال إلى {name}' },

  // ------------------------------------------ Gemeinsame Siedlung (E86)
  // Leute einladen, entfernen, verlassen
  'siedlung.leute': { de: 'Leute', ar: 'الأشخاص' },
  'siedlung.leute_hilfe': {
    de: 'Leute einladen und sehen, wer dabei ist',
    ar: 'ادعُ أشخاصًا وشاهد من هو معك',
  },
  'siedlung.leute_titel': { de: 'Leute in der Siedlung', ar: 'الأشخاص في المجمّع السكني' },
  'siedlung.leute_fehler_kurz': {
    de: 'Die Leute konnten nicht geladen werden. Tippe hier für Details.',
    ar: 'تعذّر تحميل الأشخاص. اضغط هنا للتفاصيل.',
  },
  'siedlung.zu_gast': { de: 'Du bist hier zu Gast', ar: 'أنت ضيف هنا' },
  'siedlung.start': { de: 'Start am Hauseingang', ar: 'البداية عند مدخل المبنى' },
  'siedlung.einladen_titel': { de: 'Jemanden einladen', ar: 'دعوة شخص' },
  'siedlung.einladen_feld': { de: 'E-Mail oder Name', ar: 'البريد الإلكتروني أو الاسم' },
  'siedlung.einladen_hinweis': {
    de: 'Die Person braucht ein Kistly-Konto. Ein Name geht nur, wenn ihn genau eine Person hat; sonst nimm die E-Mail.',
    ar: 'يحتاج الشخص إلى حساب في Kistly. يصلح الاسم فقط إذا كان لشخص واحد بالضبط؛ وإلا فاستخدم البريد الإلكتروني.',
  },
  'siedlung.einladen': { de: 'Einladen', ar: 'دعوة' },
  'siedlung.einladen_leer': { de: 'Gib eine E-Mail oder einen Namen ein.', ar: 'أدخل بريدًا إلكترونيًا أو اسمًا.' },
  'siedlung.einladen_fehler': { de: 'Einladen ging nicht: {grund}', ar: 'تعذّرت الدعوة: {grund}' },
  'siedlung.einladung_ok': {
    de: '{name} ist jetzt dabei und kann die Siedlung öffnen.',
    ar: '{name} أصبح معك ويمكنه فتح المجمّع السكني.',
  },
  'siedlung.einladung_nicht_gefunden': {
    de: 'Niemand mit dieser E-Mail oder diesem Namen gefunden. Die Person braucht ein Kistly-Konto.',
    ar: 'لم يُعثر على أحد بهذا البريد الإلكتروني أو بهذا الاسم. يحتاج الشخص إلى حساب في Kistly.',
  },
  'siedlung.einladung_mehrdeutig': {
    de: 'Diesen Namen haben mehrere Leute. Nimm bitte die E-Mail-Adresse.',
    ar: 'هذا الاسم لدى أكثر من شخص. من فضلك استخدم البريد الإلكتروني.',
  },
  'siedlung.einladung_schon_drin': { de: 'Diese Person ist schon dabei.', ar: 'هذا الشخص موجود بالفعل.' },
  'siedlung.einladung_selbst': { de: 'Das bist du selbst.', ar: 'هذا أنت.' },
  'siedlung.einladung_zu_viele': {
    de: 'Das geht gerade nicht: zu viele Leute oder zu viele Versuche. Entferne jemanden oder versuch es später noch einmal.',
    ar: 'غير ممكن الآن: عدد كبير جدًا من الأشخاص أو المحاولات. أزل أحدًا أو حاول مرة أخرى لاحقًا.',
  },
  'siedlung.mitglieder': { de: 'Dabei', ar: 'المشاركون' },
  'siedlung.mitglieder_laedt': { de: 'Leute werden geladen', ar: 'جارٍ تحميل الأشخاص' },
  'siedlung.mitglieder_leer': {
    de: 'Noch niemand eingeladen. Wer dabei ist, geht mit dir durch die Siedlung, und ihr hört euch.',
    ar: 'لم تدعُ أحدًا بعد. من ينضم يتجوّل معك في المجمّع ويسمع أحدكما الآخر.',
  },
  'siedlung.rolle_besitzer': { de: 'Besitzer', ar: 'المالك' },
  'siedlung.rolle_gast': { de: 'Gast', ar: 'ضيف' },
  // E87b: Leute im Umzug der eigenen Wohnung des Besitzers (kein Gast).
  'siedlung.rolle_umzug': { de: 'im Umzug', ar: 'في النقلة' },
  'siedlung.umzug_hinweis': {
    de: 'Du bist über den Umzug dieser Wohnung dabei. Einladen kann nur, wem die Siedlung gehört.',
    ar: 'أنت مشارك عبر نقلة هذه الشقة. الدعوة متاحة لمالك المجمّع السكني فقط.',
  },
  'siedlung.gaeste_zahl': { de: 'Gäste: {n} von {max}', ar: 'الضيوف: {n} من {max}' },
  'siedlung.du': { de: 'Du', ar: 'أنت' },
  'siedlung.entfernen': { de: 'Entfernen', ar: 'إزالة' },
  'siedlung.entfernen_name': { de: '{name} entfernen', ar: 'إزالة {name}' },
  'siedlung.entfernen_frage': {
    de: '{name} entfernen? Die Person kann die Siedlung dann nicht mehr öffnen.',
    ar: 'إزالة {name}؟ لن يتمكن هذا الشخص بعدها من فتح المجمّع السكني.',
  },
  'siedlung.entfernt': { de: '{name} ist nicht mehr dabei.', ar: '{name} لم يعد مشاركًا.' },
  'siedlung.gast_hinweis': {
    de: 'Du bist Gast in dieser Siedlung. Einladen kann nur, wem sie gehört.',
    ar: 'أنت ضيف في هذا المجمّع السكني. الدعوة متاحة لمالكه فقط.',
  },
  'siedlung.verlassen': { de: 'Siedlung verlassen', ar: 'مغادرة المجمّع السكني' },
  'siedlung.verlassen_frage': {
    de: '„{name}“ verlassen? Du kannst die Siedlung dann erst wieder öffnen, wenn du neu eingeladen wirst.',
    ar: 'مغادرة «{name}»؟ لن تتمكن من فتح المجمّع السكني مجددًا إلا إذا دُعيت من جديد.',
  },
  'siedlung.verlassen_ok': { de: 'Du hast die Siedlung verlassen.', ar: 'لقد غادرت المجمّع السكني.' },
  'siedlung.aktion_fehler': { de: 'Das ging nicht: {grund}', ar: 'لم ينجح ذلك: {grund}' },

  // Zusammen in 3D: wer da ist, Sprechen, Verbindung
  'siedlung.leute_da': { de: 'Mit dir in der Siedlung: {n}', ar: 'معك في المجمّع السكني: {n}' },
  'siedlung.mikro_hilfe': {
    de: 'Mit Mikrofon hören dich alle, die gerade auch durch die Siedlung gehen, lauter, je näher sie stehen.',
    ar: 'مع الميكروفون يسمعك كل من يتجوّل في المجمّع الآن، وبصوت أعلى كلما اقتربوا.',
  },
  'siedlung.live_anmeldung': {
    de: 'Verbindung zur Siedlung nicht aufgebaut: {grund}',
    ar: 'لم يتم الاتصال بالمجمّع السكني: {grund}',
  },
  'siedlung.live_kanal': {
    de: 'Die Verbindung zu den anderen in der Siedlung ist gestört. Du siehst sie gerade nicht.',
    ar: 'الاتصال بالآخرين في المجمّع السكني متعطل. لا يمكنك رؤيتهم الآن.',
  },
  'siedlung.live_zeit': {
    de: 'Die anderen in der Siedlung antworten nicht. Es wird weiter versucht.',
    ar: 'الآخرون في المجمّع السكني لا يستجيبون. تتم المحاولة من جديد.',
  },
  'siedlung.live_zu': {
    de: 'Die Verbindung zu den anderen in der Siedlung wurde beendet.',
    ar: 'انتهى الاتصال بالآخرين في المجمّع السكني.',
  },

  // Minikarte
  'siedlung.minikarte': { de: 'Karte', ar: 'الخريطة' },
  'siedlung.minikarte_bild': {
    de: 'Karte der Siedlung von oben, Norden ist oben. Tippe auf ein Haus, um hinzugehen.',
    ar: 'خريطة المجمّع السكني من الأعلى، الشمال في الأعلى. اضغط على مبنى للانتقال إليه.',
  },
  'siedlung.minikarte_zu': { de: 'Karte einklappen', ar: 'طي الخريطة' },
  'siedlung.minikarte_auf': { de: 'Karte zeigen', ar: 'إظهار الخريطة' },
  'siedlung.minikarte_du': { de: 'Du', ar: 'أنت' },
  'siedlung.minikarte_naeher': { de: 'Näher heran', ar: 'تقريب' },
  'siedlung.minikarte_weiter': { de: 'Weiter weg', ar: 'تبعيد' },

  // ---------------------------------- Stadtteil, Dinge, Wohnung (E87)
  'siedlung.zu_unserer_wohnung': { de: 'Zu unserer Wohnung', ar: 'إلى شقتنا' },
  'siedlung.zu_unserer_wohnung_hilfe': {
    de: 'Zu eurer Wohnung in der Siedlung gehen (leer, wie geplant)',
    ar: 'انتقل إلى شقتكم في المجمّع (فارغة كما في المخطط)',
  },
  'siedlung.eingerichtet': { de: 'Eingerichtet ansehen', ar: 'عرضها مفروشة' },
  'siedlung.eingerichtet_hilfe': {
    de: 'Die eingerichtete Wohnung im Umzug öffnen: Grundriss, dann 3D und Begehen',
    ar: 'افتح الشقة المفروشة في النقلة: المخطط، ثم العرض الثلاثي الأبعاد والتجوّل',
  },
  'siedlung.dinge_laden_fehler': {
    de: 'Wo Dinge und Autos zuletzt standen, konnte nicht geladen werden: {grund}',
    ar: 'تعذّر تحميل آخر أماكن الأشياء والسيارات: {grund}',
  },
  'siedlung.dinge_speichern_fehler': {
    de: 'Wo das Ding jetzt steht, wurde nicht gespeichert: {grund}',
    ar: 'لم يُحفظ المكان الجديد للشيء: {grund}',
  },
  // E87b: Fehler je Ding; mehrere nicht gespeichert, dazu der juengste Grund.
  'siedlung.dinge_speichern_fehler_n': {
    de: 'Wo verschobene Dinge jetzt stehen, wurde nicht gespeichert (Anzahl: {anzahl}): {grund}',
    ar: 'لم تُحفظ الأماكن الجديدة لأشياء منقولة (العدد: {anzahl}): {grund}',
  },
  'siedlung.dinge_ohne_rahmen': {
    de: 'Wo Dinge und Autos stehen, wird gerade weder geladen noch gespeichert: Diese Siedlung kann ihre Lage noch nicht umrechnen.',
    ar: 'لا يتم الآن تحميل أماكن الأشياء والسيارات ولا حفظها: هذا المجمّع لا يستطيع بعد تحويل مواقعها.',
  },
  'siedlung.dinge_umrechnen_fehler': {
    de: 'Einige Dinge konnten nicht an ihren gespeicherten Platz gestellt oder dort gespeichert werden.',
    ar: 'تعذّر وضع بعض الأشياء في أماكنها المحفوظة أو حفظها هناك.',
  },
  'siedlung.dinge_zuruecksetzen': { de: 'Dinge zurücksetzen', ar: 'إعادة الأشياء إلى أماكنها' },
  'siedlung.dinge_zuruecksetzen_hilfe': {
    de: 'Alle verschobenen Dinge und Autos wieder an ihren Startplatz stellen',
    ar: 'أعد كل الأشياء والسيارات المنقولة إلى أماكنها الأصلية',
  },
  'siedlung.dinge_zuruecksetzen_frage': {
    de: 'Alle verschobenen Dinge und Autos wieder an ihren Startplatz stellen? Das gilt für alle in der Siedlung und lässt sich nicht rückgängig machen.',
    ar: 'إعادة كل الأشياء والسيارات المنقولة إلى أماكنها الأصلية؟ ينطبق ذلك على الجميع في المجمّع السكني ولا يمكن التراجع عنه.',
  },
  'siedlung.dinge_zuruecksetzen_ja': { de: 'Zurücksetzen', ar: 'إعادة' },
  'siedlung.dinge_zurueckgesetzt': { de: 'Dinge zurückgesetzt: {n}', ar: 'تمت إعادة الأشياء: {n}' },
  'siedlung.dinge_zuruecksetzen_fehler': { de: 'Zurücksetzen ging nicht: {grund}', ar: 'تعذّرت الإعادة: {grund}' },
  // E87b: herausgenommen, waehrend die Siedlung offen war.
  'siedlung.nicht_mehr_dabei': { de: 'Du bist nicht mehr in dieser Siedlung.', ar: 'لم تعد ضمن هذا المجمّع السكني.' },
  'siedlung.nicht_mehr_dabei_hinweis': {
    de: 'Wem die Siedlung gehört, hat dich herausgenommen. Die Verbindung zu den anderen ist beendet. Lädt man dich wieder ein, kannst du sie wieder öffnen.',
    ar: 'أخرجك مالك المجمّع السكني منه. انتهى الاتصال بالآخرين. إذا دُعيت من جديد يمكنك فتحه مرة أخرى.',
  },

  // ------------------------------- Aus Datei aktualisieren, Umgebung (E87)
  'siedlung.aus_datei': { de: 'Aus Datei aktualisieren', ar: 'تحديث من ملف' },
  'siedlung.aus_datei_hilfe': {
    de: 'Die Siedlung aus einer neuen Datei (.json) laden, etwa mit der Umgebung. Sie ersetzt diese Siedlung; Gäste und verschobene Dinge bleiben.',
    ar: 'حمّل المجمّع السكني من ملف جديد (.json)، مثلًا مع المنطقة المحيطة. يحلّ محل هذا المجمّع، ويبقى الضيوف والأشياء المنقولة.',
  },
  'siedlung.aus_datei_laeuft': { de: 'Siedlung wird aktualisiert', ar: 'جارٍ تحديث المجمّع السكني' },
  'siedlung.aktualisiert': { de: 'Siedlung aktualisiert', ar: 'تم تحديث المجمّع السكني' },
  'siedlung.umgebung_fehler': { de: 'Die Umgebung konnte nicht gebaut werden', ar: 'تعذّر بناء المنطقة المحيطة' },
  'siedlung.umgebung_fehler_grund': {
    de: 'Die Umgebung konnte nicht gebaut werden: {grund}',
    ar: 'تعذّر بناء المنطقة المحيطة: {grund}',
  },
}
