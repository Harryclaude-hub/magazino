# Erzeugt SCHIENENREGAL-BAUPLAN.html (Zeichnungen als SVG). PDF danach mit Chrome:
#   chrome --headless=new --no-pdf-header-footer --print-to-pdf=SCHIENENREGAL-BAUPLAN.pdf SCHIENENREGAL-BAUPLAN.html
import sys, html
ziel = sys.argv[1]

W, D = 161, 217          # Keller innen: Breite (x) und Tiefe (y), cm
T_E, T_W, T_B = 35, 30, 35   # Tiefe Ost (links), West (rechts), Hinten
RAIL_SIDE = [20, 79, 138, 197]
RAIL_BACK = [20, 60, 100, 140]
LEVELS = [45, 85, 125, 165]
FONT = "font-family:Arial,Helvetica,sans-serif"
HOLZ = "#e9cfa3"
RAIL = "#3b4650"


def t(x, y, s, size=5, anchor="middle", fill="#111", rot=None, weight="normal"):
    tr = f' transform="rotate({rot} {x} {y})"' if rot is not None else ""
    return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" fill="{fill}" font-weight="{weight}" style="{FONT}"{tr}>{html.escape(s)}</text>'


def line(x1, y1, x2, y2, w=0.5, c="#111", dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}" stroke-width="{w}"{d}/>'


def poly(pts, fill="none", stroke="#111", w=0.6):
    p = " ".join(f"{x},{y}" for x, y in pts)
    return f'<polygon points="{p}" fill="{fill}" stroke="{stroke}" stroke-width="{w}" stroke-linejoin="round"/>'


def rect(x, y, w, h, fill="none", stroke="#111", sw=0.5):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def mass_h(x1, x2, y, text, off=0, size=5):
    s = [line(x1, y, x2, y, 0.35), line(x1, y - 2, x1, y + 2, 0.35), line(x2, y - 2, x2, y + 2, 0.35)]
    s.append(t((x1 + x2) / 2, y - 1.8 + off, text, size))
    return "".join(s)


def mass_v(x, y1, y2, text, size=5, side=1):
    s = [line(x, y1, x, y2, 0.35), line(x - 2, y1, x + 2, y1, 0.35), line(x - 2, y2, x + 2, y2, 0.35)]
    s.append(t(x + side * 2.5, (y1 + y2) / 2 + 1.7, text, size, "start" if side > 0 else "end"))
    return "".join(s)


def board_poly(L, T):
    return [(0, 0), (L, 0), (L - T, T), (T, T)]


