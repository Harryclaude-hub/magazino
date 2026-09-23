import type { Woerterbuch } from '../woerter'

/* Bilderkennung.
 *
 * Die Texte sagen ausdruecklich, was passiert: dass das Bild den Server
 * verlaesst, dass es Geld kostet, und dass ein Vorschlag ein Vorschlag
 * bleibt, bis jemand ihn uebernimmt.
 */
export const bildki: Woerterbuch = {
  'bildki.titel': { de: 'Aus dem Foto lesen', ar: 'القراءة من الصورة' },
  'bildki.knopf': { de: 'Inhalt aus Foto lesen', ar: 'قراءة المحتوى من الصورة' },
  'bildki.knopf_kurz': { de: 'Foto lesen', ar: 'قراءة الصورة' },
  'bildki.laeuft': { de: 'Das Bild wird gelesen', ar: 'جارٍ قراءة الصورة' },
  'bildki.erklaerung': {
    de: 'Die Erkennung sieht sich das Foto an und schlägt vor, was darauf liegt. Nichts wird von allein eingetragen: du entscheidest Zeile für Zeile.',
    ar: 'يفحص التعرّف الصورة ويقترح ما فيها. لا يُسجَّل شيء تلقائياً: أنت تقرر سطراً بسطر.',
  },

  'bildki.keine_bilder': {
    de: 'Es gibt noch kein Foto zum Lesen. Mach zuerst eins.',
    ar: 'لا توجد صورة للقراءة بعد. التقط واحدة أولاً.',
  },
  'bildki.kein_ergebnis': {
    de: 'Auf diesem Bild war nichts zu erkennen. Ein Foto von näher dran oder bei besserem Licht hilft meistens.',
    ar: 'لم يُتعرَّف على شيء في هذه الصورة. عادةً تساعد صورة من مسافة أقرب أو بإضاءة أفضل.',
  },
  'bildki.bild_nummer': { de: 'Bild {n}', ar: 'الصورة {n}' },

  'bildki.uebernehmen': { de: 'Übernehmen', ar: 'اعتماد' },
  'bildki.alle_uebernehmen': { de: 'Alle gewählten übernehmen', ar: 'اعتماد كل المحدّد' },
  'bildki.uebernommen.eins': { de: '1 Zeile übernommen', ar: 'تم اعتماد سطر واحد' },
  'bildki.uebernommen.viele': { de: '{n} Zeilen übernommen', ar: 'تم اعتماد {n} سطور' },
  'bildki.teilweise_uebernommen': {
    de: '{ok} übernommen, {fehler} nicht. Grund: {grund}',
    ar: 'تم اعتماد {ok}، وفشل {fehler}. السبب: {grund}',
  },
  'bildki.nichts_gewaehlt': { de: 'Nichts ausgewählt', ar: 'لم يُحدَّد شيء' },
  'bildki.schon_drin': { de: 'Steht schon in der Liste', ar: 'موجود في القائمة' },

  'bildki.stufe_sicher': { de: 'Sicher', ar: 'مؤكّد' },
  'bildki.stufe_wahrscheinlich': { de: 'Wahrscheinlich', ar: 'على الأرجح' },
  'bildki.stufe_unsicher': { de: 'Unsicher', ar: 'غير مؤكّد' },
  'bildki.stufe_hinweis': {
    de: 'Die Stufe ist eine Selbsteinschätzung der Erkennung, keine Messung. Sieh die unsicheren Zeilen durch, bevor du sie übernimmst.',
    ar: 'الدرجة تقدير ذاتي من التعرّف، وليست قياساً. راجع السطور غير المؤكدة قبل اعتمادها.',
  },

  'bildki.menge': { de: 'Menge', ar: 'العدد' },
  'bildki.zeile_aendern': { de: 'Zeile ändern', ar: 'تعديل السطر' },

  'bildki.kostet': {
    de: 'Jedes neue Bild kostet einen Bruchteil eines Cent. Ein Bild, das schon gelesen wurde, kostet nichts mehr.',
    ar: 'كل صورة جديدة تكلّف جزءاً من السنت. الصورة التي قُرئت من قبل لا تكلّف شيئاً.',
  },
  'bildki.aus_speicher': { de: 'Schon gelesen', ar: 'قُرئت سابقاً' },
  'bildki.alles_gelesen': {
    de: 'Alle Fotos sind schon gelesen. Mit "Neu lesen" liest du sie noch einmal.',
    ar: 'قُرئت كل الصور بالفعل. مع "إعادة القراءة" تقرأها مرة أخرى.',
  },
  'bildki.neu_lesen': { de: 'Neu lesen', ar: 'إعادة القراءة' },
  'bildki.neu_lesen_frage': {
    de: 'Das Bild wird noch einmal gelesen und kostet wieder. Die bisherigen Vorschläge gehen dabei verloren.',
    ar: 'ستُقرأ الصورة من جديد وستُكلّف مجدداً، وستضيع الاقتراحات الحالية.',
  },
  'bildki.rest': {
    de: 'Heute noch frei: {projekt} für diesen Umzug, {nutzer} für dich in dieser Stunde.',
    ar: 'المتبقّي اليوم: {projekt} لهذه النقلة، و{nutzer} لك خلال هذه الساعة.',
  },
  'bildki.noch_ungelesen.eins': {
    de: 'Ein Foto ist noch nicht gelesen. Tippe noch einmal auf "Foto lesen", dann kommt es dran.',
    ar: 'بقيت صورة واحدة لم تُقرأ بعد. اضغط مرة أخرى على "قراءة الصورة" لتُقرأ.',
  },
  'bildki.noch_ungelesen.viele': {
    de: '{n} Fotos sind noch nicht gelesen. Je Durchgang gehen höchstens {max}. Tippe noch einmal auf "Foto lesen", dann kommen die nächsten dran.',
    ar: 'بقيت {n} صور لم تُقرأ بعد. في كل مرة تُقرأ {max} صور على الأكثر. اضغط مرة أخرى على "قراءة الصورة" لتُقرأ الصور التالية.',
  },
  'bildki.grenze_erreicht': {
    de: 'Die Grenze für heute ist erreicht. {n} Bilder sind darum liegen geblieben. Morgen geht es weiter.',
    ar: 'تم بلوغ حدّ اليوم. لذلك بقيت {n} صور دون قراءة. يمكنك المتابعة غداً.',
  },

  'bildki.dienst': {
    de: 'Gelesen wird mit dem offenen Modell Qwen bei OVHcloud in Frankreich.',
    ar: 'تتم القراءة بالنموذج المفتوح Qwen لدى OVHcloud في فرنسا.',
  },
  'bildki.datenschutz': {
    de: 'Zum Lesen wird das Bild an den Erkennungsdienst geschickt. Fotografier nichts, was niemanden angeht: Papiere, Rezepte, Ausweise.',
    ar: 'لقراءتها تُرسَل الصورة إلى خدمة التعرّف. لا تصوّر ما لا يخصّ أحداً: أوراقاً أو وصفات أو هويات.',
  },

  'bildki.sprache_anders': {
    de: 'Diese Vorschläge wurden auf {sprache} gelesen. Sie bleiben so stehen, denn ab jetzt sind sie dein Inhalt.',
    ar: 'قُرئت هذه الاقتراحات بلغة {sprache}. تبقى كما هي، فهي من الآن محتواك.',
  },
  'bildki.sprache_de': { de: 'Deutsch', ar: 'الألمانية' },
  'bildki.sprache_ar': { de: 'Arabisch', ar: 'العربية' },

  'bildki.kein_schluessel_titel': { de: 'Die Erkennung ist noch nicht eingeschaltet', ar: 'التعرّف غير مُفعّل بعد' },
  'bildki.kein_schluessel': {
    de: 'Es fehlt der Schlüssel für den Erkennungsdienst. Er wird einmal im Supabase-Projekt als Function Secret OVH_AI_ENDPOINTS_TOKEN hinterlegt. Danach läuft es ohne weiteres Zutun.',
    ar: 'مفتاح خدمة التعرّف ناقص. يُضاف مرة واحدة في مشروع Supabase كسرّ للدالة باسم OVH_AI_ENDPOINTS_TOKEN. بعدها يعمل كل شيء تلقائياً.',
  },
  // Eigene Saetze fuer die Fehler, die die Erkennung mit Kennung meldet.
  'bildki.fehler.zu_lang': {
    de: 'Auf dem Bild war so viel, dass die Antwort abgeschnitten wurde. Fotografiere die Lage in zwei Teilen.',
    ar: 'كان في الصورة الكثير حتى قُطع الرد. صوّر الطبقة على جزأين.',
  },
  'bildki.fehler.zeit': {
    de: 'Die Erkennung hat zu lange gebraucht. Versuch es gleich noch einmal.',
    ar: 'استغرق التعرّف وقتاً طويلاً. حاول مرة أخرى بعد قليل.',
  },
  'bildki.fehler.dienst_voll': {
    de: 'Der Erkennungsdienst ist gerade ausgelastet. Versuch es in einer Minute noch einmal.',
    ar: 'خدمة التعرّف مشغولة الآن. حاول مرة أخرى بعد دقيقة.',
  },
  'bildki.fehler.schluessel_falsch': {
    de: 'Der Schlüssel für den Erkennungsdienst wird nicht angenommen. Prüf OVH_AI_ENDPOINTS_TOKEN in Supabase.',
    ar: 'مفتاح خدمة التعرّف غير مقبول. تحقّق من OVH_AI_ENDPOINTS_TOKEN في Supabase.',
  },
  'bildki.fehler.format': {
    de: 'Dieses Foto hat ein Format, das die Erkennung nicht lesen kann. Nimm es noch einmal auf.',
    ar: 'لهذه الصورة صيغة لا يستطيع التعرّف قراءتها. التقطها مرة أخرى.',
  },
  'bildki.fehler.unlesbar': {
    de: 'Die Erkennung hat keine brauchbare Liste geliefert. Versuch es noch einmal.',
    ar: 'لم يُرجع التعرّف قائمة صالحة. حاول مرة أخرى.',
  },
  'bildki.fehler.zu_gross': {
    de: 'Das Foto ist zu groß für die Erkennung.',
    ar: 'الصورة كبيرة جداً على التعرّف.',
  },
  'bildki.nur_lesen': {
    de: 'Nur Bearbeiter dürfen Bilder lesen lassen.',
    ar: 'المحرّرون فقط يمكنهم تشغيل قراءة الصور.',
  },
}
