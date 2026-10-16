# Erzeugt SCHIENENREGAL-BAUPLAN.html (Zeichnungen als SVG). PDF danach mit Chrome:
#   chrome --headless=new --no-pdf-header-footer --print-to-pdf=SCHIENENREGAL-BAUPLAN.pdf SCHIENENREGAL-BAUPLAN.html
# Stand E97: nur die zwei Seitenwaende, gerade Enden, 5 Schienen je Wand.
import sys, html
ziel = sys.argv[1]

W, D = 161, 217            # Keller innen: Breite (x) und Tiefe (y), cm
T_L, T_R = 35, 30          # Brett links (Ost) und rechts (West), Tiefe cm
BRETT_L = 216              # Brettlaenge: 5 mm Luft an jedem Ende
N = 5                      # Schienen je Wand
RAND = 10                  # Schienenmitte ab Wand, cm
SCH = [RAND + (D - 2 * RAND) * i / (N - 1) for i in range(N)]   # 10, 59.25, 108.5, 157.75, 207
ABST = (D - 2 * RAND) / (N - 1)
LEVELS = [45, 85, 125, 165]
FONT = "font-family:Arial,Helvetica,sans-serif"
HOLZ = "#e9cfa3"
RAIL = "#3b4650"
STAHL = "#6b7a88"


def z(v):
    return f"{v:.2f}".rstrip("0").rstrip(".").replace(".", ",")


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


def circ(x, y, r, fill="#fff", stroke="#111", sw=0.4):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def mass_h(x1, x2, y, text, size=5, tick=2, lw=0.35):
    s = [line(x1, y, x2, y, lw), line(x1, y - tick, x1, y + tick, lw), line(x2, y - tick, x2, y + tick, lw)]
    s.append(t((x1 + x2) / 2, y - tick * 0.9, text, size))
    return "".join(s)


def mass_v(x, y1, y2, text, size=5, side=1, tick=2, lw=0.35):
    s = [line(x, y1, x, y2, lw), line(x - tick, y1, x + tick, y1, lw), line(x - tick, y2, x + tick, y2, lw)]
    s.append(t(x + side * tick * 1.3, (y1 + y2) / 2 + size * 0.35, text, size, "start" if side > 0 else "end"))
    return "".join(s)


def svg(vw, vh, inner, maxh="150mm"):
    return f'<svg viewBox="0 0 {vw} {vh}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:{maxh}">{inner}</svg>'


# ------------------------------------------------ Bild 1: Draufsicht
def bild_draufsicht():
    pad = 22
    vw, vh = W + 2 * pad + 85, D + 2 * pad + 34
    o = []
    ox, oy = pad + 14, pad + 14
    o.append(rect(ox - 8, oy - 8, W + 16, D + 16, "#c9c9c9", "none", 0))
    o.append(rect(ox, oy, W, D, "#f5f1e8", "#111", 0.5))
    o.append(rect(ox + 35, oy - 8, 80, 8, "#f5f1e8", "none", 0))
    o.append(f'<path d="M {ox+35} {oy+80} A 80 80 0 0 1 {ox+115} {oy}" fill="none" stroke="#c24" stroke-width="0.5" stroke-dasharray="3 2"/>')
    o.append(line(ox + 35, oy, ox + 35, oy + 80, 1.6, "#c24"))
    o.append(t(ox + 75, oy - 11, "Tuer 80 cm (Angel links, offen nach innen)", 4.5, fill="#c24"))
    # Bretter: 5 mm Luft an beiden Enden
    o.append(rect(ox + W - T_L, oy + 0.5, T_L, BRETT_L, HOLZ, "#6b4a1e", 0.6))
    o.append(rect(ox, oy + 0.5, T_R, BRETT_L, HOLZ, "#6b4a1e", 0.6))
    for y in SCH:
        o.append(rect(ox + W - 3, oy + y - 1.3, 3, 2.6, RAIL, RAIL, 0))
        o.append(rect(ox, oy + y - 1.3, 3, 2.6, RAIL, RAIL, 0))
    o.append(t(ox + W - T_L / 2 + 1.5, oy + D / 2, "LINKS (Ost) 216 x 35", 4.5, rot=90))
    o.append(t(ox + T_R / 2 + 1.5, oy + D / 2, "RECHTS (West) 216 x 30", 4.5, rot=-90))
    o.append(t(ox + W / 2, oy + D / 2 - 6, "Gang 96 cm", 6, fill="#555"))
    o.append(t(ox + W / 2, oy + D - 12, "hintere Wand frei", 5, fill="#555"))
    o.append(t(ox + W / 2, oy + D - 5, "(Ecken frei)", 4, fill="#777"))
    o.append(mass_h(ox, ox + W, oy + D + 24, "161 cm innen", size=5.5))
    o.append(mass_v(ox + W + 14, oy, oy + D, "217 cm innen", size=5.5))
    o.append(t(ox + W + 26, oy - 2, "NORD = Tuer", 4.5, "start", "#555"))
    o.append(t(ox + W + 26, oy + D + 8, "SUED", 4.5, "start", "#555"))
    o.append(rect(ox + W + 26, oy + 20, 4, 3, RAIL, RAIL, 0))
    o.append(t(ox + W + 32, oy + 22.6, "Wandschiene (5 je Wand)", 4.5, "start"))
    o.append(rect(ox + W + 26, oy + 28, 4, 3, HOLZ, "#6b4a1e", 0.4))
    o.append(t(ox + W + 32, oy + 30.6, "Brett (Aufsicht)", 4.5, "start"))
    return svg(vw, vh, "".join(o))


