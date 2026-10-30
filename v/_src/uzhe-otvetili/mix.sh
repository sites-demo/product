cd "$(dirname "$0")"
ffmpeg -v error -y -i voice.wav -i music.wav -i sfx.wav -filter_complex "\
[0:a]aformat=channel_layouts=stereo,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.0,asplit=2[v][vsc];\
[1:a]volume=0.55[m];[m][vsc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[md];\
[2:a]aformat=channel_layouts=stereo,volume=0.8[s];\
[v][md][s]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]" -map "[a]" -ar 48000 mix.wav
ffmpeg -v error -y -i video_only.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest final.mp4
ffmpeg -i final.mp4 -af ebur128 -f null - 2>&1 | grep -A3 "Integrated" | head -4