def bild_draufsicht():
    pad = 22
    vw, vh = W + 2 * pad + 60, D + 2 * pad + 30
    o = []
    ox, oy = pad + 14, pad + 14
    o.append(rect(ox - 8, oy - 8, W + 16, D + 16, "#c9c9c9", "none", 0))
    o.append(rect(ox, oy, W, D, "#f5f1e8", "#111", 0.5))
    o.append(rect(ox + 35, oy - 8, 80, 8, "#f5f1e8", "none", 0))
    o.append(f'<path d="M {ox+35} {oy+80} A 80 80 0 0 1 {ox+115} {oy}" fill="none" stroke="#c24" stroke-width="0.5" stroke-dasharray="3 2"/>')
    o.append(line(ox + 35, oy, ox + 35, oy + 80, 1.6, "#c24"))
    o.append(t(ox + 75, oy - 11, "Tuer 80 cm (Angel links, offen nach innen)", 4.5, fill="#c24"))
    east = [(ox + W, oy), (ox + W, oy + D), (ox + W - T_E, oy + D - T_E), (ox + W - T_E, oy + T_E)]
    west = [(ox, oy), (ox, oy + D), (ox + T_W, oy + D - T_W), (ox + T_W, oy + T_W)]
    back = [(ox, oy + D), (ox + W, oy + D), (ox + W - T_B, oy + D - T_B), (ox + T_B, oy + D - T_B)]
    for p in (east, west, back):
        o.append(poly(p, HOLZ, "#6b4a1e", 0.6))
    for y in RAIL_SIDE:
        o.append(rect(ox + W - 3, oy + y - 1.3, 3, 2.6, RAIL, RAIL, 0))
        o.append(rect(ox, oy + y - 1.3, 3, 2.6, RAIL, RAIL, 0))
    for x in RAIL_BACK:
        o.append(rect(ox + x - 1.3, oy + D - 3, 2.6, 3, RAIL, RAIL, 0))
    o.append(line(ox + W, oy + D, ox + W - T_E, oy + D - T_E, 1.1, "#c24"))
    o.append(line(ox, oy + D, ox + T_B, oy + D - T_B, 1.1, "#c24"))
    o.append(t(ox + W, oy + D + 14, "Gehrung 45 Grad", 4.5, "end", "#c24"))
    o.append(t(ox, oy + D + 14, "Gehrung 45 Grad", 4.5, "start", "#c24"))
    o.append(t(ox + W - T_E / 2 + 1.5, oy + D / 2, "OST (links) 35 cm tief", 4.5, rot=90))
    o.append(t(ox + T_W / 2 + 1.5, oy + D / 2, "WEST (rechts) 30 cm tief", 4.5, rot=-90))
    o.append(t(ox + W / 2, oy + D - T_B / 2 + 1.5, "HINTEN (Sued) 35 cm tief", 4.5))
    o.append(t(ox + W / 2, oy + D / 2 - 6, "Gang 96 cm", 6, fill="#555"))
    o.append(t(ox + W / 2, oy + D / 2 + 2, "(zwischen den Brettern)", 4, fill="#555"))
    o.append(mass_h(ox, ox + W, oy + D + 24, "161 cm innen", size=5.5))
    o.append(mass_v(ox + W + 14, oy, oy + D, "217 cm innen", size=5.5, side=1))
    o.append(t(ox + W + 26, oy - 2, "NORD = Tuer", 4.5, "start", "#555"))
    o.append(t(ox + W + 26, oy + D + 8, "SUED = hintere Wand", 4.5, "start", "#555"))
    o.append(rect(ox + W + 26, oy + 20, 4, 3, RAIL, RAIL, 0))
    o.append(t(ox + W + 32, oy + 22.6, "Wandschiene", 4.5, "start"))
    o.append(rect(ox + W + 26, oy + 28, 4, 3, HOLZ, "#6b4a1e", 0.4))
    o.append(t(ox + W + 32, oy + 30.6, "Brett (Aufsicht)", 4.5, "start"))
    return f'<svg viewBox="0 0 {vw} {vh}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:150mm">{"".join(o)}</svg>'


def ansicht(breite, schienen, titel):
    pad = 14
    H = 215
    vw, vh = breite + 2 * pad + 10, H + 2 * pad + 12
    ox, oy = pad + 8, pad

    def Y(z):
        return oy + 5 + (205 - z)

    o = []
    o.append(rect(ox, Y(205) - 5, breite, 215, "#f5f1e8", "#111", 0.4))
    o.append(line(ox - 4, Y(0), ox + breite + 4, Y(0), 1.2, "#111"))
    o.append(t(ox + breite / 2, Y(0) + 9, titel, 6, weight="bold"))
    for x in schienen:
        o.append(rect(ox + x - 1.3, Y(205), 2.6, 200, RAIL, RAIL, 0))
        o.append(t(ox + x, Y(205) - 3, f"{x}", 4, fill="#555"))
    for z in LEVELS:
        o.append(line(ox - 2, Y(z), ox + breite, Y(z), 0.25, "#999", "2 2"))
        o.append(t(ox - 3, Y(z) + 1.5, f"{z}", 4.5, "end"))
    for z in LEVELS:
        o.append(rect(ox, Y(z + 2.1), breite, 2.1, HOLZ, "#6b4a1e", 0.35))
        for x in schienen:
            o.append(f'<polygon points="{ox+x-1.5},{Y(z)} {ox+x+1.5},{Y(z)} {ox+x+1.5},{Y(z-9)} {ox+x-1.5},{Y(z-9)}" fill="#6b7a88" stroke="#222" stroke-width="0.25"/>')
    txt = "20 / 59 / 59 / 59 / 20" if breite == 217 else "20 / 40 / 40 / 40 / 21"
    o.append(t(ox + breite / 2, Y(205) - 11, f"Schienenabstand: {txt} cm", 4.5, fill="#333"))
    prev = 0
    yy = Y(0) + 17
    for x in list(schienen) + [breite]:
        o.append(mass_h(ox + prev, ox + x, yy, f"{x - prev}", size=4))
        prev = x
    return f'<svg viewBox="0 0 {vw} {vh + 12}" xmlns="http://www.w3.org/2000/svg" style="width:100%">{"".join(o)}</svg>'


