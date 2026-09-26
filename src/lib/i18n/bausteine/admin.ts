import type { Woerterbuch } from '../woerter'

/* Das Admin-Portal (0035): alle Nutzer und ihre Umzuege. Nur Konten in
 * app_admins sehen den Menuepunkt; die Datenbank prueft es selbst. */
export const admin: Woerterbuch = {
  'admin.titel': { de: 'Admin-Portal', ar: 'لوحة الإدارة' },
  'admin.untertitel': { de: 'Alle Nutzer und ihre Umzüge', ar: 'كل المستخدمين وانتقالاتهم' },
  'admin.laedt': { de: 'Übersicht wird geladen', ar: 'جارٍ تحميل النظرة العامة' },
  'admin.nutzer': { de: 'Nutzer', ar: 'المستخدمون' },
  'admin.umzuege': { de: 'Umzüge', ar: 'الانتقالات' },
  'admin.kisten': { de: 'Kisten', ar: 'الصناديق' },
  'admin.grundrisse': { de: 'Grundrisse', ar: 'المخططات' },
  'admin.suchen': { de: 'Name, E-Mail oder Umzug', ar: 'الاسم أو البريد أو الانتقال' },
  'admin.keine_treffer': { de: 'Niemand passt zu dieser Suche.', ar: 'لا أحد يطابق هذا البحث.' },
  'admin.leer': { de: 'Noch keine Nutzer.', ar: 'لا يوجد مستخدمون بعد.' },
  'admin.ohne_name': { de: 'Ohne Namen', ar: 'بدون اسم' },
  'admin.ist_admin': { de: 'Admin', ar: 'مسؤول' },
  'admin.seit': { de: 'Dabei seit {datum}', ar: 'منذ {datum}' },
  'admin.zuletzt': { de: 'Zuletzt angemeldet {datum}', ar: 'آخر دخول {datum}' },
  'admin.nie': { de: 'Noch nie angemeldet', ar: 'لم يسجل الدخول بعد' },
  'admin.keine_umzuege': { de: 'Noch in keinem Umzug.', ar: 'ليس في أي انتقال بعد.' },
  'admin.eigentuemer': { de: 'Eigentümer', ar: 'المالك' },
  'admin.rolle_editor': { de: 'Bearbeiter', ar: 'محرر' },
  'admin.rolle_viewer': { de: 'Nur lesen', ar: 'قراءة فقط' },
  'admin.rolle_owner': { de: 'Eigentümer', ar: 'المالك' },
  'admin.archiviert': { de: 'Archiviert', ar: 'مؤرشف' },
  'admin.umzugstag': { de: 'Umzug am {datum}', ar: 'الانتقال في {datum}' },
  'admin.zahlen': {
    de: '{kisten} Kisten ({angekommen} angekommen) · {grundrisse} Grundrisse · {raeume} Räume · {mitglieder} Mitglieder',
    ar: '{kisten} صناديق ({angekommen} وصلت) · {grundrisse} مخططات · {raeume} غرف · {mitglieder} أعضاء',
  },
  'admin.hinweis': {
    de: 'Nur zum Ansehen. Einen fremden Umzug öffnen kann nur, wer darin Mitglied ist.',
    ar: 'للعرض فقط. لا يمكن فتح انتقال شخص آخر إلا لمن هو عضو فيه.',
  },
  'admin.nav': { de: 'Admin', ar: 'الإدارة' },

  'fuehrung.admin.zahlen.titel': { de: 'Die ganze App', ar: 'التطبيق كله' },
  'fuehrung.admin.zahlen.text': {
    de: 'Wie viele Nutzer, Umzüge, Kisten und Grundrisse es insgesamt gibt.',
    ar: 'كم مستخدماً وانتقالاً وصندوقاً ومخططاً يوجد إجمالاً.',
  },
  'fuehrung.admin.suche.titel': { de: 'Suchen', ar: 'البحث' },
  'fuehrung.admin.suche.text': {
    de: 'Tippe einen Namen, eine E-Mail oder den Namen eines Umzugs.',
    ar: 'اكتب اسماً أو بريداً إلكترونياً أو اسم انتقال.',
  },
  'fuehrung.nav.admin.titel': { de: 'Admin-Portal', ar: 'لوحة الإدارة' },
  'fuehrung.nav.admin.text': {
    de: 'Nur für dich sichtbar: alle Nutzer und ihre Umzüge.',
    ar: 'مرئي لك فقط: كل المستخدمين وانتقالاتهم.',
  },
  'fuehrung.profil.admin.titel': { de: 'Admin-Portal', ar: 'لوحة الإدارة' },
  'fuehrung.profil.admin.text': {
    de: 'Öffnet die Übersicht über alle Nutzer und ihre Umzüge. Nur Admins sehen diesen Knopf.',
    ar: 'يفتح النظرة العامة على كل المستخدمين وانتقالاتهم. المسؤولون فقط يرون هذا الزر.',
  },
  'fuehrung.admin.start.titel': { de: 'Admin-Portal', ar: 'لوحة الإدارة' },
  'fuehrung.admin.start.text': {
    de: 'Nur dein Konto sieht diese Seite. Oben die Zahlen für die ganze App, darunter jeder Nutzer mit seinen Umzügen. Das Suchfeld filtert nach Name, E-Mail oder Umzug.',
    ar: 'حسابك فقط يرى هذه الصفحة. في الأعلى أرقام التطبيق كله، وتحتها كل مستخدم مع انتقالاته. حقل البحث يصفّي حسب الاسم أو البريد أو الانتقال.',
  },
}
