/* Der Schalter fuer die sachliche Oberflaeche von Grundriss und 3D
 * (Karam, 19.11.2026): "Man soll den Grundriss sehen, nicht so viele
 * Spielereien."
 *
 * true:  Plan und 3D zeigen nur das Noetige. Im 2D-Plan keine Legende fuer
 *        Tuer und Fenster, keine Linien, Strom-Symbole, Teppiche und Deko;
 *        im Zeichner nur Auswahl, Regal und Messen. In 3D nur Ansicht
 *        (von oben, schraeg), Licht (an, aus) und Begehen, mit festem
 *        sachlichem Tageslicht, ohne Teppiche, Deko, Moebel tragen,
 *        Fahrzeuge, Knoepfe beim Begehen und Moebel-Menue ausser Details.
 * false: alles wie vorher. Aller Code dafuer ist noch da, nichts ist
 *        geloescht; nur die Bedienung ist ausgeblendet.
 *
 * Der Zeichner hat zusaetzlich ZEICHNER_VOLL (src/zeichner/schalter.ts).
 */
export const SACHLICH: boolean = true