# ------------------------------------------------ Bild 2: Wandansicht
def ansicht(titel, tiefe):
    breite = D
    pad = 14
    vw, vh = breite + 2 * pad + 14, 205 + 2 * pad + 32
    ox, oy = pad + 10, pad + 8

    def Y(zz):
        return oy + 5 + (205 - zz)

    o = []
    o.append(rect(ox, Y(205) - 5, breite, 210, "#f5f1e8", "#111", 0.4))
    o.append(line(ox - 4, Y(0), ox + breite + 4, Y(0), 1.2, "#111"))
    o.append(t(ox + breite / 2, Y(0) + 9, f"{titel}  (Brett {BRETT_L} x {tiefe} cm)", 6, weight="bold"))
    for x in SCH:
        o.append(rect(ox + x - 1.3, Y(205), 2.6, 200, RAIL, RAIL, 0))
    for zz in LEVELS:
        o.append(line(ox - 2, Y(zz), ox + breite, Y(zz), 0.25, "#999", "2 2"))
        o.append(t(ox - 3, Y(zz) + 1.5, f"{zz}", 4.5, "end"))
        o.append(rect(ox + 0.5, Y(zz + 2.1), BRETT_L, 2.1, HOLZ, "#6b4a1e", 0.35))
        for x in SCH:
            o.append(rect(ox + x - 1.5, Y(zz), 3, 9, STAHL, "#222", 0.25))
    o.append(t(ox - 3, Y(205) + 2, "205", 4, "end", "#777"))
    o.append(t(ox - 3, Y(5) + 1.5, "5", 4, "end", "#777"))
    prev = 0
    yy = Y(0) + 18
    for x in SCH + [breite]:
        o.append(mass_h(ox + prev, ox + x, yy, z(x - prev), size=4))
        prev = x
    o.append(t(ox + breite / 2, Y(0) + 26, "Abstand der Schienenmitten in cm, von der Tuerwand aus", 4, fill="#555"))
    return svg(vw, vh, "".join(o), "100%")


