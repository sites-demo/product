# Разворот тетради в клетку с решением задачи, текстура для сцены desk.py
import math, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 2400, 1700
MM = W / 296
PAPER = (246, 241, 229)
GRID = (178, 196, 214)
INK = (34, 52, 104)
RED = (176, 44, 38)

cyr = lambda s: ImageFont.truetype('caveat-cyrillic-500.ttf', s)
lat = lambda s: ImageFont.truetype('caveat-latin-500.ttf', s)

img = Image.new('RGB', (W, H), PAPER)
d = ImageDraw.Draw(img)
step = 5 * MM
x = 0.0
while x < W:
    d.line([(x, 0), (x, H)], fill=GRID, width=2); x += step
y = 0.0
while y < H:
    d.line([(0, y), (W, y)], fill=GRID, width=2); y += step
d.line([(W - 20 * MM, 0), (W - 20 * MM, H)], fill=(205, 90, 84), width=4)
d.line([(20 * MM, 0), (20 * MM, H)], fill=(205, 90, 84), width=4)

def text(x, y, s, size=74, fill=INK):
    for ch in s:
        f = cyr(size) if 'Ѐ' <= ch <= 'ӿ' else lat(size)
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f)
    return x

c = 24 * MM

def sub(x, y, ch, size=76):
    return text(x, y + size * 0.38, ch, int(size * 0.62))

def root(x, y, s, size=72):
    h = size * 0.9
    d.line([(x, y + h * 0.62), (x + 10, y + h * 0.55), (x + 24, y + h * 1.0), (x + 46, y + h * 0.18), (x + 46 + d.textlength(s, font=lat(size)) + 8, y + h * 0.18)], fill=INK, width=5, joint='curve')
    return text(x + 50, y + 4, s, size)
text(c, 1.2 * step, 'Задача 12', 86)
rows = [['y = x² − 4x + 3'], ['D = b² − 4ac = 16 − 12 = 4'], ['x', ('1',), ' = (4 − 2) / 2 = 1'], ['x', ('2',), ' = (4 + 2) / 2 = 3'],
        ['вершина: x', ('0',), ' = −b/2a = 2'], ['y', ('0',), ' = 4 − 8 + 3 = −1'], ['Ответ: 1; 3']]
for i, parts in enumerate(rows):
    xx, yy = c + (0 if i in (0, 6) else 2 * step), (3.2 + i * 2.6) * step
    for p in parts:
        xx = sub(xx, yy, p[0]) if isinstance(p, tuple) else text(xx, yy, p, 76)
d.rectangle([c - 10, 18.6 * step, c + 7.6 * step, 20.6 * step], outline=INK, width=4)
xx = text(c + 2 * step, 23 * step, 'log', 72); xx = sub(xx, 23 * step, '2', 72); xx = text(xx + 8, 23 * step, ' 8 = 3,   ', 72); xx = root(xx, 23 * step, '49'); text(xx + 14, 23 * step, '= 7', 72)
text(c + 2 * step, 25.6 * step, 'sin² x + cos² x = 1', 72)

ox, oy = W / 2 + 26 * MM, 30 * step
sc = 2 * step
d.line([(ox - 6 * step, oy), (W - 26 * MM, oy)], fill=INK, width=4)
d.line([(ox + 2 * sc, 4 * step), (ox + 2 * sc, H - 2 * step)], fill=INK, width=4)
ax = ox + 2 * sc
d.polygon([(W - 26 * MM, oy), (W - 26 * MM - 26, oy - 10), (W - 26 * MM - 26, oy + 10)], fill=INK)
d.polygon([(ax, 4 * step), (ax - 10, 4 * step + 26), (ax + 10, 4 * step + 26)], fill=INK)
text(W - 26 * MM - 30, oy + 10, 'x', 70)
text(ax + 20, 4 * step - 10, 'y', 70)
pts = []
for i in range(0, 161):
    xv = -0.7 + i * (5.4 / 160)
    yv = xv * xv - 4 * xv + 3
    px, py = ax + xv * sc, oy - yv * sc
    if 3 * step < py < H - step:
        pts.append((px, py))
d.line(pts, fill=INK, width=6, joint='curve')
for xv in (1, 3):
    d.ellipse([ax + xv * sc - 9, oy - 9, ax + xv * sc + 9, oy + 9], fill=INK)
d.ellipse([ax + 2 * sc - 9, oy + sc - 9, ax + 2 * sc + 9, oy + sc + 9], fill=INK)
text(ax + 2 * sc + 18, oy + sc + 4, '(2; −1)', 64)
text(W / 2 + 30 * MM, 2.2 * step, 'y = x² − 4x + 3', 80)

fx, fy = W - 15 * MM, 2.2 * step
d.line([(fx + 52, fy), (fx + 6, fy + 4), (fx, fy + 48)], fill=RED, width=8, joint='curve')
d.arc([fx - 6, fy + 30, fx + 60, fy + 106], start=-150, end=140, fill=RED, width=8)
d.line([(W - 34 * MM, 9.2 * step), (W - 30 * MM, 10.6 * step), (W - 24 * MM, 7.4 * step)], fill=RED, width=7)

img = img.filter(ImageFilter.GaussianBlur(0.6))
img.save(sys.argv[1] if len(sys.argv) > 1 else 'page.png')
