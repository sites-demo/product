# Модель машины

`src/assets/car.glb` сделана из **Car Concept** из образцов Khronos:
https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept

- Модель и текстуры: Eric Chadwick, © 2024 Darmstadt Graphics Group GmbH, лицензия CC BY 4.0.
- Исходная модель: «Free Concept Car 004» от Unity Fan, CC0.

Что изменено (`scripts/car-prep.mjs`, запускать в папке с @gltf-transform/core, functions, extensions 4.2.1, meshoptimizer и sharp):
- убраны логотипы Khronos: номер, эмблема руля, светящиеся надписи на дисках, суппортах и зеркалах, надписи на боковинах шин;
- убраны педали и варианты окраски (красим в коде);
- дворники упрощены, текстуры уменьшены до 1024 и переведены в WebP, геометрия сжата meshopt.

Подпись об авторстве стоит в подвале страниц, где есть машина.

```
node scripts/car-prep.mjs CarConcept.glb src/assets/car.glb
```