# ------------------------------------------------ Einzelteile
def teil_brett(L, T, name, menge):
    # Draufsicht von oben (Wand oben), Vorderansicht (Dicke), Bohrbild
    sx = 1.0
    pad = 16
    vw, vh = L + 2 * pad + 30, T + 70
    ox, oy = pad + 6, 16
    o = []
    o.append(rect(ox, oy, L, T, HOLZ, "#6b4a1e", 0.6))
    o.append(line(ox, oy, ox + L, oy, 1.4, "#555"))
    o.append(t(ox + L / 2, oy - 3, "Wandseite", 4, fill="#555"))
    o.append(t(ox + L / 2, oy + T / 2 + 1.5, name, 6, weight="bold", fill="#4a2f08"))
    # Traeger-Lage und Schraubloecher (2 je Traeger)
    for x in SCH:
        bx = x - 0.5
        o.append(line(ox + bx, oy, ox + bx, oy + T - 2, 0.3, "#888", "1.5 1.5"))
        for d in (8, T - 7):
            o.append(circ(ox + bx, oy + d, 0.9, "#fff", "#c24", 0.35))
    o.append(mass_h(ox, ox + L, oy + T + 10, f"{L} cm", size=5))
    o.append(mass_v(ox + L + 6, oy, oy + T, f"{T} cm", size=5))
    prev = 0
    for x in [s - 0.5 for s in SCH]:
        o.append(mass_h(ox + prev, ox + x, oy + T + 20, z(x - prev), size=3.6, tick=1.4))
        prev = x
    o.append(t(ox, oy + T + 32, f"Menge je Ebene: {menge}. Rote Kreise: Schraubloecher fuer die Traeger (2 je Traeger, 8 cm von der Wandkante und 7 cm von vorn), vorbohren 3 mm.", 4, "start", "#333"))
    # Dicke
    o.append(rect(ox, oy + T + 40, 60, 2.1 * 3, HOLZ, "#6b4a1e", 0.5))
    o.append(t(ox + 66, oy + T + 45, "Dicke 21 mm (hier 3-fach gross gezeichnet), Kanten leicht gebrochen", 4, "start", "#333"))
    return svg(vw, vh, "".join(o), "62mm")


def teil_schiene():
    # Massstab mm: Gesamtansicht 2000 mm (verkleinert) und Ausschnitt 1:1
    o = []
    # Uebersicht: 2000 mm als 200 Einheiten
    ox, oy = 62, 18
    o.append(rect(ox, oy, 4, 200, RAIL, RAIL, 0.0))
    for i in range(8):
        yy = oy + 6 + i * 26.5
        o.append(circ(ox + 2, yy, 0.9, "#fff", "#fff", 0))
    o.append(mass_v(ox - 6, oy, oy + 200, "2000 mm", 11.0, -1))
    o.append(t(ox + 2, oy + 210, "Schiene ganz", 9.9))
    o.append(t(ox + 8, oy + 30, "Befestigungsloecher", 8.4, "start", "#555"))
    o.append(t(ox + 8, oy + 41, "etwa alle 25 bis 30 cm", 8.4, "start", "#555"))
    # Ausschnitt vergroessert: 26 x 120 mm, Schlitze 2-reihig
    k = 1.0
    ax, ay = 175, 30
    o.append(rect(ax, ay, 26 * k, 150 * k, RAIL, "#111", 1.1))
    for i in range(6):
        yy = ay + 6 + i * 25 * k
        o.append(rect(ax + 4 * k, yy, 6 * k, 14 * k, "#f5f1e8", "#111", 0.7))
        o.append(rect(ax + 16 * k, yy, 6 * k, 14 * k, "#f5f1e8", "#111", 0.7))
    o.append(mass_h(ax, ax + 26 * k, ay - 4, "26 mm", 9.9))
    o.append(mass_v(ax + 34 * k, ay + 6, ay + 31, "25 mm Schlitzabstand", 9.2, 1))
    o.append(t(ax + 13, ay + 162, "Ausschnitt vergroessert", 9.9))
    # Querschnitt
    qx, qy = 340, 60
    o.append(poly([(qx, qy), (qx + 26, qy), (qx + 26, qy + 12), (qx + 22, qy + 12), (qx + 22, qy + 2), (qx + 4, qy + 2), (qx + 4, qy + 12), (qx, qy + 12)], RAIL, "#111", 0.4))
    o.append(rect(qx - 4, qy - 8, 34, 8, "#d6d6d6", "#111", 0.7))
    o.append(t(qx + 13, qy - 11, "Wand", 8.8, fill="#555"))
    o.append(mass_h(qx, qx + 26, qy + 22, "26", 8.8))
    o.append(mass_v(qx + 32, qy, qy + 12, "12 mm tief", 8.8, 1))
    o.append(t(qx + 13, qy + 34, "Querschnitt (typisch)", 9.9))
    return svg(430, 270, "".join(o), "85mm")


