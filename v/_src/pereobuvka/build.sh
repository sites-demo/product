#!/usr/bin/env bash
# Сборка 3D-ролика «Переобувка» (20 с). Нужны node, python3 + numpy, ffmpeg, playwright с chromium.
# Озвучка уже в audio/. Перезаписать: ELEVENLABS_API_KEY=... python3 tts.py
set -euo pipefail
cd "$(dirname "$0")"
R=../../..
cp $R/assets/fonts/golos-text-cyrillic.woff2 $R/assets/fonts/golos-text-latin.woff2 .
cp $R/v/yt_avatar.jpg logo_src.jpg
[ -d node_modules/three ] || npm i --no-save three@0.160.0
python3 beat.py
python3 -m http.server 8768 --bind 127.0.0.1 >/dev/null 2>&1 & SRV=$!
trap 'kill $SRV' EXIT
sleep 1
node render.js video
bash mix.sh
echo "Готово: $(pwd)/final.mp4"