def bild_schnitt():
    o = []
    ox, oy = 30, 10
    o.append(rect(ox - 30, oy, 30, 330, "#d6d6d6", "#111", 0.6))
    for i in range(0, 330, 12):
        o.append(line(ox - 30, oy + i + 12, ox, oy + i, 0.3, "#888"))
    o.append(t(ox - 15, oy + 350, "Wand (Beton oder Vollziegel)", 11, "start", "#333"))
    o.append(rect(ox, oy + 20, 12, 300, "#4a5560", "#111", 0.6))
    o.append(t(ox + 6, oy + 14, "Schiene", 11, "start", "#111"))
    o.append(t(ox + 22, oy + 50, "Schiene 12 mm tief, 26 mm breit", 10, "start", "#111"))
    for yy in (oy + 70, oy + 270):
        o.append(rect(ox - 28, yy - 2, 40, 4, "#888", "#111", 0.3))
    o.append(t(ox + 40, oy + 75, "Schraube 6x60 + Duebel 8x40", 10, "start", "#222"))
    by = oy + 160
    o.append(rect(ox + 12, by - 21, 350, 21, HOLZ, "#6b4a1e", 0.8))
    o.append(t(ox + 190, by - 7, "Brett Multiplex 21 mm", 12, "middle", "#4a2f08"))
    o.append(poly([(ox + 12, by), (ox + 350, by), (ox + 350, by + 6), (ox + 12, by + 6)], "#6b7a88", "#111", 0.6))
    o.append(poly([(ox + 12, by), (ox + 12, by + 110), (ox + 22, by + 110), (ox + 22, by + 6), (ox + 150, by + 6)], "#6b7a88", "#111", 0.6))
    o.append(poly([(ox + 12, by + 100), (ox + 4, by + 100), (ox + 4, by + 108), (ox + 12, by + 108)], "#6b7a88", "#111", 0.6))
    o.append(t(ox + 190, by + 30, "Doppelhaken-Traeger (Winkel)", 11, "middle", "#222"))
    o.append(t(ox + 190, by + 44, "typisch, je nach System etwas anders", 9, "middle", "#555"))
    o.append(t(ox + 30, by + 128, "Haken greifen in 2 Schlitze", 10, "start", "#222"))
    for sx in (ox + 110, ox + 300):
        o.append(poly([(sx - 2.5, by + 6), (sx + 2.5, by + 6), (sx + 2.5, by - 10), (sx - 2.5, by - 10)], "#222", "#222", 0.3))
        o.append(rect(sx - 6, by + 6, 12, 3, "#222", "#222", 0))
    o.append(t(ox + 205, by + 92, "2 Holzschrauben 4x16 von unten", 10, "middle", "#222"))
    o.append(line(ox + 205, by + 82, ox + 118, by + 11, 0.4, "#222"))
    o.append(line(ox + 205, by + 82, ox + 292, by + 11, 0.4, "#222"))
    o.append(mass_h(ox + 12, ox + 362, by - 40, "Brett 350 mm tief (35 cm)", size=11))
    o.append(mass_h(ox + 12, ox + 350, by + 150, "Traeger 350 mm", size=11))
    o.append(line(ox + 366, by - 21, ox + 380, by - 21, 0.3))
    o.append(line(ox + 366, by, ox + 380, by, 0.3))
    o.append(line(ox + 376, by - 21, ox + 376, by, 0.35))
    o.append(t(ox + 384, by - 6, "21", 11, "start"))
    return f'<svg viewBox="0 0 440 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:120mm">{"".join(o)}</svg>'


def bild_raster():
    o = []
    ox, oy = 60, 10
    o.append(rect(ox, oy, 26, 300, "#4a5560", "#111", 0.6))
    for i in range(12):
        yy = oy + 8 + i * 25
        o.append(rect(ox + 4, yy, 6, 14, "#f5f1e8", "#111", 0.3))
        o.append(rect(ox + 16, yy, 6, 14, "#f5f1e8", "#111", 0.3))
    for i in range(0, 12, 2):
        yy = oy + 8 + i * 25 + 7
        o.append(line(ox + 28, yy, ox + 70, yy, 0.8, "#c24"))
        o.append(t(ox + 74, yy + 3.5, "Brett moeglich", 9, "start", "#c24"))
    o.append(mass_v(ox - 8, oy + 8, oy + 33, "25", 9, -1))
    o.append(mass_v(ox - 36, oy + 8, oy + 58, "50 mm", 9, -1))
    o.append(t(ox - 30, oy + 322, "Schlitzabstand meist 25 mm (vor dem Kauf pruefen)", 10, "start", "#333"))
    return f'<svg viewBox="0 0 330 340" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:100mm">{"".join(o)}</svg>'