def teil_traeger(L, menge_text):
    # Seitenansicht in mm (L = Armlaenge in mm)
    o = []
    ox, oy = 60, 24
    h = 120
    o.append(poly([(ox, oy), (ox + 8, oy), (ox + 8, oy + h - 20), (ox + L * 0.35, oy + 8), (ox + L, oy + 8), (ox + L, oy), (ox + 8, oy)], STAHL, "#111", 0.5))
    o.append(poly([(ox, oy), (ox + 8, oy), (ox + 8, oy + h), (ox, oy + h)], STAHL, "#111", 0.5))
    for hy in (oy + 10, oy + 35):
        o.append(poly([(ox, hy), (ox - 6, hy + 2), (ox - 6, hy + 10), (ox, hy + 10)], STAHL, "#111", 0.4))
    for sx in (80, L - 70):
        o.append(circ(ox + sx, oy + 4, 1.8, "#fff", "#c24", 0.4))
    o.append(mass_h(ox, ox + L, oy - 6, f"{L} mm", 13.2))
    o.append(mass_v(ox - 12, oy, oy + h, f"{h} mm", 11.0, -1))
    o.append(t(ox + L / 2, oy + 28, "Arm, oben liegt das Brett", 11.0, fill="#333"))
    o.append(t(ox + 10, oy + h + 12, "Doppelhaken greifen in die Schiene (typisch, je nach System)", 9.9, "start", "#333"))
    o.append(t(ox + L * 0.55, oy + 46, menge_text, 11.0, weight="bold"))
    return svg(L + 90, h + 56, "".join(o), "55mm")


def teil_klein():
    o = []
    # Duebel 8x40
    o.append(rect(10, 20, 40, 8, "#d0d0d0", "#111", 0.4))
    o.append(t(30, 40, "Duebel 8 x 40", 5))
    # Schraube 6x60
    o.append(rect(70, 22, 60, 4, "#888", "#111", 0.4))
    o.append(rect(66, 19, 4, 10, "#888", "#111", 0.4))
    o.append(t(98, 40, "Schraube 6 x 60", 5))
    # Holzschraube 4x16
    o.append(rect(160, 23, 16, 2.6, "#888", "#111", 0.4))
    o.append(rect(157, 20.5, 3, 7.6, "#888", "#111", 0.4))
    o.append(t(168, 40, "Holzschraube 4 x 16", 5))
    return svg(200, 48, "".join(o), "22mm")


def bild_schnitt():
    o = []
    ox, oy = 30, 10
    o.append(rect(ox - 30, oy, 30, 330, "#d6d6d6", "#111", 0.6))
    for i in range(0, 330, 12):
        o.append(line(ox - 30, oy + i + 12, ox, oy + i, 0.3, "#888"))
    o.append(t(ox - 25, oy + 350, "Wand (Beton oder Vollziegel)", 11, "start", "#333"))
    o.append(rect(ox, oy + 20, 12, 300, "#4a5560", "#111", 0.6))
    o.append(t(ox + 22, oy + 50, "Schiene 12 mm tief, 26 mm breit", 10, "start", "#111"))
    for yy in (oy + 70, oy + 270):
        o.append(rect(ox - 28, yy - 2, 40, 4, "#888", "#111", 0.3))
    o.append(t(ox + 40, oy + 75, "Schraube 6x60 + Duebel 8x40", 10, "start", "#222"))
    by = oy + 160
    o.append(rect(ox + 12, by - 21, 350, 21, HOLZ, "#6b4a1e", 0.8))
    o.append(t(ox + 190, by - 7, "Brett Multiplex 21 mm", 12, "middle", "#4a2f08"))
    o.append(poly([(ox + 12, by), (ox + 350, by), (ox + 350, by + 6), (ox + 12, by + 6)], STAHL, "#111", 0.6))
    o.append(poly([(ox + 12, by), (ox + 12, by + 110), (ox + 22, by + 110), (ox + 22, by + 6), (ox + 150, by + 6)], STAHL, "#111", 0.6))
    o.append(t(ox + 190, by + 30, "Doppelhaken-Traeger", 11, "middle", "#222"))
    for sx in (ox + 90, ox + 300):
        o.append(rect(sx - 2.5, by - 10, 5, 16, "#222", "#222", 0))
        o.append(rect(sx - 6, by + 6, 12, 3, "#222", "#222", 0))
    o.append(t(ox + 205, by + 92, "2 Holzschrauben 4x16 von unten", 10, "middle", "#222"))
    o.append(mass_h(ox + 12, ox + 362, by - 40, "Brett 350 mm tief (links), 300 mm (rechts)", size=11, tick=5))
    o.append(line(ox + 366, by - 21, ox + 380, by - 21, 0.3))
    o.append(line(ox + 366, by, ox + 380, by, 0.3))
    o.append(line(ox + 376, by - 21, ox + 376, by, 0.35))
    o.append(t(ox + 384, by - 6, "21", 11, "start"))
    return svg(440, 400, "".join(o), "110mm")


