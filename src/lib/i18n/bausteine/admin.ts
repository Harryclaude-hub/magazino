import type { Woerterbuch } from '../woerter'

/* Das Admin-Portal (0035): alle Nutzer und ihre Umzuege. Nur Konten in
 * app_admins sehen den Menuepunkt; die Datenbank prueft es selbst. */
export const admin: Woerterbuch = {
  'admin.titel': { de: 'Admin-Portal' },
  'admin.untertitel': { de: 'Alle Nutzer und ihre Umzüge' },
  'admin.laedt': { de: 'Übersicht wird geladen' },
  'admin.nutzer': { de: 'Nutzer' },
  'admin.umzuege': { de: 'Umzüge' },
  'admin.kisten': { de: 'Kisten' },
  'admin.grundrisse': { de: 'Grundrisse' },
  'admin.suchen': { de: 'Name, E-Mail oder Umzug' },
  'admin.keine_treffer': { de: 'Niemand passt zu dieser Suche.' },
  'admin.leer': { de: 'Noch keine Nutzer.' },
  'admin.ohne_name': { de: 'Ohne Namen' },
  'admin.ist_admin': { de: 'Admin' },
  'admin.seit': { de: 'Dabei seit {datum}' },
  'admin.zuletzt': { de: 'Zuletzt angemeldet {datum}' },
  'admin.nie': { de: 'Noch nie angemeldet' },
  'admin.keine_umzuege': { de: 'Noch in keinem Umzug.' },
  'admin.eigentuemer': { de: 'Eigentümer' },
  'admin.rolle_editor': { de: 'Bearbeiter' },
  'admin.rolle_viewer': { de: 'Nur lesen' },
  'admin.rolle_owner': { de: 'Eigentümer' },
  'admin.archiviert': { de: 'Archiviert' },
  'admin.umzugstag': { de: 'Umzug am {datum}' },
  'admin.zahlen': {
    de: '{kisten} Kisten ({angekommen} angekommen) · {grundrisse} Grundrisse · {raeume} Räume · {mitglieder} Mitglieder',
  },
  'admin.hinweis': {
    de: 'Nur zum Ansehen. Einen fremden Umzug öffnen kann nur, wer darin Mitglied ist.',
  },
  'admin.nav': { de: 'Admin' },

  // Freischaltung (0036)
  'admin.status_wartet': { de: 'Wartet auf Freigabe' },
  'admin.status_frei': { de: 'Freigeschaltet' },
  'admin.status_gesperrt': { de: 'Gesperrt' },
  'admin.wartende_titel': { de: 'Warten auf Freigabe ({n})' },
  'admin.alle_titel': { de: 'Alle Nutzer' },
  'admin.freischalten': { de: 'Freischalten' },
  'admin.sperren': { de: 'Sperren' },
  'admin.entsperren': { de: 'Entsperren' },
  'admin.loeschen': { de: 'Konto löschen' },
  'admin.freigeschaltet': { de: '{name} ist freigeschaltet.' },
  'admin.gesperrt': { de: '{name} ist gesperrt.' },
  'admin.entsperrt': { de: '{name} ist wieder frei.' },
  'admin.sperren_frage_titel': { de: '{name} sperren?' },
  'admin.sperren_frage': {
    de: 'Das Konto kann sich noch anmelden, sieht aber nur einen Hinweis und kommt an nichts mehr heran. Entsperren geht jederzeit.',
  },
  'admin.loeschen_frage_titel': { de: '{name} endgültig löschen?' },
  'admin.loeschen_frage': {
    de: 'Das Konto verschwindet für immer. Umzüge mit weiteren Mitgliedern gehen an eines von ihnen. Umzüge, in denen die Person allein ist, werden mit allen Kisten gelöscht ({n} Umzüge). Das lässt sich nicht rückgängig machen.',
  },
  'admin.geloescht': {
    de: 'Konto gelöscht. {uebergeben} Umzüge übergeben, {geloescht} Umzüge gelöscht.',
  },

  // Warte-Seite nach der Anmeldung
  'freigabe.warten_titel': { de: 'Fast geschafft' },
  'freigabe.warten_text': {
    de: 'Dein Konto ist angelegt. Bevor du Magazino nutzen kannst, muss ein Admin es freischalten. Diese Seite öffnet sich von selbst, sobald das passiert ist.',
  },
  'freigabe.gesperrt_titel': { de: 'Konto gesperrt' },
  'freigabe.gesperrt_text': {
    de: 'Dieses Konto ist gesperrt. Wende dich an den Admin, wenn du glaubst, dass das ein Fehler ist.',
  },
  'freigabe.hinweis_registrieren': {
    de: 'Nach der Anmeldung schaltet ein Admin dein Konto frei. Bis dahin siehst du eine Warte-Seite.',
  },
  'freigabe.nochmal': { de: 'Nochmal prüfen' },
  'freigabe.fehler': {
    de: 'Die Freigabe ließ sich nicht prüfen: {grund}',
  },

  'fuehrung.admin.zahlen.titel': { de: 'Die ganze App' },
  'fuehrung.admin.zahlen.text': {
    de: 'Wie viele Nutzer, Umzüge, Kisten und Grundrisse es insgesamt gibt.',
  },
  'fuehrung.admin.wartende.titel': { de: 'Warten auf Freigabe' },
  'fuehrung.admin.wartende.text': {
    de: 'Neue Konten stehen hier oben. Bis du sie freischaltest, sehen sie nach der Anmeldung nur eine Warte-Seite und können nichts nutzen.',
  },
  'fuehrung.admin.knoepfe.titel': { de: 'Freischalten, sperren, löschen' },
  'fuehrung.admin.knoepfe.text': {
    de: 'Freischalten gibt ein Konto frei. Sperren nimmt ihm jeden Zugriff, Entsperren gibt ihn zurück. Löschen entfernt das Konto für immer; Magazino fragt vorher nach.',
  },
  'fuehrung.admin.suche.titel': { de: 'Suchen' },
  'fuehrung.admin.suche.text': {
    de: 'Tippe einen Namen, eine E-Mail oder den Namen eines Umzugs.',
  },
  'fuehrung.nav.admin.titel': { de: 'Admin-Portal' },
  'fuehrung.nav.admin.text': {
    de: 'Nur für dich sichtbar: alle Nutzer und ihre Umzüge.',
  },
  'fuehrung.profil.admin.titel': { de: 'Admin-Portal' },
  'fuehrung.profil.admin.text': {
    de: 'Öffnet die Übersicht über alle Nutzer und ihre Umzüge. Nur Admins sehen diesen Knopf.',
  },
  'fuehrung.admin.start.titel': { de: 'Admin-Portal' },
  'fuehrung.admin.start.text': {
    de: 'Nur dein Konto sieht diese Seite. Oben die Zahlen für die ganze App, darunter jeder Nutzer mit seinen Umzügen. Das Suchfeld filtert nach Name, E-Mail oder Umzug.',
  },
}