def bild_zuschnitt():
    o = []

    def brett(oy, L, T, name, ox=30):
        pts = [(ox + x, oy + y) for x, y in board_poly(L, T)]
        s = [poly(pts, HOLZ, "#6b4a1e", 0.8)]
        s.append(t(ox + L / 2, oy + T / 2 + 1.8, name, 6, "middle", "#4a2f08", weight="bold"))
        s.append(mass_h(ox, ox + L, oy - 4, f"{L} cm (lange Kante, an der Wand)", size=5.5))
        s.append(mass_h(ox + T, ox + L - T, oy + T + 8, f"{L - 2 * T} cm (vordere Kante)", size=5.5))
        s.append(mass_v(ox + L + 6, oy, oy + T, f"{T} cm", size=5.5))
        s.append(t(ox + 3, oy + T - 2, "45", 4.5, "start", "#c24"))
        s.append(t(ox + L - 3, oy + T - 2, "45", 4.5, "end", "#c24"))
        return "".join(s)

    o.append(brett(20, 217, 35, "LINKS (Ost): 217 x 35"))
    o.append(brett(88, 217, 30, "RECHTS (West): 217 x 30"))
    o.append(brett(150, 161, 35, "HINTEN (Sued): 161 x 35", ox=58))
    o.append(t(30, 205, "Schnitt: beide Enden jedes Bretts an der vorderen Ecke im 45-Grad-Winkel (Schenkel = Brettbreite).", 5, "start", "#333"))
    o.append(t(30, 213, "Die lange Kante liegt an der Wand und bleibt ganz.", 5, "start", "#333"))
    return f'<svg viewBox="0 0 290 222" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:150mm">{"".join(o)}</svg>'


CSS = """
@page { size: A4 landscape; margin: 11mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color:#111; font-size: 10.5pt; line-height: 1.32; }
.seite { page-break-after: always; min-height: 186mm; }
.seite:last-child { page-break-after: auto; }
h1 { font-size: 21pt; margin: 0 0 3mm; }
h2 { font-size: 14pt; margin: 0 0 3mm; border-bottom: 1.5px solid #111; padding-bottom: 1.5mm; }
h3 { font-size: 11.5pt; margin: 3mm 0 1mm; }
table { border-collapse: collapse; width: 100%; margin: 2mm 0; font-size: 9.6pt; }
th, td { border: 1px solid #777; padding: 1.3mm 2mm; vertical-align: top; text-align: left; }
th { background: #e6e6e6; }
.zwei { display: flex; gap: 8mm; align-items: flex-start; }
.zwei > div { flex: 1; min-width: 0; }
.warn { border: 1.5px solid #b00; background: #fff1f1; padding: 2mm 3mm; margin: 2mm 0; }
.ok { border: 1.5px solid #070; background: #f1fff1; padding: 2mm 3mm; margin: 2mm 0; }
.klein { font-size: 9pt; color: #444; }
ol, ul { margin: 1mm 0 2mm 5mm; padding-left: 4mm; }
li { margin-bottom: 1mm; }
.box { display:inline-block; width:3.5mm; height:3.5mm; border:1px solid #111; margin-right:1.5mm; vertical-align:-0.5mm; }
"""


def tabelle(kopf, zeilen):
    s = "<table><tr>" + "".join(f"<th>{html.escape(k)}</th>" for k in kopf) + "</tr>"
    for z in zeilen:
        s += "<tr>" + "".join(f"<td>{c}</td>" for c in z) + "</tr>"
    return s + "</table>"


seiten = []