CSS = """
@page { size: A4 landscape; margin: 11mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color:#111; font-size: 10.5pt; line-height: 1.32; }
.seite { page-break-after: always; }
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
.teil { border: 1px solid #999; border-radius: 2mm; padding: 2mm 3mm; margin-bottom: 3mm; }
.teil h3 { margin-top: 0; }
ol, ul { margin: 1mm 0 2mm 5mm; padding-left: 4mm; }
li { margin-bottom: 1mm; }
.box { display:inline-block; width:3.5mm; height:3.5mm; border:1px solid #111; margin-right:1.5mm; vertical-align:-0.5mm; }
"""


def tabelle(kopf, zeilen):
    s = "<table><tr>" + "".join(f"<th>{html.escape(k)}</th>" for k in kopf) + "</tr>"
    for zl in zeilen:
        s += "<tr>" + "".join(f"<td>{c}</td>" for c in zl) + "</tr>"
    return s + "</table>"


seiten = []
abst = z(ABST)

seiten.append(f"""
<div class="seite">
<h1>Schienenregal Keller: Zeichnung und Bauplan</h1>
<p class="klein">Stand 16.10.2026. Maße aus dem Programm Kistly (Keller innen 161 x 217 cm). Vor dem Kaufen im echten Keller nachmessen.</p>
<div class="zwei">
<div>
<h2>Bild 1: Draufsicht</h2>
{bild_draufsicht()}
</div>
<div>
<h2>So ist es aufgebaut</h2>
<ul>
<li>Regale nur an den <b>zwei Seitenwänden</b>, links und rechts. Die hintere Wand bleibt frei, die Ecken auch.</li>
<li>Gerade Bretter mit <b>90-Grad-Enden</b>, keine Schrägen, keine Eckbretter.</li>
<li>Je Wand <b>5 Schienen</b> in gleichem Abstand ({abst} cm), 10 cm von beiden Wandenden. Zusammen <b>10 Schienen</b>, je 2 m.</li>
<li>Pro Ebene <b>2 Bretter</b>: links 216 x 35 cm, rechts 216 x 30 cm (rechts schmaler, weil die offene Tür dort liegt). 5 mm Luft an jedem Ende.</li>
<li>Jedes Brett liegt auf <b>5 Trägern</b>. Brett und Träger bleiben verschraubt und werden zusammen in 5-cm-Schritten umgehängt.</li>
</ul>
<h3>Die wichtigsten Zahlen</h3>
{tabelle(["Teil","Maß"],[
 ["Brett links","216 x 35 cm, 21 mm Multiplex Birke, wasserfest"],
 ["Brett rechts","216 x 30 cm, 21 mm Multiplex Birke, wasserfest"],
 ["Schienen","10 Stück (5 je Wand), 2 m, verzinkt, Doppelschlitz"],
 ["Träger je Ebene","5 mit 35 cm (links), 5 mit 30 cm (rechts)"],
 ["Gang","96 cm"],
 ["Ziel","rund 1 Tonne je Wand, etwa 180 kg je Brett"],
])}
</div></div></div>
""")

