# Erzeugt SCHIENENREGAL-BAUPLAN.html (Zeichnungen als SVG). PDF danach mit Chrome:
#   chrome --headless=new --no-pdf-header-footer --print-to-pdf=SCHIENENREGAL-BAUPLAN.pdf SCHIENENREGAL-BAUPLAN.html
# Stand E100: Teile von Bauhaus (Element System Classic 50), Bretter Leimholz
# 216 x 40 x 1,8 cm, 5 Schienen je Wand, Traeger 40 cm, Tuer geht nach aussen auf.
import sys, html
ziel = sys.argv[1]

W, D = 161, 217            # Keller innen: Breite (x) und Tiefe (y), cm
T_L, T_R = 40, 40          # Brett links (Ost) und rechts (West), Tiefe cm
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


def rect(x, y, w, h, fill="none", stroke="#111", sw=0.5, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>'


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
    o.append(t(ox + W - T_L / 2 + 1.5, oy + D / 2, f"LINKS (Ost) 216 x {T_L}", 4.5, rot=90))
    o.append(t(ox + T_R / 2 + 1.5, oy + D / 2, f"RECHTS (West) 216 x {T_R}", 4.5, rot=-90))
    o.append(t(ox + W / 2, oy + D / 2 - 6, f"Gang {W - T_L - T_R} cm", 6, fill="#555"))
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
        o.append(rect(ox + 0.5, Y(zz + 1.8), BRETT_L, 1.8, HOLZ, "#6b4a1e", 0.35))
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
    # Unterseite: wo die Traeger liegen (gestrichelt), Antirutsch-Pads
    # (graue Quadrate) auf jedem Traeger, Fuehrungsleisten (rot) links und
    # rechts vom ersten und letzten Traeger, 10 bis 18 cm von der Wand.
    for i, x in enumerate(SCH):
        bx = x - 0.5
        o.append(line(ox + bx, oy, ox + bx, oy + T - 2, 0.3, "#888", "1.5 1.5"))
        o.append(rect(ox + bx - 1, oy + 22, 2, 2, "#777", "#333", 0.2))
        if i in (0, len(SCH) - 1):
            for sx in (-2.2, 1.2):
                o.append(rect(ox + bx + sx, oy + 10, 1, 8, "#c24", "#c24", 0))
    o.append(mass_h(ox, ox + L, oy + T + 10, f"{L} cm", size=5))
    o.append(mass_v(ox + L + 6, oy, oy + T, f"{T} cm", size=5))
    prev = 0
    for x in [s - 0.5 for s in SCH]:
        o.append(mass_h(ox + prev, ox + x, oy + T + 20, z(x - prev), size=3.6, tick=1.4))
        prev = x
    o.append(t(ox, oy + T + 32, f"Menge je Ebene: {menge}. Ansicht von unten. Grau: Antirutsch-Pad auf jedem Traeger. Rot: Fuehrungsleisten 10 x 10 x 80 mm links und rechts vom ersten und letzten Traeger.", 4, "start", "#333"))
    # Dicke
    o.append(rect(ox, oy + T + 40, 60, 1.8 * 3, HOLZ, "#6b4a1e", 0.5))
    o.append(t(ox + 66, oy + T + 45, "Dicke 18 mm (hier 3-fach gross gezeichnet), Kanten leicht gebrochen", 4, "start", "#333"))
    return svg(vw, vh, "".join(o), "62mm")


def teil_schiene():
    # Massstab mm: Gesamtansicht 2000 mm (verkleinert) und Ausschnitt 1:1
    o = []
    # Uebersicht: 2000 mm als 200 Einheiten
    ox, oy = 62, 18
    o.append(rect(ox, oy, 4, 200, RAIL, RAIL, 0.0))
    # Schraubloecher etwa alle 200 mm (Abstand an der echten Schiene nachzaehlen)
    for i in range(10):
        yy = oy + 10 + i * 20
        o.append(circ(ox + 2, yy, 0.9, "#fff", "#fff", 0))
    o.append(mass_v(ox - 6, oy, oy + 200, "2000 mm", 11.0, -1))
    o.append(t(ox + 2, oy + 210, "Schiene ganz", 9.9))
    o.append(t(ox + 8, oy + 30, "Schraubloecher", 8.4, "start", "#555"))
    o.append(t(ox + 8, oy + 41, "etwa alle 200 mm", 8.4, "start", "#555"))
    # Ausschnitt vergroessert: einreihig, Schlitze im Raster 50 mm
    k = 1.0
    ax, ay = 180, 30
    o.append(rect(ax, ay, 20 * k, 150 * k, RAIL, "#111", 1.1))
    for i in range(3):
        yy = ay + 10 + i * 50 * k
        o.append(rect(ax + 7 * k, yy, 6 * k, 20 * k, "#f5f1e8", "#111", 0.7))
    o.append(mass_v(ax + 28 * k, ay + 10, ay + 60, "50 mm Raster", 9.2, 1))
    o.append(t(ax + 10, ay + 162, "Ausschnitt vergroessert", 9.9))
    # Querschnitt
    qx, qy = 340, 60
    o.append(poly([(qx, qy), (qx + 26, qy), (qx + 26, qy + 12), (qx + 22, qy + 12), (qx + 22, qy + 2), (qx + 4, qy + 2), (qx + 4, qy + 12), (qx, qy + 12)], RAIL, "#111", 0.4))
    o.append(rect(qx - 4, qy - 8, 34, 8, "#d6d6d6", "#111", 0.7))
    o.append(t(qx + 13, qy - 11, "Wand", 8.8, fill="#555"))
    o.append(t(qx + 13, qy + 34, "Querschnitt (Beispiel)", 9.9))
    return svg(430, 270, "".join(o), "85mm")


def teil_traeger(L, menge_text):
    # Seitenansicht in mm: gerader Arm ohne Strebe, an der Wand hoch, vorn
    # schmal, zwei Haken an der Wandseite, oben liegt das Brett.
    o = []
    ox, oy = 95, 24
    h = 50
    o.append(poly([(ox, oy), (ox + L, oy), (ox + L, oy + 14), (ox + 12, oy + h), (ox, oy + h)], STAHL, "#111", 0.5))
    for hy in (oy + 6, oy + 31):
        o.append(poly([(ox, hy), (ox - 7, hy + 2), (ox - 7, hy + 11), (ox, hy + 11)], STAHL, "#111", 0.4))
    o.append(mass_h(ox, ox + L, oy - 8, f"{L} mm", 13.2, tick=4))
    o.append(mass_v(ox - 16, oy, oy + h, f"ca. {h} mm", 10, -1, tick=4))
    o.append(t(ox + L / 2, oy + h + 14, "gerader Arm ohne Dreieck, oben liegt das Brett", 11, fill="#333"))
    o.append(t(ox + 4, oy + h + 34, "Zwei Haken an der Wandseite greifen in die Schiene", 9.9, "start", "#333"))
    o.append(t(ox + L * 0.75, oy + 106, menge_text, 12, weight="bold"))
    return svg(L + 130, h + 92, "".join(o), "50mm")


def teil_klein():
    o = []
    # Duebel 8x40
    o.append(rect(10, 20, 40, 8, "#d0d0d0", "#111", 0.4))
    o.append(t(30, 40, "Duebel 6 mm", 5))
    # Schraube 6x60
    o.append(rect(70, 22, 60, 4, "#888", "#111", 0.4))
    o.append(rect(66, 19, 4, 10, "#888", "#111", 0.4))
    o.append(t(98, 40, "Senkkopf 4,5 x 50", 5))
    # Fuehrungsleiste 10 x 10 x 80
    o.append(rect(145, 21, 32, 6, "#c24", "#111", 0.4))
    o.append(t(161, 40, "Leiste 10 x 10 x 80", 5))
    # Antirutsch-Pad
    o.append(rect(205, 20, 10, 10, "#777", "#111", 0.4))
    o.append(t(210, 40, "Pad 20 x 20", 5))
    return svg(228, 48, "".join(o), "22mm")


def bild_montage_schiene():
    # Eine Schiene von vorn, Massstab 0,15 px je mm. Boden unten, Hoehenlinie rot.
    k = 0.15
    o = []
    ox, boden = 120, 340
    def y(mm):
        return boden - mm * k
    o.append(rect(ox - 70, y(2150), 170, 2150 * k, "#eeeeea", "none", 0))
    o.append(line(ox - 80, boden, ox + 110, boden, 1.4))
    o.append(t(ox + 104, boden + 12, "Boden", 9, "end", "#555"))
    unten, oben = 50, 50 + 2000
    o.append(rect(ox - 6, y(oben), 12, 2000 * k, RAIL, "#111", 0.6))
    for i in range(10):
        mm = oben - 100 - i * 200
        o.append(circ(ox, y(mm), 2.2, "#fff", "#111", 0.5))
    o.append(line(ox - 80, y(1000), ox + 110, y(1000), 1.2, "#c22", "6 3"))
    o.append(t(ox + 108, y(1000) + 13, "Höhenlinie 100 cm", 9.5, "end", "#c22", weight="bold"))
    o.append(mass_v(ox - 30, y(unten), boden, "5 cm Luft", 9, -1, tick=3))
    o.append(mass_v(ox - 30, y(oben - 100), y(oben - 300), "ca. 20 cm", 9, -1, tick=3))
    o.append(mass_v(ox - 30, y(oben - 300), y(oben - 500), "ca. 20 cm", 9, -1, tick=3))
    o.append(line(ox + 22, y(unten), ox + 22, y(oben), 0.35))
    o.append(line(ox + 19, y(unten), ox + 25, y(unten), 0.35))
    o.append(line(ox + 19, y(oben), ox + 25, y(oben), 0.35))
    o.append(t(ox + 32, y(1550), "Schiene 200 cm", 9, rot=-90))
    o.append(t(ox, y(oben) - 8, "In jedes Loch 1 Schraube", 9.5, weight="bold"))
    return svg(240, 360, "".join(o), "120mm")


def bild_montage_wand():
    # Draufsicht einer Seitenwand: wo die 5 Schienen sitzen, gemessen ab der Tuerwand.
    o = []
    ox, oy, k = 20, 40, 2.0
    o.append(rect(ox, oy - 12, D * k, 12, "#cfcfcf", "#111", 0.5))
    o.append(t(ox + D * k / 2, oy - 16, "Seitenwand (von oben gesehen)", 9.5, fill="#333"))
    o.append(rect(ox - 12, oy - 12, 12, 70, "#cfcfcf", "#111", 0.5))
    o.append(t(ox - 6, oy + 72, "Türwand", 8.5, fill="#333"))
    for s in SCH:
        o.append(rect(ox + s * k - 2.6, oy, 5.2, 2.4, RAIL, "#111", 0.3))
        o.append(line(ox + s * k, oy + 3, ox + s * k, oy + 30, 0.4, "#888", "2 2"))
        o.append(t(ox + s * k, oy + 42, z(s) + " cm", 9.5, weight="bold"))
    o.append(t(ox + D * k / 2, oy + 62, "Maß bis zur Schienenmitte, immer ab der Türwand messen", 9, fill="#555"))
    return svg(D * k + 40, 112, "".join(o), "40mm")


def bild_montage_loch():
    # Schnitt durch ein Loch: Wand, Duebel 6 mm, Schiene, Senkkopfschraube buendig.
    o = []
    wx = 120
    o.append(rect(wx - 110, 10, 110, 120, "#d6d6d6", "#111", 0.6))
    for i in range(0, 120, 14):
        o.append(line(wx - 110, 10 + i + 14, wx - 96, 10 + i, 0.3, "#999"))
    o.append(rect(wx - 60, 64, 60, 12, "#fff", "#111", 0.5, "3 2"))
    o.append(rect(wx - 52, 65, 52, 10, "#e9c46a", "#7a5b12", 0.6))
    o.append(rect(wx, 40, 18, 60, RAIL, "#111", 0.6))
    o.append(poly([(wx + 18, 62), (wx + 18, 78), (wx + 10, 72), (wx + 10, 68)], "#888", "#111", 0.5))
    o.append(rect(wx - 56, 68.5, 66, 3, "#888", "#111", 0.4))
    o.append(mass_h(wx - 60, wx, 56, "Loch 6 mm, 45 mm tief", 8.5, tick=3))
    o.append(t(wx - 26, 92, "Dübel 6 mm", 8.5, fill="#7a5b12", weight="bold"))
    o.append(t(wx + 9, 112, "Schiene", 8.5))
    o.append(t(wx + 24, 66, "Kopf flach", 8.5, "start", weight="bold"))
    o.append(t(wx + 24, 77, "in der Schiene", 8.5, "start"))
    o.append(t(wx + 24, 90, "Schraube 4,5 x 50", 8.5, "start"))
    return svg(220, 136, "".join(o), "45mm")


def bild_schnitt():
    o = []
    ox, oy = 30, 10
    o.append(rect(ox - 30, oy, 30, 330, "#d6d6d6", "#111", 0.6))
    for i in range(0, 330, 12):
        o.append(line(ox - 30, oy + i + 12, ox, oy + i, 0.3, "#888"))
    o.append(t(ox - 25, oy + 350, "Wand (Beton oder Vollziegel)", 11, "start", "#333"))
    o.append(rect(ox, oy + 20, 12, 300, "#4a5560", "#111", 0.6))
    o.append(t(ox + 22, oy + 50, "Schiene Element System EL 50", 10, "start", "#111"))
    for yy in (oy + 70, oy + 270):
        o.append(rect(ox - 28, yy - 2, 40, 4, "#888", "#111", 0.3))
    o.append(t(ox + 40, oy + 75, "Senkkopfschraube 4,5x50 + Duebel 6 mm", 10, "start", "#222"))
    by = oy + 160
    o.append(rect(ox + 12, by - 18, 400, 18, HOLZ, "#6b4a1e", 0.8))
    o.append(t(ox + 200, by - 5, "Brett Leimholz Fichte 18 mm", 12, "middle", "#4a2f08"))
    o.append(poly([(ox + 12, by), (ox + 400, by), (ox + 400, by + 14), (ox + 24, by + 50), (ox + 12, by + 50)], STAHL, "#111", 0.6))
    o.append(t(ox + 210, by + 72, "Traeger 400 mm, gerader Arm", 11, "middle", "#222"))
    # Fuehrungsleiste unter dem Brett neben dem Traeger (gestrichelt, weil sie
    # vor und hinter dem Traeger sitzt); Pad zwischen Traeger und Brett
    o.append(rect(ox + 112, by, 80, 10, "none", "#c24", 0.9, "4 2"))
    o.append(rect(ox + 230, by - 2, 24, 2, "#555", "#333", 0.3))
    o.append(t(ox + 92, by + 100, "Leiste 10 x 10 mm unter dem Brett, links und rechts vom Traeger", 10, "start", "#c24"))
    o.append(line(ox + 140, by + 92, ox + 150, by + 11, 0.4, "#c24"))
    o.append(t(ox + 250, by + 120, "Antirutsch-Pad auf dem Traeger, Brett liegt lose", 10, "middle", "#222"))
    o.append(line(ox + 250, by + 112, ox + 242, by, 0.4, "#222"))
    o.append(mass_h(ox + 12, ox + 412, by - 40, "Brett 400 mm tief (beide Seiten)", size=11, tick=5))
    o.append(line(ox + 416, by - 18, ox + 430, by - 18, 0.3))
    o.append(line(ox + 416, by, ox + 430, by, 0.3))
    o.append(line(ox + 426, by - 18, ox + 426, by, 0.35))
    o.append(t(ox + 433, by - 5, "18", 11, "start"))
    return svg(490, 400, "".join(o), "110mm")


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
URL_SCHIENE = "https://www.bauhaus.at/regalschienen/element-system-wandschiene-el-50/p/10580128"
URL_TRAEGER = "https://www.bauhaus.at/wandkonsolen/element-system-bodentraeger-set-s-50/p/22255947"
URL_HOLZ = "https://www.bauhaus.at/leimholzplatten/exclusivholz-leimholzplatte/p/25863376"
POS = ", ".join(z(x) for x in SCH)


def link(u, text):
    return f'<a href="{u}">{html.escape(text)}</a>'


seiten.append(f"""
<div class="seite">
<h1>Schienenregal Keller: auf einen Blick</h1>
<h2>1. Das kaufst du (4 Ebenen)</h2>
{tabelle(["Menge","Was","Artikel","Hält"],[
 ["<b>10</b>", "Element System Wandschiene EL 50, 200 cm, weiß (5 je Wand), 4,25 €", link(URL_SCHIENE, "10580128"), "etwa 250 kg je Schiene"],
 ["<b>4 Packs</b>", "Element System Bodenträger-Set S 50, 40 cm, je 10 Stück (1 Pack je Ebene), 13,95 €", link(URL_TRAEGER, "22255947"), "60 kg je Träger"],
 ["<b>100 + 100</b>", "Senkkopfschrauben 4,5 x 50 mm und Dübel 6 mm (etwa 10 je Schiene, Reserve einplanen)", "", ""],
 ["<b>8</b>", "Leimholzplatte Fichte 2500 x 400 x 18 mm, 36,95 €, im Markt auf 216 cm kürzen lassen", link(URL_HOLZ, "25863376"), "180 kg je Brett"],
 ["<b>3</b>", "Vierkantleiste Kiefer 10 x 10 mm, 1 m (in 8-cm-Stücke, 4 je Brett)", "", ""],
 ["<b>40</b>", "Antirutsch-Pads selbstklebend, etwa 20 x 20 mm (1 je Träger)", "", ""],
 ["<b>1</b>", "Holzleim, dazu 1 Liter Hartwachsöl", "", ""],
])}
<p class="klein">Alles von Bauhaus. Schiene und Träger beide von Element System (Classic 50), nie mit einem anderen System mischen. Kosten etwa 123 € ohne Holz, 452 € mit Holz. Werkzeug: Schlagbohrmaschine, Steinbohrer 6 mm, Akkuschrauber, Wasserwaage, Leitungssucher.</p>
<div class="zwei">
<div>
<h2>2. Maße</h2>
{tabelle(["Was","Maß"],[
 ["Schienen je Wand","<b>5</b>"],
 ["Erste Schiene ab der Türwand","<b>10 cm</b> (zur Mitte)"],
 ["Abstand Schiene zu Schiene", f"<b>{abst} cm</b> (Mitte zu Mitte)"],
 ["Schienenmitten ab Türwand", f"{POS} cm"],
 ["Schiene unten","<b>5 cm</b> über dem Boden"],
 ["Schiene oben","205 cm"],
 ["Schrauben","<b>in jedes Loch eine</b>, etwa alle 20 cm, rund 100"],
 ["Bretter (Unterkante)","45, 85, 125, 165 cm"],
])}
</div>
<div>
<h2>3. Was es hält</h2>
{tabelle(["Teil","hält etwa"],[
 ["1 Träger","60 kg"],
 ["1 Brett auf 5 Trägern","180 kg"],
 ["1 Schiene (10 Schrauben)","250 kg"],
 ["1 Wand (5 Schienen)","<b>1,25 Tonnen</b>"],
])}
<p class="klein">Nach Herstellerangaben, nicht selbst geprüft. Gilt nur bei fester Wand. Erst ein Brett mit 50, 100, 180 kg testen.</p>
</div></div>
<h2>4. So baust du es</h2>
<ol>
<li>Rote Linie bei 100 cm auf beide Wände. Schiene anhalten, Mitte auf dem Maß, unten 5 cm Luft, immer derselbe Schlitz auf der Linie.</li>
<li>Oberstes Loch: 6 mm bohren, Dübel, Schraube locker. Gerade stellen, alle anderen Löcher anzeichnen, bohren, Dübel, alle Schrauben fest.</li>
<li>Träger einhängen (5 je Brett, gleicher Schlitz), Pad drauf, Brett drauflegen. Genaue Zeichnungen auf den nächsten Seiten.</li>
</ol>
</div>
""")

seiten.append(f"""
<div class="seite">
<h1>Schienenregal Keller: Zeichnung und Bauplan</h1>
<p class="klein">Stand 18.10.2026. Maße aus dem Programm Kistly (Keller innen 161 x 217 cm). Vor dem Kaufen im echten Keller nachmessen.</p>
<div class="zwei">
<div>
<h2>Bild 1: Draufsicht</h2>
{bild_draufsicht()}
</div>
<div>
<h2>So ist es aufgebaut</h2>
<ul>
<li>Regale nur an den <b>zwei Seitenwänden</b>. Die hintere Wand und die Ecken bleiben frei.</li>
<li><b>Grundgerüst:</b> je Wand 5 Schienen (gleicher Abstand {abst} cm, 10 cm von beiden Enden) und darin eingehängte <b>gerade Träger</b> ohne Dreieck.</li>
<li><b>Bretter liegen lose auf den Trägern</b>, nichts wird verschraubt. Vier kleine Holzleisten unter jedem Brett umfassen zwei Träger, Antirutsch-Pads halten es fest. Zum Umstellen hebst du das Brett einfach ab.</li>
<li><b>Gleiche Bretter</b> links und rechts: 216 x 40 cm, gerade Enden. Die Tür geht nach außen auf.</li>
</ul>
<h3>Die wichtigsten Zahlen</h3>
{tabelle(["Teil","Maß"],[
 ["Brett (2 je Ebene)","216 x 40 cm, Leimholz Fichte 18 mm"],
 ["Schienen","10 Stück (5 je Wand), 2 m, Element System EL 50"],
 ["Träger","10 je Ebene, Element System S 50, 40 cm"],
 ["Gang","81 cm"],
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
<p class="klein">Dunkle Streifen: Schienen, Unterkante etwa 5 cm über dem Boden, Oberkante etwa 205 cm. Abstände der Schienenmitten von der Türwand: 10 / {abst} / {abst} / {abst} / {abst} / 10 cm. Gestrichelt: Beispielhöhen der Bretter (Unterkante) 45, 85, 125, 165 cm, frei einstellbar in 5-cm-Schritten. Graue Stücke unter den Brettern: Träger.</p>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Schienen an der Wand befestigen (der wichtigste Teil)</h2>
<p>Schiene und Träger sind fertige Teile. Deine Arbeit: <b>10 Schienen gerade und gleich hoch an die Wand</b>. Pro Schiene etwa 10 Schrauben.</p>
<div class="zwei">
<div>
{bild_montage_schiene()}
</div>
<div>
<h3>Was du brauchst</h3>
<ul>
<li><b>100 Senkkopfschrauben 4,5 x 50 mm und 100 Dübel 6 mm</b>. Im Markt eine Schraube an ein Loch der Schiene halten: der Kopf muss hineinpassen.</li>
<li>Schlagbohrmaschine, <b>Steinbohrer 6 mm</b>, Akkuschrauber mit passendem Bit</li>
<li>Wasserwaage, Kreuzlinienlaser (wenn da), Zollstock, Bleistift, Leitungssucher, Staubsauger</li>
</ul>
<h3>Die Bohrung</h3>
{bild_montage_loch()}
<div class="warn"><b>Vorher:</b> Leitungssucher über jede Stelle. Vermieter fragen, ob du bohren darfst. Normale Dübel sind für Beton und Ziegel gemacht. Fühlt sich die Wand hohl an oder ist sie Porenbeton (leicht, grau, weich), nicht weiterbohren und im Markt passende Dübel holen.</div>
</div></div>
<h3>Wo die Schienen hinkommen (beide Seitenwände gleich)</h3>
{bild_montage_wand()}
<h3>So geht es, je Schiene</h3>
<ol>
<li><b>Höhenlinie ziehen</b> (einmal für beide Wände): rote Linie bei 100 cm, mit Laser oder Wasserwaage.</li>
<li><b>Schiene anhalten:</b> Mitte auf dem Maß von oben, unten 5 cm Luft. Merke dir den Schlitz, der auf der roten Linie liegt, zum Beispiel mit Malerkrepp an der Schiene. Bei jeder Schiene liegt <b>genau dieser Schlitz</b> auf der Linie.</li>
<li><b>Oberstes Loch anzeichnen</b>, Schiene weg, 6 mm bohren (45 mm tief), aussaugen, Dübel bündig rein.</li>
<li><b>Oben anschrauben, aber locker.</b> Die Schiene hängt und lässt sich noch drehen.</li>
<li><b>Gerade stellen</b> mit der Wasserwaage an der Seite. Dann durch alle anderen Löcher anzeichnen.</li>
<li><b>Schiene zur Seite drehen</b>, die Löcher bohren, aussaugen, Dübel rein.</li>
<li><b>Zurückdrehen, alle Schrauben fest</b>, von oben nach unten. Köpfe müssen flach in der Schiene liegen. Nicht überdrehen.</li>
<li><b>Prüfen:</b> Träger einhängen, kräftig nach unten ziehen. Nichts wackelt.</li>
</ol>
<p class="klein">Reihenfolge je Wand: erst die zwei äußeren Schienen (10 und 207 cm), dann die mittlere (108,5 cm), dann die zwei dazwischen. Zeit: etwa 20 Minuten je Schiene. Die Löcher sitzen etwa alle 20 cm; zähle an deiner Schiene nach und setze in jedes Loch eine Schraube.</p>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Einzelteile 1: das Brett (lose aufgelegt)</h2>
<div class="teil"><h3>Teil A: Brett 216 x 40 x 1,8 cm (2 je Ebene, links und rechts gleich)</h3>{teil_brett(BRETT_L, T_L, "Teil A: Brett 216 x 40", "2 Stück (eins links, eins rechts)")}</div>
<div class="zwei">
<div>
<h3>So hält das Brett ohne Schrauben</h3>
<ol>
<li><b>Antirutsch-Pads:</b> Auf jeden Träger oben ein selbstklebendes Gummi-Pad (etwa 20 x 20 mm, 2 bis 3 mm dick). Das Gewicht drückt das Brett darauf, es rutscht nicht.</li>
<li><b>Führungsleisten:</b> Unter jedem Brett vier Stücke Holzleiste 10 x 10 mm, 8 cm lang: je eines links und rechts vom ersten und vom letzten Träger. Beim Auflegen rutscht der Träger zwischen die zwei Leisten. Das Brett kann dann nicht zur Seite wandern, hinten stoppt die Wand.</li>
<li><b>Abheben:</b> Brett vorne anheben, nach oben abnehmen. Die Träger bleiben in der Schiene.</li>
</ol>
</div>
<div>
<h3>Leisten ankleben</h3>
<ol>
<li>Träger einhängen, Brett auflegen und ausrichten.</li>
<li>Von unten am ersten und letzten Träger links und rechts einen Bleistiftstrich aufs Brett ziehen.</li>
<li>Brett umdrehen, Leisten mit Holzleim direkt an die Striche kleben (1 bis 2 mm Luft zum Träger lassen), trocknen lassen.</li>
</ol>
<p class="klein">Weil alle Schienen gleich weit auseinander sitzen, passt jedes Brett an jede Höhe und auf beide Wände.</p>
</div></div>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Einzelteile 2: Träger, Schiene, Kleinteile</h2>
<div class="zwei">
<div>
<div class="teil"><h3>Teil B: Träger Element System S 50, 40 cm</h3>{teil_traeger(400, "10 je Ebene")}
<p class="klein">Gerader Arm ohne Dreieck, an der Wand etwa 5 cm hoch. Ein Träger hält 60 kg (Herstellerangabe). Mit Aushängesicherung.</p></div>
<div class="teil"><h3>Teil D: Kleinteile</h3>{teil_klein()}
<p class="klein">Dübel 6 mm und Senkkopfschraube 4,5 x 50: Wand zu Schiene, in jedes Loch eine. Leiste 10 x 10 x 80 mm: 4 je Brett. Pad: 1 je Träger.</p></div>
</div>
<div>
<div class="teil"><h3>Teil C: Wandschiene Element System EL 50, 2 m</h3>{teil_schiene()}
<p class="klein">10 Stück. Einreihig, Schlitze im Raster 50 mm. Schiene und Träger <b>aus demselben System</b> kaufen.</p></div>
</div></div>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Bild 3: Schnitt durch eine Wand (Zusammenbau)</h2>
<div class="zwei">
<div>{bild_schnitt()}</div>
<div>
<div class="ok"><b>Gleich hohe Schlitze:</b> Alle 5 Schienen einer Wand müssen auf derselben Höhenlinie sitzen, sonst liegt das Brett schief (Seite "Schienen an der Wand befestigen").</div>
<div class="warn"><b>Lose Bretter:</b> Nicht auf die Vorderkante eines Bretts treten oder sich daran hochziehen. Schwere Kisten von vorn nur ziehen, wenn das Brett beladen ist; ein leeres Brett liegt nur durch sein Gewicht.</div>
</div></div>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Traglast: wie viel hält jedes Teil</h2>
<div class="zwei">
<div>
{tabelle(["Teil","hält etwa","Woher"],[
 ["1 Träger (B)","60 kg","Herstellerangabe"],
 ["1 Brett mit 5 Trägern","300 kg, sinnvoll 180 kg","5 x 60 kg, mit Reserve"],
 ["1 Schiene (C)","250 kg","sinnvoller Wert: 10 Schrauben zu je 25 kg"],
 ["Schiene laut Hersteller","nicht angegeben","darum vorsichtig 25 kg je Schraube"],
])}
<h3>So viele Schienen, so viel Last je Wand</h3>
{tabelle(["Schienen je Wand","Last je Wand (250 kg je Schiene)"],[
 ["3","750 kg"],
 ["4","1000 kg (1 Tonne)"],
 ["<b>5 (Plan)</b>","<b>1250 kg</b>"],
 ["6","1500 kg"],
])}
</div>
<div>
<h3>Rechenbeispiel</h3>
<p>6 Ebenen mit je 180 kg sind 1080 kg je Wand. Jede der 5 Schienen trägt dann etwa 216 kg, jeder Dübel (10 je Schiene) etwa 22 kg.</p>
<div class="warn"><b>Wichtig:</b>
<ul>
<li>Alle Werte stammen aus Händlerangaben, nicht aus eigener Prüfung.</li>
<li>Die Schwachstelle ist die Wand. In Lochziegel oder Hohlblock halten normale Dübel nur einen Bruchteil.</li>
<li>Erst den Belastungstest machen: ein Brett, schrittweise 50, 100, 180 kg, 24 Stunden beobachten.</li>
</ul></div>
</div></div>
</div>
""")

zeilen = []
for e in (4, 6, 8):
    zeilen.append([f"<b>{e}</b>", str(2 * e), "10", str(e), str(2 * e), str(-(-8 * e * 8 // 100)), str(e * 10), "100"])

seiten.append(f"""
<div class="seite">
<h2>Materialliste und Bezugsquellen</h2>
{tabelle(["Ebenen","Bretter 216 x 40","Schienen 2 m","Träger-Packs (je 10)","Leimholz 2500 x 400 x 18","Leisten 10 x 10, 1 m","Pads","Schrauben und Dübel"], zeilen)}
<p class="klein">Jede Leimholzplatte ist schon 40 cm breit: nur auf 216 cm kürzen, ergibt ein Brett. Kauf ein paar Dübel, Schrauben und Pads als Reserve.</p>
<h3>Schiene, Träger und Holz (alles Bauhaus, online reservieren und im Markt abholen)</h3>
{tabelle(["Teil","Produkt","Preis (Stand Oktober 2026)","Link"],[
 ["C Schiene","Element System Wandschiene EL 50, 200 cm, weiß (Prod.Nr. 10580128)","4,25 €", link(URL_SCHIENE, "bauhaus.at")],
 ["B Träger","Element System Bodenträger-Set S 50, 40 cm, 10 Stück (Prod.Nr. 22255947)","13,95 € je Pack", link(URL_TRAEGER, "bauhaus.at")],
 ["A Holz","Leimholzplatte Fichte A/B 2500 x 400 x 18 mm (Prod.Nr. 25863376), auf 216 cm kürzen","36,95 € je Platte", link(URL_HOLZ, "bauhaus.at")],
])}
<h3>Kleinteile (im selben Markt)</h3>
{tabelle(["Teil","Produkt","Link"],[
 ["D Dübel und Schrauben","100 Senkkopfschrauben 4,5 x 50 mm und 100 Dübel 6 mm (z. B. Fischer DuoPower 6 x 30), Bohrer 6 mm",""],
 ["D Leisten","Vierkantleiste Kiefer 10 x 10 mm, 1 m, in Stücke zu 8 cm sägen, dazu Holzleim",""],
 ["D Pads","Antirutsch-Pads selbstklebend, Gummi, etwa 20 x 20 mm",""],
 ["Pflege","Hartwachsöl oder farbloser Lack, 1 Liter",""],
])}
<p class="klein"><b>Nie Schienen und Träger zweier Hersteller mischen.</b> Die Schlitze sind verschieden.</p>
</div>
""")

seiten.append(f"""
<div class="seite">
<h2>Bauanleitung in der Übersicht</h2>
<div class="zwei">
<div>
<ol>
<li><b>Nachmessen.</b> Wandlänge links und rechts, Höhe, Tür. Brettlänge = Wandlänge minus 1 cm.</li>
<li><b>Wand prüfen.</b> Probebohrung 6 mm: rotes Mehl = Ziegel, graues hartes = Beton, plötzlich hohl = Lochziegel. Leitungen suchen.</li>
<li><b>Einkaufen.</b> Materialliste, alles von Bauhaus, Bretter auf 216 cm kürzen lassen.</li>
<li><b>Schienen setzen.</b> Wie auf der Seite "Schienen an der Wand befestigen", mit Höhenlinie.</li>
<li><b>Bretter vorbereiten.</b> Kanten schleifen, zweimal versiegeln, trocknen lassen.</li>
</ol>
</div>
<div>
<ol start="6">
<li><b>Träger einhängen, Pads kleben.</b> 5 Träger je Ebene auf derselben Schlitzhöhe, auf jeden ein Pad.</li>
<li><b>Leisten kleben.</b> Brett auflegen, neben dem ersten und letzten Träger anzeichnen, Leisten ankleben.</li>
<li><b>Belastungstest.</b> Ein Brett, schrittweise 50, 100, 180 kg, je 10 Minuten, nach 24 Stunden nochmal prüfen.</li>
<li><b>Beladen.</b> Schwere Kisten nach unten und nahe an die Wand.</li>
<li><b>Im Programm eintragen.</b> Im Zeichner die Böden auf die echten Höhen stellen.</li>
</ol>
<h3>Checkliste vor dem Beladen</h3>
<ul style="list-style:none;padding-left:0">
<li><span class="box"></span>Wandmaterial geprüft, passende Dübel</li>
<li><span class="box"></span>10 Schienen lotrecht, gleicher Schlitz auf der Höhenlinie</li>
<li><span class="box"></span>Schraubenköpfe flach, Träger lassen sich einhängen</li>
<li><span class="box"></span>Belastungstest bestanden</li>
<li><span class="box"></span>Träger sitzen zwischen den Leisten, Brett liegt eben</li>
</ul>
<p><b>Zeit:</b> etwa ein Tag im Keller, wenn der Zuschnitt fertig ist.</p>
</div></div>
</div>
""")

doc = f"<!doctype html><html lang='de'><head><meta charset='utf-8'><title>Schienenregal Keller</title><style>{CSS}</style></head><body>{''.join(seiten)}</body></html>"
open(ziel, "w", encoding="utf-8").write(doc)
print("ok", len(doc), [round(s, 2) for s in SCH])
