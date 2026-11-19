import bpy, math
bpy.ops.wm.read_factory_settings(use_empty=True)
objs=[]
def box(name,size,loc,bevel=0.03,seg=4,subd=1,puff=0.0,rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.name=name;o.scale=size
    bpy.ops.object.transform_apply(scale=True)
    m=o.modifiers.new("b",'BEVEL');m.width=bevel;m.segments=seg;m.limit_method='NONE'
    if subd:
        s=o.modifiers.new("s",'SUBSURF');s.levels=subd;s.render_levels=subd
    if puff:
        c=o.modifiers.new("c",'CAST');c.factor=puff;c.cast_type='SPHERE'
    if rot: o.rotation_euler=rot
    bpy.ops.object.shade_smooth();objs.append(o);return o
def join(name,parts):
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        apply(p); p.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
    o=bpy.context.object;o.name=name
    for p in parts[1:]:
        if p in objs: objs.remove(p)
    return o
def apply(o):
    bpy.context.view_layer.objects.active=o
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
W=0.64
# sofa frames for 1..4 seats (1 = armchair)
for n in (1,2,3,4):
    box(f"base{n}",(n*W,0.9,0.24),(0,0,0.22),bevel=0.035,seg=4)
    box(f"backframe{n}",(n*W,0.2,0.6),(0,-0.35,0.5),bevel=0.05,seg=5)
# chaise (corner part), sits to the right; origin at its own center x, back aligned
box("chaise_base",(W,1.6,0.24),(0,0.35,0.22),bevel=0.035,seg=4)
box("chaise_seat",(W-0.015,1.36,0.16),(0,0.45,0.41),bevel=0.07,seg=6,subd=2,puff=0.05)
box("seat",(W-0.015,0.7,0.16),(0,0.08,0.41),bevel=0.07,seg=6,subd=2,puff=0.08)
box("back",(W-0.025,0.2,0.44),(0,-0.17,0.69),bevel=0.08,seg=6,subd=2,puff=0.1,rot=(math.radians(-11),0,0))
box("arm_round",(0.22,0.9,0.6),(0,0,0.4),bevel=0.1,seg=8,subd=2)
box("arm_square",(0.15,0.9,0.56),(0,0,0.38),bevel=0.025,seg=4,subd=1)
box("arm_low",(0.2,0.9,0.4),(0,0,0.3),bevel=0.08,seg=6,subd=2)
box("pillow",(0.42,0.12,0.42),(0,0,0),bevel=0.05,seg=5,subd=2,puff=0.05)
# legs (origin at top center, height 0.1)
bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=0.022,radius2=0.03,depth=0.1,location=(0,0,0.05))
o=bpy.context.object;o.name="leg_wood";bpy.ops.object.shade_smooth();objs.append(o)
box("leg_metal",(0.025,0.025,0.1),(0,0,0.05),bevel=0.004,seg=2,subd=0)
box("leg_plinth",(1,0.8,0.08),(0,0,0.05),bevel=0.01,seg=2,subd=0)
# dining chair
seat=box("chair_seat",(0.46,0.44,0.07),(0,0.02,0.48),bevel=0.03,seg=5,subd=2,puff=0.08)
cback=box("chair_back",(0.42,0.06,0.32),(0,-0.2,0.8),bevel=0.025,seg=5,subd=2,puff=0.05,rot=(math.radians(-8),0,0))
parts=[]
for x in (-0.2,0.2):
    for y in (-0.18,0.2):
        bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=0.016,radius2=0.022,depth=0.44,location=(x,y,0.22))
        p=bpy.context.object;bpy.ops.object.shade_smooth();parts.append(p)
for x in (-0.2,0.2):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=0.018,depth=0.5,location=(x,-0.2,0.7))
    p=bpy.context.object;p.rotation_euler=(math.radians(-8),0,0);bpy.ops.object.shade_smooth();parts.append(p)
parts.append(box("ap",(0.44,0.42,0.06),(0,0.01,0.42),bevel=0.008,seg=2,subd=0))
objs.extend(parts)
fr=join("chair_frame",parts)
# mattress 1x1x0.22, app scales x/y
box("mattress",(1.6,2.0,0.24),(0,0,0.12),bevel=0.05,seg=6,subd=1,puff=0.02)
box("mattress_band",(1.62,2.02,0.05),(0,0,0.12),bevel=0.02,seg=3,subd=0)
for o in list(bpy.data.objects):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True)
    bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    apply(o)
    bpy.ops.object.shade_smooth_by_angle(angle=0.7)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=0.4);bpy.ops.object.mode_set(mode='OBJECT')
    o.data.materials.clear();o.data.materials.append(bpy.data.materials.new(o.name))
    print(o.name,len(o.data.polygons))
bpy.ops.export_scene.gltf(filepath="public/assets/parts.glb",export_format='GLB',export_apply=True,export_draco_mesh_compression_enable=False)
bpy.ops.wm.save_as_mainfile(filepath="scripts/parts.blend")
