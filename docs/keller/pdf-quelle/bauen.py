# Erzeugt SCHIENENREGAL-BAUPLAN.html (Zeichnungen als SVG). PDF danach mit Chrome:
#   chrome --headless=new --no-pdf-header-footer --print-to-pdf=SCHIENENREGAL-BAUPLAN.pdf SCHIENENREGAL-BAUPLAN.html
# Stand E98: nur die zwei Seitenwaende, gleiche Bretter 216 x 37, 5 Schienen je Wand,
# gerade Traeger 370 mm, Tuer geht nach aussen auf.
import sys, html
ziel = sys.argv[1]

W, D = 161, 217            # Keller innen: Breite (x) und Tiefe (y), cm
T_L, T_R = 37, 37          # Brett links (Ost) und rechts (West), Tiefe cm
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
    vw, vh = W + 2 * pad + 85, D + 2 * pad + 34 + 82
    o = []
    ox, oy = pad + 14, pad + 14 + 82
    o.append(rect(ox - 8, oy - 8, W + 16, D + 16, "#c9c9c9", "none", 0))
    o.append(rect(ox, oy, W, D, "#f5f1e8", "#111", 0.5))
    o.append(rect(ox + 35, oy - 8, 80, 8, "#f5f1e8", "none", 0))
    # Tuer geht nach aussen auf (in den Gang vor dem Keller)
    o.append(f'<path d="M {ox+35} {oy-8-80} A 80 80 0 0 1 {ox+115} {oy-8}" fill="none" stroke="#c24" stroke-width="0.5" stroke-dasharray="3 2"/>')
    o.append(line(ox + 35, oy - 8, ox + 35, oy - 8 - 80, 1.6, "#c24"))
    o.append(t(ox + 75, oy - 12, "Tuer 80 cm, geht nach aussen auf", 4.5, fill="#c24"))
    # Bretter: 5 mm Luft an beiden Enden
    o.append(rect(ox + W - T_L, oy + 0.5, T_L, BRETT_L, HOLZ, "#6b4a1e", 0.6))
    o.append(rect(ox, oy + 0.5, T_R, BRETT_L, HOLZ, "#6b4a1e", 0.6))
    for y in SCH:
        o.append(rect(ox + W - 3, oy + y - 1.3, 3, 2.6, RAIL, RAIL, 0))
        o.append(rect(ox, oy + y - 1.3, 3, 2.6, RAIL, RAIL, 0))
    o.append(t(ox + W - T_L / 2 + 1.5, oy + D / 2, "LINKS (Ost) 216 x 37", 4.5, rot=90))
    o.append(t(ox + T_R / 2 + 1.5, oy + D / 2, "RECHTS (West) 216 x 37", 4.5, rot=-90))
    o.append(t(ox + W / 2, oy + D / 2 - 6, "Gang 87 cm", 6, fill="#555"))
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
    # Seitenansicht in mm: gerader Arm ohne Strebe, an der Wand hoch, vorn
    # schmal (wie die Dolle-Traeger 2-reihig), oben liegt das Brett.
    o = []
    ox, oy = 60, 24
    h = 50
    o.append(poly([(ox, oy), (ox + L, oy), (ox + L, oy + 14), (ox + 12, oy + h), (ox, oy + h)], STAHL, "#111", 0.5))
    for hy in (oy + 6, oy + 31):
        o.append(poly([(ox, hy), (ox - 7, hy + 2), (ox - 7, hy + 11), (ox, hy + 11)], STAHL, "#111", 0.4))
    for sx in (80, L - 70):
        o.append(circ(ox + sx, oy + 4, 1.8, "#fff", "#c24", 0.4))
    o.append(mass_h(ox, ox + L, oy - 8, f"{L} mm", 13.2, tick=4))
    o.append(mass_v(ox - 16, oy, oy + h, f"ca. {h} mm", 10, -1, tick=4))
    o.append(t(ox + L / 2, oy + 50, "gerader Arm ohne Dreieck, oben liegt das Brett", 11, fill="#333"))
    o.append(t(ox + 4, oy + h + 30, "Doppelhaken an der Wandseite greifen in die Schiene", 9.9, "start", "#333"))
    o.append(t(ox + L * 0.62, oy + 72, menge_text, 12, weight="bold"))
    return svg(L + 90, h + 90, "".join(o), "50mm")


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
    o.append(rect(ox + 12, by - 21, 370, 21, HOLZ, "#6b4a1e", 0.8))
    o.append(t(ox + 190, by - 7, "Brett Multiplex 21 mm", 12, "middle", "#4a2f08"))
    o.append(poly([(ox + 12, by), (ox + 370, by), (ox + 370, by + 14), (ox + 24, by + 50), (ox + 12, by + 50)], STAHL, "#111", 0.6))
    o.append(t(ox + 200, by + 72, "Traeger 370 mm, gerader Arm", 11, "middle", "#222"))
    for sx in (ox + 90, ox + 320):
        o.append(rect(sx - 2.5, by - 10, 5, 16, "#222", "#222", 0))
        o.append(rect(sx - 6, by + 6, 12, 3, "#222", "#222", 0))
    o.append(t(ox + 205, by + 100, "2 Holzschrauben 4x16 von unten", 10, "middle", "#222"))
    o.append(mass_h(ox + 12, ox + 382, by - 40, "Brett 370 mm tief (beide Seiten)", size=11, tick=5))
    o.append(line(ox + 386, by - 21, ox + 400, by - 21, 0.3))
    o.append(line(ox + 386, by, ox + 400, by, 0.3))
    o.append(line(ox + 396, by - 21, ox + 396, by, 0.35))
    o.append(t(ox + 403, by - 6, "21", 11, "start"))
    return svg(460, 400, "".join(o), "110mm")


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
URL_SCHIENE = "https://www.hornbach.at/p/dolle-regale-wandschiene-2-reihig-weiss-1995-x-26-x-12-mm/7023195/"
URL_TRAEGER = "https://www.hornbach.at/p/traeger-dolle-regale-2-reihig-370-mm-weiss/7023207/"
URL_HOLZ = "https://www.hornbach.at/p/multiplexplatte-platte-unbehandelt-holz-2500-x-1220-x-21-mm/10578448/"
URL_DUEBEL = "https://www.bauhaus.at/universalduebel/fischer-duopower-duebel-schraubenbox-duopower/p/24505064"