seiten.append(f"""
<div class="seite">
<h2>Bild 2: Wandansichten (von innen, mit Blick auf die Wand)</h2>
<div class="zwei">
<div>{ansicht("LINKE WAND (Ost)", T_L)}</div>
<div>{ansicht("RECHTE WAND (West)", T_R)}</div>
</div>
<p class="klein">Dunkle Streifen: Schienen, Unterkante 5 cm über dem Boden, Oberkante 205 cm. Abstände der Schienenmitten von der Türwand: 10 / {abst} / {abst} / {abst} / {abst} / 10 cm. Gestrichelt: Beispielhöhen der Bretter (Unterkante) 45, 85, 125, 165 cm. Frei einstellbar in 5-cm-Schritten. Graue Stücke unter den Brettern: Träger.</p>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Einzelteile 1: die Bretter</h2>
<div class="teil"><h3>Teil A: Brett links (Ost), 216 x 35 x 2,1 cm</h3>{teil_brett(BRETT_L, T_L, "Teil A: Brett links 216 x 35", "1 Stück")}</div>
<div class="teil"><h3>Teil B: Brett rechts (West), 216 x 30 x 2,1 cm</h3>{teil_brett(BRETT_L, T_R, "Teil B: Brett rechts 216 x 30", "1 Stück")}</div>
<p class="klein">Material: Multiplex Birke 21 mm, wasserfest verleimt (AW 100 oder WBP). Ecken rechtwinklig, Kanten leicht brechen (Schleifpapier 120), alle Kanten zweimal mit Hartwachsöl oder Lack versiegeln. Maße der Löcher gelten ab dem Brettende an der Türseite.</p>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Einzelteile 2: Schiene, Träger, Befestigung</h2>
<div class="zwei">
<div>
<div class="teil"><h3>Teil C: Wandschiene 2-reihig, verzinkt, 2000 mm</h3>{teil_schiene()}
<p class="klein">10 Stück. Herstellerangabe: 55 kg je 200 mm Schiene. Schlitzabstand meist 25 mm, vor dem Kauf prüfen.</p></div>
<div class="teil"><h3>Teil F: Kleinteile</h3>{teil_klein()}
<p class="klein">Dübel und Schraube: Wand zu Schiene. Holzschraube: Träger zu Brett, 2 je Träger.</p></div>
</div>
<div>
<div class="teil"><h3>Teil D: Träger 350 mm (für Brett links)</h3>{teil_traeger(350, "5 je Ebene")}</div>
<div class="teil"><h3>Teil E: Träger 300 mm (für Brett rechts)</h3>{teil_traeger(300, "5 je Ebene")}</div>
<p class="klein">Doppelhaken-Träger vom selben Hersteller wie die Schiene. Herstellerangabe bei Hornbach etwa 110 bis 130 kg je Paar. Rote Kreise: Löcher für die Holzschrauben.</p>
</div></div>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Bild 3: Schnitt durch eine Wand (Zusammenbau)</h2>
<div class="zwei">
<div>{bild_schnitt()}</div>
<div>
<h3>Wie die Teile zusammenhalten</h3>
<ol>
<li><b>Wand zu Schiene (C):</b> Schraube 6 x 60 mit Dübel 8 x 40, Bohrer 8 mm, mindestens 50 mm tief. Alle 25 bis 30 cm, die erste 5 cm vom Ende. 8 je Schiene.</li>
<li><b>Schiene zu Träger (D, E):</b> Die zwei Haken hängen in zwei Schlitzen. Das Gewicht drückt den Träger fest nach unten.</li>
<li><b>Träger zu Brett (A, B):</b> 2 Holzschrauben 4 x 16 von unten, vorgebohrt 3 mm. Nicht länger als 16 mm, das Brett ist 21 mm dick.</li>
<li><b>Höhe ändern:</b> Brett leer räumen, anheben, alle 5 Träger aus den Schlitzen lösen, jeden zweiten Schlitz weiter wieder einhängen (5 cm). Zu zweit leichter.</li>
</ol>
<div class="ok"><b>Gleich hohe Schlitze:</b> Alle 5 Schienen einer Wand müssen genau gleich hoch sitzen, sonst hängt das Brett schief. Unterkante aller Schienen 5 cm über dem Boden, mit Lehrlatte und Wasserwaage.</div>
</div></div>
</div>
""")

zeilen = []
for e, platten in ((4, 3), (6, 4), (8, 5)):
    zeilen.append([f"<b>{e}</b>", "10", str(e * 5), str(e * 5), str(platten), str(e * 20), "80", "80"])

