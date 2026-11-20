# Детальные модели мебели: кант по швам, прожимы и складки на подушках,
# точёные ножки с латунным колпачком, стёжка матраса, мягкие тени в складках
# (запечены в цвета вершин). Запуск из папки проекта:
#   python3 scripts/parts_hd.py && npx @gltf-transform/cli@4.1.1 meshopt public/assets/parts_hd.glb public/assets/parts_hd.glb
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix, noise

bpy.ops.wm.read_factory_settings(use_empty=True)
OUT = 'public/assets/parts_hd.glb'
FAST = '--fast' in sys.argv
W = 0.64
TARGETS = {}


def clamp(v, a, b):
    return a if v < a else b if v > b else v


def smooth(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def fall(t, p=4):
    return max(0.0, 1 - min(1.0, abs(t)) ** p)


def axis(h, r, step, k):
    inner = max(h - r, 0.0)
    n = max(1, math.ceil(2 * inner / step)) if inner > 1e-6 else 0
    flat = [-inner + 2 * inner * i / n for i in range(n + 1)] if n else [0.0]
    th = [math.pi / 4 * j / k for j in range(1, k + 1)]
    right = [inner + r * math.tan(t) for t in th]
    return [-x for x in reversed(right)] + flat + right


class RBox:
    """Скруглённая коробка: равномерная сетка на гранях, точные скругления по рёбрам."""

    def __init__(s, half, r, step=0.02, k=4):
        s.h = half
        s.r = r
        s.i = [half[a] - r[a] for a in range(3)]
        s.lists = [axis(half[a], r[a], step, k) for a in range(3)]

    def proj(s, p):
        q = [clamp(p[a], -s.i[a], s.i[a]) for a in range(3)]
        d = [(p[a] - q[a]) / s.r[a] for a in range(3)]
        l = math.sqrt(sum(x * x for x in d))
        if l < 1e-9:
            n = Vector([(1 if p[a] > 0 else -1) if abs(p[a]) >= s.h[a] - 1e-6 else 0 for a in range(3)]).normalized()
            return Vector(p), n
        n = Vector([d[a] / s.r[a] for a in range(3)]).normalized()
        return Vector([q[a] + d[a] / l * s.r[a] for a in range(3)]), n

    def build(s, bm, deform):
        X, Y, Z = s.lists
        hx, hy, hz = s.h
        cache = {}

        def V(p):
            key = tuple(round(c, 5) for c in p)
            v = cache.get(key)
            if v is None:
                q, n = s.proj(p)
                v = bm.verts.new(deform(q, n))
                cache[key] = v
            return v

        def grid(us, vs, f):
            rows = [[V(f(u, v)) for u in us] for v in vs]
            for j in range(len(vs) - 1):
                for i in range(len(us) - 1):
                    bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))

        for sg in (1, -1):
            grid(X, Y, lambda u, v: (u, v, sg * hz))
            grid(X, Z, lambda u, v: (u, sg * hy, v))
            grid(Y, Z, lambda u, v: (sg * hx, u, v))

    def seam(s, ax, sg, deform, density=0.006):
        a, b = [i for i in range(3) if i != ax]
        ha, hb = s.h[a], s.h[b]
        A, B = s.lists[a], s.lists[b]
        pts = [Vector((u, -hb)) for u in A[:-1]] + [Vector((ha, v)) for v in B[:-1]]
        pts += [Vector((u, hb)) for u in reversed(A[1:])] + [Vector((-ha, v)) for v in reversed(B[1:])]
        out = []
        for uv in pts:
            p = [0.0, 0.0, 0.0]
            p[ax] = sg * s.h[ax]
            p[a], p[b] = uv.x, uv.y
            q, n = s.proj(p)
            out.append((deform(q, n), n))
        return out


def tube(bm, path, radius, m=10, offset=0.55, closed=True):
    N = len(path)
    rings = []
    for i, (p, n) in enumerate(path):
        a = path[(i + 1) % N][0] if closed or i < N - 1 else p
        b = path[i - 1][0] if closed or i > 0 else p
        t = (a - b).normalized()
        nn = (n - t * n.dot(t)).normalized()
        bb = t.cross(nn)
        c = p + nn * radius * offset
        rings.append([bm.verts.new(c + (nn * math.cos(2 * math.pi * j / m) + bb * math.sin(2 * math.pi * j / m)) * radius) for j in range(m)])
    for i in range(N if closed else N - 1):
        r0, r1 = rings[i], rings[(i + 1) % N]
        for j in range(m):
            bm.faces.new((r0[j], r1[j], r1[(j + 1) % m], r0[(j + 1) % m]))