seiten.append(f"""
<div class="seite">
<h1>Schienenregal Keller: Zeichnung und Bauplan</h1>
<p class="klein">Stand 15.10.2026. Maße aus dem Programm Kistly (Keller innen 161 x 217 cm, Plan 3,49 m2). Vor dem Kaufen alles im echten Keller nachmessen.</p>
<div class="zwei">
<div>
<h2>Bild 1: Draufsicht</h2>
{bild_draufsicht()}
</div>
<div>
<h2>So funktioniert es</h2>
<ul>
<li>An 3 Wänden hängen senkrechte <b>Doppelschlitz-Schienen</b>: Ost 4, West 4, hinten 4, zusammen <b>12 Schienen</b>, je 2 m lang.</li>
<li>In die Schlitze werden <b>Doppelhaken-Träger</b> eingehängt (je Brett 4).</li>
<li>Auf den Trägern liegt <b>ein Brett</b>. Pro Höhe gibt es <b>3 Bretter</b>: links, rechts, hinten. Sie bilden ein U.</li>
<li>An den zwei hinteren Ecken treffen sich die Bretter in einer <b>Gehrung von 45 Grad</b>. Es gibt keine Eckbretter.</li>
<li>Brett und Träger sind verschraubt. Du hängst sie als <b>eine Einheit</b> höher oder tiefer, in <b>5-cm-Schritten</b> (jeder zweite Schlitz).</li>
</ul>
<div class="warn"><b>Die seitlichen Bretter sind nicht ganz gleich:</b> Links (Ost) ist 35 cm tief, rechts (West) nur 30 cm, weil die Tür nach innen aufgeht und dort an der Wand liegt. Wenn du beide gleich willst, nimm 30 cm.</div>
<h3>Die wichtigsten Zahlen</h3>
{tabelle(["Teil","Maß"],[
 ["Bretter je Höhe","3 (links 217 x 35, rechts 217 x 30, hinten 161 x 35 cm)"],
 ["Holz","Multiplex Birke 21 mm, wasserfest verleimt"],
 ["Schienen","12 Stück, 2 m, verzinkt, Doppelschlitz"],
 ["Träger","12 je Höhe: 8 mit 35 cm, 4 mit 30 cm"],
 ["Gang zwischen den Brettern","96 cm"],
 ["Ziel","150 kg je Brett, 4 Träger je Brett"],
])}
</div></div></div>
""")

seiten.append(f"""
<div class="seite">
<h2>Bild 2: Wandansichten (von innen, mit Blick auf die Wand)</h2>
<div style="display:flex;gap:4mm">
<div style="flex:217">{ansicht(217, RAIL_SIDE, "OSTWAND (links) 217 cm")}</div>
<div style="flex:161">{ansicht(161, RAIL_BACK, "SUEDWAND (hinten) 161 cm")}</div>
<div style="flex:217">{ansicht(217, RAIL_SIDE, "WESTWAND (rechts) 217 cm")}</div>
</div>
<p class="klein">Dunkle Streifen: Schienen (Unterkante 5 cm über dem Boden, Länge 200 cm). Zahlen über den Schienen: Abstand der Schienenmitte von der Ecke an der Tür (Ost und West) beziehungsweise von der Westecke (hinten). Gestrichelte Linien: Höhe der Brettunterkante in cm über dem Boden, hier als Beispiel 45, 85, 125, 165. Die Höhen sind frei einstellbar. Kleine graue Streifen unter den Brettern: Träger.</p>
<p>Ost und West haben je 4 Schienen mit etwa 59 cm Abstand, die hintere Wand 4 Schienen mit 40 cm Abstand.</p>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Bild 3: Schnitt durch eine Wand (nicht maßstäblich außer den mm-Angaben)</h2>
<div class="zwei">
<div>{bild_schnitt()}</div>
<div>
<h3>Wie die Teile zusammenhalten</h3>
<ol>
<li><b>Wand zu Schiene:</b> Schraube 6 x 60 mit Dübel 8 x 40 (Beton oder Vollziegel), Bohrer 8 mm, mindestens 50 mm tief. Alle 25 bis 30 cm eine Befestigung, die erste 5 cm vom Ende.</li>
<li><b>Schiene zu Träger:</b> Die zwei Haken des Trägers hängen in zwei Schlitzen. Das Gewicht drückt den Träger nach unten fest in die Schlitze.</li>
<li><b>Träger zu Brett:</b> 2 Holzschrauben 4 x 16 mm von unten. Nicht länger, sonst kommt die Spitze oben heraus. Vorbohren mit 3 mm.</li>
<li><b>Höhe ändern:</b> Brett leer räumen, anheben, alle 4 Träger aus den Schlitzen lösen und eine Stufe höher oder tiefer wieder einhängen. Die Träger bleiben am Brett.</li>
</ol>
<h3>Bild 4: Raster der Schlitze</h3>
{bild_raster()}
</div></div>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Bild 5: Zuschnitt der drei Bretter einer Höhe (Maße in cm)</h2>
<div class="zwei">
<div>{bild_zuschnitt()}</div>
<div>
{tabelle(["Brett","Lange Kante (Wand)","Tiefe","Vordere Kante","Ecken"],[
 ["Links (Ost)","217","35","147","beide Enden 45 Grad"],
 ["Rechts (West)","217","30","157","beide Enden 45 Grad"],
 ["Hinten (Süd)","161","35","91","beide Enden 45 Grad"],
])}
<div class="ok"><b>Wie die Gehrung passt:</b> Alle Schnitte laufen auf einer 45-Grad-Linie durch die Wandecke. Dadurch treffen sich die Bretter in der Ecke ohne Lücke. Auf der Westseite ist das Seitenbrett 30 cm, das hintere 35 cm tief: dort entsteht an der vorderen Kante eine kleine Stufe von 5 cm. Das ist normal.</div>
<h3>Zuschnitt aus der Platte (2500 x 1220 mm)</h3>
<ul>
<li>Eine Höhe braucht etwa 1,95 m2 reine Fläche. Eine Platte hat rund 3,05 m2. Wegen der langen Bretter (217 cm) ergibt eine Platte <b>eine Höhe</b> plus Reststreifen. Plane <b>1 Platte je Höhe</b>.</li>
<li>Zuerst die Rechtecke <b>3 mm kürzer</b> als gemessen zuschneiden. Die Gehrungen erst vor Ort anzeichnen: Schablone aus Pappe in der Ecke, dann auf das Brett übertragen. Das gleicht schiefe Wände aus.</li>
<li>Schnitt am besten mit Tauchsäge und Führungsschiene. Schnittkante abschleifen und sofort versiegeln.</li>
</ul>
</div></div>
</div>
""")

