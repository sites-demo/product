# Натюрморт для первого экрана: стол, кожаный бювар, тетрадь с решением, перьевая ручка, циркуль, книги.
# python3 desk.py [wide|tall] [samples] [out.png]
import math, sys, os, bpy, bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
mode = sys.argv[1] if len(sys.argv) > 1 else 'wide'
samples = int(sys.argv[2]) if len(sys.argv) > 2 else 64
out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(HERE, f'desk_{mode}.png')
page_png = os.path.join(HERE, '..', 'build-cache', 'page.png')
os.makedirs(os.path.dirname(page_png), exist_ok=True)
os.system(f'cd "{HERE}" && python3 page.py "{page_png}"')

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def mat(name, color, rough=0.5, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    return m, b, m.node_tree

def bump(nt, bsdf, scale, strength, detail=8):
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = strength; bp.inputs['Distance'].default_value = 0.001
    nt.links.new(n.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], bsdf.inputs['Normal'])
    return n

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        md = o.modifiers.new('b', 'BEVEL'); md.width = bevel; md.segments = 3
    o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return o

def cyl(name, r, depth, loc, m, rot=(0, 0, 0), r2=None, verts=48):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object; o.name = name; o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return o

def parent(objs, name, loc=(0, 0, 0), rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None); sc.collection.objects.link(e)
    for o in objs: o.parent = e
    e.location = loc; e.rotation_euler = rot
    return e

# стол: тёмный орех
wood, wb, wnt = mat('wood', srgb('#3a2418'), 0.62, coat=0.0)
wave = wnt.nodes.new('ShaderNodeTexWave'); wave.inputs['Scale'].default_value = 2.2; wave.inputs['Distortion'].default_value = 7; wave.inputs['Detail'].default_value = 6
wave.bands_direction = 'Y'
ramp = wnt.nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].color = (*srgb('#24150d'), 1); ramp.color_ramp.elements[1].color = (*srgb('#4a2e1c'), 1)
wnt.links.new(wave.outputs['Fac'], ramp.inputs['Fac']); wnt.links.new(ramp.outputs['Color'], wb.inputs['Base Color'])
box('desk', (3, 3, 0.04), (0, 0, -0.02), wood)

# бювар: тёмно-зелёная кожа с латунными уголками
leather, lb, lnt = mat('leather', srgb('#173a2f'), 0.55)
bump(lnt, lb, 900, 0.12, 12)
box('blotter', (0.70, 0.46, 0.006), (0.03, -0.01, 0.003), leather, bevel=0.002)
brass, bb, bnt = mat('brass', srgb('#c9a464'), 0.24, metal=1.0)
for sx in (-1, 1):
    for sy in (-1, 1):
        cx, cy = 0.03 + sx * 0.35, -0.01 + sy * 0.23
        box('corner', (0.05, 0.012, 0.0035), (cx - sx * 0.019, cy - sy * 0.0055, 0.0065), brass, bevel=0.0012)
        box('corner', (0.012, 0.05, 0.0035), (cx - sx * 0.0055, cy - sy * 0.019, 0.0065), brass, bevel=0.0012)

gold, _, _ = mat('gold', srgb('#d8b56c'), 0.18, metal=1.0)
# кант бювара: тёмная окантовка со строчкой
rim, rb, rnt = mat('rim', srgb('#132f26'), 0.6)
bump(rnt, rb, 900, 0.1, 12)
for sy in (-1, 1):
    box('rim', (0.70, 0.026, 0.0016), (0.03, -0.01 + sy * 0.217, 0.0064), rim, bevel=0.0006)
for sx in (-1, 1):
    box('rim', (0.026, 0.46, 0.0016), (0.03 + sx * 0.337, -0.01, 0.0064), rim, bevel=0.0006)

# чашка чая: фарфор с золотым ободком
def lathe(name, prof, m, loc):
    bm2 = bmesh.new()
    vs = [bm2.verts.new((r, 0, z)) for r, z in prof]
    for a, b in zip(vs, vs[1:]): bm2.edges.new((a, b))
    me2 = bpy.data.meshes.new(name); bm2.to_mesh(me2)
    o = bpy.data.objects.new(name, me2); sc.collection.objects.link(o)
    md = o.modifiers.new('screw', 'SCREW'); md.steps = 96; md.render_steps = 96; md.use_smooth_shade = True
    md2 = o.modifiers.new('sub', 'SUBSURF'); md2.levels = 1; md2.render_levels = 2
    o.data.materials.append(m); o.location = loc
    return o