def lathe(bm, prof, seg=28, M=Matrix.Identity(4), off=0.0):
    rings = []
    for r, z in prof:
        if r < 1e-7:
            rings.append([bm.verts.new(M @ Vector((0, 0, z)))])
        else:
            rings.append([bm.verts.new(M @ Vector((r * math.cos(2 * math.pi * j / seg + off), r * math.sin(2 * math.pi * j / seg + off), z))) for j in range(seg)])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for j in range(seg):
                bm.faces.new((a[0], b[j], b[(j + 1) % seg]))
        elif len(b) == 1:
            for j in range(seg):
                bm.faces.new((a[j], a[(j + 1) % seg], b[0]))
        else:
            for j in range(seg):
                bm.faces.new((a[j], a[(j + 1) % seg], b[(j + 1) % seg], b[j]))


def finish(name, bm, M=Matrix.Identity(4), angle=1.0):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.transform(M)
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.shade_smooth_by_angle(angle=angle)
    TARGETS[name] = o
    return o


def wrinkles(q, n, h, ax, sg, amp, reach=0.07, k=10, phase=0.0):
    """Веер складок от углов грани ax*sg к центру."""
    a, b = [i for i in range(3) if i != ax]
    w = smooth(0.25, 0.9, sg * q[ax] / h[ax])
    if w <= 0:
        return 0.0
    out = 0.0
    for ca in (-1, 1):
        for cb in (-1, 1):
            da = (q[a] - ca * h[a]) * -ca
            db = (q[b] - cb * h[b]) * -cb
            d = math.hypot(da, db)
            th = math.atan2(db, da)
            out += math.exp(-d / reach) * math.sin(th * k + phase + ca * 1.3 + cb * 0.7) * smooth(0.005, 0.03, d)
    return amp * w * out


def cushion(half, crown, back_crown, bulge, face=(2, 1), wr=0.003, lumps=0.0012, dent=None, seed=0.0):
    ax, sg = face
    h = half

    def deform(q, n):
        p = q.copy()
        a, b = [i for i in range(3) if i != ax]
        # пухлая лицевая и тыльная стороны
        top = smooth(0.2, 0.95, sg * q[ax] / h[ax])
        bot = smooth(0.2, 0.95, -sg * q[ax] / h[ax])
        cf = fall(q[a] / h[a]) * fall(q[b] / h[b])
        p[ax] += sg * crown * cf * top - sg * back_crown * cf * bot
        # боковины чуть выпирают
        for s_ax in (a, b):
            o_ax = b if s_ax == a else a
            side = smooth(0.55, 1.0, abs(q[s_ax]) / h[s_ax])
            p[s_ax] += math.copysign(bulge * side * fall(q[o_ax] / h[o_ax]) * fall(q[ax] / h[ax], 2), q[s_ax])
        # продавленность от сидения
        if dent:
            da, db, ra, rb, depth = dent
            p[ax] -= sg * depth * top * math.exp(-(((q[a] - da) / ra) ** 2 + ((q[b] - db) / rb) ** 2))
        # складки от углов
        p[ax] += sg * wrinkles(q, n, h, ax, sg, wr)
        # мелкая неровность набивки
        p += n * lumps * noise.noise(q * 11 + Vector((seed, seed * 2, 0)))
        return p

    return deform


def rbox_part(name, half, r, center=(0, 0, 0), step=0.02, k=4, deform=None, seams=(), pipe=0.0055, rot=None, extra=None):
    bm = bmesh.new()
    box = RBox(half, r, step, k)
    d = deform or (lambda q, n: q)
    box.build(bm, d)
    for ax, sg in seams:
        tube(bm, box.seam(ax, sg, d), pipe)
    if extra:
        extra(bm)
    M = Matrix.Translation(center)
    if rot:
        M = M @ Matrix.Rotation(rot, 4, 'X')
    return finish(name, bm, M)