zeilen = []
for e in (4, 6, 10):
    zeilen.append([f"<b>{e}</b>", "12", str(e * 8), str(e * 4), str(e), str(e * 24), "96", "100"])

seiten.append(f"""
<div class="seite">
<h2>Materialliste</h2>
{tabelle(["Ebenen (Bretthöhen)","Schienen 2 m","Träger 35 cm","Träger 30 cm","Platten Multiplex 21 mm","Holzschrauben 4 x 16","Dübel 8 x 40","Schrauben 6 x 60"], zeilen)}
<p class="klein">Pro Ebene: 3 Bretter, 12 Träger (8 mit 35 cm und 4 mit 30 cm), 24 Holzschrauben 4 x 16. Schienen und Wandbefestigung brauchst du nur einmal, egal wie viele Ebenen. Dübel: 12 Schienen x 8 Stück. Bei Betonschrauben statt Dübeln nur die Schrauben (6 x 60) kaufen.</p>
<div class="zwei">
<div>
<h3>Holz</h3>
<ul>
<li>Multiplex Birke, <b>21 mm</b>, <b>wasserfest verleimt (AW 100 oder WBP)</b>, Platte 2500 x 1220 mm. Hornbach Österreich führt sie, Preisstand August 2026: 177,50 € je Platte (rund 58 € je m2). Zuschnitt im Markt auf Maß.</li>
<li>Hartwachsöl oder farbloser Lack, 1 Liter, für alle Kanten und Gehrungen.</li>
<li>Sparvariante: Tischlerplatte Fichte 18 mm wasserfest. Trägt hier auch, ist aber an den Kanten empfindlicher.</li>
</ul>
<h3>Metall</h3>
<ul>
<li><b>Wandschiene</b> 2-reihig, <b>verzinkt</b> (der Keller ist feucht), 2 m. Beispiel: Dolle, 1995 mm bei Hornbach Österreich; OBI: 200 cm. Herstellerangabe: 55 kg je 200 mm Schiene.</li>
<li><b>Doppelhaken-Träger</b> desselben Systems, 35 cm und 30 cm lang. Herstellerangabe bei Hornbach etwa 110 bis 130 kg je Paar.</li>
<li>Schiene und Träger <b>vom selben Hersteller</b> kaufen. Im Markt nach dem Abstand der Schlitze und der Tragkraft bei 35 cm Tiefe fragen.</li>
</ul>
</div>
<div>
<h3>Wandbefestigung, je nach Wand</h3>
{tabelle(["Wand","Was du nimmst"],[
 ["Beton","Betonschraube 6 mm, zum Beispiel Fischer FBS II 6 x 60, oder DuoPower 8 x 40 mit Schraube 6 x 60"],
 ["Vollziegel","Fischer DuoPower 8 x 40, Bohrer 8 mm, mindestens 50 mm tief"],
 ["Lochziegel oder Hohlblock","<b>Nicht</b> mit normalen Dübeln. Dann Injektionsmörtel mit Siebhülsen, oder nur halb so schwer beladen."],
])}
<h3>Werkzeug</h3>
<ul>
<li>Schlagbohrmaschine mit 8-mm-Betonbohrer, Staubsauger zum Ausblasen der Löcher.</li>
<li>Wasserwaage 1 m, Laser oder Lehrlatte, Zollstock, Bleistift, Malerkrepp.</li>
<li>Tauchsäge mit Führungsschiene (oder Zuschnitt im Markt), Schleifpapier 120 und 180.</li>
<li>Akkuschrauber, Holzbohrer 3 mm, Leitungssucher.</li>
<li>Hygrometer (Luftfeuchte im Keller).</li>
</ul>
</div></div>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Bauanleitung Schritt für Schritt (1 von 2)</h2>
<ol>
<li><b>Nachmessen (1 Stunde).</b> Keller innen: Breite, Tiefe, Höhe, Tür. Mit der Wasserwaage prüfen, ob Wände lotrecht und Ecken rechtwinklig sind. Abweichungen notieren. Schick mir die Maße, dann passe ich sie im Programm an.</li>
<li><b>Wand prüfen.</b> Mit dem 8-mm-Bohrer an unauffälliger Stelle bohren. Rotes Mehl, mittlerer Widerstand = Ziegel. Graues Mehl, hart = Beton. Plötzlich hohl = Lochziegel (dann die Warnung beachten). Mit Leitungssucher prüfen, ob Strom oder Wasser in der Wand liegt. Vermieter oder Hausverwaltung fragen, ob gebohrt werden darf.</li>
<li><b>Einkaufen und zuschneiden lassen.</b> Materialliste. Platten auf Rechtecke schneiden lassen, 3 mm kürzer. Gehrungen später.</li>
<li><b>Schienen anzeichnen.</b> Alle Schienen sitzen mit der Unterkante 5 cm über dem Boden. Zeichne an jeder Wand die Schienenmitten an (Bild 2). Mit einer Lehrlatte (Latte mit Markierungen) den Bodenabstand für alle gleich halten. <b>Wichtig:</b> Alle Schlitze müssen an allen Wänden auf gleicher Höhe liegen, sonst hängen die Bretter schief.</li>
<li><b>Bohren und Dübel setzen.</b> Eine Schiene an die Wand halten, mit Wasserwaage lotrecht ausrichten, durch die Löcher der Schiene die Bohrlöcher anzeichnen (alle 25 bis 30 cm, erste und letzte 5 cm vom Ende). 8 mm bohren, mindestens 50 mm tief, Loch ausblasen, Dübel einsetzen.</li>
<li><b>Schienen anschrauben.</b> Schrauben 6 x 60. Oberste und unterste zuerst leicht anziehen, nochmal lotrecht prüfen, dann alle fest. Die Schiene nicht verspannen.</li>
</ol>
<div class="warn"><b>Belastungstest, bevor du viel auflegst:</b> Hänge ein einzelnes Brett mit Trägern ein. Lege schrittweise 50, 100, 150 kg auf (Wasserflaschen, Säcke), je 10 Minuten warten. Achte auf Risse im Putz, Bewegung der Schienen und Knarzen. Nach 24 Stunden nochmal prüfen. Erst danach weitere Bretter einbauen.</div>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Bauanleitung Schritt für Schritt (2 von 2)</h2>
<ol start="7">
<li><b>Bretter vorbereiten.</b> Kanten ringsum leicht brechen und schleifen. Rechtecke in die Ecken halten: Gehrung mit Schablone aus Pappe anzeichnen. Zuschneiden, bis die Bretter in der Ecke ohne Lücke aufeinander treffen.</li>
<li><b>Versiegeln.</b> Alle Kanten und die Gehrungen zweimal mit Hartwachsöl oder Lack streichen. Bei über 65 Prozent Luftfeuchte im Keller auch die Unterseite. Zwischen Brett und Wand bleibt 1 cm Luft.</li>
<li><b>Träger am Brett befestigen.</b> Brett umdrehen. 4 Träger im Abstand der Schienen auflegen (Maße Bild 2), mit 3-mm-Bohrer vorbohren, mit je 2 Schrauben 4 x 16 festschrauben. Die Haken zeigen zur Wand.</li>
<li><b>Einhängen.</b> Zu zweit: Brett mit Trägern in die Schlitze einhängen, von unten nach oben. Alle 4 Träger auf derselben Schlitzhöhe. Tipp: Schlitze mit Malerkrepp nummerieren und jede Höhe notieren.</li>
<li><b>Gehrung prüfen.</b> In der Ecke darf die Lücke höchstens 1 mm sein. Bei Bedarf nachschleifen.</li>
<li><b>Höhe ändern, später.</b> Brett leer räumen, alle 4 Träger aus den Schlitzen heben, eine Stufe höher oder tiefer einhängen. Das Brett wiegt leer etwa 10 kg. Du kannst ein Brett auch ganz herausnehmen und flach lagern oder ganz unten auf den Boden legen.</li>
<li><b>Beladen.</b> Schwere Kisten nach unten und nahe an die Wand. Gleichmäßig verteilen. Nicht mehr als 150 kg je Brett.</li>
<li><b>Im Programm eintragen.</b> Im Zeichner die Böden auf die echten Höhen stellen, damit die Kisten im Plan stimmen.</li>
</ol>
<h3>Zeit</h3>
<p>Etwa 1,5 Tage im Keller, wenn der Zuschnitt fertig ist: Messen und Wand prüfen 1 Stunde, Schienen setzen halber Tag, Test 1 Stunde plus Beobachtung, Bretter fertigen halber Tag, Einhängen 1 Stunde je Höhe.</p>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Tragfähigkeit und Sicherheit</h2>
<div class="zwei">
<div>
<h3>Rechnung für 150 kg je Brett</h3>
{tabelle(["Frage","Ergebnis"],[
 ["Last je Träger bei 4 Trägern","150 : 4 = 37,5 kg, etwa 68 Prozent von 55 kg"],
 ["Mit nur 3 Trägern","50 kg, also 91 Prozent: zu knapp. Darum auch hinten 4 Schienen."],
 ["Biegung des Bretts 21 mm bei 59 cm Abstand","unter 0,5 mm und unter 1,5 MPa. Das Holz ist nicht die Schwachstelle."],
 ["10 Bretter je 100 kg auf einer Wand (1 Tonne)","250 kg je Schiene, etwa 30 kg je Dübel in der Scherung"],
 ["Kippmoment durch die 35 cm Tiefe","etwa 17 kg Zug je Dübel"],
])}
<p>Beides liegt unter den Herstellerwerten für Beton (etwa 1,1 kN je Dübel) und im knappen bis sicheren Bereich bei Vollziegel (etwa 0,6 kN). <b>Die Schwachstelle ist die Wand, nicht die Schiene.</b> Darum der Belastungstest.</p>
</div>
<div>
<div class="warn">
<b>Wichtig:</b>
<ul>
<li>Die Tragfähigkeit von Schienen und Trägern stammt aus Händlerangaben, nicht aus eigener Prüfung. Das Datenblatt des gekauften Systems gilt.</li>
<li>In Lochziegel oder Hohlblock halten normale Dübel nur einen Bruchteil.</li>
<li>Nie unter schwer beladenen Brettern arbeiten, bevor der Test gemacht ist.</li>
<li>Vor dem Bohren Leitungen suchen.</li>
<li>Bei Zweifel: Ein Fachmann (Bauhandwerker) schaut sich die Wand an.</li>
</ul></div>
<h3>Checkliste vor dem Beladen</h3>
<ul style="list-style:none;padding-left:0">
<li><span class="box"></span>Wandmaterial geprüft, passende Dübel gekauft</li>
<li><span class="box"></span>Alle 12 Schienen lotrecht und auf gleicher Höhe</li>
<li><span class="box"></span>Alle Schrauben fest, alle Löcher genutzt</li>
<li><span class="box"></span>Belastungstest mit 150 kg bestanden, 24 Stunden beobachtet</li>
<li><span class="box"></span>Kanten und Gehrungen versiegelt</li>
<li><span class="box"></span>Träger sitzen in allen Schlitzen, Brett liegt eben</li>
<li><span class="box"></span>Höhen im Programm Kistly eingetragen</li>
</ul>
</div></div>
</div>
""")

doc = f"<!doctype html><html lang='de'><head><meta charset='utf-8'><title>Schienenregal Keller</title><style>{CSS}</style></head><body>{''.join(seiten)}</body></html>"
open(ziel, "w", encoding="utf-8").write(doc)
print("ok", len(doc))