def link(u, text):
    return f'<a href="{u}">{html.escape(text)}</a>'


seiten.append(f"""
<div class="seite">
<h1>Schienenregal Keller: Zeichnung und Bauplan</h1>
<p class="klein">Stand 17.10.2026. Maße aus dem Programm Kistly (Keller innen 161 x 217 cm). Vor dem Kaufen im echten Keller nachmessen.</p>
<div class="zwei">
<div>
<h2>Bild 1: Draufsicht</h2>
{bild_draufsicht()}
</div>
<div>
<h2>So ist es aufgebaut</h2>
<ul>
<li>Regale nur an den <b>zwei Seitenwänden</b>. Die hintere Wand und die Ecken bleiben frei.</li>
<li><b>Gleiche Bretter</b> links und rechts: 216 x 37 cm, gerade Enden. Die Tür geht nach außen auf, darum ist rechts genauso viel Platz.</li>
<li>Je Wand <b>5 Schienen</b> in gleichem Abstand ({abst} cm), 10 cm von beiden Wandenden. Zusammen <b>10 Schienen</b>, je 2 m.</li>
<li>Jedes Brett liegt auf <b>5 geraden Trägern</b> (370 mm, ohne Dreieck darunter). Brett und Träger bleiben verschraubt und werden zusammen in 5-cm-Schritten umgehängt.</li>
</ul>
<h3>Die wichtigsten Zahlen</h3>
{tabelle(["Teil","Maß"],[
 ["Brett (2 je Ebene)","216 x 37 cm, 21 mm Multiplex Birke"],
 ["Schienen","10 Stück (5 je Wand), 1995 mm, 2-reihig"],
 ["Träger","10 je Ebene, 370 mm, 2-reihig, gerade"],
 ["Gang","87 cm"],
 ["Traglast","rund 1,25 Tonnen je Wand (Seite Traglast)"],
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
<p class="klein">Dunkle Streifen: Schienen, Unterkante 5 cm über dem Boden, Oberkante etwa 205 cm. Abstände der Schienenmitten von der Türwand: 10 / {abst} / {abst} / {abst} / {abst} / 10 cm. Gestrichelt: Beispielhöhen der Bretter (Unterkante) 45, 85, 125, 165 cm, frei einstellbar in 5-cm-Schritten. Graue Stücke unter den Brettern: Träger.</p>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Einzelteile 1: das Brett</h2>
<div class="teil"><h3>Teil A: Brett 216 x 37 x 2,1 cm (2 je Ebene, links und rechts gleich)</h3>{teil_brett(BRETT_L, T_L, "Teil A: Brett 216 x 37", "2 Stück (eins links, eins rechts)")}</div>
<p class="klein">Material: Multiplex Birke 21 mm, wasserfest verleimt (AW 100 oder WBP). Ecken rechtwinklig, Kanten leicht brechen (Schleifpapier 120), alle Kanten zweimal mit Hartwachsöl oder Lack versiegeln. Die Löcher gelten ab dem Brettende an der Türseite. Rechts wird das Brett gedreht eingebaut, die Löcher passen trotzdem, weil die Schienen auf beiden Wänden gleich sitzen.</p>
<h2>Einzelteile 2: Träger</h2>
<div class="teil"><h3>Teil B: Träger 2-reihig 370 mm (gerader Arm)</h3>{teil_traeger(370, "10 je Ebene")}</div>
<p class="klein">Der Träger ist ein gerader Arm: an der Wand etwa 5 cm hoch, nach vorn schmaler. Kein Dreieck darunter, darunter bleibt der Platz frei. Ein Träger hält etwa 55 kg (Herstellerangabe 110 kg je Paar). Rote Kreise: Löcher für die Holzschrauben.</p>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Einzelteile 3: Schiene und Kleinteile</h2>
<div class="zwei">
<div>
<div class="teil"><h3>Teil C: Wandschiene 2-reihig, 1995 mm</h3>{teil_schiene()}
<p class="klein">10 Stück. Herstellerangabe: 55 kg je 200 mm Schiene. Schlitzabstand meist 25 mm, vor dem Kauf prüfen.</p></div>
</div>
<div>
<div class="teil"><h3>Teil D: Kleinteile</h3>{teil_klein()}
<p class="klein">Dübel 8 x 40 und Schraube 6 x 60: Wand zu Schiene, 8 je Schiene. Holzschraube 4 x 16: Träger zu Brett, 2 je Träger.</p></div>
<h3>Wie die Teile zusammenhalten</h3>
<ol>
<li><b>Wand zu Schiene (C):</b> Dübel 8 x 40 und Schraube 6 x 60, Bohrer 8 mm, mindestens 50 mm tief, alle 25 bis 30 cm.</li>
<li><b>Schiene zu Träger (B):</b> Die Haken hängen in zwei Schlitzen, das Gewicht drückt sie fest.</li>
<li><b>Träger zu Brett (A):</b> 2 Holzschrauben 4 x 16 von unten, 3 mm vorgebohrt.</li>
<li><b>Höhe ändern:</b> Brett leer räumen, anheben, alle 5 Träger aus den Schlitzen lösen, jeden zweiten Schlitz weiter einhängen (5 cm).</li>
</ol>
</div></div>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Bild 3: Schnitt durch eine Wand (Zusammenbau)</h2>
<div class="zwei">
<div>{bild_schnitt()}</div>
<div>
<div class="ok"><b>Gleich hohe Schlitze:</b> Alle 5 Schienen einer Wand müssen genau gleich hoch sitzen, sonst hängt das Brett schief. Unterkante aller Schienen 5 cm über dem Boden, mit Lehrlatte und Wasserwaage.</div>
<div class="warn"><b>Zum geraden Träger:</b> Er braucht unter dem Brett nur etwa 5 cm an der Wand und 1,5 cm vorn. Ein Träger mit Dreieck (Strebe) trägt etwas mehr, nimmt aber darunter Platz weg. Für 55 kg je Träger reicht der gerade Träger.</div>
</div></div>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Traglast: wie viel hält jedes Teil</h2>
<div class="zwei">
<div>
{tabelle(["Teil","hält etwa","Woher"],[
 ["1 Träger (B)","55 kg","Herstellerangabe 110 kg je Paar"],
 ["1 Brett mit 5 Trägern","275 kg, sinnvoll 180 kg","5 x 55 kg, mit Reserve"],
 ["1 Schiene (C)","250 kg","sinnvoller Wert, begrenzt durch 8 Dübel in der Wand"],
 ["1 Dübel in Beton","etwa 110 kg","Händlerangabe 1,1 kN"],
 ["1 Dübel in Vollziegel","etwa 60 kg","Händlerangabe 0,6 kN"],
])}
<h3>So viele Schienen, so viel Last je Wand</h3>
{tabelle(["Schienen je Wand","Last je Wand (250 kg je Schiene)"],[
 ["3","750 kg"],
 ["4","1000 kg (1 Tonne)"],
 ["<b>5 (Plan)</b>","<b>1250 kg</b>"],
 ["6","1500 kg"],
])}
<p>Also: <b>4 Schienen ergeben 1 Tonne je Wand</b>, mit 5 hast du ein Viertel Reserve. Jede Schiene mehr bringt etwa 250 kg.</p>
</div>
<div>
<h3>Rechenbeispiel</h3>
<p>6 Ebenen mit je 180 kg sind 1080 kg je Wand. Jede der 5 Schienen trägt dann etwa 216 kg, jeder Dübel (8 je Schiene) etwa 27 kg. Das liegt unter dem Wert für Vollziegel.</p>
<div class="warn"><b>Wichtig:</b>
<ul>
<li>Alle Werte stammen aus Händlerangaben, nicht aus eigener Prüfung.</li>
<li>Die Schwachstelle ist die Wand. In Lochziegel oder Hohlblock halten normale Dübel nur einen Bruchteil.</li>
<li>Erst den Belastungstest machen, dann schwer beladen.</li>
<li>Vor dem Bohren Leitungen suchen.</li>
</ul></div>
</div></div>
</div>
""")