# ---------- диван ----------
TOP, BOT = (2, 1), (2, -1)
for n in (1, 2, 3, 4):
    half = (n * W / 2, 0.45, 0.12)
    rbox_part(f'base{n}', half, (0.025, 0.025, 0.025), (0, 0, 0.22), step=0.05,
              deform=cushion(half, 0.004, 0.0, 0.004, lumps=0.0008, wr=0.0), seams=(TOP, BOT))
    half = (n * W / 2, 0.1, 0.3)
    rbox_part(f'backframe{n}', half, (0.035, 0.035, 0.04), (0, -0.35, 0.5), step=0.045,
              deform=cushion(half, 0.008, 0.0, 0.006, lumps=0.0008, wr=0.0), seams=(TOP,))

half = (W / 2, 0.8, 0.12)
rbox_part('chaise_base', half, (0.025, 0.025, 0.025), (0, 0.35, 0.22), step=0.05,
          deform=cushion(half, 0.004, 0.0, 0.004, lumps=0.0008, wr=0.0), seams=(TOP, BOT))

half = ((W - 0.015) / 2, 0.35, 0.08)
rbox_part('seat', half, (0.05, 0.05, 0.03), (0, 0.08, 0.41), step=0.016,
          deform=cushion(half, 0.016, 0.004, 0.009, wr=0.0035, dent=(0.0, 0.03, 0.17, 0.2, 0.009), seed=1.0),
          seams=(TOP, BOT))
half = ((W - 0.015) / 2, 0.68, 0.08)
rbox_part('chaise_seat', half, (0.05, 0.05, 0.03), (0, 0.45, 0.41), step=0.02,
          deform=cushion(half, 0.018, 0.004, 0.009, wr=0.0035, dent=(0.0, -0.25, 0.17, 0.22, 0.008), seed=2.0),
          seams=(TOP, BOT))

# спинка: подушка заваливается назад на 11 градусов
FRONT, REAR = (1, 1), (1, -1)
half = ((W - 0.025) / 2, 0.1, 0.22)
rbox_part('back', half, (0.07, 0.06, 0.07), (0, -0.17, 0.69), step=0.016,
          deform=cushion(half, 0.034, 0.012, 0.012, face=FRONT, wr=0.0045, lumps=0.0014,
                         dent=(0.0, -0.06, 0.16, 0.08, 0.006), seed=3.0),
          seams=(FRONT, REAR), rot=math.radians(11))


def chaikin(pts, it=4):
    for _ in range(it):
        out = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            out += [a.lerp(b, 0.25), a.lerp(b, 0.75)]
        pts = out
    return pts


def resample(pts, N):
    L = [0.0]
    for i in range(len(pts)):
        L.append(L[-1] + (pts[(i + 1) % len(pts)] - pts[i]).length)
    total = L[-1]
    out, j = [], 0
    for i in range(N):
        t = total * i / N
        while L[j + 1] < t:
            j += 1
        f = (t - L[j]) / (L[j + 1] - L[j])
        out.append(pts[j].lerp(pts[(j + 1) % len(pts)], f))
    return out


