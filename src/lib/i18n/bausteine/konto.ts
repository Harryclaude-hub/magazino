import type { Woerterbuch } from '../woerter'

/* Anmelden, Konto anlegen und Passwort zuruecksetzen. Alle Schluessel
 * beginnen mit konto.
 *
 * konto.passwort_anzeigen und konto.passwort_verbergen stehen absichtlich
 * nicht hier, sondern in gemeinsam.ts, weil ui.tsx sie direkt braucht.
 */
export const konto: Woerterbuch = {
  // ------------------------------------------------------- Rahmen und Kopf
  'konto.startseite': { de: 'Startseite', ar: 'الصفحة الرئيسية' },

  // ------------------------------------------------------------- Anmelden
  'konto.anmelden': { de: 'Anmelden', ar: 'تسجيل الدخول' },
  'konto.anmelden_unter': {
    de: 'Mit E-Mail und Passwort.',
    ar: 'بالبريد الإلكتروني وكلمة المرور.',
  },
  'konto.noch_kein_konto': { de: 'Noch kein Konto?', ar: 'ليس لديك حساب؟' },
  'konto.jetzt_anlegen': { de: 'Jetzt anlegen', ar: 'أنشئ حسابًا الآن' },

  // ---------------------------------------------------------------- Felder
  'konto.email': { de: 'E-Mail', ar: 'البريد الإلكتروني' },
  'konto.email_platzhalter': { de: 'du@beispiel.de', ar: 'du@beispiel.de' },
  'konto.passwort': { de: 'Passwort', ar: 'كلمة المرور' },
  'konto.passwort_platzhalter': { de: 'Dein Passwort', ar: 'كلمة المرور' },
  'konto.passwort_vergessen': { de: 'Passwort vergessen', ar: 'نسيت كلمة المرور' },

  // -------------------------------------------------------- Konto anlegen
  'konto.konto_anlegen': { de: 'Konto anlegen', ar: 'إنشاء حساب' },
  'konto.konto_anlegen_unter': {
    de: 'Name ist freiwillig. E-Mail und Passwort brauchst du.',
    ar: 'الاسم اختياري. تحتاج البريد الإلكتروني وكلمة المرور.',
  },
  'konto.schon_konto': { de: 'Schon ein Konto?', ar: 'لديك حساب؟' },
  'konto.name_hinweis': {
    de: 'Optional. So sehen dich die anderen im Umzug.',
    ar: 'اختياري. هكذا يراك الآخرون في النقلة.',
  },
  'konto.name_platzhalter': { de: 'Karam', ar: 'كرم' },
  'konto.passwort_kurz': { de: 'Nimm mindestens 8 Zeichen.', ar: 'استخدم 8 أحرف على الأقل.' },
  'konto.passwort_min': { de: 'Mindestens 8 Zeichen.', ar: '8 أحرف على الأقل.' },
  'konto.passwort_hinweis': {
    de: 'Mindestens 8 Zeichen. Mit dem Auge im Feld kannst du es anzeigen.',
    ar: '8 أحرف على الأقل. اضغط رمز العين في الحقل لإظهارها.',
  },
  'konto.neues_passwort_platzhalter': { de: 'Neues Passwort', ar: 'كلمة مرور جديدة' },
  'konto.fast_fertig': { de: 'Fast fertig', ar: 'اقتربت من النهاية' },
  'konto.bestaetigung_noetig': {
    de: 'Konto angelegt. Dieses Supabase-Projekt verlangt noch eine Bestätigung per E-Mail. Schau in dein Postfach, dann kannst du dich anmelden.',
    ar: 'تم إنشاء الحساب. يطلب مشروع Supabase هذا تأكيدًا عبر البريد الإلكتروني. تحقق من بريدك، ثم يمكنك تسجيل الدخول.',
  },
  'konto.zur_anmeldung': { de: 'Zur Anmeldung', ar: 'إلى تسجيل الدخول' },

  // --------------------------------------------------- Passwort vergessen
  'konto.reset_titel': { de: 'Passwort zurücksetzen', ar: 'إعادة تعيين كلمة المرور' },
  'konto.reset_unter': {
    de: 'Wir schicken dir einen Link, mit dem du ein neues Passwort setzt.',
    ar: 'سنرسل لك رابطًا تضبط به كلمة مرور جديدة.',
  },
  'konto.zurueck_anmeldung': { de: 'Zurück zur Anmeldung', ar: 'رجوع إلى تسجيل الدخول' },
  // Immer derselbe Satz, ob es ein Konto gibt oder nicht.
  'konto.reset_unterwegs_titel': { de: 'Schau in dein Postfach', ar: 'تحقّق من بريدك' },
  'konto.reset_unterwegs_text': {
    de: 'Wenn es zu dieser Adresse ein Konto gibt, ist jetzt eine E-Mail mit einem Link unterwegs. Der Link gilt eine Stunde und nur einmal.',
    ar: 'إن كان لهذا العنوان حساب، فهناك الآن رسالة في الطريق إليك فيها رابط. الرابط صالح لمدة ساعة واحدة ولمرة واحدة فقط.',
  },
  'konto.reset_zu_viele': {
    de: 'Gerade wurden zu viele Links angefordert. Warte ein paar Minuten und versuch es dann noch einmal.',
    ar: 'طُلبت روابط كثيرة في وقت قصير. انتظر بضع دقائق ثم حاول مرة أخرى.',
  },
  'konto.reset_keine_verbindung': {
    de: 'Keine Verbindung zum Server. Prüf das Internet und versuch es noch einmal.',
    ar: 'لا يوجد اتصال بالخادم. تحقّق من الإنترنت ثم حاول مرة أخرى.',
  },
  'konto.link_schicken': { de: 'Link schicken', ar: 'أرسل الرابط' },
  'konto.link_nochmal': { de: 'Link nochmal schicken', ar: 'أرسل الرابط مرة أخرى' },
  'konto.link_nochmal_warten': {
    de: 'Nochmal schicken geht in {s} s',
    ar: 'يمكن الإرسال مرة أخرى بعد {s} ثانية',
  },
  'konto.andere_adresse': { de: 'Andere Adresse eingeben', ar: 'أدخل عنوانًا آخر' },

  // ------------------------------------------------------- Neues Passwort
  'konto.neues_passwort': { de: 'Neues Passwort', ar: 'كلمة مرور جديدة' },
  'konto.neues_passwort_unter': {
    de: 'Setze jetzt dein neues Passwort.',
    ar: 'اضبط الآن كلمة المرور الجديدة.',
  },
  'konto.link_wird_geprueft': { de: 'Link wird geprüft', ar: 'جارٍ التحقق من الرابط' },
  'konto.link_weiter': { de: 'Weiter zum neuen Passwort', ar: 'تابع إلى كلمة المرور الجديدة' },
  'konto.link_weiter_text': {
    de: 'Tipp auf den Knopf, um den Link einzulösen. Erst danach kannst du ein neues Passwort setzen.',
    ar: 'اضغط الزر لتفعيل الرابط. بعدها فقط يمكنك ضبط كلمة مرور جديدة.',
  },
  'konto.link_ungueltig': { de: 'Dieser Link ist ungültig', ar: 'هذا الرابط غير صالح' },
  'konto.link_ungueltig_text': {
    de: 'Er ist unvollständig oder schon abgelaufen. Fordere einen neuen Link an.',
    ar: 'الرابط ناقص أو انتهت صلاحيته. اطلب رابطًا جديدًا.',
  },
  'konto.link_fehler': {
    de: 'Mit diesem Link hat es nicht geklappt. Fordere bitte einen neuen an.',
    ar: 'لم ينجح هذا الرابط. اطلب رابطًا جديدًا من فضلك.',
  },
  'konto.link_anderes_geraet_titel': { de: 'Anderer Browser?', ar: 'متصفح آخر؟' },
  'konto.angemeldet_einstellungen': {
    de: 'Du bist angemeldet. Dein Passwort änderst du in den Einstellungen, mit deinem aktuellen Passwort.',
    ar: 'أنت مسجّل الدخول. تغيّر كلمة المرور من الإعدادات باستخدام كلمة المرور الحالية.',
  },
  'konto.zu_den_einstellungen': { de: 'Zu den Einstellungen', ar: 'إلى الإعدادات' },
  'konto.neuen_link': { de: 'Neuen Link anfordern', ar: 'اطلب رابطًا جديدًا' },
  'konto.passwort_nochmal': { de: 'Passwort wiederholen', ar: 'أعد كتابة كلمة المرور' },
  'konto.passwoerter_ungleich': {
    de: 'Die beiden Passwörter sind nicht gleich.',
    ar: 'كلمتا المرور غير متطابقتين.',
  },
  'konto.passwort_speichern': { de: 'Passwort speichern', ar: 'حفظ كلمة المرور' },
  'konto.passwort_geaendert': { de: 'Passwort geändert', ar: 'تم تغيير كلمة المرور' },
  'konto.andere_abgemeldet': {
    de: 'Auf allen anderen Geräten bist du jetzt abgemeldet.',
    ar: 'تم تسجيل خروجك الآن من جميع الأجهزة الأخرى.',
  },
  // Das Passwort steht, nur das Abmelden der anderen Geraete schlug fehl.
  'konto.andere_nicht_abgemeldet': {
    de: 'Andere Geräte konnten wir gerade nicht abmelden. Bist du dort noch angemeldet, melde dich dort selbst ab.',
    ar: 'لم نتمكن الآن من تسجيل خروجك من الأجهزة الأخرى. إن كنت لا تزال مسجّل الدخول عليها، فسجّل الخروج منها بنفسك.',
  },
  // Oben im Formular: fuer welches Konto das neue Passwort gilt.
  'konto.passwort_fuer': {
    de: 'Neues Passwort für {email}',
    ar: 'كلمة المرور الجديدة للحساب {email}',
  },
  // Vor dem Klick war hier ein anderes Konto angemeldet als das aus dem Link.
  'konto.anderes_konto_titel': { de: 'Achtung: anderes Konto', ar: 'تنبيه: حساب آخر' },
  'konto.anderes_konto_text': {
    de: 'Dieser Link gehört nicht zu dem Konto, mit dem du hier angemeldet warst. Das neue Passwort gilt für {email}. Mit deinem bisherigen Konto bist du auf diesem Gerät abgemeldet. Willst du das nicht, tippe unten auf „Abbrechen und abmelden“.',
    ar: 'هذا الرابط لا يخص الحساب الذي كنت مسجّل الدخول به هنا. كلمة المرور الجديدة ستكون للحساب {email}. تم تسجيل خروجك من حسابك السابق على هذا الجهاز. إن لم تكن تريد ذلك، فاضغط في الأسفل على «إلغاء وتسجيل الخروج».',
  },
  // Der Vorgang lief schon und wurde anderswo beendet (anderer Tab).
  'konto.link_beendet_titel': { de: 'Vorgang beendet', ar: 'انتهت العملية' },
  'konto.link_beendet_text': {
    de: 'Das Zurücksetzen wurde beendet, zum Beispiel in einem anderen Tab. Brauchst du noch ein neues Passwort, fordere einen neuen Link an.',
    ar: 'انتهت عملية إعادة التعيين، مثلاً في تبويب آخر. إن كنت لا تزال تحتاج إلى كلمة مرور جديدة، فاطلب رابطًا جديدًا.',
  },
  'konto.abbrechen_abmelden': { de: 'Abbrechen und abmelden', ar: 'إلغاء وتسجيل الخروج' },
  'konto.weiter_geht_es': { de: 'Weiter geht es.', ar: 'لنكمل.' },
}
