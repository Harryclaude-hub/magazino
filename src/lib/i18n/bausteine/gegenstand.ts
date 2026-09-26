import type { Woerterbuch } from '../woerter'

/* Einzelne Gegenstaende (Lampe, Staubsauger, Bild): ohne Kiste, mit Foto
 * und ungefaehrer Groesse. In der Datenbank Eintraege mit kind 'other'.
 * Dazu die Zahlen der Zimmerseite: Moebel, Regale, Kisten, Gegenstaende. */
export const gegenstand: Woerterbuch = {
  'gegenstand.anlegen': { de: 'Gegenstand anlegen', ar: 'إضافة غرض' },
  'gegenstand.titel': { de: 'Neuer Gegenstand', ar: 'غرض جديد' },
  'gegenstand.name': { de: 'Was ist es?', ar: 'ما هو؟' },
  'gegenstand.name_platzhalter': { de: 'z. B. Stehlampe, Staubsauger', ar: 'مثلاً مصباح أرضي، مكنسة كهربائية' },
  'gegenstand.name_fehlt': { de: 'Bitte einen Namen eingeben.', ar: 'يرجى إدخال اسم.' },
  'gegenstand.zimmer': { de: 'Zimmer', ar: 'الغرفة' },
  'gegenstand.zimmer_fehlt': { de: 'Bitte ein Zimmer wählen.', ar: 'يرجى اختيار غرفة.' },
  'gegenstand.zimmer_waehlen': { de: 'Zimmer wählen', ar: 'اختر غرفة' },
  'gegenstand.foto': { de: 'Foto', ar: 'صورة' },
  'gegenstand.foto_machen': { de: 'Foto machen', ar: 'التقاط صورة' },
  'gegenstand.foto_anderes': { de: 'Anderes Foto', ar: 'صورة أخرى' },
  'gegenstand.foto_weg': { de: 'Foto entfernen', ar: 'إزالة الصورة' },
  'gegenstand.kein_bild': { de: 'Das ist kein Bild.', ar: 'هذا ليس صورة.' },
  'gegenstand.groesse': { de: 'Ungefähre Größe', ar: 'الحجم التقريبي' },
  'gegenstand.groesse_hinweis': {
    de: 'Grob reicht. Leer lassen geht auch, dann gilt eine mittlere Kiste.',
    ar: 'التقدير يكفي. يمكن تركه فارغاً، فيُعتمد حجم صندوق متوسط.',
  },
  'gegenstand.klein': { de: 'Klein', ar: 'صغير' },
  'gegenstand.mittel': { de: 'Mittel', ar: 'متوسط' },
  'gegenstand.gross': { de: 'Groß', ar: 'كبير' },
  'gegenstand.lang': { de: 'Lang', ar: 'طويل' },
  'gegenstand.laenge': { de: 'Länge (cm)', ar: 'الطول (سم)' },
  'gegenstand.breite': { de: 'Breite (cm)', ar: 'العرض (سم)' },
  'gegenstand.hoehe': { de: 'Höhe (cm)', ar: 'الارتفاع (سم)' },
  'gegenstand.mass_falsch': {
    de: 'Bitte alle drei Maße zwischen 1 und 1000 cm eingeben, oder alle leer lassen.',
    ar: 'يرجى إدخال الأبعاد الثلاثة بين 1 و1000 سم، أو ترك الثلاثة فارغة.',
  },
  'gegenstand.angelegt': { de: '{code} angelegt', ar: 'تم إنشاء {code}' },
  'gegenstand.foto_fehler': {
    de: '{code} ist angelegt, aber das Foto kam nicht an: {grund}',
    ar: 'تم إنشاء {code}، لكن الصورة لم تُحفظ: {grund}',
  },
  'gegenstand.speichern': { de: 'Anlegen', ar: 'إنشاء' },
  'gegenstand.und_noch_einer': { de: 'Anlegen und noch einer', ar: 'إنشاء وإضافة آخر' },

  // Zimmerseite: was im Zimmer steht
  'gegenstand.im_zimmer': { de: 'Im Zimmer', ar: 'في الغرفة' },
  'gegenstand.zahl_moebel': { de: 'Möbel', ar: 'أثاث' },
  'gegenstand.zahl_regale': { de: 'Regale und Schränke', ar: 'رفوف وخزائن' },
  'gegenstand.zahl_kisten': { de: 'Kisten', ar: 'صناديق' },
  'gegenstand.zahl_gegenstaende': { de: 'Gegenstände', ar: 'أغراض' },
  'gegenstand.moebel_hinweis': {
    de: 'Regale und Schränke zählen bei den Möbeln mit.',
    ar: 'الرفوف والخزائن محسوبة ضمن الأثاث.',
  },
  'gegenstand.regale_titel': { de: 'Regale und Schränke', ar: 'الرفوف والخزائن' },
  'gegenstand.regal_inhalt': {
    de: '{kisten} Kisten, {dinge} Gegenstände',
    ar: '{kisten} صناديق، {dinge} أغراض',
  },
  'gegenstand.regal': { de: 'Regal', ar: 'رف' },
  'gegenstand.schrank': { de: 'Schrank', ar: 'خزانة' },
  'gegenstand.regal_leer': { de: 'leer', ar: 'فارغ' },
  'gegenstand.plan_laedt': { de: 'Grundriss wird geladen', ar: 'جارٍ تحميل المخطط' },
  'gegenstand.keine': { de: 'Noch keine einzelnen Gegenstände', ar: 'لا توجد أغراض منفردة بعد' },
  'gegenstand.keine_hinweis': {
    de: 'Lampe, Staubsauger, Bild: alles, was nicht in eine Kiste kommt.',
    ar: 'مصباح، مكنسة، لوحة: كل ما لا يوضع في صندوق.',
  },
  'gegenstand.gegenstaende_titel': { de: 'Gegenstände in diesem Zimmer', ar: 'الأغراض في هذه الغرفة' },
}