def roll_arm(name, ctrl, hy=0.45, re=0.03, k=6, step=0.03, N=110):
    prof = resample(chaikin([Vector(c) for c in ctrl]), N)
    # внешние нормали (контур против часовой в плоскости x-z)
    nrm = []
    for i in range(N):
        a, b = prof[i - 1], prof[(i + 1) % N]
        t = (b - a).normalized()
        nrm.append(Vector((t.y, -t.x)))
    cen = sum(prof, Vector((0, 0))) / N
    cen.y = 0.42
    zmin = min(p.y for p in prof)
    zmax = max(p.y for p in prof)
    stations = []
    for j in range(k, 0, -1):
        th = math.pi / 2 * j / k
        stations.append((-(hy - re + re * math.sin(th)), re * (1 - math.cos(th))))
    nflat = max(1, math.ceil(2 * (hy - re) / step))
    stations += [(-(hy - re) + 2 * (hy - re) * i / nflat, 0.0) for i in range(nflat + 1)]
    for j in range(1, k + 1):
        th = math.pi / 2 * j / k
        stations.append((hy - re + re * math.sin(th), re * (1 - math.cos(th))))

    def pt(i, y, inset):
        p = prof[i] - nrm[i] * inset
        # сборки ткани у передней панели на валике
        upper = smooth(zmin + 0.42 * (zmax - zmin), zmin + 0.6 * (zmax - zmin), p.y)
        near = smooth(hy - 0.09, hy - re * 0.5, abs(y))
        p = p + nrm[i] * (0.0022 * math.sin(i * 2 * math.pi * 22 / N) * upper * near)
        lump = noise.noise(Vector((p.x * 9, y * 9, p.y * 9))) * 0.0009
        p = p + nrm[i] * lump
        return Vector((p.x, y, p.y))

    bm = bmesh.new()
    rings = [[bm.verts.new(pt(i, y, ins)) for i in range(N)] for y, ins in stations]
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(N):
            bm.faces.new((r0[i], r0[(i + 1) % N], r1[(i + 1) % N], r1[i]))
    # торцевые панели: кольца к центру
    for end, y in ((rings[0], stations[0][0]), (rings[-1], stations[-1][0])):
        prev = end
        M = 5
        for m in range(1, M):
            f = 1 - m / M
            ring = []
            for i in range(N):
                base = Vector((end[i].co.x, end[i].co.z))
                q = cen + (base - cen) * f
                ring.append(bm.verts.new(Vector((q.x, y, q.y))))
            for i in range(N):
                bm.faces.new((prev[i], prev[(i + 1) % N], ring[(i + 1) % N], ring[i]))
            prev = ring
        c = bm.verts.new(Vector((cen.x, y, cen.y)))
        for i in range(N):
            bm.faces.new((prev[i], prev[(i + 1) % N], c))
    # кант по передней и задней панели
    for sg in (1, -1):
        th = math.radians(78)
        y = sg * (hy - re + re * math.sin(th))
        ins = re * (1 - math.cos(th))
        path = []
        for i in range(N):
            p = pt(i, y, ins)
            n3 = Vector((nrm[i].x * math.cos(th), sg * math.sin(th), nrm[i].y * math.cos(th))).normalized()
            path.append((p, n3))
        tube(bm, path, 0.0055)
    return finish(name, bm)


roll_arm('arm_round', [(-0.078, 0.10), (0.078, 0.10), (0.082, 0.47), (0.112, 0.55), (0.11, 0.66),
                       (0.065, 0.712), (0, 0.718), (-0.065, 0.712), (-0.11, 0.66), (-0.112, 0.55), (-0.082, 0.47)])
half = (0.075, 0.45, 0.28)
rbox_part('arm_square', half, (0.022, 0.022, 0.022), (0, 0, 0.38), step=0.025,
          deform=cushion(half, 0.006, 0.0, 0.004, wr=0.0015, lumps=0.0008, seed=4.0), seams=(TOP, FRONT, REAR))
half = (0.1, 0.45, 0.2)
rbox_part('arm_low', half, (0.06, 0.06, 0.06), (0, 0, 0.3), step=0.018,
          deform=cushion(half, 0.01, 0.0, 0.006, wr=0.002, lumps=0.001, seed=5.0), seams=(FRONT, REAR))


def pillow(name, hx=0.21, hz=0.21, t=0.062, n=44):
    bm = bmesh.new()
    s = [math.sin(math.pi / 2 * (-1 + 2 * i / (n - 1))) for i in range(n)]
    cache = {}

    def P(u, v, side):
        au, av = abs(u), abs(v)
        edge = au > 0.9999 or av > 0.9999
        key = (round(u, 6), round(v, 6), 0 if edge else side)
        if key in cache:
            return cache[key]
        th = t * ((1 - au ** 2.3) * (1 - av ** 2.3)) ** 0.55
        x = u * hx * (1 - 0.075 * (1 - v * v))
        z = v * hz * (1 - 0.075 * (1 - u * u))
        y = side * th
        if not edge:
            w = smooth(0.0, 0.5, th / t)
            for cu in (-1, 1):
                for cv in (-1, 1):
                    dx, dz = (x - cu * hx) * -cu, (z - cv * hz) * -cv
                    d = math.hypot(dx, dz)
                    ang = math.atan2(dz, dx)
                    y += side * 0.005 * w * math.exp(-d / 0.075) * math.sin(ang * 9 + cu + side)
            y += side * 0.0012 * noise.noise(Vector((x * 12, z * 12, side * 3)))
        v_ = bm.verts.new(Vector((x, y, z)))
        cache[key] = v_
        return v_

    for side in (1, -1):
        rows = [[P(u, v, side) for u in s] for v in s]
        for j in range(n - 1):
            for i in range(n - 1):
                bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    per = []
    for i in range(n - 1):
        per.append((s[i], -1.0))
    for i in range(n - 1):
        per.append((1.0, s[i]))
    for i in range(n - 1, 0, -1):
        per.append((s[i], 1.0))
    for i in range(n - 1, 0, -1):
        per.append((-1.0, s[i]))
    path = []
    for u, v in per:
        x = u * hx * (1 - 0.075 * (1 - v * v))
        z = v * hz * (1 - 0.075 * (1 - u * u))
        path.append((Vector((x, 0, z)), Vector((x, 0, z)).normalized()))
    tube(bm, path, 0.0058, offset=0.0)
    return finish(name, bm)


