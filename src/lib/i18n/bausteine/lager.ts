import type { Woerterbuch } from '../woerter'

/* Lager (E103): Tuer-QR, Bestand, Ausleihen, Kalender, Lagerstart, Fehlersaetze. Schluessel lager.* und fehler.db.lager.*
 *
 * Einheiten, Namen und Orte stehen so da, wie sie eingegeben wurden, und
 * kommen nur ueber Platzhalter in die Saetze. */
export const lager: Woerterbuch = {
  // ------------------------------------------------------------ Menue
  'lager.nav_tuer': { de: 'Tür', ar: 'الباب' },
  'lager.nav_bestand': { de: 'Bestand', ar: 'المخزون' },
  'lager.nav_ausleihen': { de: 'Ausleihen', ar: 'الإعارات' },

  // ------------------------------------------------------- Allgemein
  'lager.fehler': { de: '{grund}', ar: '{grund}' },
  'lager.knapp': { de: 'Knapp', ar: 'قليل' },
  'lager.zur_tuer': { de: 'Zur Tür', ar: 'إلى الباب' },
  'lager.menge': { de: 'Menge', ar: 'الكمية' },
  'lager.notiz': { de: 'Notiz (optional)', ar: 'ملاحظة (اختياري)' },
  'lager.unbekanntes_ding': { de: 'Unbekanntes Ding', ar: 'غرض غير معروف' },
  'lager.menge_ungueltig': {
    de: 'Bitte eine Menge größer als 0 eingeben.',
    ar: 'يرجى إدخال كمية أكبر من 0.',
  },
  'lager.menge_ungueltig_null': {
    de: 'Bitte eine Menge von 0 oder mehr eingeben.',
    ar: 'يرجى إدخال كمية 0 أو أكثر.',
  },

  // ------------------------------------------------------------- Tür
  'lager.tuer_titel': { de: 'Tür', ar: 'الباب' },
  'lager.tuer_laedt': { de: 'Tür wird geladen', ar: 'جارٍ تحميل الباب' },
  'lager.tuer_eintragen': { de: 'Eintragen', ar: 'سجّل دخولي' },
  'lager.tuer_austragen': { de: 'Austragen', ar: 'سجّل خروجي' },
  'lager.tuer_status_drin': { de: 'Du bist eingetragen seit {zeit}.', ar: 'أنت مسجَّل منذ {zeit}.' },
  'lager.tuer_status_draussen': { de: 'Du bist nicht eingetragen.', ar: 'أنت غير مسجَّل.' },
  'lager.tuer_hinweis': {
    de: 'Trag dich ein, wenn du ins Lager gehst, und trag dich aus, wenn du gehst. Nur eingetragen kannst du etwas entnehmen oder ausleihen.',
    ar: 'سجّل دخولك عند دخول المستودع وسجّل خروجك عند المغادرة. لا يمكنك السحب أو الاستعارة إلا وأنت مسجَّل.',
  },
  'lager.tuer_hinweis_besitzer': {
    de: 'Als Besitzer darfst du auch ohne Eintrag buchen.',
    ar: 'بصفتك مالكاً يمكنك إجراء الحركات دون تسجيل الدخول.',
  },
  'lager.tuer_toast_ein': { de: 'Eingetragen', ar: 'تم تسجيل دخولك' },
  'lager.tuer_toast_aus': { de: 'Ausgetragen', ar: 'تم تسجيل خروجك' },
  'lager.tuer_drin_titel': { de: 'Gerade im Lager', ar: 'داخل المستودع الآن' },
  'lager.tuer_niemand': { de: 'Gerade ist niemand eingetragen.', ar: 'لا أحد مسجَّل الآن.' },
  'lager.tuer_seit': { de: 'seit {zeit}', ar: 'منذ {zeit}' },
  'lager.tuer_protokoll': { de: 'Protokoll (letzte 30)', ar: 'السجل (آخر 30)' },
  'lager.tuer_protokoll_leer': { de: 'Noch keine Einträge.', ar: 'لا توجد سجلات بعد.' },
  'lager.tuer_von_bis': { de: '{von} bis {bis}', ar: 'من {von} إلى {bis}' },
  'lager.tuer_noch_drin': { de: 'noch drin', ar: 'ما زال بالداخل' },

  // ------------------------------------------------------ Tür-QR
  'lager.etikett_titel': { de: 'Tür-QR zum Drucken', ar: 'رمز QR للباب للطباعة' },
  'lager.etikett_hinweis': {
    de: 'Aufhängen an der Lagertür. Wer den Code scannt, landet direkt bei Eintragen und Austragen.',
    ar: 'علّقه على باب المستودع. من يمسح الرمز يصل مباشرة إلى تسجيل الدخول والخروج.',
  },
  'lager.etikett_kopf': { de: 'Hier ein- und austragen', ar: 'سجّل دخولك وخروجك هنا' },
  'lager.etikett_fuss': { de: 'Mit der Handykamera scannen', ar: 'امسح الرمز بكاميرا الهاتف' },

  // --------------------------------------------------------- Bestand
  'lager.bestand_titel': { de: 'Bestand', ar: 'المخزون' },
  'lager.bestand_laedt': { de: 'Bestand wird geladen', ar: 'جارٍ تحميل المخزون' },
  'lager.bestand_suche': { de: 'Name oder Ort suchen', ar: 'ابحث بالاسم أو المكان' },
  'lager.bestand_ohne_bereich': { de: 'Ohne Bereich', ar: 'بدون قسم' },
  'lager.bestand_leer_titel': { de: 'Noch nichts im Bestand', ar: 'لا يوجد شيء في المخزون بعد' },
  'lager.bestand_leer_bearbeiter': {
    de: 'Lege die ersten Dinge mit Neu hinzufügen an.',
    ar: 'أضف أول الأغراض بزر إضافة جديد.',
  },
  'lager.bestand_leer_leser': {
    de: 'Ein Bearbeiter legt die Dinge an.',
    ar: 'يضيف المحرر الأغراض.',
  },
  'lager.mindestens': { de: 'Mindestens {menge} {einheit}', ar: 'الحد الأدنى {menge} {einheit}' },
  'lager.ort_zeile': { de: 'Ort: {ort}', ar: 'المكان: {ort}' },
  'lager.art_verbrauch': { de: 'Verbrauch', ar: 'استهلاك' },
  'lager.art_ausleihe': { de: 'Ausleihen', ar: 'إعارة' },
  'lager.art_hinweis': {
    de: 'Verbrauch wird aufgebraucht. Ausleihen kommt zurück.',
    ar: 'الاستهلاك يُستنفد. الإعارة تعود.',
  },
  'lager.entnehmen': { de: 'Entnehmen', ar: 'سحب' },
  'lager.zugang': { de: 'Zugang', ar: 'إضافة كمية' },
  'lager.zaehlen': { de: 'Zählen', ar: 'جرد' },
  'lager.neu': { de: 'Neu hinzufügen', ar: 'إضافة جديد' },
  'lager.bereiche_verwalten': { de: 'Bereiche verwalten', ar: 'إدارة الأقسام' },

  // ------------------------------------------------------ Entnehmen
  'lager.entnehmen_titel': { de: '{name} entnehmen', ar: 'سحب {name}' },
  'lager.da': { de: 'Da sind {menge} {einheit}.', ar: 'المتوفر {menge} {einheit}.' },
  'lager.kommt_zurueck': { de: 'Kommt zurück', ar: 'سيُعاد' },
  'lager.kommt_zurueck_hinweis': {
    de: 'Aus, wenn es verbraucht wird. An, wenn du es zurückbringst.',
    ar: 'أوقفه إذا سيُستهلك. شغّله إذا ستعيده.',
  },
  'lager.zurueck_bis': { de: 'Zurück bis', ar: 'يُعاد قبل' },
  'lager.heute_abend': { de: 'Heute Abend', ar: 'مساء اليوم' },
  'lager.morgen': { de: 'Morgen', ar: 'غداً' },
  'lager.in_woche': { de: 'In einer Woche', ar: 'بعد أسبوع' },
  'lager.termin_vergangen': {
    de: 'Der Rückgabetermin liegt in der Vergangenheit.',
    ar: 'موعد الإعادة في الماضي.',
  },
  'lager.termin_fehlt': { de: 'Bitte einen Rückgabetermin wählen.', ar: 'يرجى اختيار موعد الإعادة.' },
  'lager.toast_entnommen': {
    de: '{name}: {menge} {einheit} entnommen',
    ar: 'تم سحب {menge} {einheit} من {name}',
  },
  'lager.toast_ausgeliehen': {
    de: '{name} ausgeliehen bis {bis}',
    ar: 'تمت إعارة {name} حتى {bis}',
  },

  // ------------------------------------------------- Zugang, Zählen
  'lager.zugang_titel': { de: '{name}: Zugang', ar: '{name}: إضافة كمية' },
  'lager.zugang_hinweis': { de: 'Wie viel legst du dazu?', ar: 'كم ستضيف؟' },
  'lager.zaehlen_titel': { de: '{name}: Zählen', ar: '{name}: جرد' },
  'lager.zaehlen_hinweis': {
    de: 'Wie viel ist jetzt wirklich da? Der Bestand wird auf diese Zahl gesetzt.',
    ar: 'كم الموجود فعلاً الآن؟ سيُضبط المخزون على هذا الرقم.',
  },
  'lager.toast_zugegeben': {
    de: '{name}: {menge} {einheit} dazugelegt',
    ar: 'تمت إضافة {menge} {einheit} إلى {name}',
  },
  'lager.toast_gezaehlt': {
    de: '{name}: jetzt {menge} {einheit}',
    ar: '{name}: الآن {menge} {einheit}',
  },

  // ------------------------------------------- Neu, Ändern, Löschen
  'lager.neu_titel': { de: 'Neu hinzufügen', ar: 'إضافة جديد' },
  'lager.bereich': { de: 'Bereich', ar: 'القسم' },
  'lager.kein_bereich': { de: 'Kein Bereich', ar: 'بدون قسم' },
  'lager.einheit': { de: 'Einheit', ar: 'الوحدة' },
  'lager.einheit_beispiel': { de: 'Stk, kg, Liter', ar: 'قطعة، كغ، لتر' },
  'lager.mindestmenge': { de: 'Mindestmenge', ar: 'الحد الأدنى' },
  'lager.mindestmenge_hinweis': {
    de: 'Darunter erscheint knapp. 0 heißt: keine Warnung.',
    ar: 'تحته يظهر قليل. 0 يعني بدون تنبيه.',
  },
  'lager.art': { de: 'Art', ar: 'النوع' },
  'lager.ort': { de: 'Ort (optional)', ar: 'المكان (اختياري)' },
  'lager.speichern_naechstes': { de: 'Speichern und nächstes', ar: 'حفظ والتالي' },
  'lager.name_fehlt': { de: 'Bitte einen Namen eingeben.', ar: 'يرجى إدخال اسم.' },
  'lager.toast_angelegt': { de: '{name} angelegt', ar: 'تمت إضافة {name}' },
  'lager.aendern_titel': { de: '{name} ändern', ar: 'تعديل {name}' },
  'lager.aendern_hinweis': {
    de: 'Die Menge änderst du mit Entnehmen, Zugang oder Zählen.',
    ar: 'تغيّر الكمية بالسحب أو الإضافة أو الجرد.',
  },
  'lager.toast_geaendert': { de: '{name} gespeichert', ar: 'تم حفظ {name}' },
  'lager.loeschen_titel': { de: '{name} löschen?', ar: 'حذف {name}؟' },
  'lager.loeschen_text': {
    de: 'Das Ding wird aus dem Bestand gelöscht, samt seinen Ausleihen. Das lässt sich nicht rückgängig machen.',
    ar: 'سيُحذف الغرض من المخزون مع إعاراته. لا يمكن التراجع عن ذلك.',
  },
  'lager.toast_geloescht': { de: '{name} gelöscht', ar: 'تم حذف {name}' },

  // ------------------------------------------------------- Bereiche
  'lager.bereiche_titel': { de: 'Bereiche verwalten', ar: 'إدارة الأقسام' },
  'lager.bereiche_hinweis': {
    de: 'Ein Bereich fasst Dinge zusammen. Wer zuständig ist, kümmert sich um den Nachschub.',
    ar: 'القسم يجمع الأغراض. المسؤول عنه يتولى التزويد.',
  },
  'lager.bereich_name': { de: 'Name des Bereichs', ar: 'اسم القسم' },
  'lager.zustaendig': { de: 'Zuständig', ar: 'المسؤول' },
  'lager.niemand': { de: 'Niemand', ar: 'لا أحد' },
  'lager.bereich_neu': { de: 'Neuer Bereich', ar: 'قسم جديد' },
  'lager.bereiche_leer': { de: 'Noch keine Bereiche.', ar: 'لا توجد أقسام بعد.' },
  'lager.toast_bereich': { de: 'Bereich gespeichert', ar: 'تم حفظ القسم' },

  // ------------------------------------------------------ Ausleihen
  'lager.ausleihen_titel': { de: 'Ausleihen', ar: 'الإعارات' },
  'lager.ausleihen_laedt': { de: 'Ausleihen werden geladen', ar: 'جارٍ تحميل الإعارات' },
  'lager.meine_offenen': { de: 'Meine offenen', ar: 'إعاراتي المفتوحة' },
  'lager.alle_offenen': { de: 'Alle offenen', ar: 'كل الإعارات المفتوحة' },
  'lager.keine_meine': { de: 'Du hast nichts ausgeliehen.', ar: 'ليس لديك أي شيء مستعار.' },
  'lager.keine_alle': { de: 'Es ist nichts ausgeliehen.', ar: 'لا يوجد شيء مستعار.' },
  'lager.faellig': { de: 'Fällig {zeit}', ar: 'الموعد {zeit}' },
  'lager.ueberfaellig': { de: 'Überfällig', ar: 'متأخر' },
  'lager.von_wem': { de: 'von {name}', ar: 'من {name}' },
  'lager.zurueckgebracht': { de: 'Zurückgebracht', ar: 'تمت الإعادة' },
  'lager.toast_zurueck': { de: 'Als zurückgebracht gebucht', ar: 'تم تسجيل الإعادة' },
  'lager.in_kalender': { de: 'In Kalender', ar: 'إلى التقويم' },
  'lager.alle_in_kalender': { de: 'Alle meine offenen in den Kalender', ar: 'كل إعاراتي المفتوحة إلى التقويم' },
  'lager.toast_kalender': { de: 'Kalenderdatei erstellt', ar: 'تم إنشاء ملف التقويم' },
  'lager.erledigt_titel': { de: 'Zurückgebracht', ar: 'تمت إعادتها' },
  'lager.erledigt_zeigen': { de: 'Zurückgebrachte anzeigen', ar: 'عرض المُعادة' },
  'lager.erledigt_leer': { de: 'Noch nichts zurückgebracht.', ar: 'لم يُعَد شيء بعد.' },
  'lager.zurueck_am': { de: 'zurück am {zeit}', ar: 'أُعيد في {zeit}' },
  'lager.kal_titel': { de: 'Zurückbringen: {ding} ({lager})', ar: 'إعادة: {ding} ({lager})' },
  'lager.kal_beschreibung': {
    de: '{menge} {einheit} {ding} ins Lager {lager} zurückbringen.',
    ar: 'أعد {menge} {einheit} من {ding} إلى المستودع {lager}.',
  },

  // ------------------------------------------------------ Lagerstart
  'lager.band_passwort': { de: 'Bitte setze ein eigenes Passwort.', ar: 'يرجى تعيين كلمة مرور خاصة بك.' },
  'lager.band_passwort_knopf': { de: 'Passwort ändern', ar: 'تغيير كلمة المرور' },
  'lager.home_drin': { de: 'Drin seit {zeit}', ar: 'بالداخل منذ {zeit}' },
  'lager.home_nicht_drin': { de: 'Nicht eingetragen', ar: 'غير مسجَّل' },
  'lager.home_knapp': { de: '{n} knapp', ar: '{n} قليلة' },
  'lager.home_alles_da': { de: 'Alles da', ar: 'كل شيء متوفر' },
  'lager.home_offen': { de: '{n} offen', ar: '{n} مفتوحة' },
  'lager.home_nichts_offen': { de: 'Nichts offen', ar: 'لا شيء مفتوح' },
  'lager.home_ueberfaellig': { de: '{n} überfällig', ar: '{n} متأخرة' },
  'lager.home_fehler': { de: 'Nicht geladen', ar: 'تعذّر التحميل' },
  'lager.leer_zugeteilt': {
    de: 'Ein Admin muss dich einem Lager zuteilen.',
    ar: 'على المسؤول أن يضيفك إلى مستودع.',
  },
  'lager.admin_pruefen_fehler': {
    de: 'Ob du Admin bist, ließ sich nicht prüfen: {grund}',
    ar: 'تعذّر التحقق من كونك مسؤولاً: {grund}',
  },

  // ---------------------------------------------- Konten (api.ts)
  'lager.konto_halb': {
    de: 'Das Konto wurde angelegt, aber ein Folgeschritt ist fehlgeschlagen: {grund}. Prüfe Freigabe und Zuteilung in der Admin-Übersicht.',
    ar: 'تم إنشاء الحساب لكن إحدى الخطوات التالية فشلت: {grund}. راجع التفعيل والتوزيع في لوحة الإدارة.',
  },
  'lager.konto_fehler_email_ungueltig': {
    de: 'Diese E-Mail-Adresse ist ungültig.',
    ar: 'عنوان البريد الإلكتروني غير صالح.',
  },
  'lager.konto_fehler_passwort_schwach': {
    de: 'Das Passwort ist zu schwach. Nimm ein längeres mit Buchstaben und Zahlen.',
    ar: 'كلمة المرور ضعيفة. اختر كلمة أطول فيها أحرف وأرقام.',
  },
  'lager.konto_fehler_email_vergeben': {
    de: 'Zu dieser E-Mail-Adresse gibt es schon ein Konto.',
    ar: 'يوجد حساب بهذا البريد الإلكتروني بالفعل.',
  },
  'lager.konto_fehler_kein_admin': {
    de: 'Nur Admins dürfen Konten anlegen.',
    ar: 'للمسؤولين فقط إنشاء الحسابات.',
  },
  'lager.konto_fehler_nicht_angemeldet': {
    de: 'Du bist nicht angemeldet.',
    ar: 'أنت غير مسجَّل الدخول.',
  },
  'lager.konto_fehler_anlegen_fehlgeschlagen': {
    de: 'Das Konto ließ sich nicht anlegen. Bitte versuche es später nochmal.',
    ar: 'تعذّر إنشاء الحساب. حاول مرة أخرى لاحقاً.',
  },
  'lager.konto_fehler_serverfehler': {
    de: 'Der Server meldet einen Fehler. Bitte versuche es später nochmal.',
    ar: 'أبلغ الخادم عن خطأ. حاول مرة أخرى لاحقاً.',
  },
  'lager.konto_fehler_unbekannt': {
    de: 'Beim Anlegen des Kontos ist etwas schiefgegangen.',
    ar: 'حدث خطأ أثناء إنشاء الحساب.',
  },

  // ---------------------------- Ablehnungen der Datenbank (0050)
  'fehler.db.lager.nur_buchung': {
    de: 'Die Menge lässt sich nur über eine Buchung ändern: Entnehmen, Zugang oder Zählen.',
    ar: 'لا تتغير الكمية إلا بحركة: سحب أو إضافة أو جرد.',
  },
  'fehler.db.lager.fremde_kategorie': {
    de: 'Dieser Bereich gehört zu einem anderen Lager.',
    ar: 'هذا القسم تابع لمستودع آخر.',
  },
  'fehler.db.lager.fremde_kiste': {
    de: 'Diese Kiste gehört zu einem anderen Lager.',
    ar: 'هذا الصندوق تابع لمستودع آخر.',
  },
  'fehler.db.lager.zustaendig_kein_mitglied': {
    de: 'Wer zuständig ist, muss Mitglied dieses Lagers sein.',
    ar: 'يجب أن يكون المسؤول عضواً في هذا المستودع.',
  },
  'fehler.db.lager.kein_zugang': {
    de: 'Dafür hast du in diesem Lager keine Berechtigung.',
    ar: 'ليست لديك صلاحية لذلك في هذا المستودع.',
  },
  'fehler.db.lager.nicht_drin': {
    de: 'Du bist nicht eingetragen, also kannst du dich auch nicht austragen.',
    ar: 'أنت غير مسجَّل، لذلك لا يمكنك تسجيل الخروج.',
  },
  'fehler.db.lager.unbekannt': {
    de: 'Das gibt es nicht mehr. Lade die Seite neu.',
    ar: 'لم يعد هذا موجوداً. أعد تحميل الصفحة.',
  },
  'fehler.db.lager.art': {
    de: 'Diese Buchungsart gibt es nicht.',
    ar: 'نوع الحركة هذا غير موجود.',
  },
  'fehler.db.lager.menge': {
    de: 'Die Menge ist ungültig. Sie muss größer als 0 sein, beim Zählen 0 oder mehr.',
    ar: 'الكمية غير صالحة. يجب أن تكون أكبر من 0، وفي الجرد 0 أو أكثر.',
  },
  'fehler.db.lager.nicht_eingetragen': {
    de: 'Du bist nicht eingetragen. Trag dich zuerst an der Tür ein.',
    ar: 'أنت غير مسجَّل. سجّل دخولك أولاً عند الباب.',
  },
  'fehler.db.lager.termin': {
    de: 'Zum Ausleihen brauchst du einen Rückgabetermin.',
    ar: 'للاستعارة تحتاج إلى موعد إعادة.',
  },
  'fehler.db.lager.zu_wenig': {
    de: 'So viel ist nicht da. Es sind nur {n} {einheit}.',
    ar: 'الكمية غير متوفرة. المتوفر فقط {n} {einheit}.',
  },
  'fehler.db.lager.rolle': {
    de: 'Diese Rolle gibt es nicht.',
    ar: 'هذا الدور غير موجود.',
  },
  'fehler.db.admin.letzter': {
    de: 'Der letzte Admin bleibt. Ernenne zuerst einen anderen.',
    ar: 'يجب أن يبقى مسؤول واحد على الأقل. عيّن مسؤولاً آخر أولاً.',
  },
  'fehler.db.admin.selbst': {
    de: 'Das geht nicht bei deinem eigenen Konto.',
    ar: 'لا يمكن ذلك مع حسابك أنت.',
  },
}
