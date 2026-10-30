import json, base64, sys, urllib.request, os
K=os.environ['ELEVENLABS_API_KEY']
VOICE=sys.argv[1] if len(sys.argv)>1 else 'cjVigY5qzO86Huf0OWal'
segs=[
 ("q","Сколько стоит? Что входит? Как заказать?",1.08),
 ("fam","Знакомые вопросы? Вы снова печатаете длинный ответ.",1.0),
 ("link","А можно отправить одну ссылку.",0.97),
 ("site","На сайте клиент увидит, что входит в услугу, поймёт порядок стоимости и найдёт кнопку связи.",1.0),
 ("task","И напишет уже по конкретной задаче.",1.0),
 ("less","Меньше объяснений в переписке. Больше ясности для клиента.",1.0),
 ("brand","Стажа́р. Сайты для бизнеса.",0.97),
 ("cta","Нужен такой сайт? Заходите на студио-сайт точка ру.",1.0),
]
import sys as _s
ONLY=_s.argv[2:]
prev=json.load(open('align.json'))
out=[]
for i,(k,t,sp) in enumerate(segs):
    if ONLY and k not in ONLY:
        out.append(next(p for p in prev if p['key']==k));continue
    body={"text":t,"model_id":"eleven_multilingual_v2",
      "voice_settings":{"stability":0.55,"similarity_boost":0.75,"style":0.05,"use_speaker_boost":True,"speed":sp},
      "previous_text":" ".join(s[1] for s in segs[:i]) or None,
      "next_text":" ".join(s[1] for s in segs[i+1:]) or None,
      "language_code":"ru","seed":7}
    body={a:b for a,b in body.items() if b is not None}
    req=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(),headers={"xi-api-key":K,"content-type":"application/json"})
    try: d=json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e: print(e.read()); raise
    open(f"audio/seg_{k}.mp3","wb").write(base64.b64decode(d["audio_base64"]))
    a=d["alignment"]; out.append({"key":k,"text":t,"chars":a["characters"],"start":a["character_start_times_seconds"],"end":a["character_end_times_seconds"]})
    print(k, a["character_end_times_seconds"][-1])
json.dump(out,open("align.json","w"),ensure_ascii=False)