seiten.append(f"""
<div class="seite">
<h2>Materialliste</h2>
{tabelle(["Ebenen","Schienen 2 m (C)","Träger 350 mm (D)","Träger 300 mm (E)","Platten Multiplex 21 mm 2500 x 1220","Holzschrauben 4 x 16","Dübel 8 x 40","Schrauben 6 x 60"], zeilen)}
<p class="klein">Pro Ebene: Brett A + Brett B, 10 Träger, 20 Holzschrauben. Schienen und Wandbefestigung nur einmal. Aus einer Platte (122 cm breit) bekommst du drei Streifen: 35 + 35 + 30 cm oder vier Streifen à 30 cm, jeweils 216 cm lang. Darum 3 Platten für 4 Ebenen. Kauf ein paar Schrauben und Dübel als Reserve.</p>
<div class="zwei">
<div>
<h3>Holz</h3>
<ul>
<li>Multiplex Birke 21 mm, wasserfest verleimt (AW 100 oder WBP). Hornbach Österreich, Preisstand August 2026: 177,50 € je Platte. Zuschnitt im Markt auf 216 x 35 und 216 x 30 cm.</li>
<li>Hartwachsöl oder farbloser Lack, 1 Liter.</li>
</ul>
<h3>Metall</h3>
<ul>
<li>Wandschiene 2-reihig <b>verzinkt</b>, 2 m (Dolle bei Hornbach 1995 mm, OBI 200 cm).</li>
<li>Doppelhaken-Träger 350 und 300 mm, derselbe Hersteller.</li>
</ul>
</div>
<div>
<h3>Wandbefestigung, je nach Wand</h3>
{tabelle(["Wand","Was du nimmst"],[
 ["Beton","Betonschraube 6 mm (zum Beispiel Fischer FBS II 6 x 60) oder DuoPower 8 x 40 mit Schraube 6 x 60"],
 ["Vollziegel","Fischer DuoPower 8 x 40, Bohrer 8 mm, mindestens 50 mm tief"],
 ["Lochziegel oder Hohlblock","<b>Nicht</b> mit normalen Dübeln: Injektionsmörtel mit Siebhülsen, oder nur halb so schwer beladen"],
])}
<h3>Werkzeug</h3>
<ul>
<li>Schlagbohrmaschine, Betonbohrer 8 mm, Holzbohrer 3 mm, Akkuschrauber.</li>
<li>Wasserwaage, Laser oder Lehrlatte, Zollstock, Malerkrepp, Leitungssucher.</li>
<li>Schleifpapier 120 und 180, Pinsel, Hygrometer.</li>
</ul>
</div></div>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Bauanleitung Schritt für Schritt</h2>
<div class="zwei">
<div>
<ol>
<li><b>Nachmessen.</b> Keller innen: Wandlänge links und rechts, Höhe, Tür. Weicht etwas ab, Brettlänge = Wandlänge minus 1 cm.</li>
<li><b>Wand prüfen.</b> Probebohrung 8 mm an unauffälliger Stelle: rotes Mehl = Ziegel, graues hartes = Beton, plötzlich hohl = Lochziegel. Mit Leitungssucher Leitungen suchen. Vermieter oder Hausverwaltung fragen, ob gebohrt werden darf.</li>
<li><b>Einkaufen und zuschneiden lassen.</b> Materialliste. Bretter im Markt auf 216 x 35 und 216 x 30 cm.</li>
<li><b>Schienen anzeichnen.</b> An jeder Seitenwand 5 senkrechte Linien bei 10, {abst}, {z(10 + 2 * ABST)}, {z(10 + 3 * ABST)} und 207 cm von der Türwand. Unterkante 5 cm über dem Boden.</li>
<li><b>Bohren und Schienen setzen.</b> Schiene lotrecht halten, Löcher anzeichnen, bohren, ausblasen, Dübel rein, Schiene mit 6 x 60 festschrauben. Oben und unten zuerst, nochmal lotrecht prüfen, dann alle.</li>
<li><b>Bretter vorbereiten.</b> Kanten schleifen und zweimal versiegeln, trocknen lassen.</li>
</ol>
</div>
<div>
<ol start="7">
<li><b>Träger anschrauben.</b> Brett umdrehen, 5 Träger an die Lochpositionen aus Teil A oder B legen, Haken zur Wandseite. 3 mm vorbohren, je 2 Holzschrauben 4 x 16.</li>
<li><b>Belastungstest.</b> Ein Brett einhängen, schrittweise 50, 100, 180 kg auflegen (Wasserflaschen, Säcke), je 10 Minuten. Auf Risse, Bewegung, Knarzen achten, nach 24 Stunden nochmal prüfen.</li>
<li><b>Alle Bretter einhängen.</b> Von unten nach oben, zu zweit, alle 5 Träger auf derselben Schlitzhöhe. Schlitze mit Malerkrepp nummerieren.</li>
<li><b>Beladen.</b> Schwere Kisten nach unten, nahe an die Wand, gleichmäßig verteilen.</li>
<li><b>Im Programm eintragen.</b> Im Zeichner die Böden auf die echten Höhen stellen.</li>
</ol>
<p><b>Zeit:</b> etwa ein Tag im Keller, wenn der Zuschnitt fertig ist.</p>
</div></div>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Tragfähigkeit: eine Tonne je Wand</h2>
<div class="zwei">
<div>
{tabelle(["Frage","Ergebnis"],[
 ["Träger je Brett","5, Herstellerangabe etwa 55 kg je Träger, zusammen etwa 275 kg je Brett"],
 ["Sinnvolle Last je Brett (rund 65 Prozent)","etwa 180 kg"],
 ["6 Ebenen je 180 kg","etwa 1,08 Tonnen je Wand"],
 ["Last je Schiene bei 1 Tonne je Wand","etwa 200 kg"],
 ["Je Dübel (8 je Schiene), senkrecht","etwa 25 kg"],
 ["Kippen durch 35 cm Tiefe, je Dübel","etwa 20 kg Zug"],
 ["Biegung Brett 21 mm, Schienen {0} cm auseinander, 180 kg".format(abst),"unter 0,5 mm, das Holz hält das leicht"],
])}
<p>Mit <b>5 Schienen je Wand</b> erreichst du etwa eine Tonne je Wand. Für mehr (etwa 1,3 Tonnen) nimm <b>6 Schienen</b> je Wand mit gleichem Abstand: 10, 49,4, 88,8, 128,2, 167,6, 207 cm. Mehr als 6 bringt wenig, dann ist die Wand die Grenze.</p>
<p>Die Dübelwerte liegen deutlich unter den Herstellerangaben für Beton (etwa 1,1 kN je Dübel) und im sicheren Bereich bei Vollziegel (etwa 0,6 kN). <b>Die Schwachstelle ist die Wand.</b></p>
</div>
<div>
<div class="warn"><b>Wichtig:</b>
<ul>
<li>Die Tragkraft der Schienen und Träger stammt aus Händlerangaben, nicht aus eigener Prüfung. Das Datenblatt des gekauften Systems gilt.</li>
<li>Lochziegel oder Hohlblock: normale Dübel halten nur einen Bruchteil.</li>
<li>Erst den Belastungstest machen, dann schwer beladen.</li>
<li>Vor dem Bohren Leitungen suchen.</li>
</ul></div>
<h3>Checkliste vor dem Beladen</h3>
<ul style="list-style:none;padding-left:0">
<li><span class="box"></span>Wandmaterial geprüft, passende Dübel</li>
<li><span class="box"></span>10 Schienen lotrecht und auf gleicher Höhe</li>
<li><span class="box"></span>Alle Schrauben fest</li>
<li><span class="box"></span>Belastungstest bestanden, 24 Stunden beobachtet</li>
<li><span class="box"></span>Kanten versiegelt</li>
<li><span class="box"></span>Alle Träger sitzen in den Schlitzen, Brett liegt eben</li>
<li><span class="box"></span>Höhen in Kistly eingetragen</li>
</ul>
</div></div>
</div>
""")

doc = f"<!doctype html><html lang='de'><head><meta charset='utf-8'><title>Schienenregal Keller</title><style>{CSS}</style></head><body>{''.join(seiten)}</body></html>"
open(ziel, "w", encoding="utf-8").write(doc)
print("ok", len(doc), [round(s, 2) for s in SCH])