zeilen = []
for e, platten in ((4, 3), (6, 4), (8, 6)):
    zeilen.append([f"<b>{e}</b>", str(2 * e), "10", str(e * 10), str(platten), str(e * 20), "80", "80"])

seiten.append(f"""
<div class="seite">
<h2>Materialliste und Bezugsquellen</h2>
{tabelle(["Ebenen","Bretter 216 x 37 (A)","Schienen 1995 mm (C)","Träger 370 mm (B)","Platten 2500 x 1220 x 21","Holzschrauben 4 x 16","Dübel 8 x 40","Schrauben 6 x 60"], zeilen)}
<p class="klein">Aus einer Platte (122 cm breit) bekommst du drei Bretter 216 x 37 cm. Kauf ein paar Schrauben und Dübel als Reserve.</p>
{tabelle(["Teil","Produkt","Preis (Stand Oktober 2026)","Link"],[
 ["C Schiene","Dolle Regale Wandschiene 2-reihig weiß 1995 x 26 x 12 mm (Art. 7023195)","5,95 € je Stück, ab 10 Stück 5,35 €", link(URL_SCHIENE, "hornbach.at")],
 ["B Träger","Träger Dolle Regale 2-reihig 370 mm weiß (Art. 7023207)","3,75 € je Stück, ab 10 Stück 3,35 €", link(URL_TRAEGER, "hornbach.at")],
 ["A Holz","Multiplexplatte 2500 x 1220 x 21 mm (Art. 10578448), Zuschnitt im Markt","177,50 € je Platte", link(URL_HOLZ, "hornbach.at")],
 ["D Dübel","Fischer DuoPower 8 x 40 mit Schrauben","je nach Packung", link(URL_DUEBEL, "bauhaus.at")],
 ["D Holzschrauben","Spanplattenschrauben 4 x 16, verzinkt","Baumarkt, Packung 200 Stück",""],
 ["Pflege","Hartwachsöl oder farbloser Lack, 1 Liter","Baumarkt",""],
])}
<p class="klein">Für 4 Ebenen ungefähr: Schienen 54 €, Träger 134 €, Holz 533 €, dazu Schrauben, Dübel und Öl. Schiene und Träger <b>vom selben Hersteller</b> (Dolle) kaufen, andere Systeme passen nicht in diese Schlitze. Ist der Keller feucht, frag im Markt nach verzinkten Schienen.</p>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Bauanleitung Schritt für Schritt</h2>
<div class="zwei">
<div>
<ol>
<li><b>Nachmessen.</b> Wandlänge links und rechts, Höhe, Tür. Weicht etwas ab, Brettlänge = Wandlänge minus 1 cm.</li>
<li><b>Wand prüfen.</b> Probebohrung 8 mm: rotes Mehl = Ziegel, graues hartes = Beton, plötzlich hohl = Lochziegel. Leitungen suchen. Vermieter fragen, ob gebohrt werden darf.</li>
<li><b>Einkaufen und zuschneiden lassen.</b> Bretter im Markt auf 216 x 37 cm.</li>
<li><b>Schienen anzeichnen.</b> An jeder Seitenwand 5 senkrechte Linien bei 10, {abst}, {z(10 + 2 * ABST)}, {z(10 + 3 * ABST)} und 207 cm von der Türwand. Unterkante 5 cm über dem Boden.</li>
<li><b>Bohren und Schienen setzen.</b> Schiene lotrecht halten, Löcher anzeichnen, bohren, ausblasen, Dübel rein, Schiene mit 6 x 60 festschrauben. Oben und unten zuerst, nochmal lotrecht prüfen, dann alle.</li>
<li><b>Bretter vorbereiten.</b> Kanten schleifen, zweimal versiegeln, trocknen lassen.</li>
</ol>
</div>
<div>
<ol start="7">
<li><b>Träger anschrauben.</b> Brett umdrehen, 5 Träger an die Lochpositionen aus Teil A, Haken zur Wandseite. 3 mm vorbohren, je 2 Holzschrauben 4 x 16.</li>
<li><b>Belastungstest.</b> Ein Brett einhängen, schrittweise 50, 100, 180 kg auflegen, je 10 Minuten. Auf Risse, Bewegung, Knarzen achten, nach 24 Stunden nochmal prüfen.</li>
<li><b>Alle Bretter einhängen.</b> Von unten nach oben, zu zweit, alle 5 Träger auf derselben Schlitzhöhe. Schlitze mit Malerkrepp nummerieren.</li>
<li><b>Beladen.</b> Schwere Kisten nach unten, nahe an die Wand, gleichmäßig verteilen.</li>
<li><b>Im Programm eintragen.</b> Im Zeichner die Böden auf die echten Höhen stellen.</li>
</ol>
<h3>Checkliste vor dem Beladen</h3>
<ul style="list-style:none;padding-left:0">
<li><span class="box"></span>Wandmaterial geprüft, passende Dübel</li>
<li><span class="box"></span>10 Schienen lotrecht und auf gleicher Höhe</li>
<li><span class="box"></span>Belastungstest bestanden, 24 Stunden beobachtet</li>
<li><span class="box"></span>Alle Träger sitzen in den Schlitzen, Brett liegt eben</li>
</ul>
<p><b>Zeit:</b> etwa ein Tag im Keller, wenn der Zuschnitt fertig ist.</p>
</div></div>
</div>
""")

doc = f"<!doctype html><html lang='de'><head><meta charset='utf-8'><title>Schienenregal Keller</title><style>{CSS}</style></head><body>{''.join(seiten)}</body></html>"
open(ziel, "w", encoding="utf-8").write(doc)
print("ok", len(doc), [round(s, 2) for s in SCH])