pillow('pillow')

# ножки: точёное дерево с латунным колпачком, тонкая металлическая, цоколь
lathe_bm = bmesh.new()
lathe(lathe_bm, [(0, 0.016), (0.0158, 0.016), (0.0172, 0.03), (0.0205, 0.058), (0.0232, 0.074),
                 (0.0262, 0.0785), (0.0268, 0.082), (0.0262, 0.0855), (0.0236, 0.088), (0.0236, 0.09),
                 (0.0295, 0.0915), (0.03, 0.0935), (0.03, 0.1), (0, 0.1)], seg=32)
finish('leg_wood', lathe_bm, angle=0.6)
cap_bm = bmesh.new()
lathe(cap_bm, [(0, 0), (0.0152, 0), (0.0166, 0.0012), (0.0168, 0.0032), (0.0168, 0.0148), (0.0172, 0.0162),
               (0.0165, 0.0172), (0, 0.0172)], seg=32)
finish('leg_cap', cap_bm, angle=0.6)
met_bm = bmesh.new()
lathe(met_bm, [(0, 0), (0.0115, 0), (0.0125, 0.003), (0.0155, 0.086), (0.0158, 0.09), (0.0235, 0.0905),
               (0.024, 0.1), (0, 0.1)], seg=4, off=math.pi / 4)
finish('leg_metal', met_bm, angle=0.6)
rbox_part('leg_plinth', (0.5, 0.4, 0.04), (0.008, 0.008, 0.008), (0, 0, 0.05), step=0.05)


# ---------- обеденный стул ----------
def chair_frame():
    bm = bmesh.new()
    legs = [(x, y) for x in (-0.2, 0.2) for y in (0.2,)]
    for x, y in legs:
        lathe(bm, [(0, 0), (0.0135, 0), (0.0145, 0.004), (0.0175, 0.2), (0.0205, 0.4), (0.021, 0.44), (0, 0.44)],
              seg=20, M=Matrix.Translation((x, y, 0)))
    tilt = math.radians(9)
    for x in (-0.2, 0.2):
        lathe(bm, [(0, 0), (0.0135, 0), (0.0145, 0.004), (0.0175, 0.2), (0.02, 0.44), (0, 0.44)],
              seg=20, M=Matrix.Translation((x, -0.18, 0)))
        M = Matrix.Translation((x, -0.18, 0.43)) @ Matrix.Rotation(tilt, 4, 'X')
        lathe(bm, [(0, 0), (0.02, 0), (0.0185, 0.3), (0.0175, 0.5), (0.019, 0.515), (0.0175, 0.53), (0.008, 0.538), (0, 0.539)],
              seg=20, M=M)
    # царги и проножки
    def bar(p0, p1, r):
        p0, p1 = Vector(p0), Vector(p1)
        d = p1 - p0
        M = Matrix.Translation(p0) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        lathe(bm, [(0, 0), (r, 0), (r, d.length), (0, d.length)], seg=14, M=M)
    for x in (-0.2, 0.2):
        bar((x, -0.18, 0.14), (x, 0.2, 0.14), 0.0095)
    bar((-0.2, 0.01, 0.15), (0.2, 0.01, 0.15), 0.009)
    box = RBox((0.215, 0.2, 0.03), (0.006, 0.006, 0.006), 0.04, 2)
    box.build(bm, lambda q, n: q + Vector((0, 0.01, 0.42)))
    return finish('chair_frame', bm, angle=0.7)


