import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune, dedup, textureCompress, meshopt, weld, simplifyPrimitive } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
await MeshoptEncoder.ready; await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(process.argv[2])
const root = doc.getRoot()
// 1. Варианты окраски не нужны: красим сами.
for (const e of root.listExtensionsUsed()) if (e.extensionName === 'KHR_materials_variants') e.dispose()
// 2. Логотипы Khronos светятся через emissive на дисках, суппортах, зеркалах: убираем.
for (const m of root.listMaterials()) {
  if (m.getEmissiveTexture() && m.getName() !== 'Dashboard') { m.setEmissiveTexture(null); m.setEmissiveFactor([0, 0, 0]) }
  if (m.getName() === 'Tireside') { m.setBaseColorTexture(null); m.setBaseColorFactor([0.022, 0.022, 0.022, 1]); m.setNormalTexture(null); m.setRoughnessFactor(0.7) }
}
// 3. Номер с логотипом, эмблема руля, педали: не видно или чужое.
for (const n of root.listNodes()) {
  const nm = n.getName()
  if (nm === 'License Plate' || nm === 'InteriorSteeringEmblem' || /^InteriorPedal/.test(nm)) n.dispose()
}
// 4. Дворники на 24 тысячи треугольников: упрощаем только их.
for (const n of root.listNodes()) {
  if (n.getName() !== 'BodyWindshieldWipers' || !n.getMesh()) continue
  for (const p of n.getMesh().listPrimitives()) simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio: 0.15, error: 0.002 })
}
await doc.transform(prune(), dedup())
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 88 }))
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
await io.write(process.argv[3], doc)
let tris = 0
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3
console.log('tris', Math.round(tris), 'textures', root.listTextures().length)
