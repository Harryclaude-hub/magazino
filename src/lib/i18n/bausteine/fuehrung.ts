import type { Woerterbuch } from '../woerter'

/* Die Fuehrung ("Erklaerung"): jeder Schritt hat .titel und .text. Welche
 * Schritte wo gezeigt werden, steht in lib/fuehrung.ts. Einfache Saetze,
 * die man beim Umzug im Stehen lesen kann. Arabische Saetze liest Karam
 * gegen. */
export const fuehrung: Woerterbuch = {
  'fuehrung.knopf': { de: 'Erklärung', ar: 'شرح' },
  'fuehrung.weiter': { de: 'Weiter', ar: 'التالي' },
  'fuehrung.zurueck': { de: 'Zurück', ar: 'السابق' },
  'fuehrung.fertig': { de: 'Fertig', ar: 'تم' },
  'fuehrung.beenden': { de: 'Erklärung beenden', ar: 'إنهاء الشرح' },
  'fuehrung.schritt': { de: 'Schritt {a} von {b}', ar: 'الخطوة {a} من {b}' },

  // Kopfzeile
  'fuehrung.kopf.zurueck.titel': { de: 'Zurück', ar: 'رجوع' },
  'fuehrung.kopf.zurueck.text': {
    de: 'Bringt dich eine Seite zurück, zum Beispiel vom Zimmer zur Zimmerliste.',
    ar: 'يعيدك صفحة واحدة إلى الوراء، مثلاً من الغرفة إلى قائمة الغرف.',
  },
  'fuehrung.kopf.erklaerung.titel': { de: 'Erklärung', ar: 'شرح' },
  'fuehrung.kopf.erklaerung.text': {
    de: 'Dieser Knopf steht auf jeder Seite. Er erklärt immer die Seite, auf der du gerade bist.',
    ar: 'هذا الزر موجود في كل صفحة. يشرح دائماً الصفحة التي أنت فيها الآن.',
  },
  'fuehrung.kopf.profil.titel': { de: 'Dein Profil', ar: 'ملفك الشخصي' },
  'fuehrung.kopf.profil.text': {
    de: 'Dein Name, die Sprache (Deutsch oder Arabisch), hell oder dunkel, Benachrichtigungen und Abmelden.',
    ar: 'اسمك، اللغة (الألمانية أو العربية)، الوضع الفاتح أو الداكن، الإشعارات وتسجيل الخروج.',
  },

  // Navigation (Seitenleiste am Computer, Leiste unten am Handy)
  'fuehrung.nav.leiste.titel': { de: 'Die Seitenleiste', ar: 'الشريط الجانبي' },
  'fuehrung.nav.leiste.text': {
    de: 'Am Computer steht hier links alles, was du oft brauchst. Ein Klick bringt dich überall hin.',
    ar: 'على الكمبيوتر تجد هنا على الجانب كل ما تحتاجه كثيراً. نقرة واحدة تأخذك إلى أي مكان.',
  },
  'fuehrung.nav.umzug.titel': { de: 'Umzug wählen', ar: 'اختيار الانتقال' },
  'fuehrung.nav.umzug.text': {
    de: 'Hast du mehrere Umzüge, wechselst du hier zwischen ihnen.',
    ar: 'إذا كان لديك أكثر من انتقال، تنتقل بينها من هنا.',
  },
  'fuehrung.nav.klappen.titel': { de: 'Leiste einklappen', ar: 'طي الشريط' },
  'fuehrung.nav.klappen.text': {
    de: 'Macht die Leiste schmal, damit mehr Platz für Listen und den Grundriss bleibt. Noch ein Klick klappt sie wieder auf.',
    ar: 'يجعل الشريط ضيقاً ليبقى مكان أكبر للقوائم والمخطط. نقرة أخرى تفتحه من جديد.',
  },
  'fuehrung.nav.suchkopf.titel': { de: 'Schnell suchen', ar: 'بحث سريع' },
  'fuehrung.nav.suchkopf.text': {
    de: 'Tippe hier, was du suchst, zum Beispiel "Bohrmaschine". Die Taste / springt direkt in dieses Feld.',
    ar: 'اكتب هنا ما تبحث عنه، مثلاً "مثقاب". زر / ينقلك مباشرة إلى هذا الحقل.',
  },
  'fuehrung.nav.umzuege.titel': { de: 'Umzüge', ar: 'الانتقالات' },
  'fuehrung.nav.umzuege.text': {
    de: 'Alle deine Umzüge. Hier legst du einen neuen an oder trittst einem bei.',
    ar: 'كل انتقالاتك. هنا تنشئ انتقالاً جديداً أو تنضم إلى انتقال.',
  },
  'fuehrung.nav.kisten.titel': { de: 'Kisten', ar: 'الصناديق' },
  'fuehrung.nav.kisten.text': {
    de: 'Die Liste aller Kisten, Taschen, Möbel und Gegenstände des Umzugs.',
    ar: 'قائمة كل الصناديق والحقائب والأثاث والأغراض في هذا الانتقال.',
  },
  'fuehrung.nav.zimmer.titel': { de: 'Zimmer', ar: 'الغرف' },
  'fuehrung.nav.zimmer.text': {
    de: 'Alle Zimmer und Personen. Jedes Zimmer hat eine Farbe und ein Kürzel, das auf jedem Etikett steht.',
    ar: 'كل الغرف والأشخاص. لكل غرفة لون واختصار يظهر على كل ملصق.',
  },
  'fuehrung.nav.grundriss.titel': { de: 'Grundriss', ar: 'المخطط' },
  'fuehrung.nav.grundriss.text': {
    de: 'Die Wohnung von oben: Räume, Türen, Fenster, Möbel und wo jede Kiste steht. Am Computer kannst du ihn zeichnen.',
    ar: 'الشقة من الأعلى: الغرف والأبواب والنوافذ والأثاث ومكان كل صندوق. على الكمبيوتر يمكنك رسمه.',
  },
  'fuehrung.nav.suchen.titel': { de: 'Suchen', ar: 'بحث' },
  'fuehrung.nav.suchen.text': {
    de: 'Finde jedes Ding: Kiste, Zimmer, Platz und Höhe über dem Boden.',
    ar: 'اعثر على أي شيء: الصندوق والغرفة والمكان والارتفاع عن الأرض.',
  },
  'fuehrung.nav.scannen.titel': { de: 'Scannen', ar: 'مسح' },
  'fuehrung.nav.scannen.text': {
    de: 'Halte die Kamera auf den QR-Code einer Kiste, und die Kiste öffnet sich sofort.',
    ar: 'وجّه الكاميرا إلى رمز QR على الصندوق، فيُفتح الصندوق فوراً.',
  },
  'fuehrung.nav.chat.titel': { de: 'Chat', ar: 'الدردشة' },
  'fuehrung.nav.chat.text': {
    de: 'Nachrichten, Fotos, Sprachnachrichten und Anrufe mit allen, die beim Umzug helfen. Die rote Zahl zeigt Ungelesenes.',
    ar: 'رسائل وصور ورسائل صوتية ومكالمات مع كل من يساعد في الانتقال. الرقم الأحمر يعني رسائل غير مقروءة.',
  },
  'fuehrung.nav.profil_nav.titel': { de: 'Profil', ar: 'الملف الشخصي' },
  'fuehrung.nav.profil_nav.text': {
    de: 'Deine Einstellungen: Name, Sprache, Aussehen und Abmelden.',
    ar: 'إعداداتك: الاسم واللغة والمظهر وتسجيل الخروج.',
  },

  // Umzuege (Startseite)
  'fuehrung.umzuege.start.titel': { de: 'Deine Umzüge', ar: 'انتقالاتك' },
  'fuehrung.umzuege.start.text': {
    de: 'Hier beginnt alles. Ein Umzug sammelt alle Kisten, Zimmer, den Grundriss und den Chat für eine Wohnung.',
    ar: 'من هنا يبدأ كل شيء. الانتقال يجمع كل الصناديق والغرف والمخطط والدردشة لشقة واحدة.',
  },
  'fuehrung.umzuege.neu.titel': { de: 'Neuer Umzug', ar: 'انتقال جديد' },
  'fuehrung.umzuege.neu.text': {
    de: 'Legt einen neuen Umzug an. Du gibst ihm nur einen Namen, zum Beispiel "Wohnung Berlin".',
    ar: 'ينشئ انتقالاً جديداً. تعطيه اسماً فقط، مثلاً "شقة برلين".',
  },
  'fuehrung.umzuege.beitreten.titel': { de: 'Code einlösen', ar: 'استخدام رمز' },
  'fuehrung.umzuege.beitreten.text': {
    de: 'Hat dir jemand einen Einladungscode geschickt? Hier eingeben, dann hilfst du bei seinem Umzug mit.',
    ar: 'هل أرسل لك أحدهم رمز دعوة؟ أدخله هنا لتساعد في انتقاله.',
  },
  'fuehrung.umzuege.karte.titel': { de: 'Einen Umzug öffnen', ar: 'فتح انتقال' },
  'fuehrung.umzuege.karte.text': {
    de: 'Tippe auf eine Karte, um den Umzug zu öffnen. Die Zahlen zeigen, wie viele Kisten schon angekommen sind.',
    ar: 'اضغط على بطاقة لفتح الانتقال. الأرقام تبين كم صندوقاً وصل بالفعل.',
  },

  // Ein Umzug
  'fuehrung.umzug.start.titel': { de: 'Übersicht des Umzugs', ar: 'نظرة عامة على الانتقال' },
  'fuehrung.umzug.start.text': {
    de: 'Alles zu diesem Umzug auf einen Blick: wie weit ihr seid, die Zimmer, die Personen und die wichtigsten Wege.',
    ar: 'كل ما يخص هذا الانتقال بنظرة واحدة: إلى أين وصلتم، الغرف، الأشخاص وأهم الطرق.',
  },
  'fuehrung.umzug.einstellen.titel': { de: 'Umzug einstellen', ar: 'إعدادات الانتقال' },
  'fuehrung.umzug.einstellen.text': {
    de: 'Name und Adressen (alt und neu) ändern, oder den Umzug löschen.',
    ar: 'تغيير الاسم والعنوانين (القديم والجديد)، أو حذف الانتقال.',
  },
  'fuehrung.umzug.zahlen.titel': { de: 'Wo sind die Kisten?', ar: 'أين الصناديق؟' },
  'fuehrung.umzug.zahlen.text': {
    de: 'Drei Zahlen: noch in der alten Wohnung, unterwegs, angekommen. Tippe auf eine Zahl, um genau diese Kisten zu sehen.',
    ar: 'ثلاثة أرقام: ما زالت في الشقة القديمة، في الطريق، وصلت. اضغط على رقم لترى هذه الصناديق بالتحديد.',
  },
  'fuehrung.umzug.schnell.titel': { de: 'Schnellzugriff', ar: 'وصول سريع' },
  'fuehrung.umzug.schnell.text': {
    de: 'Kiste anlegen, Scannen, Bereiche, Grundriss, Möbel, Etiketten und Drucken. Ein Tipp, und du bist da.',
    ar: 'إنشاء صندوق، المسح، المناطق، المخطط، الأثاث، الملصقات والطباعة. ضغطة واحدة وتصل.',
  },
  'fuehrung.umzug.zimmer.titel': { de: 'Zimmer verwalten', ar: 'إدارة الغرف' },
  'fuehrung.umzug.zimmer.text': {
    de: 'Zimmer anlegen, umbenennen, Farbe und Kürzel ändern. Darunter jedes Zimmer mit seiner Zahl an Kisten.',
    ar: 'إنشاء الغرف وإعادة تسميتها وتغيير لونها واختصارها. تحتها كل غرفة مع عدد صناديقها.',
  },
  'fuehrung.umzug.personen.titel': { de: 'Personen', ar: 'الأشخاص' },
  'fuehrung.umzug.personen.text': {
    de: 'Kisten können auch einer Person gehören, zum Beispiel "Lina". Hier verwaltest du die Personen.',
    ar: 'يمكن أن تخص الصناديق شخصاً أيضاً، مثلاً "لينا". هنا تدير الأشخاص.',
  },
  'fuehrung.umzug.fuss.titel': { de: 'Weitere Wege', ar: 'طرق أخرى' },
  'fuehrung.umzug.fuss.text': {
    de: 'Alle Kisten, Etiketten und Liste zum Drucken, das Team (wer mithilft) und deine anderen Umzüge.',
    ar: 'كل الصناديق، الملصقات والقائمة للطباعة، الفريق (من يساعد) وانتقالاتك الأخرى.',
  },

  // Kistenliste
  'fuehrung.kisten.start.titel': { de: 'Die Kistenliste', ar: 'قائمة الصناديق' },
  'fuehrung.kisten.start.text': {
    de: 'Hier stehen alle Kisten, Taschen, Möbel und Gegenstände. Jede hat eine Nummer, zum Beispiel "KÜ-3-007": Zimmer, Größe, laufende Nummer.',
    ar: 'هنا كل الصناديق والحقائب والأثاث والأغراض. لكل منها رقم، مثلاً "KÜ-3-007": الغرفة، الحجم، الرقم التسلسلي.',
  },
  'fuehrung.kisten.neu.titel': { de: 'Neue Kiste', ar: 'صندوق جديد' },
  'fuehrung.kisten.neu.text': {
    de: 'Legt eine oder mehrere Kisten an. Du wählst Zimmer, Größe und Art; die Nummer vergibt Kistly selbst.',
    ar: 'ينشئ صندوقاً أو أكثر. تختار الغرفة والحجم والنوع، وكيستلي يعطي الرقم بنفسه.',
  },
  'fuehrung.kisten.gegenstand.titel': { de: 'Gegenstand anlegen', ar: 'إضافة غرض' },
  'fuehrung.kisten.gegenstand.text': {
    de: 'Für Dinge ohne Kiste, zum Beispiel eine Lampe: Foto machen, Namen tippen, ungefähre Größe wählen, fertig.',
    ar: 'للأشياء التي لا توضع في صندوق، مثل مصباح: التقط صورة، اكتب الاسم، اختر الحجم التقريبي، وانتهى.',
  },
  'fuehrung.kisten.auswahl.titel': { de: 'Mehrere auswählen', ar: 'تحديد عدة عناصر' },
  'fuehrung.kisten.auswahl.text': {
    de: 'Schaltet Häkchen an jeder Zeile ein. Dann kannst du viele Kisten auf einmal umziehen, markieren oder den Status ändern.',
    ar: 'يُظهر علامات اختيار في كل سطر. بعدها يمكنك نقل صناديق كثيرة دفعة واحدة أو تمييزها أو تغيير حالتها.',
  },
  'fuehrung.kisten.export.titel': { de: 'Als Tabelle speichern', ar: 'حفظ كجدول' },
  'fuehrung.kisten.export.text': {
    de: 'Lädt alle Kisten als CSV-Datei herunter. Die lässt sich in Excel öffnen.',
    ar: 'يحمّل كل الصناديق كملف CSV. يمكن فتحه في Excel.',
  },
  'fuehrung.kisten.groessen.titel': { de: 'Größen prüfen', ar: 'فحص الأحجام' },
  'fuehrung.kisten.groessen.text': {
    de: 'Die Kistengrößen 1 bis 10 und deine eigenen Größen. Hier legst du auch eigene Maße an.',
    ar: 'أحجام الصناديق من 1 إلى 10 وأحجامك الخاصة. هنا تنشئ أيضاً مقاساتك الخاصة.',
  },
  'fuehrung.kisten.suche.titel': { de: 'In der Liste suchen', ar: 'البحث في القائمة' },
  'fuehrung.kisten.suche.text': {
    de: 'Tippe eine Nummer, einen Titel oder ein Wort aus der Notiz. Die Liste filtert sofort.',
    ar: 'اكتب رقماً أو عنواناً أو كلمة من الملاحظة. تتم تصفية القائمة فوراً.',
  },
  'fuehrung.kisten.filter.titel': { de: 'Filter', ar: 'التصفية' },
  'fuehrung.kisten.filter.text': {
    de: 'Nur ein Zimmer, nur eine Person, oder anders sortiert. Die Zahl am Knopf zeigt, wie viele Filter gesetzt sind.',
    ar: 'غرفة واحدة فقط، أو شخص واحد فقط، أو ترتيب مختلف. الرقم على الزر يبين عدد عوامل التصفية المفعّلة.',
  },
  'fuehrung.kisten.status.titel': { de: 'Nach Status zeigen', ar: 'العرض حسب الحالة' },
  'fuehrung.kisten.status.text': {
    de: 'Alle, alte Wohnung, unterwegs oder angekommen. So siehst du schnell, was noch fehlt.',
    ar: 'الكل، الشقة القديمة، في الطريق، أو وصلت. هكذا ترى بسرعة ما الذي ما زال ناقصاً.',
  },
  'fuehrung.kisten.liste.titel': { de: 'Die Kisten', ar: 'الصناديق' },
  'fuehrung.kisten.liste.text': {
    de: 'Tippe auf eine Zeile, um die Kiste zu öffnen. Der farbige Status in der Zeile wechselt mit einem Tipp: alte Wohnung, unterwegs, angekommen.',
    ar: 'اضغط على سطر لفتح الصندوق. الحالة الملونة في السطر تتغير بضغطة: الشقة القديمة، في الطريق، وصل.',
  },

  // Eine Kiste
  'fuehrung.kiste.start.titel': { de: 'Eine Kiste', ar: 'صندوق واحد' },
  'fuehrung.kiste.start.text': {
    de: 'Alles über diese Kiste: was drin ist, Fotos, wo sie steht, wie voll sie ist und ihr Etikett.',
    ar: 'كل شيء عن هذا الصندوق: ما بداخله، الصور، أين يوجد، كم هو ممتلئ وملصقه.',
  },
  'fuehrung.kiste.markieren.titel': { de: 'Markieren', ar: 'تمييز' },
  'fuehrung.kiste.markieren.text': {
    de: 'Gibt der Kiste eine eigene Farbe oder ein Zeichen, zum Beispiel für "zuerst auspacken".',
    ar: 'يعطي الصندوق لوناً أو رمزاً خاصاً، مثلاً لـ "يُفرغ أولاً".',
  },
  'fuehrung.kiste.bearbeiten.titel': { de: 'Bearbeiten', ar: 'تعديل' },
  'fuehrung.kiste.bearbeiten.text': {
    de: 'Titel, Zimmer, Person, Größe, Notiz und "zerbrechlich" ändern.',
    ar: 'تغيير العنوان والغرفة والشخص والحجم والملاحظة و"قابل للكسر".',
  },
  'fuehrung.kiste.loeschen.titel': { de: 'Löschen', ar: 'حذف' },
  'fuehrung.kiste.loeschen.text': {
    de: 'Löscht die Kiste mit Inhalt und Fotos. Kistly fragt vorher noch einmal nach.',
    ar: 'يحذف الصندوق مع محتواه وصوره. كيستلي يسأل مرة أخرى قبل ذلك.',
  },
  'fuehrung.kiste.status.titel': { de: 'Status', ar: 'الحالة' },
  'fuehrung.kiste.status.text': {
    de: 'Alte Wohnung, unterwegs oder angekommen. Ein Tipp genügt.',
    ar: 'الشقة القديمة، في الطريق أو وصل. ضغطة واحدة تكفي.',
  },
  'fuehrung.kiste.fuellstand.titel': { de: 'Füllstand', ar: 'مستوى الامتلاء' },
  'fuehrung.kiste.fuellstand.text': {
    de: 'Wie voll ist die Kiste? Von 0 % (leer, grün) bis 100 % (voll, rot).',
    ar: 'كم الصندوق ممتلئ؟ من 0٪ (فارغ، أخضر) إلى 100٪ (ممتلئ، أحمر).',
  },
  'fuehrung.kiste.wo.titel': { de: 'Wo steht sie?', ar: 'أين يوجد؟' },
  'fuehrung.kiste.wo.text': {
    de: 'Springt nach unten zum Lageplan der Kiste.',
    ar: 'ينتقل إلى الأسفل إلى مخطط موقع الصندوق.',
  },
  'fuehrung.kiste.eintrag.titel': { de: 'Was ist drin?', ar: 'ماذا بداخله؟' },
  'fuehrung.kiste.eintrag.text': {
    de: 'Tippe ein Ding und drücke Enter. So findest du es später über die Suche. Mit dem Haken hakst du ab, was schon ausgepackt ist.',
    ar: 'اكتب شيئاً واضغط Enter. هكذا تجده لاحقاً عبر البحث. بعلامة الصح تشطب ما تم إفراغه.',
  },
  'fuehrung.kiste.foto_lesen.titel': { de: 'Foto lesen', ar: 'قراءة الصورة' },
  'fuehrung.kiste.foto_lesen.text': {
    de: 'Kistly schaut sich die Fotos an und schlägt vor, was darauf zu sehen ist. Du bestätigst, was stimmt.',
    ar: 'كيستلي ينظر إلى الصور ويقترح ما يظهر فيها. أنت تؤكد ما هو صحيح.',
  },
  'fuehrung.kiste.foto.titel': { de: 'Foto', ar: 'صورة' },
  'fuehrung.kiste.foto.text': {
    de: 'Fotografiere den Inhalt, bevor du die Kiste schließt. Ein Foto kann das Deckbild werden, das beim Scannen sofort erscheint.',
    ar: 'صوّر المحتوى قبل إغلاق الصندوق. يمكن أن تصبح صورة هي صورة الغلاف التي تظهر فوراً عند المسح.',
  },
  'fuehrung.kiste.schicht.titel': { de: 'Schichten', ar: 'الطبقات' },
  'fuehrung.kiste.schicht.text': {
    de: 'Packst du in Lagen? Wähle die Schicht, bevor du fotografierst. Dann weißt du später, wie tief ein Ding liegt.',
    ar: 'هل تعبئ على طبقات؟ اختر الطبقة قبل التصوير. هكذا تعرف لاحقاً على أي عمق يوجد الشيء.',
  },
  'fuehrung.kiste.lage.titel': { de: 'Wo steht die Kiste', ar: 'أين يوجد الصندوق' },
  'fuehrung.kiste.lage.text': {
    de: 'Der Raum von oben, die Kiste rot. Dazu steht, worauf sie steht und in welcher Höhe. Von hier kannst du ihr einen Platz geben.',
    ar: 'الغرفة من الأعلى والصندوق باللون الأحمر. ويُكتب على ماذا يقف وعلى أي ارتفاع. من هنا يمكنك تحديد مكان له.',
  },
  'fuehrung.kiste.drei_d.titel': { de: 'In 3D ansehen', ar: 'عرض ثلاثي الأبعاد' },
  'fuehrung.kiste.drei_d.text': {
    de: 'Zeigt den Raum dreidimensional. Am Computer: ziehen dreht, Mausrad zoomt. Am Handy: ein Finger dreht, zwei Finger verschieben und zoomen.',
    ar: 'يعرض الغرفة بثلاثة أبعاد. على الكمبيوتر: السحب يدوّر وعجلة الفأرة تكبّر. على الهاتف: إصبع يدوّر وإصبعان يحرّكان ويكبّران.',
  },
  'fuehrung.kiste.link.titel': { de: 'Link kopieren', ar: 'نسخ الرابط' },
  'fuehrung.kiste.link.text': {
    de: 'Kopiert den Link zu dieser Kiste, zum Beispiel für den Chat. Der QR-Code darüber führt zur selben Seite.',
    ar: 'ينسخ رابط هذا الصندوق، مثلاً لإرساله في الدردشة. رمز QR فوقه يقود إلى نفس الصفحة.',
  },
  'fuehrung.kiste.druck.titel': { de: 'Etikett drucken', ar: 'طباعة الملصق' },
  'fuehrung.kiste.druck.text': {
    de: 'Öffnet das Etikett dieser Kiste zum Drucken, mit Nummer, Zimmerfarbe und QR-Code.',
    ar: 'يفتح ملصق هذا الصندوق للطباعة، مع الرقم ولون الغرفة ورمز QR.',
  },

  // Platz waehlen (Handy)
  'fuehrung.platz.start.titel': { de: 'Platz wählen', ar: 'اختيار المكان' },
  'fuehrung.platz.start.text': {
    de: 'In vier Tipps: Zimmer wählen, auf die Stelle im Plan tippen, wählen worauf die Kiste steht, speichern. Mit zwei Fingern zoomst du im Plan.',
    ar: 'بأربع ضغطات: اختر الغرفة، اضغط على المكان في المخطط، اختر على ماذا يقف الصندوق، ثم احفظ. بإصبعين تكبّر المخطط.',
  },
  'fuehrung.platz.drehen.titel': { de: 'Drehen', ar: 'تدوير' },
  'fuehrung.platz.drehen.text': {
    de: 'Dreht die Kiste um 90 Grad.',
    ar: 'يدوّر الصندوق بمقدار 90 درجة.',
  },
  'fuehrung.platz.fein.titel': { de: 'Feineinstellung', ar: 'ضبط دقيق' },
  'fuehrung.platz.fein.text': {
    de: 'Schiebt die Kiste zentimetergenau, oder du tippst den Abstand von links und von oben ein.',
    ar: 'يحرّك الصندوق بدقة السنتيمتر، أو تكتب المسافة من اليسار ومن الأعلى.',
  },
  'fuehrung.platz.speichern.titel': { de: 'Hier hinstellen', ar: 'ضعه هنا' },
  'fuehrung.platz.speichern.text': {
    de: 'Speichert den Platz. Passt die Kiste dort nicht, sagt Kistly warum.',
    ar: 'يحفظ المكان. إذا لم يناسب الصندوق هناك، يخبرك كيستلي بالسبب.',
  },

  // Bereiche (Zimmer und Personen)
  'fuehrung.bereiche.start.titel': { de: 'Zimmer und Personen', ar: 'الغرف والأشخاص' },
  'fuehrung.bereiche.start.text': {
    de: 'Jedes Zimmer hat einen Namen, eine Farbe und ein Kürzel. Das Kürzel steht vorne in jeder Kistennummer.',
    ar: 'لكل غرفة اسم ولون واختصار. الاختصار يظهر في بداية كل رقم صندوق.',
  },
  'fuehrung.bereiche.neu.titel': { de: 'Neues Zimmer', ar: 'غرفة جديدة' },
  'fuehrung.bereiche.neu.text': {
    de: 'Legt ein neues Zimmer an. Bei den Personen gibt es denselben Knopf für eine neue Person.',
    ar: 'ينشئ غرفة جديدة. عند الأشخاص يوجد نفس الزر لإضافة شخص جديد.',
  },
  'fuehrung.bereiche.zeile.titel': { de: 'Zimmer öffnen', ar: 'فتح الغرفة' },
  'fuehrung.bereiche.zeile.text': {
    de: 'Tippe auf ein Zimmer: dann siehst du alles, was darin steht.',
    ar: 'اضغط على غرفة: عندها ترى كل ما فيها.',
  },
  'fuehrung.bereiche.bearbeiten.titel': { de: 'Bearbeiten', ar: 'تعديل' },
  'fuehrung.bereiche.bearbeiten.text': {
    de: 'Name, Farbe, Kürzel und Zeichen ändern.',
    ar: 'تغيير الاسم واللون والاختصار والرمز.',
  },
  'fuehrung.bereiche.loeschen.titel': { de: 'Löschen', ar: 'حذف' },
  'fuehrung.bereiche.loeschen.text': {
    de: 'Löscht das Zimmer. Die Kisten bleiben, sie haben dann nur kein Zimmer mehr.',
    ar: 'يحذف الغرفة. الصناديق تبقى، لكن بدون غرفة.',
  },

  // Ein Zimmer
  'fuehrung.zimmer.start.titel': { de: 'Ein Zimmer', ar: 'غرفة واحدة' },
  'fuehrung.zimmer.start.text': {
    de: 'Alles, was zu diesem Zimmer gehört: Kisten, Gegenstände, Möbel, Regale und wo sie stehen.',
    ar: 'كل ما يخص هذه الغرفة: الصناديق والأغراض والأثاث والرفوف وأماكنها.',
  },
  'fuehrung.zimmer.grundriss.titel': { de: 'Im Grundriss zeigen', ar: 'العرض في المخطط' },
  'fuehrung.zimmer.grundriss.text': {
    de: 'Öffnet den Grundriss mit diesem Zimmer.',
    ar: 'يفتح المخطط على هذه الغرفة.',
  },
  'fuehrung.zimmer.auswahl.titel': { de: 'Mehrere auswählen', ar: 'تحديد عدة عناصر' },
  'fuehrung.zimmer.auswahl.text': {
    de: 'Häkchen an jeder Zeile: viele Kisten auf einmal in ein anderes Zimmer, markieren oder Status ändern.',
    ar: 'علامات اختيار في كل سطر: نقل صناديق كثيرة دفعة واحدة إلى غرفة أخرى، أو تمييزها أو تغيير حالتها.',
  },
  'fuehrung.zimmer.bearbeiten.titel': { de: 'Bearbeiten', ar: 'تعديل' },
  'fuehrung.zimmer.bearbeiten.text': {
    de: 'Name, Farbe und Kürzel ändern.',
    ar: 'تغيير الاسم واللون والاختصار.',
  },
  'fuehrung.zimmer.zahlen.titel': { de: 'Wie weit?', ar: 'إلى أين وصلنا؟' },
  'fuehrung.zimmer.zahlen.text': {
    de: 'Wie viele Kisten noch in der alten Wohnung sind, unterwegs oder schon angekommen.',
    ar: 'كم صندوقاً ما زال في الشقة القديمة، في الطريق أو وصل بالفعل.',
  },
  'fuehrung.zimmer.inhalt.titel': { de: 'Im Zimmer', ar: 'في الغرفة' },
  'fuehrung.zimmer.inhalt.text': {
    de: 'Möbel (Regale und Schränke zählen mit), Regale und Schränke, Kisten und Gegenstände. Darunter jedes Regal mit dem, was darin steht.',
    ar: 'الأثاث (الرفوف والخزائن محسوبة ضمنه)، الرفوف والخزائن، الصناديق والأغراض. تحتها كل رف مع ما يوجد فيه.',
  },
  'fuehrung.zimmer.knoepfe.titel': { de: 'Weitere Knöpfe', ar: 'أزرار أخرى' },
  'fuehrung.zimmer.knoepfe.text': {
    de: 'Alle Kisten dieses Zimmers in der Liste, Etiketten nur für dieses Zimmer drucken, oder zwei Zimmer zusammenführen.',
    ar: 'كل صناديق هذه الغرفة في القائمة، طباعة ملصقات هذه الغرفة فقط، أو دمج غرفتين.',
  },
  'fuehrung.zimmer.ohne_platz.titel': { de: 'Ohne Platz', ar: 'بدون مكان' },
  'fuehrung.zimmer.ohne_platz.text': {
    de: 'Diese Kisten stehen noch nirgends im Grundriss. Tippe eine an, stell sie hin, dann kommt die nächste.',
    ar: 'هذه الصناديق ليس لها مكان في المخطط بعد. اضغط على واحد، ضعه، ثم يأتي التالي.',
  },
  'fuehrung.zimmer.kiste_neu.titel': { de: 'Kiste hier anlegen', ar: 'إنشاء صندوق هنا' },
  'fuehrung.zimmer.kiste_neu.text': {
    de: 'Neue Kiste, das Zimmer ist schon gewählt.',
    ar: 'صندوق جديد، والغرفة مختارة مسبقاً.',
  },
  'fuehrung.zimmer.gegenstand_neu.titel': { de: 'Gegenstand anlegen', ar: 'إضافة غرض' },
  'fuehrung.zimmer.gegenstand_neu.text': {
    de: 'Ein einzelnes Ding ohne Kiste: Foto, Name, ungefähre Größe. Danach kannst du ihm einen Platz im Grundriss geben.',
    ar: 'شيء واحد بدون صندوق: صورة، اسم، حجم تقريبي. بعدها يمكنك تحديد مكان له في المخطط.',
  },
  'fuehrung.zimmer.moebel_neu.titel': { de: 'Möbel anlegen', ar: 'إضافة أثاث' },
  'fuehrung.zimmer.moebel_neu.text': {
    de: 'Ein Möbelstück für dieses Zimmer, mit Hersteller, Maßen und ob es zerlegt ist.',
    ar: 'قطعة أثاث لهذه الغرفة، مع الشركة المصنعة والمقاسات وهل هي مفككة.',
  },
  'fuehrung.person.start.titel': { de: 'Eine Person', ar: 'شخص واحد' },
  'fuehrung.person.start.text': {
    de: 'Alle Kisten dieser Person, in welchem Zimmer sie auch stehen.',
    ar: 'كل صناديق هذا الشخص، في أي غرفة كانت.',
  },

  // Grundriss ansehen (Handy und ohne Bearbeiten)
  'fuehrung.grundriss.start.titel': { de: 'Der Grundriss', ar: 'المخطط' },
  'fuehrung.grundriss.start.text': {
    de: 'Die Wohnung von oben. Türen sind orange, Fenster blau. Zeichnen geht am Computer, ansehen überall.',
    ar: 'الشقة من الأعلى. الأبواب برتقالية والنوافذ زرقاء. الرسم على الكمبيوتر، والمشاهدة في كل مكان.',
  },
  'fuehrung.grundriss.raeume.titel': { de: 'Raum wählen', ar: 'اختيار الغرفة' },
  'fuehrung.grundriss.raeume.text': {
    de: '"Alles" zeigt die ganze Wohnung, ein Raum zeigt nur diesen Raum groß.',
    ar: '"الكل" يعرض الشقة كاملة، واختيار غرفة يعرضها وحدها بشكل كبير.',
  },
  'fuehrung.grundriss.plan.titel': { de: 'Der Plan', ar: 'المخطط' },
  'fuehrung.grundriss.plan.text': {
    de: 'Tippe auf eine Kiste oder ein Regal, um zu sehen, was es ist. Zoomen: am Handy mit zwei Fingern, am Computer mit dem Mausrad. Verschieben: ziehen.',
    ar: 'اضغط على صندوق أو رف لترى ما هو. التكبير: على الهاتف بإصبعين، وعلى الكمبيوتر بعجلة الفأرة. التحريك: بالسحب.',
  },
  'fuehrung.grundriss.drei_d.titel': { de: 'In 3D ansehen', ar: 'عرض ثلاثي الأبعاد' },
  'fuehrung.grundriss.drei_d.text': {
    de: 'Die Wohnung dreidimensional. Am Handy: ein Finger dreht, zwei Finger verschieben und zoomen.',
    ar: 'الشقة بثلاثة أبعاد. على الهاتف: إصبع يدوّر، وإصبعان يحرّكان ويكبّران.',
  },

  // Zeichner (Computer)
  'fuehrung.zeichner.start.titel': { de: 'Grundriss zeichnen', ar: 'رسم المخطط' },
  'fuehrung.zeichner.start.text': {
    de: 'Hier zeichnest du die Wohnung auf den Zentimeter genau: Räume, Türen, Fenster, Möbel, Regale, und stellst Kisten hin. Alles wird von selbst gespeichert.',
    ar: 'هنا ترسم الشقة بدقة السنتيمتر: الغرف والأبواب والنوافذ والأثاث والرفوف، وتضع الصناديق. كل شيء يُحفظ تلقائياً.',
  },
  'fuehrung.zeichner.flaeche.titel': { de: 'Die Zeichenfläche', ar: 'مساحة الرسم' },
  'fuehrung.zeichner.flaeche.text': {
    de: 'Das Raster zeigt Zentimeter. Klicke, um einen Punkt zu setzen; die Linie folgt der Maus.',
    ar: 'الشبكة تعرض السنتيمترات. انقر لوضع نقطة، والخط يتبع الفأرة.',
  },
  'fuehrung.zeichner.maus.titel': { de: 'Bewegen mit der Maus', ar: 'التحريك بالفأرة' },
  'fuehrung.zeichner.maus.text': {
    de: 'Mausrad hoch: näher. Mausrad runter: weiter weg.\nMaustaste gedrückt halten und ziehen: die Ansicht verschieben, auch mitten beim Zeichnen einer Linie.\nKurz klicken: Punkt setzen.',
    ar: 'عجلة الفأرة للأعلى: تقريب. للأسفل: إبعاد.\nاضغط زر الفأرة باستمرار واسحب: تحريك العرض، حتى أثناء رسم خط.\nنقرة قصيرة: وضع نقطة.',
  },
  'fuehrung.zeichner.werkzeuge.titel': { de: 'Die Werkzeuge', ar: 'الأدوات' },
  'fuehrung.zeichner.werkzeuge.text': {
    de: 'Links stehen alle Werkzeuge. Jedes hat eine Taste (steht daneben), damit es schneller geht.',
    ar: 'على الجانب توجد كل الأدوات. لكل أداة زر في لوحة المفاتيح (مكتوب بجانبها) لتسريع العمل.',
  },
  'fuehrung.zeichner.w_auswahl.titel': { de: 'Auswahl (V)', ar: 'تحديد (V)' },
  'fuehrung.zeichner.w_auswahl.text': {
    de: 'Klicke etwas an, um es zu wählen und rechts seine Maße zu ändern. Ziehen verschiebt Räume, Ecken, Wände, Möbel und Türen. Entf löscht.',
    ar: 'انقر على شيء لتحديده وتغيير مقاساته على الجانب. السحب ينقل الغرف والزوايا والجدران والأثاث والأبواب. زر Entf يحذف.',
  },
  'fuehrung.zeichner.w_raum.titel': { de: 'Raum (R)', ar: 'غرفة (R)' },
  'fuehrung.zeichner.w_raum.text': {
    de: 'Punkt für Punkt: klicken, Richtung mit der Maus zeigen, Länge tippen (zum Beispiel 3,45) und Enter. Klick auf den ersten Punkt schließt den Raum.',
    ar: 'نقطة بعد نقطة: انقر، أشر بالفأرة إلى الاتجاه، اكتب الطول (مثلاً 3,45) واضغط Enter. النقر على النقطة الأولى يغلق الغرفة.',
  },
  'fuehrung.zeichner.w_rechteck.titel': { de: 'Raum als Rechteck', ar: 'غرفة مستطيلة' },
  'fuehrung.zeichner.w_rechteck.text': {
    de: 'Der schnellste Weg: eine Ecke klicken, Breite tippen, Tab, Tiefe tippen, Enter.',
    ar: 'أسرع طريقة: انقر على زاوية، اكتب العرض، Tab، اكتب العمق، Enter.',
  },
  'fuehrung.zeichner.w_teilen.titel': { de: 'Raum teilen (T)', ar: 'تقسيم الغرفة (T)' },
  'fuehrung.zeichner.w_teilen.text': {
    de: 'Zeichnet eine Wand quer durch einen Raum und macht zwei Räume daraus.',
    ar: 'يرسم جداراً عبر الغرفة ويجعل منها غرفتين.',
  },
  'fuehrung.zeichner.w_nische.titel': { de: 'Nische / Ecke (N)', ar: 'تجويف / زاوية (N)' },
  'fuehrung.zeichner.w_nische.text': {
    de: 'Für Räume, die nicht ganz eckig sind: zwei Punkte auf eine Wand klicken, dann das Stück dazwischen mit der Maus rein oder raus ziehen und klicken. Rein gibt eine Nische, an einer Ecke schneidet es die Ecke weg (L-Form), raus gibt einen Vorsprung. Du kannst die Tiefe auch tippen und Enter drücken.',
    ar: 'للغرف غير المربعة تماماً: انقر نقطتين على جدار، ثم اسحب الجزء بينهما بالفأرة للداخل أو للخارج وانقر. للداخل يعطي تجويفاً، وعند زاوية يقص الزاوية (شكل L)، وللخارج يعطي بروزاً. يمكنك أيضاً كتابة العمق ثم Enter.',
  },
  'fuehrung.zeichner.formen.titel': { de: 'Umriss genau anpassen', ar: 'ضبط الحدود بدقة' },
  'fuehrung.zeichner.formen.text': {
    de: 'Mit der Auswahl: eine Ecke ziehen verschiebt sie, eine Wand ziehen schiebt sie parallel rein oder raus. Doppelklick auf eine Wand setzt eine neue Ecke, Doppelklick auf eine Ecke entfernt sie. Tipp: erst den Umriss der ganzen Wohnung zeichnen, dann mit "Raum teilen" in Zimmer aufteilen.',
    ar: 'بأداة التحديد: سحب زاوية ينقلها، وسحب جدار يحركه موازياً للداخل أو للخارج. النقر المزدوج على جدار يضيف زاوية جديدة، وعلى زاوية يحذفها. نصيحة: ارسم أولاً حدود الشقة كاملة، ثم قسّمها إلى غرف بأداة "تقسيم الغرفة".',
  },
  'fuehrung.zeichner.w_linie.titel': { de: 'Linie gestrichelt (L)', ar: 'خط متقطع (L)' },
  'fuehrung.zeichner.w_linie.text': {
    de: 'Zeichnet eine gestrichelte Linie, nur zum Anzeigen, zum Beispiel für eine Treppe, eine Stufe oder einen Teppich. Mit der Auswahl kannst du sie anklicken, verschieben, ihre Länge ändern oder löschen.',
    ar: 'يرسم خطاً متقطعاً للعرض فقط، مثلاً لدرج أو عتبة أو سجادة. بأداة التحديد يمكنك النقر عليه ونقله وتغيير طوله أو حذفه.',
  },
  'fuehrung.zeichner.w_tuer.titel': { de: 'Tür (D)', ar: 'باب (D)' },
  'fuehrung.zeichner.w_tuer.text': {
    de: 'Klicke auf eine Wand: dort sitzt die Tür (orange). Rechts stellst du Breite und Aufschlag ein.',
    ar: 'انقر على جدار: هناك يوضع الباب (برتقالي). على الجانب تضبط العرض واتجاه الفتح.',
  },
  'fuehrung.zeichner.w_fenster.titel': { de: 'Fenster (F)', ar: 'نافذة (F)' },
  'fuehrung.zeichner.w_fenster.text': {
    de: 'Wie die Tür, nur blau, mit Brüstungshöhe.',
    ar: 'مثل الباب، لكن باللون الأزرق ومع ارتفاع حافة النافذة.',
  },
  'fuehrung.zeichner.w_moebel.titel': { de: 'Möbel (M)', ar: 'أثاث (M)' },
  'fuehrung.zeichner.w_moebel.text': {
    de: 'Rechts ein Möbel aus dem Katalog wählen (Bett, Sofa, Tisch ...) oder eine eigene Größe, dann in den Raum klicken.',
    ar: 'اختر على الجانب قطعة أثاث من الكتالوج (سرير، كنبة، طاولة ...) أو حجماً خاصاً، ثم انقر داخل الغرفة.',
  },
  'fuehrung.zeichner.w_regal.titel': { de: 'Regal (K)', ar: 'رف (K)' },
  'fuehrung.zeichner.w_regal.text': {
    de: 'Ein Regal mit Fächern. Rechts stellst du Breite, Tiefe und die Bretter ein. In die Fächer kannst du Kisten stellen.',
    ar: 'رف مع رفوف داخلية. على الجانب تضبط العرض والعمق والألواح. يمكنك وضع صناديق في الرفوف.',
  },
  'fuehrung.zeichner.w_schrank.titel': { de: 'Schrank (J)', ar: 'خزانة (J)' },
  'fuehrung.zeichner.w_schrank.text': {
    de: 'Wie das Regal, als Schrank. Regale und Schränke zählen auf der Zimmerseite bei den Möbeln mit.',
    ar: 'مثل الرف، لكن كخزانة. الرفوف والخزائن تُحسب ضمن الأثاث في صفحة الغرفة.',
  },
  'fuehrung.zeichner.w_kiste.titel': { de: 'Kiste setzen (B)', ar: 'وضع صندوق (B)' },
  'fuehrung.zeichner.w_kiste.text': {
    de: 'Rechts eine Kiste ohne Platz wählen, dann auf den Boden, auf eine andere Kiste oder in ein Fach klicken. Kistly prüft, ob sie passt.',
    ar: 'اختر على الجانب صندوقاً بدون مكان، ثم انقر على الأرض أو على صندوق آخر أو في رف. كيستلي يتحقق هل يناسب.',
  },
  'fuehrung.zeichner.w_messen.titel': { de: 'Messen (A)', ar: 'قياس (A)' },
  'fuehrung.zeichner.w_messen.text': {
    de: 'Zwei Punkte klicken: Kistly zeigt den Abstand in Zentimetern. Es wird nichts verändert.',
    ar: 'انقر على نقطتين: يعرض كيستلي المسافة بالسنتيمتر. لا يتغير شيء.',
  },
  'fuehrung.zeichner.zimmer.titel': { de: 'Noch nicht gezeichnet', ar: 'لم تُرسم بعد' },
  'fuehrung.zeichner.zimmer.text': {
    de: 'Zimmer aus deiner Liste, die noch keinen Raum haben. Zieh eines auf einen gezeichneten Raum, dann gehören sie zusammen.',
    ar: 'غرف من قائمتك ليس لها مكان في المخطط بعد. اسحب واحدة إلى غرفة مرسومة، فتصبحان مرتبطتين.',
  },
  'fuehrung.zeichner.rueck.titel': { de: 'Rückgängig (Strg+Z)', ar: 'تراجع (Ctrl+Z)' },
  'fuehrung.zeichner.rueck.text': {
    de: 'Nimmt den letzten Schritt zurück.',
    ar: 'يلغي الخطوة الأخيرة.',
  },
  'fuehrung.zeichner.vor.titel': { de: 'Wiederholen (Strg+Y)', ar: 'إعادة (Ctrl+Y)' },
  'fuehrung.zeichner.vor.text': {
    de: 'Holt einen zurückgenommenen Schritt wieder.',
    ar: 'يعيد خطوة تم التراجع عنها.',
  },
  'fuehrung.zeichner.hilfe.titel': { de: 'Hilfezeile', ar: 'سطر المساعدة' },
  'fuehrung.zeichner.hilfe.text': {
    de: 'Sagt in einem Satz, wie das gerade gewählte Werkzeug funktioniert.',
    ar: 'يشرح في جملة واحدة كيف تعمل الأداة المختارة الآن.',
  },
  'fuehrung.zeichner.ansicht.titel': { de: '2D oder 3D', ar: 'ثنائي أو ثلاثي الأبعاد' },
  'fuehrung.zeichner.ansicht.text': {
    de: 'Schaltet zwischen dem Plan von oben und der 3D-Ansicht um.',
    ar: 'يبدّل بين المخطط من الأعلى والعرض الثلاثي الأبعاد.',
  },
  'fuehrung.zeichner.drei_d.titel': { de: 'So bewegst du 3D', ar: 'كيف تحرّك العرض الثلاثي' },
  'fuehrung.zeichner.drei_d.text': {
    de: 'Linke Maustaste halten und ziehen: drehen. Loslassen: die Maus bewegt sich frei, nichts dreht mit.\nRechte Maustaste: verschieben. Mausrad: zoomen.\nMöbel, Regal oder Schrank mit der linken Taste greifen und ziehen: es wird verschoben, mit allen Kisten darauf.',
    ar: 'اضغط زر الفأرة الأيسر واسحب: تدوير. عند الإفلات: تتحرك الفأرة بحرية ولا يدور شيء.\nالزر الأيمن: تحريك. العجلة: تكبير وتصغير.\nأمسك قطعة أثاث أو رفاً أو خزانة بالزر الأيسر واسحب: تنتقل مع كل الصناديق عليها.',
  },
  'fuehrung.zeichner.speichern.titel': { de: 'Speichern', ar: 'الحفظ' },
  'fuehrung.zeichner.speichern.text': {
    de: 'Kistly speichert jede Änderung von selbst. Hier steht, ob alles gespeichert ist. Klappt es nicht, tippst du hier auf "nochmal".',
    ar: 'كيستلي يحفظ كل تغيير تلقائياً. هنا يظهر هل تم حفظ كل شيء. إذا لم ينجح، اضغط هنا على "مرة أخرى".',
  },
  'fuehrung.zeichner.zoom.titel': { de: 'Zoom', ar: 'التكبير' },
  'fuehrung.zeichner.zoom.text': {
    de: 'Näher, weiter weg und "Alles zeigen" (Taste 0) holt die ganze Wohnung ins Bild.',
    ar: 'تقريب، إبعاد، و"عرض الكل" (زر 0) يُظهر الشقة كاملة.',
  },
  'fuehrung.zeichner.seite.titel': { de: 'Die rechte Spalte', ar: 'العمود الجانبي' },
  'fuehrung.zeichner.seite.text': {
    de: 'Zeigt, was zum Werkzeug oder zur Auswahl passt: Maße, Farbe, Katalog, Fächer, Kisten ohne Platz. Ohne Auswahl steht hier "So geht es"; das X blendet es aus, der Knopf "So geht es anzeigen" holt es zurück.',
    ar: 'يعرض ما يناسب الأداة أو التحديد: المقاسات، اللون، الكتالوج، الرفوف، الصناديق بدون مكان. بدون تحديد يظهر هنا "هكذا يعمل"؛ علامة X تخفيه، وزر "إظهار هكذا يعمل" يعيده.',
  },
  'fuehrung.zeichner.raster.titel': { de: 'Raster', ar: 'الشبكة' },
  'fuehrung.zeichner.raster.text': {
    de: 'Punkte rasten auf 1, 5 oder 10 cm ein. 5 cm passt fast immer.',
    ar: 'النقاط تُثبَّت على 1 أو 5 أو 10 سم. 5 سم تناسب في أغلب الأحيان.',
  },
  'fuehrung.zeichner.winkel.titel': { de: 'Winkel 90°', ar: 'زاوية 90°' },
  'fuehrung.zeichner.winkel.text': {
    de: 'Wände werden gerade, im rechten Winkel. Mit gedrückter Umschalttaste zeichnest du schräg.',
    ar: 'الجدران تُرسم مستقيمة بزاوية قائمة. مع الضغط على Shift ترسم بشكل مائل.',
  },
  'fuehrung.zeichner.tasten.titel': { de: 'Tasten', ar: 'اختصارات لوحة المفاتيح' },
  'fuehrung.zeichner.tasten.text': {
    de: 'Die wichtigsten Tasten stehen hier unten. Esc bricht ab, Entf löscht, Pfeiltasten schieben das Gewählte.',
    ar: 'أهم الاختصارات مكتوبة هنا في الأسفل. Esc يلغي، Entf يحذف، والأسهم تحرّك المحدد.',
  },

  // Moebel
  'fuehrung.moebel.start.titel': { de: 'Möbel', ar: 'الأثاث' },
  'fuehrung.moebel.start.text': {
    de: 'Alle Möbelstücke des Umzugs, mit Maßen, Hersteller und ob sie zerlegt sind.',
    ar: 'كل قطع أثاث الانتقال، مع المقاسات والشركة المصنعة وهل هي مفككة.',
  },
  'fuehrung.moebel.neu.titel': { de: 'Neues Möbel', ar: 'قطعة أثاث جديدة' },
  'fuehrung.moebel.neu.text': {
    de: 'Legt ein Möbelstück an. Es bekommt eine Nummer und ein Etikett wie eine Kiste.',
    ar: 'ينشئ قطعة أثاث. تحصل على رقم وملصق مثل الصندوق.',
  },
  'fuehrung.moebel.filter.titel': { de: 'Nach Zimmer', ar: 'حسب الغرفة' },
  'fuehrung.moebel.filter.text': {
    de: 'Zeigt nur die Möbel eines Zimmers.',
    ar: 'يعرض أثاث غرفة واحدة فقط.',
  },

  // Suche
  'fuehrung.suche.start.titel': { de: 'Suchen', ar: 'البحث' },
  'fuehrung.suche.start.text': {
    de: 'Sucht in allen Umzügen, in allen Kisten und in allem, was du als Inhalt eingetragen hast.',
    ar: 'يبحث في كل الانتقالات وكل الصناديق وكل ما أدخلته كمحتوى.',
  },
  'fuehrung.suche.feld.titel': { de: 'Was suchst du?', ar: 'عمّ تبحث؟' },
  'fuehrung.suche.feld.text': {
    de: 'Tippe ein Wort, zum Beispiel "Ladekabel". Deutsch und Arabisch gehen beide.',
    ar: 'اكتب كلمة، مثلاً "شاحن". الألمانية والعربية تعملان كلتاهما.',
  },
  'fuehrung.suche.treffer.titel': { de: 'Die Treffer', ar: 'النتائج' },
  'fuehrung.suche.treffer.text': {
    de: 'Jeder Treffer sagt: welche Kiste, welches Zimmer, wo sie steht und in welcher Höhe. "Im Grundriss zeigen" markiert sie rot im Plan.',
    ar: 'كل نتيجة تقول: أي صندوق، أي غرفة، أين يوجد وعلى أي ارتفاع. "العرض في المخطط" يميّزه بالأحمر في المخطط.',
  },

  // Scannen
  'fuehrung.scan.start.titel': { de: 'Scannen', ar: 'المسح' },
  'fuehrung.scan.start.text': {
    de: 'Scanne die QR-Codes auf den Etiketten. Beim Ausladen kannst du jede Kiste gleich auf "angekommen" setzen.',
    ar: 'امسح رموز QR على الملصقات. عند التفريغ يمكنك جعل كل صندوق "وصل" مباشرة.',
  },
  'fuehrung.scan.kamera.titel': { de: 'Kamera', ar: 'الكاميرا' },
  'fuehrung.scan.kamera.text': {
    de: 'Halte das Etikett in das Bild. Sobald der Code erkannt ist, erscheint die Kiste.',
    ar: 'ضع الملصق داخل الصورة. بمجرد التعرف على الرمز يظهر الصندوق.',
  },
  'fuehrung.scan.nummer.titel': { de: 'Nummer von Hand', ar: 'الرقم يدوياً' },
  'fuehrung.scan.nummer.text': {
    de: 'Ist das Etikett kaputt? Tippe die Nummer ein, zum Beispiel W-3-007.',
    ar: 'هل الملصق تالف؟ اكتب الرقم، مثلاً W-3-007.',
  },

  // Chat
  'fuehrung.chat.start.titel': { de: 'Chat', ar: 'الدردشة' },
  'fuehrung.chat.start.text': {
    de: 'Schreibe allen, die beim Umzug helfen. Du kannst Fotos, Sprachnachrichten und Kisten schicken.',
    ar: 'راسل كل من يساعد في الانتقال. يمكنك إرسال صور ورسائل صوتية وصناديق.',
  },
  'fuehrung.chat.anruf.titel': { de: 'Anrufen', ar: 'اتصال' },
  'fuehrung.chat.anruf.text': {
    de: 'Ruft die anderen im Umzug an.',
    ar: 'يتصل بالآخرين في الانتقال.',
  },
  'fuehrung.chat.video.titel': { de: 'Videoanruf', ar: 'مكالمة فيديو' },
  'fuehrung.chat.video.text': {
    de: 'Ein Anruf mit Bild, zum Beispiel um zu zeigen, wo etwas hin soll.',
    ar: 'مكالمة بالصورة، مثلاً لتُري أين يوضع شيء ما.',
  },

  // Profil
  'fuehrung.profil.start.titel': { de: 'Dein Profil', ar: 'ملفك الشخصي' },
  'fuehrung.profil.start.text': {
    de: 'Hier stellst du Kistly so ein, wie es dir gefällt.',
    ar: 'هنا تضبط كيستلي كما يعجبك.',
  },
  'fuehrung.profil.sprache.titel': { de: 'Sprache', ar: 'اللغة' },
  'fuehrung.profil.sprache.text': {
    de: 'Deutsch oder Arabisch. Auf Arabisch läuft alles von rechts nach links, Pläne bleiben wie sie sind.',
    ar: 'الألمانية أو العربية. بالعربية يسير كل شيء من اليمين إلى اليسار، والمخططات تبقى كما هي.',
  },
  'fuehrung.profil.aussehen.titel': { de: 'Hell oder dunkel', ar: 'فاتح أو داكن' },
  'fuehrung.profil.aussehen.text': {
    de: 'Wie das Handy eingestellt ist, immer hell oder immer dunkel.',
    ar: 'مثل إعداد الهاتف، أو فاتح دائماً، أو داكن دائماً.',
  },
  'fuehrung.profil.bewegung.titel': { de: 'Bewegung', ar: 'الحركة' },
  'fuehrung.profil.bewegung.text': {
    de: 'Ruhig, normal oder voll: wie viel sich auf dem Bildschirm bewegt.',
    ar: 'هادئ أو عادي أو كامل: كم تتحرك الأشياء على الشاشة.',
  },
  'fuehrung.profil.abmelden.titel': { de: 'Abmelden', ar: 'تسجيل الخروج' },
  'fuehrung.profil.abmelden.text': {
    de: 'Meldet dich auf diesem Gerät ab.',
    ar: 'يسجل خروجك من هذا الجهاز.',
  },

  'fuehrung.allgemein.start.titel': { de: 'Kistly', ar: 'كيستلي' },
  'fuehrung.allgemein.start.text': {
    de: 'Kistly hilft beim Umzug: jede Kiste hat eine Nummer und ein Etikett, du weißt immer, was drin ist und wo sie steht.',
    ar: 'كيستلي يساعدك في الانتقال: لكل صندوق رقم وملصق، وتعرف دائماً ما بداخله وأين يوجد.',
  },

  'fuehrung.ende.titel': { de: 'Das war alles', ar: 'هذا كل شيء' },
  'fuehrung.ende.text': {
    de: 'Auf jeder Seite erklärt der Knopf "Erklärung" oben genau diese Seite. Viel Erfolg beim Umzug!',
    ar: 'في كل صفحة يشرح زر "شرح" في الأعلى هذه الصفحة بالتحديد. بالتوفيق في الانتقال!',
  },
}