porcelain, ppb, _ = mat('porcelain', srgb('#f3efe6'), 0.12, coat=0.6)
ppb.inputs['Subsurface Weight'].default_value = 0.15
tea, tb, _ = mat('tea', srgb('#3b1a08'), 0.05)
saucer = lathe('saucer', [(0, 0.001), (0.03, 0.001), (0.05, 0.004), (0.072, 0.012), (0.074, 0.013), (0.071, 0.0128), (0.05, 0.0062), (0.03, 0.0048), (0, 0.0048)], porcelain, (0.235, 0.15, 0.006))
cup = lathe('cup', [(0, 0.0), (0.024, 0.0), (0.026, 0.004), (0.04, 0.03), (0.046, 0.055), (0.047, 0.058), (0.045, 0.058), (0.044, 0.055), (0.038, 0.031), (0.024, 0.008), (0, 0.008)], porcelain, (0.235, 0.15, 0.0108))
bpy.ops.mesh.primitive_torus_add(major_radius=0.0458, minor_radius=0.0011, location=(0.235, 0.15, 0.0108 + 0.0585), major_segments=96)
t = bpy.context.object; t.data.materials.append(gold)
bpy.ops.mesh.primitive_torus_add(major_radius=0.0715, minor_radius=0.0008, location=(0.235, 0.15, 0.006 + 0.0132), major_segments=96)
t = bpy.context.object; t.data.materials.append(gold)
bpy.ops.mesh.primitive_cylinder_add(radius=0.0428, depth=0.001, location=(0.235, 0.15, 0.0108 + 0.047), vertices=96)
bpy.context.object.data.materials.append(tea)
bpy.ops.mesh.primitive_torus_add(major_radius=0.014, minor_radius=0.0035, location=(0.235 + 0.054, 0.15, 0.0108 + 0.034), rotation=(math.pi / 2, 0, 0), major_segments=48)
h = bpy.context.object; h.scale = (0.8, 1, 1.15); h.data.materials.append(porcelain); bpy.ops.object.shade_smooth()

# тетрадь: обложка, стопка листов, разворот с изгибом у корешка
cover, cb, _ = mat('cover', srgb('#5b1f1c'), 0.6)
paper_m, pb, pnt = mat('paper', srgb('#f2ecdd'), 0.75)
pb.inputs['Subsurface Weight'].default_value = 0.08
tex = pnt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(page_png)
pnt.links.new(tex.outputs['Color'], pb.inputs['Base Color'])
bump(pnt, pb, 400, 0.04, 6)
edge_m, _, _ = mat('pages', srgb('#ece4d2'), 0.8)

NW, NH = 0.296, 0.21
nb_objs = [box('nb_cover', (NW + 0.008, NH + 0.008, 0.0016), (0, 0, 0.0008), cover, bevel=0.0006)]
for sx in (-1, 1):
    nb_objs.append(box('nb_stack', (NW / 2 - 0.004, NH - 0.002, 0.0028), (sx * (NW / 4 + 0.001), 0, 0.003), edge_m, bevel=0.0008))
bm = bmesh.new()
nx, ny = 96, 24
verts = []
for j in range(ny + 1):
    row = []
    for i in range(nx + 1):
        u, v = i / nx, j / ny
        x = (u - 0.5) * NW; y = (v - 0.5) * NH
        a = abs(x)
        z = 0.0046 + 0.0045 * (1 - math.exp(-a / 0.012)) - 0.0025 * (1 - math.exp(-a / 0.012)) * (a / (NW / 2)) + 0.0014 * max(0, (a - 0.12) / 0.028) ** 2
        row.append(bm.verts.new((x, y, z)))
    verts.append(row)
uv = bm.loops.layers.uv.new()
for j in range(ny):
    for i in range(nx):
        f = bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
        for l in f.loops:
            co = l.vert.co
            l[uv].uv = (co.x / NW + 0.5, co.y / NH + 0.5)
me = bpy.data.meshes.new('spread'); bm.to_mesh(me)
sp = bpy.data.objects.new('spread', me); sc.collection.objects.link(sp); me.materials.append(paper_m)
for p in me.polygons: p.use_smooth = True
sol = sp.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.0006
nb_objs.append(sp)
notebook = parent(nb_objs, 'notebook', loc=(0.06, -0.02, 0.006), rot=(0, 0, math.radians(-4)))

# перьевая ручка: чёрный лак, латунь, золотое перо
lacquer, _, _ = mat('lacquer', srgb('#0e0f12'), 0.06, coat=1.0)
R = 0.0062
pen = [
    cyl('barrel', R, 0.085, (0, 0, 0), lacquer, rot=(0, math.pi / 2, 0)),
    cyl('end', R, 0.012, (-0.0485, 0, 0), lacquer, rot=(0, math.pi / 2, 0), r2=R * 0.55),
    cyl('ring', R * 1.04, 0.004, (0.043, 0, 0), gold, rot=(0, math.pi / 2, 0)),
    cyl('grip', R * 0.86, 0.022, (0.056, 0, 0), lacquer, rot=(0, math.pi / 2, 0), r2=R * 0.7),
    cyl('ring2', R * 1.04, 0.003, (-0.03, 0, 0), gold, rot=(0, math.pi / 2, 0)),
]
bpy.ops.mesh.primitive_cone_add(radius1=R * 0.62, radius2=0.0004, depth=0.026, location=(0.078, 0, 0), rotation=(0, math.pi / 2, 0), vertices=48)
nib = bpy.context.object; nib.scale = (1, 1, 1); nib.scale.y = 0.38; nib.data.materials.append(gold); bpy.ops.object.shade_smooth()
pen.append(nib)
pen.append(box('clip', (0.05, 0.0024, 0.0014), (-0.022, 0, R + 0.0012), gold, bevel=0.0006))
parent(pen, 'pen', loc=(0.165, -0.035, 0.0128), rot=(0, 0, math.radians(118)))

