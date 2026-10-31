# Voiceover by phrase via ElevenLabs with word timings. Key from ELEVENLABS_API_KEY.
import json,base64,os,sys,urllib.request
K=os.environ['ELEVENLABS_API_KEY'];VOICE='cjVigY5qzO86Huf0OWal'
segs=[("v1","Переобувка, а телефон разрывается?",1.05),
      ("v2","Пусть клиент сам видит цену,",1.0),
      ("v3","свободное время",1.0),
      ("v4","и сразу записывается.",1.0),
      ("v5","Заявка приходит с сайта.",1.0),
      ("v6","Пришлите ссылку на карточку — в течение часа покажу макет вашего сайта.",1.07)]
out=[]
for i,(k,t,sp) in enumerate(segs):
    body={"text":t,"model_id":"eleven_multilingual_v2","language_code":"ru","seed":11,
      "voice_settings":{"stability":0.62,"similarity_boost":0.75,"style":0.0,"use_speaker_boost":True,"speed":sp},
      "previous_text":" ".join(s[1] for s in segs[:i]) or None,"next_text":" ".join(s[1] for s in segs[i+1:]) or None}
    body={a:b for a,b in body.items() if b is not None}
    req=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(),headers={"xi-api-key":K,"content-type":"application/json"})
    d=json.load(urllib.request.urlopen(req))
    open(f"audio/{k}.mp3","wb").write(base64.b64decode(d["audio_base64"]))
    a=d["alignment"];out.append({"key":k,"text":t,"chars":a["characters"],"start":a["character_start_times_seconds"],"end":a["character_end_times_seconds"]})
    print(k,round(a["character_end_times_seconds"][-1],2))
json.dump(out,open("align.json","w"),ensure_ascii=False)
