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

  // Freischaltung (0036)
  'admin.status_wartet': { de: 'Wartet auf Freigabe', ar: 'بانتظار التفعيل' },
  'admin.status_frei': { de: 'Freigeschaltet', ar: 'مفعّل' },
  'admin.status_gesperrt': { de: 'Gesperrt', ar: 'محظور' },
  'admin.wartende_titel': { de: 'Warten auf Freigabe ({n})', ar: 'بانتظار التفعيل ({n})' },
  'admin.alle_titel': { de: 'Alle Nutzer', ar: 'كل المستخدمين' },
  'admin.freischalten': { de: 'Freischalten', ar: 'تفعيل' },
  'admin.sperren': { de: 'Sperren', ar: 'حظر' },
  'admin.entsperren': { de: 'Entsperren', ar: 'إلغاء الحظر' },
  'admin.loeschen': { de: 'Konto löschen', ar: 'حذف الحساب' },
  'admin.freigeschaltet': { de: '{name} ist freigeschaltet.', ar: 'تم تفعيل {name}.' },
  'admin.gesperrt': { de: '{name} ist gesperrt.', ar: 'تم حظر {name}.' },
  'admin.entsperrt': { de: '{name} ist wieder frei.', ar: 'أصبح {name} مفعّلاً من جديد.' },
  'admin.sperren_frage_titel': { de: '{name} sperren?', ar: 'حظر {name}؟' },
  'admin.sperren_frage': {
    de: 'Das Konto kann sich noch anmelden, sieht aber nur einen Hinweis und kommt an nichts mehr heran. Entsperren geht jederzeit.',
    ar: 'يمكن للحساب تسجيل الدخول، لكنه يرى تنبيهاً فقط ولا يصل إلى أي شيء. يمكن إلغاء الحظر في أي وقت.',
  },
  'admin.loeschen_frage_titel': { de: '{name} endgültig löschen?', ar: 'حذف {name} نهائياً؟' },
  'admin.loeschen_frage': {
    de: 'Das Konto verschwindet für immer. Umzüge mit weiteren Mitgliedern gehen an eines von ihnen. Umzüge, in denen die Person allein ist, werden mit allen Kisten gelöscht ({n} Umzüge). Das lässt sich nicht rückgängig machen.',
    ar: 'سيختفي الحساب إلى الأبد. الانتقالات التي فيها أعضاء آخرون تنتقل إلى أحدهم. الانتقالات التي يكون فيها الشخص وحده تُحذف مع كل صناديقها ({n} انتقالات). لا يمكن التراجع عن ذلك.',
  },
  'admin.geloescht': {
    de: 'Konto gelöscht. {uebergeben} Umzüge übergeben, {geloescht} Umzüge gelöscht.',
    ar: 'تم حذف الحساب. نُقل {uebergeben} انتقالات، وحُذف {geloescht} انتقالات.',
  },

  // Warte-Seite nach der Anmeldung
  'freigabe.warten_titel': { de: 'Fast geschafft', ar: 'اقتربت' },
  'freigabe.warten_text': {
    de: 'Dein Konto ist angelegt. Bevor du Fundkiste nutzen kannst, muss ein Admin es freischalten. Diese Seite öffnet sich von selbst, sobald das passiert ist.',
    ar: 'تم إنشاء حسابك. قبل أن تتمكن من استخدام فوندكيستي، يجب أن يفعّله مسؤول. ستُفتح هذه الصفحة تلقائياً بمجرد حدوث ذلك.',
  },
  'freigabe.gesperrt_titel': { de: 'Konto gesperrt', ar: 'الحساب محظور' },
  'freigabe.gesperrt_text': {
    de: 'Dieses Konto ist gesperrt. Wende dich an den Admin, wenn du glaubst, dass das ein Fehler ist.',
    ar: 'هذا الحساب محظور. تواصل مع المسؤول إذا كنت تعتقد أن هذا خطأ.',
  },
  'freigabe.hinweis_registrieren': {
    de: 'Nach der Anmeldung schaltet ein Admin dein Konto frei. Bis dahin siehst du eine Warte-Seite.',
    ar: 'بعد التسجيل يفعّل أحد المسؤولين حسابك. حتى ذلك الحين ترى صفحة انتظار.',
  },
  'freigabe.nochmal': { de: 'Nochmal prüfen', ar: 'تحقق مرة أخرى' },
  'freigabe.fehler': {
    de: 'Die Freigabe ließ sich nicht prüfen: {grund}',
    ar: 'تعذّر التحقق من التفعيل: {grund}',
  },

  'fuehrung.admin.zahlen.titel': { de: 'Die ganze App', ar: 'التطبيق كله' },
  'fuehrung.admin.zahlen.text': {
    de: 'Wie viele Nutzer, Umzüge, Kisten und Grundrisse es insgesamt gibt.',
    ar: 'كم مستخدماً وانتقالاً وصندوقاً ومخططاً يوجد إجمالاً.',
  },
  'fuehrung.admin.wartende.titel': { de: 'Warten auf Freigabe', ar: 'بانتظار التفعيل' },
  'fuehrung.admin.wartende.text': {
    de: 'Neue Konten stehen hier oben. Bis du sie freischaltest, sehen sie nach der Anmeldung nur eine Warte-Seite und können nichts nutzen.',
    ar: 'الحسابات الجديدة تظهر هنا في الأعلى. حتى تفعّلها، لا ترى بعد تسجيل الدخول سوى صفحة انتظار ولا يمكنها استخدام شيء.',
  },
  'fuehrung.admin.knoepfe.titel': { de: 'Freischalten, sperren, löschen', ar: 'تفعيل، حظر، حذف' },
  'fuehrung.admin.knoepfe.text': {
    de: 'Freischalten gibt ein Konto frei. Sperren nimmt ihm jeden Zugriff, Entsperren gibt ihn zurück. Löschen entfernt das Konto für immer; Fundkiste fragt vorher nach.',
    ar: 'التفعيل يسمح للحساب بالاستخدام. الحظر يمنع عنه كل وصول، وإلغاء الحظر يعيده. الحذف يزيل الحساب إلى الأبد؛ فوندكيستي يسأل قبل ذلك.',
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