# циркуль: никелированные ножки, латунный шарнир
nickel, _, _ = mat('nickel', srgb('#c9c7c2'), 0.2, metal=1.0)
steel, _, _ = mat('steel', srgb('#8a8b8d'), 0.3, metal=1.0)
comp = []
L = 0.12
for s in (-1, 1):
    a = math.radians(14 * s)
    dx, dy = math.sin(a) * L / 2, -math.cos(a) * L / 2
    comp.append(cyl('leg', 0.0034, L, (dx, dy, 0), nickel, rot=(math.pi / 2, 0, a), r2=0.0018))
    comp.append(cyl('tip', 0.0012, 0.012, (math.sin(a) * (L + 0.006), -math.cos(a) * (L + 0.006), 0), steel, rot=(math.pi / 2, 0, a), r2=0.0002))
comp.append(cyl('hinge', 0.009, 0.007, (0, 0, 0), brass, rot=(0, 0, 0)))
comp.append(cyl('knob', 0.0032, 0.016, (0, 0.012, 0), brass, rot=(math.pi / 2, 0, 0)))
parent(comp, 'compass', loc=(-0.19, -0.075, 0.0095), rot=(0, 0, math.radians(-70)))

# книги: зелёная и бордовая ткань, обрез, золотая рамка
def book(w, h, t, cloth_hex, loc, rz):
    cloth, cb2, cnt = mat('cloth' + cloth_hex, srgb(cloth_hex), 0.85)
    bump(cnt, cb2, 1400, 0.08, 4)
    o = [box('board', (w, h, 0.0028), (0, 0, t / 2 - 0.0014), cloth, bevel=0.001),
         box('board', (w, h, 0.0028), (0, 0, -t / 2 + 0.0014), cloth, bevel=0.001),
         box('spine', (0.004, h, t), (-w / 2 + 0.002, 0, 0), cloth, bevel=0.0015),
         box('block', (w - 0.008, h - 0.008, t - 0.005), (0.001, 0, 0), edge_m)]
    for k in (-1, 1):
        o.append(box('gild', (w - 0.03, 0.0016, 0.0003), (0.004, k * (h / 2 - 0.016), t / 2 + 0.0002), gold))
        o.append(box('gild', (0.0016, h - 0.03, 0.0003), (0.004 + k * (w / 2 - 0.019), 0, t / 2 + 0.0002), gold))
    return parent(o, 'book', loc=loc, rot=(0, 0, rz))
book(0.17, 0.24, 0.032, '#1f3a30', (-0.27, 0.17, 0.016), math.radians(10))
book(0.15, 0.215, 0.026, '#2e100f', (-0.26, 0.16, 0.032 + 0.013), math.radians(-4))

# свет: тёплое окно слева сверху, холодная заливка
bpy.ops.object.light_add(type='AREA', location=(-0.85, 0.5, 0.55))
key = bpy.context.object; key.data.energy = 38; key.data.size = 0.45; key.data.color = (1.0, 0.86, 0.7)
key.rotation_euler = (Vector((0.05, -0.02, 0)) - key.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.light_add(type='AREA', location=(0.9, -0.7, 0.6))
fill = bpy.context.object; fill.data.energy = 3; fill.data.size = 1.4; fill.data.color = (0.82, 0.88, 1.0)
fill.rotation_euler = (Vector((0, 0, 0)) - fill.location).to_track_quat('-Z', 'Y').to_euler()
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.03, 0.028, 0.026, 1)

# камера
target = Vector((0.0, 0.0, 0.0))
if mode == 'wide':
    sc.render.resolution_x, sc.render.resolution_y = 2000, 1250
    cam_loc, lens, target = Vector((-0.03, -0.5, 0.58)), 40, Vector((-0.06, 0.03, 0))
else:
    sc.render.resolution_x, sc.render.resolution_y = 1200, 1500
    cam_loc, lens, target = Vector((0.0, -0.3, 0.5)), 38, Vector((0.0, 0.03, 0))
bpy.ops.object.camera_add(location=cam_loc)
cam = bpy.context.object; cam.data.lens = lens; sc.camera = cam
cam.rotation_euler = (target - cam_loc).to_track_quat('-Z', 'Y').to_euler()
cam.data.dof.use_dof = True; cam.data.dof.focus_object = notebook; cam.data.dof.aperture_fstop = 3.2

sc.render.engine = 'CYCLES'
sc.cycles.samples = samples; sc.cycles.use_denoising = True
sc.cycles.device = 'CPU'
sc.render.resolution_percentage = int(os.environ.get('PCT', '100'))
sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print('saved', out)
