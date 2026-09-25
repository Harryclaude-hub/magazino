import type { Woerterbuch } from '../woerter'

/* Die Suche ueber alle Umzuege. Nummern, Zimmernamen und Umzugsnamen sind
 * Nutzerinhalt und bleiben, wie sie sind. */
export const suche: Woerterbuch = {
  'suche.titel': { de: 'Suchen', ar: 'بحث' },
  'suche.untertitel': { de: 'In allen deinen Umzügen', ar: 'في كل نقلاتك' },
  'suche.feld': { de: 'Was suchst du?', ar: 'عمّ تبحث؟' },
  'suche.platzhalter': { de: 'zum Beispiel Kleber oder Ladekabel', ar: 'مثلًا صمغ أو شاحن' },
  'suche.hinweis': {
    de: 'Gesucht wird in allem, was in den Kisten steht, auf Deutsch und Arabisch, auch mit Tippfehler.',
    ar: 'يتم البحث في كل ما هو مسجّل داخل الصناديق، بالألمانية والعربية، حتى مع الأخطاء الإملائية.',
  },
  'suche.zu_kurz': { de: 'Mindestens zwei Buchstaben.', ar: 'حرفان على الأقل.' },
  'suche.nichts': {
    de: 'Nichts gefunden. Versuch ein anderes Wort oder einen Oberbegriff.',
    ar: 'لم يُعثر على شيء. جرّب كلمة أخرى أو اسمًا أعم.',
  },
  'suche.treffer.eins': { de: '1 Treffer', ar: 'نتيجة واحدة' },
  'suche.treffer.viele': { de: '{n} Treffer', ar: '{n} نتائج' },
  // Mehr Treffer, als gezeigt werden. Nicht still abschneiden.
  'suche.treffer.mehr': {
    de: 'Mehr als {n} Treffer. Die besten stehen oben, such genauer für den Rest.',
    ar: 'أكثر من {n} نتيجة. الأفضل في الأعلى، ابحث بدقة أكبر لرؤية الباقي.',
  },
  'suche.ohne_platz': { de: 'noch ohne Platz im Grundriss', ar: 'بلا موضع في المخطط بعد' },
  'suche.ohne_zimmer': { de: 'ohne Zimmer', ar: 'بلا غرفة' },
  // Grundriss und Raum, dann Platz und Hoehe, mit dem Komma der jeweiligen Sprache.
  'suche.ort_zeile': { de: '{ort}, {satz}', ar: '{ort}، {satz}' },
  'suche.gesucht': { de: 'Gesucht: {name}', ar: 'المطلوب: {name}' },
  'suche.gesucht_schicht': { de: 'Gesucht: {name}, Schicht {n}', ar: 'المطلوب: {name}، الطبقة {n}' },
  'suche.eintrag_weg': {
    de: 'Das gesuchte Ding steht nicht mehr in dieser Liste. Vielleicht wurde es verschoben oder gelöscht.',
    ar: 'الشيء المطلوب لم يعد في هذه القائمة. ربما نُقل أو حُذف.',
  },
  'suche.zum_lageplan': { de: 'Zum Lageplan', ar: 'إلى خريطة الموضع' },
  'suche.band_weg': { de: 'Hinweis schließen', ar: 'إغلاق التنبيه' },
  'suche.foto_gross': { de: 'Foto groß', ar: 'الصورة كبيرة' },
  'suche.waehlen': { de: 'Wähle links einen Treffer.', ar: 'اختر نتيجة من القائمة.' },
  'suche.im_foto': { de: 'Im Foto zeigen', ar: 'عرض في الصورة' },
  'suche.zur_kiste': { de: 'Zur Kiste', ar: 'إلى الصندوق' },
  'suche.zum_moebel': { de: 'Zum Möbelstück', ar: 'إلى قطعة الأثاث' },
  'suche.leeren': { de: 'Suche leeren', ar: 'مسح البحث' },
  'suche.umzug': { de: 'Umzug', ar: 'النقلة' },
  'suche.zimmer': { de: 'Zimmer', ar: 'الغرفة' },
  'suche.schicht': { de: 'Schicht', ar: 'الطبقة' },
  'suche.platz': { de: 'Platz', ar: 'الموضع' },
  'suche.hoehe': { de: 'Höhe', ar: 'الارتفاع' },
  'suche.legende_hier': { de: 'Hier steht es', ar: 'موجود هنا' },
  'suche.legende_ziel': { de: 'Hier kommt es hin', ar: 'هنا سيوضع' },
  'suche.seite_titel': { de: 'Von der Seite, Reihe {n}', ar: 'من الجانب، الصف {n}' },
  'suche.noch_nicht_da': {
    de: 'Noch nicht angekommen. Der Grundriss zeigt, wo die Kiste hinkommt.',
    ar: 'لم يصل بعد. يُظهر المخطط أين سيوضع الصندوق.',
  },
}
