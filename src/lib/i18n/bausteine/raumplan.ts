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
    de: 'Maße, Umriss, Tür und alle Plätze sind danach weg. Die Kisten selbst bleiben im Zimmer.',
    ar: 'ستُحذف المقاسات والحدود والباب وكل المواضع. الصناديق نفسها تبقى في الغرفة.',
  },
  'raumplan.plan_geloescht': { de: 'Raumplan gelöscht', ar: 'تم حذف مخطط الغرفة' },
  'raumplan.masse_zeile': {
    de: '{breite} x {tiefe} m, {hoehe} m hoch. Zelle {raster} cm, {spalten} x {reihen} Plätze, {ebenen} Lagen.',
    ar: '{breite} x {tiefe} م، بارتفاع {hoehe} م. الخلية {raster} سم، {spalten} x {reihen} موضعًا، {ebenen} طبقات.',
  },

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
  'raumplan.platz_von': { de: 'Platz {x} / {y}, Lage {z}', ar: 'الموضع {x} / {y}، الطبقة {z}' },

  // ------------------------------------------ Von der Kiste zum Plan
  'raumplan.zeigen': { de: 'Im Raumplan zeigen', ar: 'عرض في مخطط الغرفة' },
  'raumplan.kiste_ohne_platz': {
    de: 'Diese Kiste steht auf keinem Platz im Raumplan.',
    ar: 'هذا الصندوق ليس له موضع في مخطط الغرفة.',
  },
}
