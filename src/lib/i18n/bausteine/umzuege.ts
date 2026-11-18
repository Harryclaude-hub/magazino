import type { Woerterbuch } from '../woerter'

/* Uebersicht der Umzuege, Startseite eines Umzugs und der Rahmen darum.
 * Aufbau je Eintrag:
 *   'schluessel': { de: 'Deutsch', ar: 'Arabisch' }
 *
 * Namen von Umzuegen, Zimmern und Personen stehen hier nicht. Die hat der
 * Nutzer selbst eingetippt und bleiben in jeder Sprache so, wie sie sind.
 */
export const umzuege: Woerterbuch = {
  // ------------------------------------------------- Uebersicht, Begruessung
  'umzuege.hallo': { de: 'Hallo', ar: 'أهلاً' },
  'umzuege.hallo_name': { de: 'Hallo, {name}', ar: 'أهلاً {name}' },
  'umzuege.blick': { de: 'Deine Lager auf einen Blick.', ar: 'كل مستودعاتك في لمحة.' },

  // ---------------------------------------------------- Uebersicht, Knoepfe
  'umzuege.neu': { de: 'Neues Lager', ar: 'مستودع جديد' },
  'umzuege.code_einloesen': { de: 'Code einlösen', ar: 'استخدام رمز' },

  // ------------------------------------------------ Uebersicht, Liste leer
  'umzuege.laden': { de: 'Lager werden geladen', ar: 'جارٍ تحميل المستودعات' },
  'umzuege.leer_titel': { de: 'Noch kein Lager', ar: 'لا يوجد مستودع بعد' },
  'umzuege.leer_hinweis': {
    de: 'Ein Lager ist die Klammer um alles: Bestand, Kisten, Ausleihen, Team und den Chat.',
    ar: 'المستودع يجمع كل شيء: المخزون والصناديق والإعارات والفريق والمحادثة.',
  },
  'umzuege.leer_knopf': { de: 'Erstes Lager anlegen', ar: 'أنشئ أول مستودع' },

  // ------------------------------------------------------ Karte eines Umzugs
  'umzuege.kein_vermerk': { de: 'Kein Vermerk', ar: 'بدون ملاحظة' },
  'umzuege.umzug_am': { de: 'Umzug am {datum}', ar: 'النقلة في {datum}' },
  'umzuege.karte_kisten': { de: 'Kisten', ar: 'صناديق' },
  'umzuege.karte_dabei': { de: 'dabei', ar: 'مشاركين' },
  'umzuege.karte_unterwegs': { de: '{n} unterwegs', ar: '{n} في الطريق' },

  // ----------------------------------------------------- Dialog neuer Umzug
  'umzuege.toast_angelegt': { de: 'Lager angelegt', ar: 'تم إنشاء المستودع' },
  'umzuege.name_platzhalter': { de: 'Lager Salzburg', ar: 'مستودع سالزبورغ' },
  'umzuege.vermerk': { de: 'Vermerk', ar: 'ملاحظة' },
  'umzuege.vermerk_hinweis': {
    de: 'Optional, zum Beispiel die neue Adresse.',
    ar: 'اختياري، مثلاً العنوان الجديد.',
  },
  'umzuege.standardzimmer': { de: 'Standardzimmer anlegen', ar: 'إنشاء الغرف المعتادة' },
  'umzuege.standardzimmer_hinweis': {
    de: 'Wohnzimmer, Küche, Schlafzimmer, Kinderzimmer, Bad, Flur, Keller. Kannst du danach ändern.',
    ar: 'غرفة المعيشة، المطبخ، غرفة النوم، غرفة الأطفال، الحمام، الممر، القبو. يمكنك تغييرها لاحقاً.',
  },

  // -------------------------------------------------------- Dialog beitreten
  'umzuege.beitreten_titel': { de: 'Einem Umzug beitreten', ar: 'الانضمام إلى نقلة' },
  'umzuege.beitreten': { de: 'Beitreten', ar: 'انضمام' },
  'umzuege.toast_beigetreten': {
    de: 'Du bist jetzt bei {name} dabei',
    ar: 'انضممت الآن إلى {name}',
  },
  'umzuege.einladungscode': { de: 'Einladungscode', ar: 'رمز الدعوة' },
  'umzuege.einladungscode_hinweis': {
    de: 'Den Code bekommst du von der Person, die den Umzug angelegt hat.',
    ar: 'تحصل على الرمز ممن أنشأ النقلة.',
  },

  // ------------------------------------------- Startseite, Kopf und Zahlen
  'umzuege.einstellen': { de: 'Umzug einstellen', ar: 'إعدادات النقلة' },
  'umzuege.zaehlwerte_laden': { de: 'Zählwerte werden geladen', ar: 'جارٍ تحميل الأرقام' },
  'umzuege.a_von_b': { de: '{a} von {b}', ar: '{a} من {b}' },

  // -------------------------------------------------- Startseite, Schnellzugriff
  'umzuege.kiste_anlegen': { de: 'Kiste anlegen', ar: 'صندوق جديد' },
  'umzuege.etiketten': { de: 'Etiketten', ar: 'الملصقات' },

  // ------------------------------------------ Startseite, Zimmer und Personen
  'umzuege.zimmer_ueberschrift': { de: 'Zimmer', ar: 'الغرف' },
  'umzuege.verwalten': { de: 'Verwalten', ar: 'إدارة' },
  'umzuege.keine_zimmer': { de: 'Noch keine Zimmer', ar: 'لا توجد غرف بعد' },
  'umzuege.keine_zimmer_hinweis': {
    de: 'Lege zuerst die Bereiche an. Jedes Zimmer bekommt ein Kürzel, damit die Kisten eine Nummer bekommen können.',
    ar: 'أنشئ المناطق أولاً. كل غرفة تأخذ رمزاً حتى تحصل الصناديق على أرقامها.',
  },
  'umzuege.bereiche_anlegen': { de: 'Bereiche anlegen', ar: 'إنشاء المناطق' },
  'umzuege.zaehlwerte_fehler': { de: 'Zählwerte nicht geladen', ar: 'تعذّر تحميل الأرقام' },
  'umzuege.wird_gezaehlt': { de: 'wird gezählt', ar: 'جارٍ العد' },
  'umzuege.noch_keine_kisten': { de: 'noch keine Kisten', ar: 'لا صناديق بعد' },

  // ---------------------------------------------------- Startseite, Verlauf
  'umzuege.zuletzt': { de: 'Zuletzt passiert', ar: 'آخر ما حدث' },
  'umzuege.verlauf_zeigen': { de: 'Verlauf zeigen', ar: 'عرض السجل' },
  'umzuege.verlauf_verbergen': { de: 'Verlauf einklappen', ar: 'طي السجل' },
  'umzuege.verlauf_loeschen': { de: 'Verlauf löschen', ar: 'حذف السجل' },
  'umzuege.verlauf_loeschen_frage': {
    de: 'Der ganze Verlauf dieses Umzugs wird gelöscht, auch der Verlauf jeder einzelnen Kiste. Kisten und Inhalte bleiben. Das lässt sich nicht rückgängig machen.',
    ar: 'سيُحذف سجل هذه النقلة بالكامل، بما في ذلك سجل كل صندوق. الصناديق ومحتوياتها تبقى. لا يمكن التراجع عن ذلك.',
  },
  'umzuege.verlauf_geloescht': { de: 'Verlauf gelöscht', ar: 'تم حذف السجل' },
  'umzuege.verlauf_laden': { de: 'Verlauf wird geladen', ar: 'جارٍ تحميل السجل' },
  'umzuege.verlauf_leer': {
    de: 'Noch nichts passiert. Sobald Kisten angelegt oder gescannt werden, steht es hier.',
    ar: 'لم يحدث شيء بعد. بمجرد إنشاء صندوق أو مسحه سيظهر ذلك هنا.',
  },
  'umzuege.jemand': { de: 'Jemand', ar: 'شخص ما' },
  'umzuege.eine_kiste': { de: 'eine Kiste', ar: 'صندوقاً' },
  'umzuege.ereignis_angelegt': { de: 'hat {code} angelegt', ar: 'أنشأ {code}' },
  'umzuege.ereignis_status': { de: 'hat {status} gesetzt', ar: 'ضبط الحالة على {status}' },
  'umzuege.ereignis_scan': { de: 'hat gescannt', ar: 'قام بالمسح' },
  'umzuege.ereignis_code': {
    de: 'hat den Code auf {code} geändert',
    ar: 'غيّر الرمز إلى {code}',
  },
  'umzuege.ereignis_menge': { de: 'Menge geändert: {text} ({von} auf {nach})', ar: 'تغيّرت الكمية: {text} ({von} إلى {nach})' },
  'umzuege.ereignis_umgepackt': { de: '{text} umgepackt nach {code}', ar: 'نُقل {text} إلى {code}' },

  // ------------------------------------------------- Startseite, Fusszeile
  'umzuege.alle_kisten': { de: 'Alle Kisten', ar: 'كل الصناديق' },
  'umzuege.etiketten_liste': { de: 'Etiketten und Liste', ar: 'الملصقات والقائمة' },
  'umzuege.team': { de: 'Team', ar: 'الفريق' },
  'umzuege.andere': { de: 'Andere Umzüge', ar: 'نقلات أخرى' },

  // ------------------------------------------------------------- Der Rahmen
  'umzuege.umzug_laden': { de: 'Umzug wird geladen', ar: 'جارٍ تحميل النقلة' },
  'umzuege.zur_uebersicht': { de: 'Zur Übersicht', ar: 'إلى القائمة' },

  // ---------------------------------------------- Siedlung, schon beim Start
  // Der Knopf oben und sein Schalter in den Einstellungen sind zu sehen,
  // bevor die Siedlung geladen ist. Alle anderen Saetze der Siedlung laden
  // erst mit ihr (bausteine/siedlung.ts).
  'nav.siedlung': { de: 'Siedlung', ar: 'المجمّع السكني' },
  'einstellungen.siedlung_knopf': { de: 'Siedlung-Knopf zeigen', ar: 'إظهار زر المجمّع السكني' },
  'einstellungen.siedlung_knopf_hinweis': {
    de: 'Oben rechts neben dem Profil. Ausgeschaltet bleibt alles andere gleich.',
    ar: 'في أعلى الشاشة بجانب الحساب. عند إيقافه يبقى كل شيء آخر كما هو.',
  },
}
