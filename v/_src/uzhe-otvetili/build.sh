#!/usr/bin/env bash
# Сборка ролика «Вы уже ответили. Клиент ещё не понял».
# Нужны: node, python3 + numpy, ffmpeg, playwright с chromium.
# Озвучка уже лежит в audio/. Перезаписать её: ELEVENLABS_API_KEY=... python3 tts.py
set -euo pipefail
cd "$(dirname "$0")"
R=../../..
cp $R/assets/fonts/golos-text-cyrillic.woff2 $R/assets/fonts/golos-text-latin.woff2 .
cp $R/v/yt_avatar.jpg logo_src.jpg
[ -d node_modules/three ] || npm i --no-save three@0.160.0
python3 timeline.py          # склейка фраз озвучки, timeline.json, voice.wav
python3 audio.py             # музыка и звуки интерфейса
python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 & SRV=$!
trap 'kill $SRV' EXIT
sleep 1
mkdir -p prev
node render.js video         # кадры -> video_only.mp4
bash mix.sh                  # сведение звука -> final.mp4
echo "Готово: $(pwd)/final.mp4"
