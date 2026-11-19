import type { Woerterbuch } from '../woerter'

/* Bundeslandprojekte, Lagerliste, Verlauf, Navigation (E104). Schluessel struktur.*
 * Bewusst kurz: ein Wort, wo ein Wort genuegt. */
export const struktur: Woerterbuch = {
  // ------------------------------------------------------------ Navigation
  'struktur.start': { de: 'Start', ar: 'الرئيسية' },
  'struktur.verlauf': { de: 'Verlauf', ar: 'السجل' },
  'struktur.einstellungen': { de: 'Einstellungen', ar: 'الإعدادات' },
  'struktur.menue': { de: 'Menü', ar: 'القائمة' },

  // ------------------------------------------------- Bundeslandprojekte
  'struktur.lager_anzahl.eins': { de: '{n} Lager', ar: '{n} مستودع' },
  'struktur.lager_anzahl.viele': { de: '{n} Lager', ar: '{n} مستودعات' },
  'struktur.kein_zugang': {
    de: 'Du hast noch keinen Zugang. Sag es dem Admin.',
    ar: 'ليس لديك وصول بعد. أخبر المشرف.',
  },
  'struktur.bl_neu': { de: 'Neues Bundeslandprojekt', ar: 'مشروع ولاية جديد' },
  'struktur.bl_name_platzhalter': { de: 'Oberösterreich', ar: 'النمسا العليا' },
  'struktur.bl_leer': { de: 'Noch kein Bundeslandprojekt', ar: 'لا يوجد مشروع ولاية بعد' },
  'struktur.bl_fehlt': {
    de: 'Das gibt es nicht, oder du hast keinen Zugang.',
    ar: 'غير موجود، أو ليس لديك وصول.',
  },
  'struktur.bl_angelegt': { de: 'Angelegt', ar: 'تم الإنشاء' },
  'struktur.bl_umbenannt': { de: 'Umbenannt', ar: 'تمت إعادة التسمية' },
  'struktur.bl_geloescht': { de: 'Gelöscht', ar: 'تم الحذف' },
  'struktur.umbenennen': { de: 'Umbenennen', ar: 'إعادة تسمية' },
  'struktur.bl_loeschen_frage': {
    de: '„{name}“ löschen? Das lässt sich nicht rückgängig machen.',
    ar: 'حذف «{name}»؟ لا يمكن التراجع عن ذلك.',
  },
  'struktur.lager_neu': { de: 'Neues Lager', ar: 'مستودع جديد' },
  'struktur.lager_name_platzhalter': { de: 'Lager Linz', ar: 'مستودع لينتس' },
  'struktur.lager_leer': { de: 'Noch kein Lager', ar: 'لا يوجد مستودع بعد' },
  'struktur.lager_angelegt': { de: 'Lager angelegt', ar: 'تم إنشاء المستودع' },

  // ------------------------------------------------------------- Verlauf
  'struktur.gerade_drin': { de: 'Gerade drin', ar: 'بالداخل الآن' },
  'struktur.niemand_drin': { de: 'Niemand', ar: 'لا أحد' },
  'struktur.filter_ein_aus': { de: 'Ein/Aus', ar: 'دخول/خروج' },
  'struktur.filter_entnommen': { de: 'Entnommen', ar: 'مسحوب' },
  'struktur.filter_ausgeliehen': { de: 'Ausgeliehen', ar: 'معار' },
  'struktur.verlauf_leer': { de: 'Noch nichts passiert', ar: 'لم يحدث شيء بعد' },
  'struktur.verlauf_leer_filter': { de: 'Nichts in dieser Auswahl', ar: 'لا شيء في هذا الاختيار' },
  'struktur.verlauf_laedt': { de: 'Verlauf lädt', ar: 'جارٍ تحميل السجل' },
  'struktur.art.betreten': { de: 'Betreten', ar: 'دخول' },
  'struktur.art.verlassen': { de: 'Verlassen', ar: 'خروج' },
  'struktur.art.entnahme': { de: 'Entnommen', ar: 'سحب' },
  'struktur.art.zugang': { de: 'Gebracht', ar: 'إضافة' },
  'struktur.art.ausleihe': { de: 'Ausgeliehen', ar: 'إعارة' },
  'struktur.art.rueckgabe': { de: 'Zurückgebracht', ar: 'إرجاع' },
  'struktur.art.korrektur': { de: 'Korrektur', ar: 'تصحيح' },
  'struktur.art.entfernt': { de: 'Entfernt', ar: 'إزالة' },
  'struktur.art.admin': { de: 'Admin', ar: 'المشرف' },
  'struktur.art.sonst': { de: 'Eintrag', ar: 'سجل' },
}
