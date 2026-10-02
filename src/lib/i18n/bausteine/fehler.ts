import type { Woerterbuch } from '../woerter'

/* Meldungen aus dem Datenzugriff und den Hilfsmodulen. Sie erscheinen als
 * Hinweis oder in einer Fehlerkarte, gehoeren also zum Programm und werden
 * uebersetzt.
 *
 * Der Platzhalter {grund} traegt den Klartext, den der Server geliefert
 * hat. Der kommt aus errText und ist selbst schon uebersetzt.
 *
 * Nicht hier: die Texte aus console.warn. Die liest nur, wer die Konsole
 * offen hat, und die bleiben darum deutsch.
 */
export const fehler: Woerterbuch = {
  // --------------------------------------------------------- Allgemein
  'fehler.admin_aendern': {
    de: 'Freigabe nicht geändert: {grund}',
    ar: 'لم يتم تغيير التفعيل: {grund}',
  },
  'fehler.admin_loeschen': {
    de: 'Konto nicht gelöscht: {grund}',
    ar: 'لم يُحذف الحساب: {grund}',
  },
  'fehler.db.admin.nicht_selbst': {
    de: 'Das geht nicht bei deinem eigenen Konto.',
    ar: 'لا يمكن ذلك مع حسابك أنت.',
  },
  'fehler.db.admin.nicht_admin': {
    de: 'Ein Admin-Konto lässt sich nicht sperren oder löschen.',
    ar: 'لا يمكن حظر حساب مسؤول أو حذفه.',
  },
  'fehler.db.admin.unbekannt': {
    de: 'Dieses Konto gibt es nicht mehr.',
    ar: 'هذا الحساب لم يعد موجوداً.',
  },
  'fehler.db.konto.nicht_frei': {
    de: 'Dein Konto ist noch nicht freigeschaltet.',
    ar: 'حسابك لم يُفعَّل بعد.',
  },
  'fehler.admin_laden': {
    de: 'Admin-Übersicht nicht geladen: {grund}',
    ar: 'تعذّر تحميل لوحة الإدارة: {grund}',
  },
  'fehler.db.admin.kein_zugriff': {
    de: 'Nur für Admins.',
    ar: 'للمسؤولين فقط.',
  },
  'fehler.produkt_lesen': {
    de: 'Die Produktseite ließ sich nicht lesen: {grund}',
    ar: 'تعذّرت قراءة صفحة المنتج: {grund}',
  },
  'fehler.linien_speichern': {
    de: 'Die Hilfslinien wurden nicht gespeichert: {grund}',
    ar: 'لم تُحفظ الخطوط المساعدة: {grund}',
  },
  'fehler.keine_daten': { de: 'keine Daten erhalten', ar: 'لم تصل أي بيانات' },
  'fehler.nicht_angemeldet': { de: 'Nicht angemeldet', ar: 'لست مسجّل الدخول' },

  // ---------------------------------------------------------- Umzuege
  'fehler.umzuege_laden': {
    de: 'Umzüge laden: {grund}',
    ar: 'تعذّر تحميل النقلات: {grund}',
  },
  'fehler.umzug_laden': { de: 'Umzug laden: {grund}', ar: 'تعذّر تحميل النقلة: {grund}' },
  'fehler.umzug_anlegen': { de: 'Umzug anlegen: {grund}', ar: 'تعذّر إنشاء النقلة: {grund}' },
  'fehler.umzug_speichern': { de: 'Umzug speichern: {grund}', ar: 'تعذّر حفظ النقلة: {grund}' },
  'fehler.umzug_loeschen': { de: 'Umzug löschen: {grund}', ar: 'تعذّر حذف النقلة: {grund}' },
  'fehler.beitreten': { de: 'Beitreten: {grund}', ar: 'تعذّر الانضمام: {grund}' },
  'fehler.umzug_fehlt': {
    de: 'Dieser Umzug existiert nicht oder du bist nicht eingeladen.',
    ar: 'هذه النقلة غير موجودة أو لم تتم دعوتك إليها.',
  },
  'fehler.umzug_unsichtbar': {
    de: 'Der Umzug zu dieser Kiste ist für dich nicht sichtbar.',
    ar: 'النقلة التي ينتمي إليها هذا الصندوق غير ظاهرة لك.',
  },
  'fehler.zaehlwerte_laden': {
    de: 'Zählwerte laden: {grund}',
    ar: 'تعذّر تحميل الأعداد: {grund}',
  },
  'fehler.zaehlwerte_bereich': {
    de: 'Zählwerte je Bereich: {grund}',
    ar: 'تعذّر تحميل أعداد المناطق: {grund}',
  },

  // -------------------------------------------------------- Mitglieder
  'fehler.mitglieder_laden': {
    de: 'Mitglieder laden: {grund}',
    ar: 'تعذّر تحميل الأعضاء: {grund}',
  },
  'fehler.rolle_aendern': { de: 'Rolle ändern: {grund}', ar: 'تعذّر تغيير الدور: {grund}' },
  'fehler.mitglied_entfernen': {
    de: 'Mitglied entfernen: {grund}',
    ar: 'تعذّرت إزالة العضو: {grund}',
  },

  // ------------------------------------------------------- Einladungen
  'fehler.einladungen_laden': {
    de: 'Einladungen laden: {grund}',
    ar: 'تعذّر تحميل الدعوات: {grund}',
  },
  'fehler.einladung_anlegen': {
    de: 'Einladung anlegen: {grund}',
    ar: 'تعذّر إنشاء الدعوة: {grund}',
  },
  'fehler.einladung_aendern': {
    de: 'Einladung ändern: {grund}',
    ar: 'تعذّر تغيير الدعوة: {grund}',
  },

  // ---------------------------------------------------------- Bereiche
  'fehler.bereiche_laden': { de: 'Bereiche laden: {grund}', ar: 'تعذّر تحميل المناطق: {grund}' },
  'fehler.bereich_anlegen': { de: 'Bereich anlegen: {grund}', ar: 'تعذّر إنشاء المنطقة: {grund}' },
  'fehler.bereich_speichern': {
    de: 'Bereich speichern: {grund}',
    ar: 'تعذّر حفظ المنطقة: {grund}',
  },
  'fehler.bereich_loeschen': { de: 'Bereich löschen: {grund}', ar: 'تعذّر حذف المنطقة: {grund}' },
  'fehler.zimmer_person_laden': {
    de: 'Zimmer und Person laden: {grund}',
    ar: 'تعذّر تحميل الغرفة والشخص: {grund}',
  },

  // ------------------------------------------------------------ Kisten
  'fehler.suchen': { de: 'Suchen: {grund}', ar: 'تعذّر البحث: {grund}' },
  'fehler.regale_laden': { de: 'Regale laden: {grund}', ar: 'تعذّر تحميل الرفوف: {grund}' },

  // Ablehnungen der Datenbank. Die Kennung kommt als hint mit
  // (kistly:grundriss.xyz, kistly:groesse.xyz), der Satz steht hier.
  'fehler.groessen_laden': {
    de: 'Größen laden: {grund}',
    ar: 'تعذّر تحميل الأحجام: {grund}',
  },
  'fehler.kisten_laden': { de: 'Kisten laden: {grund}', ar: 'تعذّر تحميل الصناديق: {grund}' },
  'fehler.kiste_laden': { de: 'Kiste laden: {grund}', ar: 'تعذّر تحميل الصندوق: {grund}' },
  'fehler.kiste_anlegen': { de: 'Kiste anlegen: {grund}', ar: 'تعذّر إنشاء الصندوق: {grund}' },
  'fehler.kiste_speichern': { de: 'Kiste speichern: {grund}', ar: 'تعذّر حفظ الصندوق: {grund}' },
  'fehler.kiste_loeschen': { de: 'Kiste löschen: {grund}', ar: 'تعذّر حذف الصندوق: {grund}' },
  'fehler.kiste_suchen': { de: 'Kiste suchen: {grund}', ar: 'تعذّر البحث عن الصندوق: {grund}' },
  'fehler.kiste_fehlt': { de: 'Diese Kiste gibt es nicht mehr.', ar: 'هذا الصندوق لم يعد موجوداً.' },
  'fehler.code_suchen': { de: 'Code suchen: {grund}', ar: 'تعذّر البحث عن الرمز: {grund}' },
  'fehler.alter_code_suchen': {
    de: 'Alten Code suchen: {grund}',
    ar: 'تعذّر البحث عن الرمز القديم: {grund}',
  },

  // ----------------------------------------------------------- Inhalte
  'fehler.inhalt_laden': { de: 'Inhalt laden: {grund}', ar: 'تعذّر تحميل المحتويات: {grund}' },
  'fehler.inhalte_laden': { de: 'Inhalte laden: {grund}', ar: 'تعذّر تحميل المحتويات: {grund}' },
  'fehler.eintrag_anlegen': { de: 'Eintrag anlegen: {grund}', ar: 'تعذّر إضافة الإدخال: {grund}' },
  'fehler.eintrag_speichern': {
    de: 'Eintrag speichern: {grund}',
    ar: 'تعذّر حفظ الإدخال: {grund}',
  },
  'fehler.eintrag_loeschen': { de: 'Eintrag löschen: {grund}', ar: 'تعذّر حذف الإدخال: {grund}' },

  // ------------------------------------------------------------- Fotos
  'fehler.fotos_laden': { de: 'Fotos laden: {grund}', ar: 'تعذّر تحميل الصور: {grund}' },
  'fehler.foto_speichern': { de: 'Foto speichern: {grund}', ar: 'تعذّر حفظ الصورة: {grund}' },
  'fehler.foto_loeschen': { de: 'Foto löschen: {grund}', ar: 'تعذّر حذف الصورة: {grund}' },
  'fehler.hochladen': { de: 'Hochladen: {grund}', ar: 'تعذّر الرفع: {grund}' },
  'fehler.ausschnitt': {
    de: 'Ausschnitt anlegen: {grund}',
    ar: 'تعذّر إنشاء القصاصة: {grund}',
  },

  // ----------------------------------------------------------- Verlauf
  'fehler.verlauf_laden': { de: 'Verlauf laden: {grund}', ar: 'تعذّر تحميل السجل: {grund}' },
  'fehler.verlauf_loeschen': { de: 'Verlauf löschen: {grund}', ar: 'تعذّر حذف السجل: {grund}' },

  // -------------------------------------------------------------- Chat
  'fehler.nachrichten_laden': {
    de: 'Nachrichten laden: {grund}',
    ar: 'تعذّر تحميل الرسائل: {grund}',
  },
  'fehler.nachricht_senden': {
    de: 'Nachricht senden: {grund}',
    ar: 'تعذّر إرسال الرسالة: {grund}',
  },
  'fehler.nachricht_loeschen': {
    de: 'Nachricht löschen: {grund}',
    ar: 'تعذّر حذف الرسالة: {grund}',
  },
  'fehler.nachricht_aendern': {
    de: 'Nachricht ändern: {grund}',
    ar: 'تعذّر تعديل الرسالة: {grund}',
  },
  'fehler.reaktion_setzen': {
    de: 'Reaktion setzen: {grund}',
    ar: 'تعذّرت إضافة التفاعل: {grund}',
  },
  'fehler.reaktion_entfernen': {
    de: 'Reaktion entfernen: {grund}',
    ar: 'تعذّرت إزالة التفاعل: {grund}',
  },

  // ------------------------------------------------------------ Anrufe
  'fehler.anruf_starten': { de: 'Anruf starten: {grund}', ar: 'تعذّر بدء المكالمة: {grund}' },
  'fehler.anruf_laden': { de: 'Anruf laden: {grund}', ar: 'تعذّر تحميل المكالمة: {grund}' },
  'fehler.anruf_aendern': { de: 'Anruf ändern: {grund}', ar: 'تعذّر تغيير المكالمة: {grund}' },
  'fehler.anruf_fehlt': { de: 'Anruf nicht gefunden', ar: 'لم يتم العثور على المكالمة' },
  'fehler.teilnehmer_eintragen': {
    de: 'Teilnehmer eintragen: {grund}',
    ar: 'تعذّر تسجيل المشاركين: {grund}',
  },
  'fehler.teilnehmer_aendern': {
    de: 'Teilnehmer ändern: {grund}',
    ar: 'تعذّر تغيير المشارك: {grund}',
  },
  'fehler.mikrofon_abgelehnt': {
    de: 'Zugriff auf Mikrofon wurde abgelehnt. Ohne Mikrofon geht kein Anruf.',
    ar: 'تم رفض الوصول إلى الميكروفون. لا مكالمة بدون ميكروفون.',
  },
  'fehler.mikrofon_fehlt': {
    de: 'Mikrofon nicht verfügbar: {grund}',
    ar: 'الميكروفون غير متاح: {grund}',
  },
  'fehler.signalkanal': {
    de: 'Der Signalkanal ist abgebrochen. Anruf neu starten.',
    ar: 'انقطعت قناة الاتصال. ابدأ المكالمة من جديد.',
  },
  'fehler.verbindung_direkt': {
    de: 'Die direkte Verbindung kam nicht zustande. Das passiert in manchen Mobilfunknetzen ohne TURN-Server.',
    ar: 'لم يتم إنشاء الاتصال المباشر. يحدث ذلك في بعض شبكات الهاتف عندما لا يتوفر خادم TURN.',
  },

  // ------------------------------------- Figur und Wohnung live (E82)
  'fehler.figur_ungueltig': {
    de: 'Diese Figur lässt sich nicht speichern. Bitte die Auswahl prüfen.',
    ar: 'لا يمكن حفظ هذه الشخصية. يرجى مراجعة الاختيارات.',
  },
  'fehler.figur_spalte_fehlt': {
    de: 'Die Datenbank kennt Figuren noch nicht. Speichern geht nach dem nächsten Update.',
    ar: 'قاعدة البيانات لا تعرف الشخصيات بعد. سيصبح الحفظ ممكنًا بعد التحديث القادم.',
  },
  'fehler.wohnung_anmeldung': {
    de: 'Verbindung zur Wohnung nicht aufgebaut: {grund}',
    ar: 'لم يتم الاتصال بالشقة: {grund}',
  },
  'fehler.wohnung_kanal': {
    de: 'Die Verbindung zu den anderen in der Wohnung ist gestört. Du siehst sie gerade nicht.',
    ar: 'الاتصال بالآخرين في الشقة متعطل. لا يمكنك رؤيتهم الآن.',
  },
  'fehler.wohnung_zeit': {
    de: 'Die anderen in der Wohnung antworten nicht. Es wird weiter versucht.',
    ar: 'الآخرون في الشقة لا يستجيبون. تتم المحاولة من جديد.',
  },
  'fehler.wohnung_zu': {
    de: 'Die Verbindung zu den anderen in der Wohnung wurde beendet.',
    ar: 'انتهى الاتصال بالآخرين في الشقة.',
  },
  'fehler.sprechen_mikrofon_abgelehnt': {
    de: 'Das Mikrofon ist gesperrt. Zuhören geht trotzdem; zum Sprechen das Mikrofon in den Seiteneinstellungen erlauben.',
    ar: 'الميكروفون محظور. يمكنك الاستماع رغم ذلك؛ وللتحدث اسمح باستخدام الميكروفون في إعدادات الموقع.',
  },

  // ---------------------------------------------------------- Aufnahme
  'fehler.keine_aufnahme': { de: 'Es läuft keine Aufnahme', ar: 'لا يوجد تسجيل جارٍ' },
  'fehler.aufnahme_leer': {
    de: 'Die Aufnahme ist leer geblieben',
    ar: 'بقي التسجيل فارغاً',
  },

  // ------------------------------------------------------ Einstellungen
  'fehler.prefs_laden': {
    de: 'Einstellungen laden: {grund}',
    ar: 'تعذّر تحميل الإعدادات: {grund}',
  },
  'fehler.prefs_anlegen': {
    de: 'Einstellungen anlegen: {grund}',
    ar: 'تعذّر إنشاء الإعدادات: {grund}',
  },
  'fehler.prefs_speichern': {
    de: 'Einstellungen speichern: {grund}',
    ar: 'تعذّر حفظ الإعدادات: {grund}',
  },

  // -------------------------------------------------------------- Push
  'fehler.push_nicht_moeglich': {
    de: 'Dieser Browser kann keine Push-Benachrichtigungen.',
    ar: 'هذا المتصفح لا يدعم الإشعارات.',
  },
  'fehler.push_kein_schluessel': {
    de: 'Es ist kein VAPID-Schlüssel hinterlegt. Ohne den kann der Server nichts schicken.',
    ar: 'لا يوجد مفتاح VAPID. بدونه لا يستطيع الخادم إرسال أي شيء.',
  },
  'fehler.push_blockiert': {
    de: 'Benachrichtigungen wurden im Browser blockiert. Das musst du in den Seiteneinstellungen wieder erlauben.',
    ar: 'تم حظر الإشعارات في المتصفح. اسمح بها من جديد في إعدادات الموقع.',
  },
  'fehler.push_keine_erlaubnis': {
    de: 'Ohne Erlaubnis gibt es keine Benachrichtigungen.',
    ar: 'بدون إذن لا توجد إشعارات.',
  },
  'fehler.push_abo_unvollstaendig': {
    de: 'Das Abo des Browsers war unvollständig.',
    ar: 'كان اشتراك المتصفح ناقصاً.',
  },
  'fehler.push_abo_speichern': {
    de: 'Abo speichern: {grund}',
    ar: 'تعذّر حفظ الاشتراك: {grund}',
  },

  // --------------------------------------- Aus errText, Antwort des Servers
  'fehler.mail_limit': {
    de: 'Supabase wollte eine Bestätigungsmail verschicken und hat das Stundenlimit erreicht. Abhilfe: in der Projektverwaltung unter Authentication, Sign In, Email die Option "Confirm email" ausschalten. Dann wird gar keine Mail mehr verschickt und die Registrierung geht sofort durch.',
    ar: 'حاول Supabase إرسال رسالة تأكيد وبلغ الحد المسموح في الساعة. الحل: في إدارة المشروع ضمن Authentication ثم Sign In ثم Email أوقف خيار "Confirm email". عندها لا تُرسل أي رسالة ويكتمل التسجيل فوراً.',
  },
  'fehler.zu_viele_versuche': {
    de: 'Zu viele Versuche kurz hintereinander. Warte einen Moment und probier es noch einmal.',
    ar: 'محاولات كثيرة في وقت قصير. انتظر قليلاً ثم حاول مرة أخرى.',
  },
  'fehler.registrierung_aus': {
    de: 'Registrierung ist in diesem Projekt abgeschaltet.',
    ar: 'التسجيل معطّل في هذا المشروع.',
  },
  'fehler.login_falsch': {
    de: 'E-Mail oder Passwort stimmt nicht.',
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  },
  'fehler.mail_vergeben': {
    de: 'Diese E-Mail ist schon registriert.',
    ar: 'هذا البريد الإلكتروني مسجّل من قبل.',
  },
  'fehler.mail_unbestaetigt': {
    de: 'Das Konto wartet noch auf eine Bestätigung. Sag Bescheid, dann wird es freigeschaltet.',
    ar: 'الحساب ما زال بانتظار التأكيد. أخبرنا وسيتم تفعيله.',
  },
  'fehler.passwort_kurz': {
    de: 'Das Passwort braucht mindestens 6 Zeichen.',
    ar: 'كلمة المرور تحتاج 6 أحرف على الأقل.',
  },
  'fehler.passwort_gleich': {
    de: 'Das neue Passwort muss sich vom alten unterscheiden.',
    ar: 'كلمة المرور الجديدة يجب أن تختلف عن القديمة.',
  },
  'fehler.sitzung_weg': {
    de: 'Die Sitzung ist abgelaufen. Bitte neu anmelden.',
    ar: 'انتهت الجلسة. سجّل الدخول من جديد.',
  },
  'fehler.kuerzel_vergeben': {
    de: 'Dieses Kürzel ist in diesem Umzug schon vergeben.',
    ar: 'هذا الرمز مستخدم بالفعل في هذه النقلة.',
  },
  'fehler.eintrag_doppelt': { de: 'Der Eintrag existiert schon.', ar: 'الإدخال موجود بالفعل.' },
  'fehler.keine_berechtigung': {
    de: 'Dafür fehlt dir die Berechtigung in diesem Umzug.',
    ar: 'لا تملك الصلاحية لذلك في هذه النقلة.',
  },
  'fehler.bereiche_zusammenfuehren': {
    de: 'Bereiche zusammenführen: {grund}',
    ar: 'تعذّر دمج المناطق: {grund}',
  },
  'fehler.inhalt_verschieben': {
    de: 'Inhalt verschieben: {grund}',
    ar: 'تعذّر نقل المحتوى: {grund}',
  },
  'fehler.erkennung_laden': {
    de: 'Erkennung laden: {grund}',
    ar: 'تعذّر تحميل التعرّف: {grund}',
  },
  'fehler.erkennung_verwerfen': {
    de: 'Erkennung verwerfen: {grund}',
    ar: 'تعذّر حذف التعرّف: {grund}',
  },
  'fehler.rest_laden': {
    de: 'Verbleibende Auswertungen laden: {grund}',
    ar: 'تعذّر تحميل المتبقّي: {grund}',
  },
  'fehler.umzug_verlassen': {
    de: 'Umzug verlassen: {grund}',
    ar: '\u062a\u0639\u0630\u0651\u0631 \u0645\u063a\u0627\u062f\u0631\u0629 \u0627\u0644\u0646\u0642\u0644\u0629: {grund}',
  },
  'fehler.keine_verbindung': {
    de: 'Keine Verbindung zum Server. Internet prüfen.',
    ar: 'لا يوجد اتصال بالخادم. تحقق من الإنترنت.',
  },

  // ---------------------------------------- Eigene Groessen und Grundriss
  'fehler.eigene_groessen_laden': {
    de: 'Eigene Größen laden: {grund}',
    ar: 'تعذّر تحميل الأحجام الخاصة: {grund}',
  },
  'fehler.eigene_groesse_speichern': { de: 'Größe speichern: {grund}', ar: 'تعذّر حفظ الحجم: {grund}' },
  'fehler.eigene_groesse_loeschen': { de: 'Größe löschen: {grund}', ar: 'تعذّر حذف الحجم: {grund}' },
  'fehler.eigene_groesse_folgen': {
    de: 'Folgen prüfen: {grund}',
    ar: 'تعذّر فحص ما سيتغيّر: {grund}',
  },
  'fehler.grundrisse_laden': { de: 'Grundrisse laden: {grund}', ar: 'تعذّر تحميل المخططات: {grund}' },
  'fehler.grundriss_laden': { de: 'Grundriss laden: {grund}', ar: 'تعذّر تحميل المخطط: {grund}' },
  'fehler.grundriss_anlegen': { de: 'Grundriss anlegen: {grund}', ar: 'تعذّر إنشاء المخطط: {grund}' },
  'fehler.grundriss_speichern': { de: 'Grundriss speichern: {grund}', ar: 'تعذّر حفظ المخطط: {grund}' },
  'fehler.grundriss_loeschen': { de: 'Grundriss löschen: {grund}', ar: 'تعذّر حذف المخطط: {grund}' },
  'fehler.raeume_laden': { de: 'Räume laden: {grund}', ar: 'تعذّر تحميل الغرف: {grund}' },
  'fehler.platz_setzen': { de: 'Platz setzen: {grund}', ar: 'تعذّر تحديد الموضع: {grund}' },
  'fehler.platz_raeumen': { de: 'Vom Platz nehmen: {grund}', ar: 'تعذّرت الإزالة من الموضع: {grund}' },
  'fehler.kiste_lage_laden': {
    de: 'Platz der Kiste laden: {grund}',
    ar: 'تعذّر تحميل موضع الصندوق: {grund}',
  },
  'fehler.bitte_nochmal': {
    de: 'Das kam einer anderen Änderung in die Quere. Bitte nochmal versuchen.',
    ar: 'تزامن هذا مع تعديل آخر. حاول مرة أخرى من فضلك.',
  },
  // Ersatzwoerter, wenn die Datenbank keinen Namen mitschickt.
  'fehler.dieses_zimmer': { de: 'Dieses Zimmer', ar: 'هذه الغرفة' },
  'fehler.objekt_art.moebel': { de: 'Möbelstück', ar: 'قطعة الأثاث' },
  'fehler.objekt_art.regal': { de: 'Regal', ar: 'الرف' },
  'fehler.objekt_art.schrank': { de: 'Schrank', ar: 'الخزانة' },
  'fehler.objekt_art.objekt': { de: 'Objekt', ar: 'العنصر' },

  // Ablehnungen fuer eigene Groessen (0027): hint kistly:groesse.xyz,
  // Platzhalter aus details.
  'fehler.db.groesse.benutzt': {
    de: 'Diese Größe benutzen noch {kisten} Kisten und {moebel} Möbel.',
    ar: 'ما زال {kisten} صناديق و{moebel} قطع أثاث تستخدم هذا الحجم.',
  },
  'fehler.db.groesse.anderer_umzug': {
    de: 'Diese Größe gehört zu einem anderen Umzug.',
    ar: 'هذا الحجم يتبع نقلة أخرى.',
  },
  'fehler.db.groesse.name_doppelt': {
    de: 'Eine Größe mit diesem Namen gibt es schon.',
    ar: 'يوجد حجم بهذا الاسم بالفعل.',
  },
  // Alte, noch zwischengespeicherte Apps nach 0029.

  // Ablehnungen des Grundrisses (0028): hint kistly:grundriss.xyz,
  // Platzhalter aus details. Liste im Bauplan, Abschnitt 5.5.
  'fehler.db.grundriss.raum_punkte': {
    de: 'Ein Raum braucht 3 bis 200 Ecken.',
    ar: 'تحتاج الغرفة إلى 3 حتى 200 زاوية.',
  },
  'fehler.db.grundriss.raum_bereich': {
    de: 'Der Raum liegt außerhalb der Zeichenfläche.',
    ar: 'الغرفة خارج مساحة الرسم.',
  },
  'fehler.db.grundriss.raum_doppelt': {
    de: 'Zwei Ecken liegen aufeinander.',
    ar: 'توجد زاويتان في الموضع نفسه.',
  },
  'fehler.db.grundriss.raum_kreuzt': {
    de: 'Die Wände dieses Raums kreuzen sich.',
    ar: 'جدران هذه الغرفة تتقاطع.',
  },
  'fehler.db.grundriss.raum_umlauf': {
    de: 'Der Raum ist falsch herum gezeichnet. Bitte neu laden.',
    ar: 'رُسمت الغرفة بالاتجاه المعاكس. أعد التحميل من فضلك.',
  },
  'fehler.db.grundriss.raum_umhaengen': {
    de: 'Ein Raum bleibt in seinem Grundriss.',
    ar: 'تبقى الغرفة في مخططها.',
  },
  'fehler.db.siedlung.nur_besitzer': {
    de: 'Das darf nur, wem die Siedlung gehört.',
    ar: 'هذا مسموح فقط لمالك المجمّع السكني.',
  },
  'fehler.db.siedlung.kein_zugriff': {
    de: 'Du bist in dieser Siedlung nicht eingeladen.',
    ar: 'أنت غير مدعو إلى هذا المجمّع السكني.',
  },
  'fehler.db.siedlung.nicht_drin': {
    de: 'Diese Person ist nicht mehr in der Siedlung.',
    ar: 'هذا الشخص لم يعد في المجمّع السكني.',
  },
  'fehler.db.siedlung.zu_oft': {
    de: 'Zu viele Einladungen in kurzer Zeit. Versuch es in einer Stunde wieder.',
    ar: 'دعوات كثيرة في وقت قصير. حاول مرة أخرى بعد ساعة.',
  },
  // Stadt und Dinge der Siedlung (E87, 0047).
  'fehler.db.siedlung.zu_viele_dinge': {
    de: 'In dieser Siedlung wurden schon zu viele Dinge verschoben.',
    ar: 'تم نقل عدد كبير جدًا من الأشياء في هذا المجمّع السكني.',
  },
  'fehler.db.siedlung.ding_ungueltig': {
    de: 'Dieses Ding lässt sich so nicht abstellen.',
    ar: 'لا يمكن وضع هذا الشيء بهذه الطريقة.',
  },
  'fehler.db.siedlung.stadt_ungueltig': {
    de: 'Die Umgebung in der Datei ist beschädigt oder zu groß.',
    ar: 'المنطقة المحيطة في الملف تالفة أو كبيرة جدًا.',
  },
  'fehler.siedlung_stadt': {
    de: 'Die Siedlung ist gespeichert, die Umgebung aber nicht: {grund} Lade die Datei noch einmal.',
    ar: 'تم حفظ المجمّع السكني، لكن لم تُحفظ المنطقة المحيطة: {grund} حمّل الملف مرة أخرى.',
  },
  'fehler.siedlung_dinge_laden': {
    de: 'Dinge der Siedlung laden: {grund}',
    ar: 'تعذّر تحميل أشياء المجمّع السكني: {grund}',
  },
  'fehler.siedlung_ding_setzen': {
    de: 'Ding abstellen: {grund}',
    ar: 'تعذّر وضع الشيء: {grund}',
  },
  'fehler.db.grundriss.grundriss_fehlt': {
    de: 'Diesen Grundriss gibt es nicht mehr.',
    ar: 'هذا المخطط لم يعد موجودًا.',
  },
  'fehler.db.grundriss.zimmer_falsch': {
    de: 'Das ist kein Zimmer dieses Umzugs.',
    ar: 'هذه ليست غرفة من هذه النقلة.',
  },
  'fehler.db.grundriss.zimmer_doppelt': {
    de: '{name} ist in diesem Grundriss schon gezeichnet.',
    ar: '{name} مرسومة بالفعل في هذا المخطط.',
  },
  'fehler.db.grundriss.farbe_ungueltig': { de: 'Diese Farbe geht nicht.', ar: 'هذا اللون غير صالح.' },
  'fehler.db.grundriss.kisten_draussen': {
    de: 'Danach stünden {n} Kisten außerhalb, zum Beispiel {code}.',
    ar: 'ستصبح {n} صناديق خارج الغرفة بعد ذلك، مثل {code}.',
  },
  'fehler.db.grundriss.zu_niedrig': {
    de: 'So niedrig passen {n} Kisten nicht mehr, zum Beispiel {code}.',
    ar: 'بهذا الارتفاع لن تتسع {n} صناديق بعد الآن، مثل {code}.',
  },
  'fehler.db.grundriss.raum_fehlt': {
    de: 'Diesen Raum gibt es nicht mehr.',
    ar: 'هذه الغرفة لم تعد موجودة.',
  },
  'fehler.db.grundriss.oeffnung_kante': {
    de: 'Diese Wand gibt es nicht mehr.',
    ar: 'هذا الجدار لم يعد موجودًا.',
  },
  'fehler.db.grundriss.oeffnung_zu_breit': {
    de: 'Tür oder Fenster ist breiter als die Wand.',
    ar: 'الباب أو النافذة أعرض من الجدار.',
  },
  'fehler.db.grundriss.oeffnung_zu_hoch': {
    de: 'Tür oder Fenster ist höher als der Raum.',
    ar: 'الباب أو النافذة أعلى من الغرفة.',
  },
  'fehler.db.grundriss.oeffnungen_ueberlappen': {
    de: 'Hier ist schon eine Tür oder ein Fenster.',
    ar: 'يوجد هنا باب أو نافذة بالفعل.',
  },
  'fehler.db.grundriss.objekt_draussen': {
    de: '{name} ragt aus dem Raum.',
    ar: '{name} يبرز خارج الغرفة.',
  },
  'fehler.db.grundriss.objekt_zu_hoch': {
    de: '{name} ist höher als der Raum.',
    ar: '{name} أعلى من الغرفة.',
  },
  'fehler.db.grundriss.objekt_umhaengen': {
    de: 'Möbel bleiben im selben Grundriss.',
    ar: 'يبقى الأثاث في المخطط نفسه.',
  },
  'fehler.db.grundriss.faecher_ungueltig': {
    de: 'Die Fächer von {name} passen nicht (mindestens 1 cm Platz je Fach).',
    ar: 'خانات {name} غير صالحة (يلزم 1 سم على الأقل في كل خانة).',
  },
  'fehler.db.grundriss.moebel_verknuepfung': {
    de: 'Nur ein Möbel-Eintrag dieses Umzugs lässt sich verknüpfen.',
    ar: 'يمكن الربط بقطعة أثاث من هذه النقلة فقط.',
  },
  'fehler.db.grundriss.moebel_schon_verknuepft': {
    de: 'Dieser Möbel-Eintrag gehört schon zu einem anderen Möbel.',
    ar: 'قطعة الأثاث هذه مرتبطة بالفعل بعنصر آخر في المخطط.',
  },
  'fehler.db.grundriss.moebel_kein_platz': {
    de: 'Möbel stehen im Grundriss, nicht als Kiste.',
    ar: 'يوضع الأثاث في المخطط، لا كصندوق.',
  },
  'fehler.db.grundriss.draussen': {
    de: '{code} stünde außerhalb des Raums.',
    ar: 'سيكون {code} خارج الغرفة.',
  },
  'fehler.db.grundriss.unterlage_fehlt': {
    de: 'Darunter steht nichts mehr. Bitte neu laden.',
    ar: 'لم يعد هناك شيء تحته. أعد التحميل من فضلك.',
  },
  'fehler.db.grundriss.unterlage_anderer_raum': {
    de: 'Die Unterlage steht in einem anderen Raum.',
    ar: 'ما يوضع عليه موجود في غرفة أخرى.',
  },
  'fehler.db.grundriss.kreis': {
    de: '{code} kann nicht auf {unter} liegen, das liegt schon auf {code}.',
    ar: 'لا يمكن وضع {code} على {unter}، لأنه موضوع بالفعل على {code}.',
  },
  'fehler.db.grundriss.nicht_darauf': {
    de: '{code} liegt nicht auf {unter}: die Mitte muss über der Kiste darunter sein.',
    ar: '{code} ليس فوق {unter}: يجب أن يكون منتصفه فوق الصندوق الذي تحته.',
  },
  'fehler.db.grundriss.nicht_darauf_objekt': {
    de: '{code} steht nicht auf {name}.',
    ar: '{code} ليس فوق {name}.',
  },
  'fehler.db.grundriss.kein_regal': {
    de: '{name} hat keine Fächer.',
    ar: 'لا توجد خانات في {name}.',
  },
  'fehler.db.grundriss.brett_belegt': {
    de: 'Auf diesem Brett in {name} steht noch {code}. Nimm die Kiste zuerst herunter.',
    ar: 'ما زال {code} على هذا الرف في {name}. أنزل الصندوق أولًا.',
  },
  'fehler.db.grundriss.fach_fehlt': {
    de: 'Dieses Fach gibt es in {name} nicht.',
    ar: 'هذه الخانة غير موجودة في {name}.',
  },
  'fehler.db.grundriss.nicht_im_fach': {
    de: '{code} steht nicht in diesem Fach.',
    ar: '{code} ليس داخل هذه الخانة.',
  },
  'fehler.db.grundriss.ueberstand_zu_gross': {
    de: '{code} ragt {cm} cm aus {name} heraus, erlaubt sind höchstens {max} cm.',
    ar: 'يبرز {code} مسافة {cm} سم خارج {name}، والمسموح {max} سم على الأكثر.',
  },
  'fehler.db.fuellstand': {
    de: 'Der Füllstand muss zwischen 0 und 100 Prozent liegen.',
    ar: 'يجب أن يكون مستوى الامتلاء بين 0 و100 بالمئة.',
  },
  'fehler.db.grundriss.zu_hoch': {
    de: '{code} ginge bis {oben} cm, Platz ist bis {grenze} cm.',
    ar: 'سيصل {code} إلى {oben} سم، والمساحة المتاحة حتى {grenze} سم فقط.',
  },
  'fehler.db.grundriss.veraltet': {
    de: 'Jemand hat den Grundriss inzwischen geändert. Bitte neu laden.',
    ar: 'غيّر أحدهم المخطط في هذه الأثناء. أعد التحميل من فضلك.',
  },
  'fehler.db.grundriss.keine_rechte': {
    de: 'Das dürfen nur Bearbeiter.',
    ar: 'هذا مسموح للمحرّرين فقط.',
  },
  'fehler.db.grundriss.drehung': {
    de: 'Eine Kiste steht gerade oder quer, andere Drehungen gibt es nicht.',
    ar: 'يوضع الصندوق مستقيمًا أو بالعرض فقط، ولا يوجد دوران آخر.',
  },
  'fehler.db.grundriss.fremde_id': {
    de: 'Das gehört zu einem anderen Grundriss. Bitte neu laden.',
    ar: 'هذا يتبع مخططًا آخر. أعد التحميل من فضلك.',
  },
}