chair_frame()
half = (0.23, 0.22, 0.035)
rbox_part('chair_seat', half, (0.045, 0.045, 0.022), (0, 0.02, 0.48), step=0.012,
          deform=cushion(half, 0.012, 0.002, 0.004, wr=0.0025, lumps=0.0008, seed=6.0), seams=(TOP,), pipe=0.0045)
half = (0.205, 0.028, 0.16)
rbox_part('chair_back', half, (0.03, 0.02, 0.03), (0, -0.215, 0.8), step=0.012,
          deform=cushion(half, 0.008, 0.002, 0.003, face=FRONT, wr=0.002, lumps=0.0007, seed=7.0),
          seams=(FRONT,), pipe=0.0042, rot=math.radians(9))


# ---------- матрас ----------
def quilt(half):
    hx, hy, hz = half

    def deform(q, n):
        p = q.copy()
        top = smooth(0.4, 0.98, q.z / hz)
        cf = fall(q.x / hx, 6) * fall(q.y / hy, 6)
        p.z += 0.012 * cf * top
        # прожимы в узлах ромбовой стёжки (та же сетка, что у строчки в текстуре)
        A, B = q.x + 0.4 - q.y, q.x - 0.4 + q.y
        dA, dB = A - round(A * 4) / 4, B - round(B * 4) / 4
        d2 = (dA * dA + dB * dB) / 2
        p.z -= 0.012 * math.exp(-d2 / 0.0009) * top * cf
        side = smooth(0.7, 1.0, max(abs(q.x) / hx, abs(q.y) / hy))
        p.x += math.copysign(0.004 * side * fall(q.z / hz, 2) * fall(q.y / hy), q.x)
        p.y += math.copysign(0.004 * side * fall(q.z / hz, 2) * fall(q.x / hx), q.y)
        p += n * 0.0009 * noise.noise(q * 8)
        return p

    return deform


half = (0.8, 1.0, 0.12)
rbox_part('mattress', half, (0.04, 0.04, 0.035), (0, 0, 0.12), step=0.02, deform=quilt(half), seams=(TOP, BOT), pipe=0.0065)


def band_handles(bm):
    for sx in (-1, 1):
        for y in (-0.42, 0.42):
            b = RBox((0.009, 0.06, 0.009), (0.004, 0.004, 0.004), 0.02, 2)
            b.build(bm, lambda q, n, sx=sx, y=y: Vector((q.x + sx * 0.817, q.y + y, q.z)))


rbox_part('mattress_band', (0.81, 1.01, 0.025), (0.014, 0.014, 0.012), (0, 0, 0.12), step=0.04, extra=band_handles)

# ---------- развёртка, материалы, запекание мягких теней ----------
for o in TARGETS.values():
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=0.4)
    bpy.ops.object.mode_set(mode='OBJECT')
    if o.name == 'mattress':
        # развёртка в метрах/0.4 без сдвига, чтобы строчка легла через прожимы
        uv = o.data.uv_layers.active.data
        for poly in o.data.polygons:
            nx, ny, nz = (abs(c) for c in poly.normal)
            for li in poly.loop_indices:
                co = o.data.vertices[o.data.loops[li].vertex_index].co
                if nz >= nx and nz >= ny:
                    uv[li].uv = (co.x / 0.4, co.y / 0.4)
                elif nx >= ny:
                    uv[li].uv = (co.y / 0.4, co.z / 0.4)
                else:
                    uv[li].uv = (co.x / 0.4, co.z / 0.4)
    o.data.materials.append(bpy.data.materials.new(o.name))
    col = o.data.color_attributes.new(name='ao', type='FLOAT_COLOR', domain='POINT')
    o.data.color_attributes.active_color = col
    o.data.attributes.active_color = col

floor_me = bpy.data.meshes.new('floor')
bmf = bmesh.new()
bmesh.ops.create_grid(bmf, x_segments=1, y_segments=1, size=6)
bmf.to_mesh(floor_me)
bmf.free()
floor = bpy.data.objects.new('FLOOR', floor_me)
bpy.context.collection.objects.link(floor)
floor.data.materials.append(bpy.data.materials.new('floor'))


def P(name, x=0.0, y=0.0, z=0.0, sx=1.0, sy=1.0):
    return (name, Matrix.Translation((x, y, z)) @ Matrix.Diagonal((sx, sy, 1, 1)))


