import type { Woerterbuch } from '../woerter'

/* Schichten in der Kiste und Punkte im Bild. Gehört zur Bilderkennung,
 * steht aber eigenständig, weil auch Fotos ohne Erkennung eine Schicht
 * haben dürfen. */
export const schichten: Woerterbuch = {
  'schichten.schicht': { de: 'Schicht', ar: 'طبقة' },
  'schichten.schicht_n': { de: 'Schicht {n}', ar: 'الطبقة {n}' },
  'schichten.ohne': { de: 'Ohne Schicht', ar: 'بلا طبقة' },
  'schichten.waehlen': { de: 'Schicht für neue Fotos', ar: 'طبقة الصور الجديدة' },
  'schichten.hinweis': {
    de: 'Fotografiere die Kiste Lage für Lage. Schicht 1 ist oben, Schicht 2 liegt darunter. So weiß man später nicht nur was drin ist, sondern auch wie tief.',
    ar: 'صوّر الصندوق طبقة بطبقة. الطبقة 1 في الأعلى، والطبقة 2 تحتها. هكذا تعرف لاحقًا ليس فقط ما بداخله، بل على أي عمق.',
  },
  'schichten.foto_schicht': { de: 'Schicht dieses Fotos', ar: 'طبقة هذه الصورة' },
  'schichten.gesetzt': { de: 'Foto in Schicht {n}', ar: 'الصورة في الطبقة {n}' },
  'schichten.entfernt': { de: 'Foto ohne Schicht', ar: 'الصورة بلا طبقة' },

  // -------------------------------------------------------- Punkt im Bild
  'schichten.im_bild_zeigen': { de: 'Im Bild zeigen', ar: 'عرض في الصورة' },
  'schichten.frage': { de: 'Ist das der gesuchte Gegenstand?', ar: 'هل هذا هو الغرض المقصود؟' },
  'schichten.ja': { de: 'Ja, das ist es', ar: 'نعم، هذا هو' },
  'schichten.nein': { de: 'Nein, das ist es nicht', ar: 'لا، ليس هذا' },
  'schichten.kein_punkt': {
    de: 'Zu diesem Eintrag gibt es keine Stelle im Bild.',
    ar: 'لا توجد نقطة في الصورة لهذا الإدخال.',
  },
  'schichten.bestaetigt': { de: 'Bestätigt', ar: 'مؤكَّد' },
  'schichten.verneint': { de: 'Stimmt nicht', ar: 'غير صحيح' },
  'schichten.antwort_weg': { de: 'Antwort zurückgenommen', ar: 'تم سحب الإجابة' },
}
