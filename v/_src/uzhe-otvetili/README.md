# Ролик «Вы уже ответили. Клиент ещё не понял»

Исходники видео `v/uzhe_otvetili.mp4`: вертикальный формат 1080×1920, 30 кадров в секунду, около 30 секунд.

- `index.html` — сцены: 3D-персонажи на Three.js, экраны телефона и подписи на Canvas. `renderAt(t)` рисует кадр на момент `t`.
- `render.js` — покадрово снимает страницу в headless Chromium и собирает `video_only.mp4`.
- `tts.py` — озвучка через ElevenLabs (голос Eric, eleven_multilingual_v2), по фразам, с метками времени слов → `audio/`, `align.json`.
- `timeline.py` — расставляет фразы с паузами → `timeline.json`, `voice.wav`. По `timeline.json` строится вся анимация.
- `audio.py` — синтез тихой музыки и звуков интерфейса.
- `mix.sh` — сведение: приглушение музыки под голос, громкость −14 LUFS → `final.mp4`.

Сборка: `bash build.sh`. Ключ ElevenLabs нужен только для новой озвучки: `ELEVENLABS_API_KEY=... python3 tts.py`. Ключ в репозиторий не кладём.
