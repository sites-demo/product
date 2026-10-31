cd "$(dirname "$0")"
ffmpeg -v error -y -i audio/v1.mp3 -i audio/v2.mp3 -i audio/v3.mp3 -i audio/v4.mp3 -i audio/v5.mp3 -i audio/v6.mp3 -i beat.wav -filter_complex "\
[0:a]adelay=250|250[a0];[1:a]adelay=5800|5800[a1];[2:a]adelay=8000|8000[a2];[3:a]adelay=9600|9600[a3];[4:a]adelay=13200|13200[a4];[5:a]adelay=15600|15600[a5];\
[a0][a1][a2][a3][a4][a5]amix=inputs=6:normalize=0,aformat=channel_layouts=stereo,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.6,asplit=2[v][sc];\
[6:a]volume=0.55[m];[m][sc]sidechaincompress=threshold=0.03:ratio=5:attack=15:release=300[md];\
[v][md]amix=inputs=2:normalize=0,loudnorm=I=-12:TP=-1:LRA=8,apad[a]" -map "[a]" -ar 48000 -t 20 mix.wav
ffmpeg -v error -y -i video_only.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart -t 20 final.mp4
