import type { Woerterbuch } from '../woerter'

/* Der Raumplan eines Zimmers: Maße, Umriss, Tür und der Platz jeder
 * Kiste. Kistennummern und Kürzel bleiben unverändert, sie sind keine
 * Wörter, sondern Kennungen. */
export const raumplan: Woerterbuch = {
  // ------------------------------------------------------------- Kopf
  'raumplan.titel': { de: 'Raumplan', ar: 'مخطط الغرفة' },
  'raumplan.kein_zimmer': { de: 'Dieses Zimmer gibt es nicht', ar: 'هذه الغرفة غير موجودة' },
  'raumplan.nur_lesen': {
    de: 'Du kannst hier nur schauen. Zum Ändern brauchst du die Rolle Bearbeiter.',
    ar: 'يمكنك الاطلاع فقط. للتعديل تحتاج إلى دور محرر.',
  },

  // --------------------------------------------------------- Einrichten
  'raumplan.einrichten_titel': { de: 'Zimmer einrichten', ar: 'إعداد الغرفة' },
  'raumplan.einrichten_text': {
    de: 'Wie groß ist das Zimmer? Die Maße kannst du später ändern.',
    ar: 'ما مقاس الغرفة؟ يمكنك تغيير المقاسات لاحقًا.',
  },
  'raumplan.breite': { de: 'Breite in Metern', ar: 'العرض بالأمتار' },
  'raumplan.tiefe': { de: 'Tiefe in Metern', ar: 'العمق بالأمتار' },
  'raumplan.hoehe': { de: 'Höhe in Metern', ar: 'الارتفاع بالأمتار' },
  'raumplan.raster': { de: 'Zelle in Zentimetern', ar: 'حجم الخلية بالسنتيمتر' },
  'raumplan.raster_hinweis': {
    de: 'Eine Kiste belegt genau eine Zelle. 50 cm passt für gewöhnliche Umzugskisten.',
    ar: 'الصندوق يشغل خلية واحدة. 50 سم مناسبة لصناديق النقل المعتادة.',
  },
  'raumplan.anlegen': { de: 'Plan anlegen', ar: 'إنشاء المخطط' },
  'raumplan.masse_aendern': { de: 'Maße ändern', ar: 'تغيير المقاسات' },
  'raumplan.gespeichert': { de: 'Plan gespeichert', ar: 'تم حفظ المخطط' },
  'raumplan.plan_loeschen': { de: 'Plan löschen', ar: 'حذف المخطط' },
  'raumplan.plan_loeschen_titel': { de: 'Raumplan löschen', ar: 'حذف مخطط الغرفة' },
  'raumplan.plan_loeschen_text': {
    de: 'Maße, Umriss, Tür, Regale und alle Plätze sind danach weg. Die Kisten selbst bleiben im Zimmer.',
    ar: 'ستُحذف المقاسات والحدود والباب والرفوف وكل المواضع. الصناديق نفسها تبقى في الغرفة.',
  },
  'raumplan.plan_geloescht': { de: 'Raumplan gelöscht', ar: 'تم حذف مخطط الغرفة' },
  // Seit 0022 zaehlen echte Hoehen statt Lagen zu 40 cm. Das Mal steht
  // als Zeichen, nicht als lateinisches x: im arabischen Satz verdreht es
  // sonst die Reihenfolge der Zahlen.
  'raumplan.masse_zeile': {
    de: '{breite} × {tiefe} m, {hoehe} m hoch. Zelle {raster} cm, {spalten} × {reihen} Plätze.',
    ar: '{breite} × {tiefe} م، بارتفاع {hoehe} م. الخلية {raster} سم، {spalten} × {reihen} موضعًا.',
  },
  'raumplan.nur_lesen_leer': {
    de: 'Für dieses Zimmer gibt es noch keinen Raumplan.',
    ar: 'لا يوجد مخطط لهذه الغرفة بعد.',
  },

  // -------------------------------------------------- Formular pruefen
  'raumplan.feld_zahl': { de: 'Bitte eine Zahl eingeben.', ar: 'الرجاء إدخال رقم.' },
  'raumplan.feld_bereich_m': {
    de: 'Erlaubt sind {min} bis {max} m.',
    ar: 'المسموح من {min} إلى {max} م.',
  },
  'raumplan.feld_bereich_cm': {
    de: 'Erlaubt sind {min} bis {max} cm.',
    ar: 'المسموح من {min} إلى {max} سم.',
  },
  'raumplan.feld_bereich_zellen': {
    de: 'Erlaubt sind {min} bis {max} Zellen.',
    ar: 'المسموح من {min} إلى {max} خلايا.',
  },
  'raumplan.feld_zu_viele_zellen': {
    de: 'So werden es {n} Zellen, höchstens 2500 gehen. Nimm größere Zellen.',
    ar: 'هكذا يصبح عدد الخلايا {n}، والحد الأقصى 2500. اختر خلايا أكبر.',
  },
  'raumplan.raster_fest_hinweis': {
    de: 'Die Zellgröße lässt sich nur ändern, solange keine Kiste und kein Regal im Plan steht.',
    ar: 'لا يمكن تغيير حجم الخلية إلا طالما لا يوجد صندوق أو رف في المخطط.',
  },
  'raumplan.umriss_angepasst': {
    de: 'Das Zimmer ist kleiner geworden: {n} gesperrte Zellen lagen außerhalb und fallen weg.',
    ar: 'صغرت الغرفة: {n} خلايا محجوبة كانت خارجها وحُذفت.',
  },
  'raumplan.tuer_entfernt': {
    de: 'Die Tür lag danach nicht mehr an einer Wand und wurde entfernt. Setz sie neu.',
    ar: 'لم يعد الباب عند جدار فأُزيل. ضعه من جديد.',
  },

  // --------------------------------------------------------- Hand
  'raumplan.hand': { de: 'In der Hand: {code}', ar: 'في اليد: {code}' },
  'raumplan.hand_weg': { de: 'Loslassen', ar: 'إفلات' },
  'raumplan.moment': {
    de: 'Einen Moment, die letzte Kiste wird noch gesetzt.',
    ar: 'لحظة، ما زال الصندوق الأخير يوضع.',
  },
  'raumplan.hoehen_geschaetzt': {
    de: 'Die Kistengrößen konnten nicht geladen werden. Die Höhen sind darum nur geschätzt, mit 40 cm je Kiste.',
    ar: 'تعذّر تحميل أحجام الصناديق. لذلك الارتفاعات تقديرية فقط، بـ 40 سم لكل صندوق.',
  },
  'raumplan.raster_umgerechnet': {
    de: 'Umriss und Tür wurden auf die neue Zellgröße umgerechnet. Sieh kurz nach, ob alles stimmt.',
    ar: 'أُعيد حساب الحدود والباب على حجم الخلية الجديد. تحقّق سريعًا من أن كل شيء صحيح.',
  },
  'raumplan.hand_hinweis': {
    de: 'Tippe auf einen Platz. Danach kommt die nächste Kiste in die Hand.',
    ar: 'انقر على موضع. بعدها ينتقل الصندوق التالي إلى يدك.',
  },

  // ------------------------------------------------ Hoehe und Stapel
  'raumplan.hoehe_bereich': {
    de: '{von} bis {bis} cm über dem Boden',
    ar: 'من {von} إلى {bis} سم فوق الأرض',
  },
  'raumplan.platz_boden': {
    de: 'Platz {x} / {y}, Lage {z} von {n}',
    ar: 'الموضع {x} / {y}، الطبقة {z} من {n}',
  },
  'raumplan.platz_regal': {
    de: '{regal}, Brett {brett}, Lage {z} von {n}',
    ar: '{regal}، الرف {brett}، الطبقة {z} من {n}',
  },
  'raumplan.stapel_titel': { de: 'Im selben Stapel', ar: 'في الكومة نفسها' },
  'raumplan.stapel_hoehe': { de: '{h} cm', ar: '{h} سم' },
  'raumplan.frei_bis': {
    de: 'Noch {frei} cm frei bis {grenze}',
    ar: 'يتبقى {frei} سم حتى {grenze}',
  },
  'raumplan.bis_decke': { de: 'zur Decke', ar: 'السقف' },
  'raumplan.bis_brett': { de: 'zum nächsten Brett', ar: 'الرف التالي' },
  'raumplan.passt_nicht': {
    de: 'Diese Kiste ist {h} cm hoch, hier sind nur noch {frei} cm frei.',
    ar: 'ارتفاع هذا الصندوق {h} سم، ولم يبقَ هنا سوى {frei} سم.',
  },
  'raumplan.seitenansicht': { de: 'In der Seitenansicht', ar: 'في المنظر الجانبي' },

  // ------------------------------------------------------- Seite
  'raumplan.ansicht_seite': { de: 'Seite', ar: 'من الجانب' },
  'raumplan.seite_reihe': { de: 'Reihe {n}', ar: 'الصف {n}' },
  'raumplan.seite_hinweis': {
    de: 'So sieht diese Reihe von vorn aus. Die Zahlen links sind Zentimeter über dem Boden.',
    ar: 'هكذا يبدو هذا الصف من الأمام. الأرقام على اليسار سنتيمترات فوق الأرض.',
  },
  'raumplan.decke': { de: 'Decke {h} cm', ar: 'السقف {h} سم' },
  'raumplan.nur_von_oben': {
    de: 'Umriss, Tür und Regale setzt du in der Ansicht von oben.',
    ar: 'الحدود والباب والرفوف تضبطها في المنظر من الأعلى.',
  },

  // ------------------------------------------------------ Regale
  'raumplan.modus_regal': { de: 'Regal', ar: 'رف' },
  'raumplan.regal_hinweis': {
    de: 'Tippe auf eine freie Zelle, um dort ein Regal aufzustellen. Tippe auf ein Regal, um es zu ändern.',
    ar: 'انقر على خلية فارغة لوضع رف فيها. انقر على رف لتعديله.',
  },
  'raumplan.regal_neu': { de: 'Regal aufstellen', ar: 'وضع رف' },
  'raumplan.regal_bearbeiten': { de: 'Regal ändern', ar: 'تعديل الرف' },
  'raumplan.regal_name': { de: 'Name', ar: 'الاسم' },
  'raumplan.regal_name_platzhalter': {
    de: 'zum Beispiel Kellerregal links',
    ar: 'مثلًا رف القبو الأيسر',
  },
  'raumplan.regal_ohne_name': { de: 'Regal', ar: 'رف' },
  'raumplan.regal_breite': { de: 'Breite in Zellen', ar: 'العرض بالخلايا' },
  'raumplan.regal_tiefe': { de: 'Tiefe in Zellen', ar: 'العمق بالخلايا' },
  'raumplan.regal_hoehe': { de: 'Höhe in cm', ar: 'الارتفاع بالسنتيمتر' },
  'raumplan.regal_boeden': { de: 'Bretter in cm, von unten', ar: 'الرفوف بالسنتيمتر، من الأسفل' },
  'raumplan.regal_boeden_hinweis': {
    de: 'Durch Komma getrennt, zum Beispiel 0, 40, 80, 120, 160. Ein Brett bei 0 ist der Boden des Regals.',
    ar: 'مفصولة بفواصل، مثلًا 0، 40، 80، 120، 160. الرف عند 0 هو أرضية الرف.',
  },
  'raumplan.regal_boeden_fehler': {
    de: 'Die Bretter müssen von unten nach oben steigen und unter der Höhe des Regals liegen.',
    ar: 'يجب أن ترتفع الرفوف من الأسفل إلى الأعلى وأن تبقى تحت ارتفاع الرف.',
  },
  'raumplan.regal_zeile': {
    de: '{breite} × {tiefe} Zellen, {hoehe} cm hoch, {n} Bretter',
    ar: '{breite} × {tiefe} خلايا، بارتفاع {hoehe} سم، {n} رفوف',
  },
  'raumplan.regal_belegt_hinweis': {
    de: 'Auf dem Regal stehen Kisten. Ändern lässt sich nur der Name. Für alles andere nimm sie zuerst herunter.',
    ar: 'توجد صناديق على الرف. يمكن تغيير الاسم فقط. لغير ذلك أنزلها أولًا.',
  },
  'raumplan.regal_gespeichert': { de: 'Regal gespeichert', ar: 'تم حفظ الرف' },
  'raumplan.regal_geloescht': { de: 'Regal weggenommen', ar: 'تمت إزالة الرف' },
  'raumplan.regal_loeschen': { de: 'Regal wegnehmen', ar: 'إزالة الرف' },
  'raumplan.regal_loeschen_text': {
    de: 'Die Kisten darauf verlieren ihren Platz, nicht ihr Zimmer.',
    ar: 'تفقد الصناديق عليه موضعها، لا غرفتها.',
  },
  'raumplan.brett_waehlen': { de: 'Auf welches Brett?', ar: 'على أي رف؟' },
  'raumplan.brett_n': { de: 'Brett {n}', ar: 'الرف {n}' },
  'raumplan.brett_hoehe': { de: 'bei {h} cm', ar: 'عند {h} سم' },
  'raumplan.brett_voll': { de: 'Passt nicht mehr', ar: 'لم يعد يتسع' },
  'raumplan.brett_leer': { de: 'leer', ar: 'فارغ' },


  // ------------------------------------------------------------ Ansicht
  'raumplan.ansicht_2d': { de: 'Von oben', ar: 'من الأعلى' },
  'raumplan.ansicht_3d': { de: 'Schräg', ar: 'منظور' },
  'raumplan.groesser': { de: 'Größer', ar: 'تكبير' },
  'raumplan.kleiner': { de: 'Kleiner', ar: 'تصغير' },
  'raumplan.qr_ab': {
    de: 'Zoom weiter hinein, dann steht auf jeder Kiste ihr QR-Code.',
    ar: 'كبّر أكثر ليظهر رمز QR على كل صندوق.',
  },

  // -------------------------------------------------------------- Modus
  'raumplan.modus_setzen': { de: 'Kisten setzen', ar: 'وضع الصناديق' },
  'raumplan.modus_umriss': { de: 'Umriss', ar: 'الحدود' },
  'raumplan.modus_tuer': { de: 'Tür', ar: 'الباب' },
  'raumplan.setzen_hinweis': {
    de: 'Wähle unten eine Kiste und tippe auf einen Platz. Sie kommt oben auf den Stapel. Zweimal tippen öffnet die Kiste.',
    ar: 'اختر صندوقًا في الأسفل ثم انقر على موضع. سيوضع أعلى الكومة. النقر مرتين يفتح الصندوق.',
  },
  'raumplan.umriss_hinweis': {
    de: 'Tippe die Zellen an, die nicht zum Zimmer gehören. So zeichnest du den Umriss.',
    ar: 'انقر على الخلايا التي لا تنتمي إلى الغرفة. هكذا ترسم الحدود.',
  },
  'raumplan.tuer_hinweis': {
    de: 'Tippe eine Zelle am Rand an. Dort ist der Eingang.',
    ar: 'انقر على خلية عند الحافة. هناك المدخل.',
  },
  'raumplan.tuer_hier': { de: 'Tür', ar: 'باب' },
  'raumplan.nur_rand': {
    de: 'Die Tür sitzt am Rand des Zimmers.',
    ar: 'الباب يكون عند حافة الغرفة.',
  },

  // --------------------------------------------------------- Kisten
  'raumplan.ohne_platz.eins': { de: '{n} Kiste ohne Platz', ar: 'صندوق واحد بلا موضع' },
  'raumplan.ohne_platz.viele': { de: '{n} Kisten ohne Platz', ar: '{n} صناديق بلا موضع' },
  'raumplan.alle_im_plan': { de: 'Jede Kiste hat ihren Platz', ar: 'كل صندوق له موضعه' },
  'raumplan.keine_kisten': {
    de: 'In diesem Zimmer ist noch keine Kiste.',
    ar: 'لا يوجد صندوق في هذه الغرفة بعد.',
  },
  'raumplan.alle_setzen': { de: 'Rest automatisch setzen', ar: 'وضع البقية تلقائيًا' },
  'raumplan.alle_gesetzt': { de: '{n} gesetzt', ar: 'تم وضع {n}' },
  'raumplan.alle_gesetzt_rest': {
    de: '{n} gesetzt, {rest} passten nicht mehr hinein.',
    ar: 'تم وضع {n}، و{rest} لم تعد تتسع.',
  },
  'raumplan.kein_platz_mehr': { de: 'Es ist kein Platz mehr frei.', ar: 'لم يعد هناك موضع فارغ.' },
  'raumplan.vom_platz': { de: 'Vom Platz nehmen', ar: 'إزالة من الموضع' },
  'raumplan.vom_platz_ok': { de: 'Kiste steht auf keinem Platz mehr', ar: 'لم يعد للصندوق موضع' },
  'raumplan.oeffnen': { de: 'Öffnen', ar: 'فتح' },
  'raumplan.zelle_gesperrt': {
    de: 'Diese Zelle gehört nicht zum Zimmer.',
    ar: 'هذه الخلية لا تنتمي إلى الغرفة.',
  },
  'raumplan.zelle_belegt': {
    de: 'Hier steht eine Kiste. Nimm sie zuerst vom Platz.',
    ar: 'يوجد صندوق هنا. أزله من الموضع أولًا.',
  },
  'raumplan.zu_hoch': { de: 'Höher geht es in diesem Zimmer nicht.', ar: 'لا يمكن الارتفاع أكثر في هذه الغرفة.' },
  'raumplan.kisten_draussen': {
    de: '{n} Kisten stünden außerhalb der neuen Maße: {codes}. Nimm sie zuerst vom Platz.',
    ar: '{n} صناديق ستقع خارج المقاسات الجديدة: {codes}. أزلها من مواضعها أولًا.',
  },
  'raumplan.stapel': { de: '{n} übereinander', ar: '{n} فوق بعضها' },

  // ------------------------------------------ Von der Kiste zum Plan
  'raumplan.zeigen': { de: 'Im Raumplan zeigen', ar: 'عرض في مخطط الغرفة' },
  'raumplan.kiste_ohne_platz': {
    de: 'Diese Kiste steht auf keinem Platz im Raumplan.',
    ar: 'هذا الصندوق ليس له موضع في مخطط الغرفة.',
  },
}