def sofa_ctx(n, arms='arm_round', aw=0.11, skip=()):
    out = [P('FLOOR')]
    for i in range(n):
        x = -n * W / 2 + (i + 0.5) * W
        out += [P('seat', x), P('back', x)]
    out += [P(f'base{n}'), P(f'backframe{n}')]
    out += [P(arms, -n * W / 2 - aw), P(arms, n * W / 2 + aw, sx=-1)]
    for x in (-n * W / 2 - 2 * aw + 0.07, n * W / 2 + 2 * aw - 0.07):
        for y in (-0.37, 0.37):
            out.append(P('leg_wood', x, y))
    return [c for c in out if c[0] not in skip]


def arm_ctx(aw):
    x = aw + W
    return [P('FLOOR'), P('base2', x), P('backframe2', x), P('seat', aw + W / 2), P('seat', aw + 1.5 * W),
            P('back', aw + W / 2), P('back', aw + 1.5 * W), P('leg_wood', -aw + 0.07, -0.37), P('leg_wood', -aw + 0.07, 0.37)]


CHAISE = [P('FLOOR'), P('chaise_base'), P('chaise_seat'), P('backframe1'), P('back'), P('base2', -1.5 * W),
          P('backframe2', -1.5 * W), P('seat', -W), P('seat', -2 * W), P('back', -W),
          P('arm_round', W / 2 + 0.11, 0.35, sx=-1, sy=1.6 / 0.9)]
CTX = {
    'seat': [c for c in sofa_ctx(3) if not (c[0] == 'seat' and abs(c[1].translation.x) < 1e-6)],
    'back': [c for c in sofa_ctx(3) if not (c[0] == 'back' and abs(c[1].translation.x) < 1e-6)],
    'chaise_seat': [c for c in CHAISE if c[0] != 'chaise_seat'],
    'chaise_base': [c for c in CHAISE if c[0] != 'chaise_base'],
    'arm_round': arm_ctx(0.11), 'arm_square': arm_ctx(0.075), 'arm_low': arm_ctx(0.1),
    'pillow': [],
    'leg_wood': [P('FLOOR'), P('base1', 0.25), P('leg_cap')],
    'leg_cap': [P('FLOOR'), P('base1', 0.25), P('leg_wood')],
    'leg_metal': [P('FLOOR'), P('base1', 0.25)],
    'leg_plinth': [P('FLOOR'), P('base3')],
    'chair_frame': [P('FLOOR'), P('chair_seat'), P('chair_back')],
    'chair_seat': [P('FLOOR'), P('chair_frame'), P('chair_back')],
    'chair_back': [P('FLOOR'), P('chair_frame'), P('chair_seat')],
    'mattress': [P('FLOOR'), P('mattress_band')],
    'mattress_band': [P('FLOOR'), P('mattress')],
}
for n in (1, 2, 3, 4):
    CTX[f'base{n}'] = sofa_ctx(n, skip=(f'base{n}',))
    CTX[f'backframe{n}'] = sofa_ctx(n, skip=(f'backframe{n}',))

sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 16 if FAST else 96
sc.render.bake.target = 'VERTEX_COLORS'
world = bpy.data.worlds.new('w')
sc.world = world
world.light_settings.distance = 0.14
ALL = list(TARGETS.values()) + [floor]

for name, o in TARGETS.items():
    temps = []
    for src, M in CTX.get(name, []):
        so = floor if src == 'FLOOR' else TARGETS[src]
        t = bpy.data.objects.new('ctx_' + src, so.data)
        t.matrix_world = M
        bpy.context.collection.objects.link(t)
        temps.append(t)
    for x in ALL:
        x.hide_render = x is not o
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.bake(type='AO')
    for t in temps:
        bpy.data.objects.remove(t)
    col = o.data.color_attributes['ao']
    for d in col.data:
        ao = d.color[0]
        v = 1 - 0.78 * (1 - ao)
        d.color = (v, v, v, 1)
    print(name, len(o.data.vertices), 'verts', flush=True)

bpy.data.objects.remove(floor)
for o in TARGETS.values():
    o.hide_render = False
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True,
                          export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                          export_draco_mesh_compression_enable=False)
print('exported', OUT)
