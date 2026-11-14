import type { Woerterbuch } from '../woerter'

/* Einstellungen, Installationshinweis und Darstellungsschalter.
 * Der Name Magazino bleibt in beiden Sprachen stehen, ebenso VAPID und
 * Safari. Zahlen bleiben in westlichen Ziffern, weil dieselben Ziffern
 * auf den Etiketten stehen.
 */
export const einstellungen: Woerterbuch = {
  // -------------------------------------------------------------- Kopfzeile
  'einstellungen.titel': { de: 'Einstellungen', ar: 'الإعدادات' },

  // ----------------------------------------------------------------- Profil
  'einstellungen.profil': { de: 'Profil', ar: 'الملف الشخصي' },
  'einstellungen.ohne_namen': { de: 'Ohne Namen', ar: 'بدون اسم' },
  'einstellungen.anzeigename': { de: 'Anzeigename', ar: 'الاسم الظاهر' },
  'einstellungen.anzeigename_hinweis': {
    de: 'So sehen dich die anderen in Umzügen und im Chat.',
    ar: 'هكذا يراك الآخرون في النقلات وفي المحادثة.',
  },
  'einstellungen.name_platzhalter': { de: 'Dein Name', ar: 'اسمك' },
  'einstellungen.name_gespeichert': { de: 'Name gespeichert', ar: 'تم حفظ الاسم' },

  // ------------------------------------------------- Figur in der Wohnung (E82)
  'einstellungen.figur': { de: 'Meine Figur in der Wohnung', ar: 'شخصيتي في الشقة' },
  'einstellungen.figur_hinweis': {
    de: 'So sehen dich die anderen, wenn ihr gemeinsam in 3D durch die Wohnung geht.',
    ar: 'هكذا يراك الآخرون عندما تتجولون معًا في الشقة ثلاثية الأبعاد.',
  },
  'einstellungen.figur_ungespeichert': { de: 'Noch nicht gespeichert.', ar: 'لم تُحفظ بعد.' },
  'einstellungen.figur_vorschau': {
    de: 'Vorschau deiner Figur. Ziehen dreht sie.',
    ar: 'معاينة شخصيتك. اسحب لتدويرها.',
  },
  'einstellungen.figur_laedt': { de: 'Vorschau lädt …', ar: 'جارٍ تحميل المعاينة …' },
  'einstellungen.figur_vorschau_fehler': {
    de: 'Vorschau nicht geladen: {fehler}',
    ar: 'لم يتم تحميل المعاينة: {fehler}',
  },
  'einstellungen.figur_kein_3d': {
    de: 'Dieses Gerät kann kein 3D anzeigen. Speichern geht trotzdem.',
    ar: 'هذا الجهاز لا يعرض الأبعاد الثلاثية. لكن الحفظ ممكن.',
  },
  'einstellungen.figur_haut': { de: 'Hautton', ar: 'لون البشرة' },
  'einstellungen.figur_haare': { de: 'Haarfarbe', ar: 'لون الشعر' },
  'einstellungen.figur_frisur': { de: 'Frisur', ar: 'تسريحة الشعر' },
  'einstellungen.figur_frisur_kurz': { de: 'Kurz', ar: 'قصير' },
  'einstellungen.figur_frisur_lang': { de: 'Lang', ar: 'طويل' },
  'einstellungen.figur_frisur_zopf': { de: 'Zopf', ar: 'ذيل حصان' },
  'einstellungen.figur_frisur_glatze': { de: 'Glatze', ar: 'أصلع' },
  'einstellungen.figur_frisur_locken': { de: 'Locken', ar: 'مجعّد' },
  'einstellungen.figur_oben': { de: 'Oberteil', ar: 'القطعة العلوية' },
  'einstellungen.figur_unten': { de: 'Hose', ar: 'البنطال' },
  'einstellungen.figur_schuhe': { de: 'Schuhe', ar: 'الحذاء' },
  'einstellungen.figur_groesse': { de: 'Größe', ar: 'الطول' },
  'einstellungen.figur_groesse_wert': { de: '{cm} cm', ar: '{cm} سم' },
  'einstellungen.figur_statur': { de: 'Statur', ar: 'البنية' },
  'einstellungen.figur_statur_schmal': { de: 'Schmal', ar: 'نحيف' },
  'einstellungen.figur_statur_mittel': { de: 'Mittel', ar: 'متوسط' },
  'einstellungen.figur_statur_breit': { de: 'Breit', ar: 'عريض' },
  'einstellungen.figur_brille': { de: 'Brille', ar: 'نظارة' },
  'einstellungen.figur_farbe': { de: 'Farbe {n} von {von}', ar: 'اللون {n} من {von}' },
  'einstellungen.figur_speichern': { de: 'Figur speichern', ar: 'حفظ الشخصية' },
  'einstellungen.figur_gespeichert': { de: 'Figur gespeichert', ar: 'تم حفظ الشخصية' },
  'einstellungen.figur_standard': { de: 'Zurück zum Standard', ar: 'العودة إلى الافتراضي' },

  // --------------------------------------------------------------- Passwort
  'einstellungen.passwort': { de: 'Passwort', ar: 'كلمة المرور' },
  'einstellungen.aktuelles_passwort': { de: 'Aktuelles Passwort', ar: 'كلمة المرور الحالية' },
  'einstellungen.neues_passwort': { de: 'Neues Passwort', ar: 'كلمة مرور جديدة' },
  'einstellungen.passwort_hinweis': {
    de: 'Mindestens 10 Zeichen, mit Buchstaben und Ziffern. Mit dem Auge kannst du es anzeigen.',
    ar: '10 أحرف على الأقل، مع حروف لاتينية وأرقام. اضغط على العين لإظهارها.',
  },
  'einstellungen.passwort_wiederholen': {
    de: 'Neues Passwort wiederholen',
    ar: 'أعد كتابة كلمة المرور الجديدة',
  },
  'einstellungen.aendern': { de: 'Ändern', ar: 'تغيير' },
  'einstellungen.passwort_geaendert': {
    de: 'Passwort geändert. Auf allen anderen Geräten bist du jetzt abgemeldet.',
    ar: 'تم تغيير كلمة المرور. تم تسجيل خروجك الآن من جميع الأجهزة الأخرى.',
  },
  // Das Passwort steht, nur das Abmelden der anderen Geraete schlug fehl.
  'einstellungen.passwort_geaendert_andere_offen': {
    de: 'Passwort geändert. Andere Geräte konnten wir gerade nicht abmelden. Bist du dort noch angemeldet, melde dich dort selbst ab.',
    ar: 'تم تغيير كلمة المرور. لم نتمكن الآن من تسجيل خروجك من الأجهزة الأخرى. إن كنت لا تزال مسجّل الدخول عليها، فسجّل الخروج منها بنفسك.',
  },
  'einstellungen.sicherheit_hinweis': {
    de: 'Die Verbindung läuft verschlüsselt, Passwörter liegen nur als Hash beim Anbieter. Deine Daten sieht nur, wer im jeweiligen Umzug eingetragen ist.',
    ar: 'الاتصال مشفّر، وكلمات المرور محفوظة كبصمة مشفّرة فقط. بياناتك لا يراها إلا من كان مسجّلاً في النقلة نفسها.',
  },

  // ----------------------------------------------------- Benachrichtigungen
  'einstellungen.benachrichtigungen': { de: 'Benachrichtigungen', ar: 'الإشعارات' },
  'einstellungen.dieses_geraet': { de: 'Auf diesem Gerät', ar: 'على هذا الجهاز' },
  'einstellungen.push_unsupported': {
    de: 'Dieser Browser kann keine Push-Benachrichtigungen. Auf dem iPhone geht es erst, wenn Magazino auf dem Startbildschirm liegt.',
    ar: 'هذا المتصفح لا يدعم الإشعارات. على iPhone تعمل فقط بعد وضع Magazino على الشاشة الرئيسية.',
  },
  'einstellungen.push_no_key': {
    de: 'Auf dem Server ist kein VAPID-Schlüssel hinterlegt. Ohne den kann nichts verschickt werden.',
    ar: 'لا يوجد مفتاح VAPID على الخادم. بدونه لا يمكن إرسال أي إشعار.',
  },
  'einstellungen.push_denied': {
    de: 'Benachrichtigungen sind im Browser blockiert. Das musst du in den Seiteneinstellungen wieder erlauben.',
    ar: 'الإشعارات محظورة في المتصفح. اسمح بها من جديد في إعدادات الموقع.',
  },
  'einstellungen.push_default': { de: 'Noch nicht erlaubt.', ar: 'لم يتم السماح بعد.' },
  'einstellungen.push_granted_off': {
    de: 'Erlaubt, aber dieses Gerät ist nicht angemeldet.',
    ar: 'مسموح، لكن هذا الجهاز غير مشترك.',
  },
  'einstellungen.push_granted_on': {
    de: 'Dieses Gerät bekommt Benachrichtigungen.',
    ar: 'هذا الجهاز يستقبل الإشعارات.',
  },
  'einstellungen.einschalten': { de: 'Einschalten', ar: 'تشغيل' },
  'einstellungen.ausschalten': { de: 'Ausschalten', ar: 'إيقاف' },
  'einstellungen.push_an': { de: 'Benachrichtigungen an', ar: 'تم تشغيل الإشعارات' },
  'einstellungen.push_aus': { de: 'Auf diesem Gerät aus', ar: 'تم الإيقاف على هذا الجهاز' },
  'einstellungen.laedt': { de: 'Einstellungen werden geladen', ar: 'جارٍ تحميل الإعدادات' },
  'einstellungen.chat': { de: 'Chatnachrichten', ar: 'رسائل المحادثة' },
  'einstellungen.chat_hinweis': { de: 'Einmal pro Nachricht.', ar: 'إشعار واحد لكل رسالة.' },
  'einstellungen.anrufe': { de: 'Anrufe', ar: 'المكالمات' },
  'einstellungen.anrufe_hinweis': {
    de: 'Wiederholt sich, solange es klingelt.',
    ar: 'يتكرر ما دام الرنين مستمراً.',
  },
  'einstellungen.kisten': { de: 'Kisten und Status', ar: 'الصناديق والحالة' },
  'einstellungen.kisten_hinweis': {
    de: 'Wenn jemand etwas scannt oder auf angekommen setzt.',
    ar: 'عند مسح صندوق أو تغيير حالته إلى وصل.',
  },

  // ---------------------------------------------------------------- Sprache
  'einstellungen.sprache': { de: 'Sprache', ar: 'اللغة' },

  // ------------------------------------------------------------ Darstellung
  'einstellungen.darstellung': { de: 'Darstellung', ar: 'المظهر' },
  'einstellungen.theme_system': { de: 'System', ar: 'النظام' },
  'einstellungen.theme_hell': { de: 'Hell', ar: 'فاتح' },
  'einstellungen.theme_dunkel': { de: 'Dunkel', ar: 'داكن' },
  'einstellungen.theme_kontrast': { de: 'Kontrast', ar: 'تباين عالٍ' },
  'einstellungen.theme_salbei': { de: 'Salbei', ar: 'أخضر هادئ' },
  'einstellungen.theme_ozean': { de: 'Ozean', ar: 'أزرق المحيط' },
  'einstellungen.theme_nacht': { de: 'Nacht', ar: 'ليلي' },
  'einstellungen.theme_graphit': { de: 'Graphit', ar: 'رمادي داكن' },
  'einstellungen.theme_titel': { de: 'Darstellung: {wert}', ar: 'المظهر: {wert}' },

  // --------------------------------------------------------------- Bewegung
  'einstellungen.bewegung': { de: 'Bewegung', ar: 'الحركة' },
  'einstellungen.bewegung_ruhig': { de: 'Ruhig', ar: 'هادئ' },
  'einstellungen.bewegung_ruhig_hinweis': {
    de: 'Nichts bewegt sich. Schont den Akku.',
    ar: 'لا شيء يتحرك. يوفّر البطارية.',
  },
  'einstellungen.bewegung_normal': { de: 'Normal', ar: 'عادي' },
  'einstellungen.bewegung_normal_hinweis': {
    de: 'Der Hintergrund steht fest, der Vordergrund scrollt darüber.',
    ar: 'الخلفية ثابتة والمحتوى يمر فوقها.',
  },
  'einstellungen.bewegung_voll': { de: 'Voll', ar: 'كامل' },
  'einstellungen.bewegung_voll_hinweis': {
    de: 'Dazu driftende Kisten und atmende Lichter.',
    ar: 'مع صناديق تنساب وأضواء تتنفس.',
  },

  // -------------------------------------------------------------------- App
  'einstellungen.app': { de: 'App', ar: 'التطبيق' },
  'einstellungen.abmelden': { de: 'Abmelden', ar: 'تسجيل الخروج' },
  'einstellungen.fusszeile': {
    de: 'Magazino . gebaut für den eigenen Umzug',
    ar: 'Magazino . صُنع من أجل نقلة حقيقية',
  },

  // --------------------------------------------------- Auf den Startbildschirm
  'einstellungen.install_ausblenden': { de: 'Hinweis ausblenden', ar: 'إخفاء الملاحظة' },
  'einstellungen.install_titel': {
    de: 'Magazino auf den Startbildschirm',
    ar: 'Magazino على الشاشة الرئيسية',
  },
  'einstellungen.install_ios_1': { de: 'In Safari unten auf', ar: 'في Safari اضغط بالأسفل على' },
  'einstellungen.install_ios_2': {
    de: 'Teilen tippen, dann auf Zum Home-Bildschirm. Danach startet Magazino wie eine normale App, mit Logo.',
    ar: 'مشاركة، ثم إضافة إلى الشاشة الرئيسية. بعدها يفتح Magazino مثل أي تطبيق، بشعاره الخاص.',
  },
  'einstellungen.install_text': {
    de: 'Ein Tipp, und Magazino liegt mit Logo auf deinem Startbildschirm. Ohne Browserleiste, mit Benachrichtigungen.',
    ar: 'ضغطة واحدة، ويصبح Magazino بشعاره على شاشتك الرئيسية. بلا شريط المتصفح، ومع الإشعارات.',
  },
  'einstellungen.install_knopf': { de: 'Jetzt installieren', ar: 'التثبيت الآن' },
}
