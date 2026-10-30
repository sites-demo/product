#!/usr/bin/env bash
# Сборка 2D-ролика «Робот нашёл сайт» (15 с, 150 BPM). Нужны node, python3 + numpy, ffmpeg, playwright с chromium.
set -euo pipefail
cd "$(dirname "$0")"
R=../../..
cp $R/assets/fonts/golos-text-cyrillic.woff2 $R/assets/fonts/golos-text-latin.woff2 .
cp $R/v/yt_avatar.jpg logo_src.jpg
python3 beat.py                                   # бит и звуки -> beat.wav
python3 -m http.server 8766 --bind 127.0.0.1 >/dev/null 2>&1 & SRV=$!
trap 'kill $SRV' EXIT
sleep 1
node render.js video                              # кадры -> video_only.mp4
ffmpeg -v error -y -i video_only.mp4 -i beat.wav -filter_complex "[1:a]loudnorm=I=-11:TP=-1:LRA=7[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest final.mp4
echo "Готово: $(pwd)/final.mp4"
