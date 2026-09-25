import type { Woerterbuch } from '../woerter'

/* Grundriss, Zeichner, Plan-Bausteine und Lageplan (Etappe 2).
 * grundriss.*  Seite, Reiter, Speichern
 * (zeichner.* steht in zeichner.ts und laedt mit dem Zeichner.)
 * plan.*       Woerter in Plaenen (Tuer, Fenster, Fach, Farben)
 * lage.*       Wo steht die Kiste (Lageplan, Kistenseite)
 * Arabische Saetze liest Karam gegen (BAUPLAN 7.2). */
export const grundriss: Woerterbuch = {
  // ---------------------------------------------------------------- Seite
  'grundriss.titel': { de: 'Grundriss', ar: 'المخطط' },
  'grundriss.reiter': { de: 'Grundrisse', ar: 'المخططات' },
  'grundriss.laedt': { de: 'Grundriss wird geladen', ar: 'جارٍ تحميل المخطط' },
  'grundriss.neue_wohnung': { de: 'Neue Wohnung', ar: 'الشقة الجديدة' },
  'grundriss.alte_wohnung': { de: 'Alte Wohnung', ar: 'الشقة القديمة' },
  'grundriss.keller': { de: 'Keller', ar: 'القبو' },
  'grundriss.lager': { de: 'Lager', ar: 'المخزن' },
  'grundriss.anlegen': { de: 'Grundriss anlegen', ar: 'إنشاء مخطط' },
  'grundriss.umbenennen': { de: 'Grundriss umbenennen', ar: 'إعادة تسمية المخطط' },
  'grundriss.loeschen': { de: 'Grundriss löschen', ar: 'حذف المخطط' },
  'grundriss.loeschen_titel': { de: '{name} löschen?', ar: 'حذف {name}؟' },
  'grundriss.loeschen_zaehlt': {
    de: 'Einen Moment, die Kisten werden gezählt.',
    ar: 'لحظة، جارٍ عدّ الصناديق.',
  },
  'grundriss.loeschen_frage': {
    de: 'Räume, Türen, Fenster und Möbel dieses Grundrisses verschwinden. {n} Kisten verlieren ihren Platz, bleiben aber im Umzug.',
    ar: 'ستختفي غرف هذا المخطط وأبوابه ونوافذه وأثاثه. {n} صناديق ستفقد موضعها لكنها تبقى في النقلة.',
  },
  'grundriss.geloescht': { de: 'Grundriss gelöscht', ar: 'تم حذف المخطط' },
  'grundriss.name_fehlt': { de: 'Bitte einen Namen mit 1 bis 60 Zeichen.', ar: 'اكتب اسمًا من 1 إلى 60 حرفًا من فضلك.' },
  'grundriss.nur_computer': {
    de: 'Zeichnen geht am Computer. Hier kannst du den Grundriss ansehen.',
    ar: 'الرسم متاح على الحاسوب. هنا يمكنك عرض المخطط فقط.',
  },
  'grundriss.nur_ansehen': {
    de: 'Du kannst den Grundriss ansehen. Zeichnen dürfen nur Bearbeiter.',
    ar: 'يمكنك عرض المخطط. الرسم مسموح للمحرّرين فقط.',
  },
  'grundriss.leer': { de: 'Noch nichts gezeichnet', ar: 'لم يُرسم شيء بعد' },
  'grundriss.leer_hinweis': {
    de: 'Am Computer zeichnest du die Wohnung auf den Zentimeter.',
    ar: 'على الحاسوب ترسم الشقة بدقة السنتيمتر.',
  },
  'grundriss.leer_betrachter': {
    de: 'Sobald ein Bearbeiter den Grundriss anlegt, erscheint er hier.',
    ar: 'سيظهر المخطط هنا عندما ينشئه أحد المحرّرين.',
  },
  'grundriss.fehlt': { de: 'Diesen Grundriss gibt es nicht mehr.', ar: 'هذا المخطط لم يعد موجودًا.' },
  'grundriss.zum_ersten': { de: 'Zum ersten Grundriss', ar: 'إلى المخطط الأول' },
  'grundriss.alles': { de: 'Alles', ar: 'الكل' },
  'grundriss.gespeichert': { de: 'Gespeichert', ar: 'تم الحفظ' },
  'grundriss.speichert': { de: 'Speichert …', ar: 'جارٍ الحفظ …' },
  'grundriss.nicht_gespeichert': { de: 'Nicht gespeichert, nochmal', ar: 'لم يُحفظ، أعد المحاولة' },
  'grundriss.veraltet_titel': { de: 'Grundriss geändert', ar: 'تغيّر المخطط' },
  'grundriss.veraltet': {
    de: 'Jemand hat den Grundriss inzwischen geändert. Lade ihn neu; deine letzte Änderung, die noch nicht gespeichert war, musst du danach wiederholen.',
    ar: 'غيّر شخص آخر المخطط في هذه الأثناء. أعد تحميله، ثم كرّر آخر تعديل لك لم يُحفظ بعد.',
  },
  'grundriss.neu_laden': { de: 'Neu laden', ar: 'إعادة التحميل' },
  'grundriss.zeigen': { de: 'Zeigen', ar: 'أظهر' },
  'grundriss.kisten_draussen_vorab': {
    de: 'Diese Kisten stünden danach außerhalb: {codes}. Nimm sie zuerst vom Platz oder stelle sie um.',
    ar: 'هذه الصناديق ستصبح خارج الغرفة: {codes}. أزلها من موضعها أولًا أو انقلها.',
  },

  // --------------------------------------------------------------- Plan
  'plan.tuer': { de: 'Tür', ar: 'باب' },
  'plan.fenster': { de: 'Fenster', ar: 'نافذة' },
  'plan.moebel': { de: 'Möbel', ar: 'قطعة أثاث' },
  'plan.regal': { de: 'Regal', ar: 'رف' },
  'plan.schrank': { de: 'Schrank', ar: 'خزانة' },
  'plan.boden': { de: 'Boden', ar: 'الأرض' },
  'plan.fach': { de: 'Fach {ebene}/{spalte}', ar: 'الخانة {ebene}/{spalte}' },
  'plan.von_bis': { de: '{von} bis {bis} cm', ar: '{von} إلى {bis} سم' },
  'plan.m2': { de: '{n} m²', ar: '{n} م²' },
  'plan.stapel': { de: 'Stapel {n}', ar: 'كومة {n}' },
  'plan.stapel_seite': { de: 'Stapel von der Seite', ar: 'الكومة من الجانب' },
  'plan.legende_hier': { de: 'Hier steht es', ar: 'موجود هنا' },
  'plan.legende_ziel': { de: 'Hier kommt es hin', ar: 'هنا سيوضع' },
  'plan.raum_ohne_name': { de: 'Raum ohne Namen', ar: 'غرفة بلا اسم' },
  'plan.farbe.anthrazit': { de: 'Anthrazit', ar: 'فحمي' },
  'plan.farbe.schiefer': { de: 'Schiefer', ar: 'رمادي أردوازي' },
  'plan.farbe.taubenblau': { de: 'Taubenblau', ar: 'أزرق رمادي' },
  'plan.farbe.salbei': { de: 'Salbei', ar: 'أخضر مريمي' },
  'plan.farbe.terrakotta': { de: 'Terrakotta', ar: 'تيراكوتا' },
  'plan.farbe.ocker': { de: 'Ocker', ar: 'مغرة' },
  'plan.farbe.aubergine': { de: 'Aubergine', ar: 'باذنجاني' },
  'plan.farbe.petrol': { de: 'Petrol', ar: 'أزرق بترولي' },
  'plan.farbe.eiche_hell': { de: 'Eiche hell', ar: 'بلوط فاتح' },
  'plan.farbe.eiche_dunkel': { de: 'Eiche dunkel', ar: 'بلوط داكن' },
  'plan.farbe.fliese_grau': { de: 'Fliese grau', ar: 'بلاط رمادي' },
  'plan.farbe.beton': { de: 'Beton', ar: 'خرسانة' },
  'plan.farbe.sand': { de: 'Sand', ar: 'رملي' },
  'plan.farbe.holz': { de: 'Holz', ar: 'خشبي' },
  'plan.farbe.grau': { de: 'Grau', ar: 'رمادي' },

  // ------------------------------------------------------------- Lage
  'lage.titel': { de: 'Wo steht die Kiste', ar: 'أين يوجد الصندوق' },
  'lage.laedt': { de: 'Platz wird geladen', ar: 'جارٍ تحميل الموضع' },
  'lage.kein_platz': { de: 'Noch kein Platz im Grundriss', ar: 'لا موضع في المخطط بعد' },
  'lage.kein_platz_hinweis': {
    de: 'Sobald die Kiste im Grundriss steht, zeigt die Karte hier, wo.',
    ar: 'عندما يوضع الصندوق في المخطط، تُظهر الخريطة هنا مكانه.',
  },
  'lage.plan_fehlt': { de: 'Der Raum ließ sich nicht laden.', ar: 'تعذّر تحميل الغرفة.' },
  'lage.ort': { de: '{grundriss}, {raum}', ar: '{grundriss}، {raum}' },
  'lage.satz_fach': {
    de: '{name}, Fach {ebene} (Ebene {ebene}), {von} bis {bis} cm über dem Boden',
    ar: '{name}، الخانة {ebene} (المستوى {ebene})، من {von} إلى {bis} سم فوق الأرض',
  },
  'lage.satz_fach_spalte': {
    de: '{name}, Fach {ebene}/{spalte} (Ebene {ebene}, Spalte {spalte}), {von} bis {bis} cm über dem Boden',
    ar: '{name}، الخانة {ebene}/{spalte} (المستوى {ebene}، العمود {spalte})، من {von} إلى {bis} سم فوق الأرض',
  },
  'lage.satz_kiste': { de: 'auf Kiste {code}, {von} bis {bis} cm', ar: 'على الصندوق {code}، من {von} إلى {bis} سم' },
  'lage.satz_objekt': { de: 'auf {name}, {von} bis {bis} cm', ar: 'على {name}، من {von} إلى {bis} سم' },
  'lage.satz_boden': { de: 'auf dem Boden, {von} bis {bis} cm', ar: 'على الأرض، من {von} إلى {bis} سم' },
  'lage.satz_moebel': { de: '{name}, 0 bis {bis} cm', ar: '{name}، من 0 إلى {bis} سم' },
  'lage.satz_in_moebel': { de: 'in {name}, {von} bis {bis} cm', ar: 'داخل {name}، من {von} إلى {bis} سم' },
  'lage.hoehe': { de: '{von} bis {bis} cm über dem Boden', ar: 'من {von} إلى {bis} سم فوق الأرض' },
  'lage.noch_nicht_da': {
    de: 'Noch nicht angekommen: hier kommt sie hin.',
    ar: 'لم يصل بعد: هنا سيوضع.',
  },
  'lage.im_grundriss': { de: 'Im Grundriss zeigen', ar: 'عرض في المخطط' },
  'lage.titel_moebel': { de: 'Wo steht das Möbel', ar: 'أين توجد قطعة الأثاث' },
  'lage.wo_steht_sie': { de: 'Wo steht sie?', ar: 'أين يوجد؟' },
  'lage.kein_platz_waehlen': {
    de: 'Wähle das Zimmer und tippe, wo die Kiste steht.',
    ar: 'اختر الغرفة واضغط على مكان الصندوق.',
  },
  'lage.platz_waehlen': { de: 'Platz wählen', ar: 'اختيار الموضع' },
  'lage.platz_aendern': { de: 'Platz ändern', ar: 'تغيير الموضع' },
  'lage.vom_platz': { de: 'Vom Platz nehmen', ar: 'إزالة من الموضع' },
  'lage.vom_platz_titel': { de: '{code} vom Platz nehmen?', ar: 'إزالة {code} من موضعه؟' },
  'lage.vom_platz_frage': {
    de: '{code} verliert ihren Platz im Grundriss. Die Kiste bleibt im Umzug.',
    ar: 'سيفقد {code} موضعه في المخطط. يبقى الصندوق في النقلة.',
  },
  'lage.rutscht_nach': {
    de: 'Was darauf steht, rutscht nach: {codes}.',
    ar: 'ما فوقه سينزل مكانه: {codes}.',
  },
  'lage.vom_platz_fertig': { de: '{code} hat keinen Platz mehr', ar: '{code} لم يعد له موضع' },
  'lage.moebel_ohne_objekt': {
    de: 'Dieses Möbel ist noch nicht im Grundriss. Zeichne es am Computer als Möbel und verknüpfe es mit diesem Eintrag.',
    ar: 'قطعة الأثاث هذه ليست في المخطط بعد. ارسمها على الحاسوب كقطعة أثاث واربطها بهذا الإدخال.',
  },
  'lage.grundriss_oeffnen': { de: 'Grundriss öffnen', ar: 'فتح المخطط' },
  'lage.gehoert_in': {
    de: 'Die Kiste gehört ins Zimmer {zimmer}. Die Nummer bleibt, auch wenn sie woanders steht.',
    ar: 'الصندوق يخص غرفة {zimmer}. يبقى الرقم كما هو حتى لو وُضع في مكان آخر.',
  },
  'plan.zoom_zurueck': { de: 'Ganz zeigen', ar: 'عرض الكل' },
}
