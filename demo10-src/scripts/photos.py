# Фото компаний для сайтов: python3 -I scripts/photos.py <папка с материалами> [короткое имя ...]
# Берёт <папка>/<имя>/photos/NN.jpg, у фото из 2ГИС срезает полосу с водяным знаком,
# уменьшает до 1600 px по длинной стороне и сохраняет webp в src/sites/<slug>/public/photos.
# Размеры пишет в src/sites/<slug>/dims.json, их читает photoSet.
import json, os, re, sys
from PIL import Image, ImageOps

SLUGS = {
    'avgust': 'avgust-omsk', 'autoclinic': 'autoclinic-tomsk', 'autogud': 'autogud-barnaul', 'avtoplaneta': 'avto-planeta',
    'nika': 'nika-detailing', 'bossfar': 'bossfar', 'krm': 'krm-kemerovo', 'komandor': 'komandor-tomsk',
    'elena': 'kuhni-elena', 'palaty': 'tsarskie-palaty',
}
# Доля высоты снизу, где у фото 2ГИС стоит знак «2GIS».
CUT = float(os.environ.get('CUT', '0.07'))
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = sys.argv[1]
names = sys.argv[2:] or list(SLUGS)
for short in names:
    slug = SLUGS[short]
    mat = os.path.join(src, short)
    md = open(os.path.join(mat, 'photos.md'), encoding='utf-8').read()
    source = {m.group(1): m.group(2) for m in re.finditer(r'^- (\d+)\.jpg .*?Источник: ([^,]+)', md, re.M)}
    out = os.path.join(root, 'src', 'sites', slug, 'public', 'photos')
    os.makedirs(out, exist_ok=True)
    dims = {}
    for f in sorted(os.listdir(os.path.join(mat, 'photos'))):
        m = re.match(r'(\d+)\.(jpe?g|png)$', f, re.I)
        if not m:
            continue
        n = m.group(1)
        im = ImageOps.exif_transpose(Image.open(os.path.join(mat, 'photos', f))).convert('RGB')
        if source.get(n, '').startswith('2ГИС'):
            w, h = im.size
            im = im.crop((0, 0, w, h - round(h * CUT)))
        im.thumbnail((1600, 1600), Image.LANCZOS)
        im.save(os.path.join(out, n + '.webp'), quality=80, method=6)
        dims[n] = list(im.size)
    with open(os.path.join(root, 'src', 'sites', slug, 'dims.json'), 'w') as fh:
        json.dump(dims, fh)
    print(slug, len(dims), 'фото')
