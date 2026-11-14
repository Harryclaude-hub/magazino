import type { Woerterbuch } from '../woerter'

/* Groessen pruefen: jede Kiste einmal nach Litern einstufen. Die Liter
 * selbst stehen in der Datenbank (0021), hier nur die Saetze drumherum. */
export const groessen: Woerterbuch = {
  'groessen.titel': { de: 'Größen prüfen', ar: 'مراجعة الأحجام' },
  'groessen.untertitel': { de: 'Jede Kiste nach Litern einstufen', ar: 'تصنيف كل صندوق حسب اللترات' },
  'groessen.erklaerung': {
    de: 'Die Größen 1 bis 10 haben jetzt Liter: 1 ist die kleinste Kiste, 10 die größte. Stell jede Kiste einmal auf ihre Größe. Ändert sich die Größe, ändert sich auch die Nummer. Die alte Nummer findet der Scanner weiter, das Etikett druckst du am Ende neu.',
    ar: 'للأحجام من 1 إلى 10 الآن لترات: 1 أصغر صندوق و10 أكبرها. اضبط كل صندوق مرة واحدة على حجمه. إذا تغيّر الحجم تغيّر الرقم أيضًا. يبقى الماسح يعرف الرقم القديم، وفي النهاية تطبع الملصق من جديد.',
  },

  'groessen.rechner_titel': { de: 'Wie viele Liter hat dein Karton?', ar: 'كم لترًا يسع صندوقك؟' },
  'groessen.rechner_hinweis': {
    de: 'Steht meist auf dem Karton oder in der Beschreibung beim Kauf.',
    ar: 'يُكتب عادةً على الصندوق أو في وصف المنتج عند الشراء.',
  },
  'groessen.rechner_feld': { de: 'Liter', ar: 'لترات' },
  'groessen.rechner_ergebnis': { de: 'Das ist Größe {n}.', ar: 'هذا هو الحجم {n}.' },
  'groessen.rechner_leer': { de: 'Gib eine Zahl ein, zum Beispiel 62.', ar: 'أدخل رقمًا، مثلًا 62.' },

  'groessen.tabelle_titel': { de: 'Die zehn Größen', ar: 'الأحجام العشرة' },
  'groessen.spalte_groesse': { de: 'Größe', ar: 'الحجم' },
  'groessen.spalte_liter': { de: 'Liter', ar: 'لترات' },
  'groessen.spalte_bereich': { de: 'gilt für', ar: 'يشمل' },
  'groessen.spalte_mass': { de: 'typisch außen', ar: 'المقاس الخارجي المعتاد' },
  'groessen.bereich_bis': { de: 'unter {bis} l', ar: 'أقل من {bis} لتر' },
  'groessen.bereich_ab': { de: 'ab {ab} l', ar: 'من {ab} لتر فأكثر' },
  'groessen.bereich_von_bis': { de: '{ab} bis unter {bis} l', ar: 'من {ab} إلى أقل من {bis} لتر' },
  'groessen.mass_zeile': { de: '{l} × {b} × {h} cm', ar: '{l} × {b} × {h} سم' },
  'groessen.norm': {
    de: 'Für Umzugskartons gibt es keine Norm für Liter. Die Abstände folgen den Normzahlen nach DIN 323: jede Größe ist etwa ein Viertel größer als die vorige.',
    ar: 'لا يوجد معيار للترات صناديق النقل. تتبع المسافات بين الأحجام الأعداد المعيارية وفق DIN 323: كل حجم أكبر من السابق بنحو الربع.',
  },

  'groessen.kisten_titel': { de: 'Deine Kisten', ar: 'صناديقك' },
  'groessen.moebel_hinweis': {
    de: 'Möbel stehen hier nicht: sie haben keine Liter.',
    ar: 'الأثاث غير مدرج هنا: ليس له لترات.',
  },
  'groessen.leer': {
    de: 'In diesem Umzug gibt es noch keine Kisten.',
    ar: 'لا توجد صناديق في هذه النقلة بعد.',
  },
  'groessen.nur_lesen': {
    de: 'Nur Bearbeiter können Größen ändern.',
    ar: 'يمكن للمحرّرين فقط تغيير الأحجام.',
  },
  'groessen.liter_fehlen': {
    de: 'Die Liter konnten nicht geladen werden. Die Größen selbst lassen sich trotzdem ändern.',
    ar: 'تعذّر تحميل اللترات. يمكنك مع ذلك تغيير الأحجام نفسها.',
  },
  'groessen.neue_nummer': { de: 'jetzt {code}', ar: 'الآن {code}' },
  'groessen.geaendert.eins': { de: '1 Kiste neu eingestuft', ar: 'أُعيد تصنيف صندوق واحد' },
  'groessen.geaendert.viele': { de: '{n} Kisten neu eingestuft', ar: 'أُعيد تصنيف {n} صناديق' },
  'groessen.etiketten_drucken': {
    de: 'Etiketten der geänderten drucken',
    ar: 'طباعة ملصقات الصناديق المعدّلة',
  },
  'groessen.erledigt': { de: 'Gedruckt, Liste leeren', ar: 'تمت الطباعة، أفرغ القائمة' },
  'groessen.gespeichert': { de: '{alt} ist jetzt {neu}', ar: '{alt} أصبح الآن {neu}' },

  'groessen.hinweis_liste': {
    de: 'Größen haben jetzt Liter. Stuf deine Kisten einmal neu ein.',
    ar: 'للأحجام الآن لترات. أعد تصنيف صناديقك مرة واحدة.',
  },

  // ------------------------------------------- Meine Groessen (0027)
  // Eigene Masse je Umzug. Die Stufe in der Nummer setzt die Datenbank.
  'groessen.eigene_titel': { de: 'Meine Größen', ar: 'أحجامي' },
  'groessen.eigene_leer': { de: 'Noch keine eigenen Größen.', ar: 'لا توجد أحجام خاصة بعد.' },
  'groessen.eigene_leer_hinweis': {
    de: 'Leg eine an, wenn du viele gleiche Kisten hast, etwa Boxen aus dem Baumarkt. Beim Anlegen einer Kiste wählst du sie dann mit einem Tipp.',
    ar: 'أنشئ حجمًا إذا كانت لديك صناديق كثيرة متشابهة، مثل صناديق من متجر العُدد. وعند إنشاء صندوق تختاره بلمسة واحدة.',
  },
  'groessen.eigene_anlegen': { de: 'Eigene Größe anlegen', ar: 'إنشاء حجم خاص' },
  'groessen.eigene_aendern': { de: 'Größe ändern', ar: 'تعديل الحجم' },
  'groessen.eigene_loeschen': { de: 'Größe löschen', ar: 'حذف الحجم' },
  'groessen.eigene_loeschen_frage': {
    de: '{name} löschen? Das geht nur, solange keine Kiste und kein Möbel diese Größe benutzt.',
    ar: 'حذف {name}؟ هذا ممكن فقط ما دام لا يستخدم هذا الحجم أي صندوق أو قطعة أثاث.',
  },
  'groessen.eigene_geloescht': { de: '{name} gelöscht', ar: 'تم حذف {name}' },
  'groessen.eigene_gespeichert': { de: '{name} gespeichert', ar: 'تم حفظ {name}' },
  'groessen.eigene_name': { de: 'Name', ar: 'الاسم' },
  'groessen.eigene_name_platzhalter': { de: 'Große Box IKEA', ar: 'صندوق إيكيا كبير' },
  'groessen.eigene_art': { de: 'Art', ar: 'النوع' },
  'groessen.eigene_art_kiste': { de: 'Kiste', ar: 'صندوق' },
  'groessen.eigene_art_moebel': { de: 'Möbel', ar: 'أثاث' },
  'groessen.eigene_laenge': { de: 'Länge', ar: 'الطول' },
  'groessen.eigene_breite': { de: 'Breite', ar: 'العرض' },
  'groessen.eigene_hoehe': { de: 'Höhe', ar: 'الارتفاع' },
  'groessen.eigene_in_cm': { de: '= {cm} cm', ar: '= {cm} سم' },
  'groessen.eigene_eingabe_hinweis': {
    de: '60 sind Zentimeter, 0,6 sind Meter.',
    ar: 'الرقم 60 يعني سنتيمترات، و0.6 يعني أمتارًا.',
  },
  'groessen.eigene_l_form': { de: 'L-Form', ar: 'شكل L' },
  'groessen.eigene_l_form_hinweis': {
    de: 'Etwa ein Ecksofa: ein Rechteck, an einer Ecke fehlt ein Stück.',
    ar: 'مثل أريكة الزاوية: مستطيل ينقصه جزء عند إحدى زواياه.',
  },
  'groessen.eigene_ausschnitt': { de: 'Das fehlende Stück an der Ecke.', ar: 'الجزء الناقص عند الزاوية.' },
  'groessen.eigene_ausschnitt_breite': { de: 'Ausschnitt Breite', ar: 'عرض الجزء الناقص' },
  'groessen.eigene_ausschnitt_tiefe': { de: 'Ausschnitt Tiefe', ar: 'عمق الجزء الناقص' },
  'groessen.eigene_ausschnitt_masse': {
    de: 'Ausschnitt {breite} × {tiefe} cm',
    ar: 'الجزء الناقص {breite} × {tiefe} سم',
  },
  'groessen.eigene_masse': { de: '{l} × {b} × {h} cm', ar: '{l} × {b} × {h} سم' },
  'groessen.eigene_folgen': {
    de: 'Betrifft {kisten} Kisten und {moebel} Möbel; {neu} bekommen eine neue Nummer (Größe {stufe}). Alte Etiketten bleiben scannbar.',
    ar: 'يشمل ذلك {kisten} صناديق و{moebel} قطع أثاث؛ منها {neu} ستحصل على رقم جديد (الحجم {stufe}). تبقى الملصقات القديمة قابلة للمسح.',
  },
  'groessen.eigene_bestaetigen': { de: 'Ja, so speichern', ar: 'نعم، احفظ هكذا' },
  'groessen.eigene_fehler_name': {
    de: 'Bitte einen Namen eingeben (höchstens 60 Zeichen).',
    ar: 'أدخل اسمًا من فضلك (60 حرفًا على الأكثر).',
  },
  'groessen.eigene_fehler_mass': {
    de: 'Zwischen 1 und 1000 cm, zum Beispiel 60 oder 0,6.',
    ar: 'بين 1 و1000 سم، مثلًا 60 أو 0.6.',
  },
  'groessen.eigene_fehler_ausschnitt': {
    de: 'Der Ausschnitt muss kleiner sein als Länge und Breite.',
    ar: 'يجب أن يكون الجزء الناقص أصغر من الطول والعرض.',
  },
  'groessen.stufe_setzt_db': {
    de: 'Die Größe in der Nummer berechnet Magazino aus Länge, Breite und Höhe.',
    ar: 'يحسب Magazino رقم الحجم في الرقم من الطول والعرض والارتفاع.',
  },
}
