import json, subprocess
a={s['key']:s for s in json.load(open('align.json'))}
order=['q','fam','link','site','task','less','brand','cta']
gap_after={'q':0.45,'fam':0.35,'link':0.75,'site':0.4,'task':0.45,'less':0.45,'brand':0.3,'cta':0.95}
def dur(k): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f'audio/seg_{k}.mp3']))
def words(s):
    w='';out=[]
    for c,b,e in zip(s['chars'],s['start'],s['end']):
        if c==' ':
            if w: out.append([w,st,pe]); w=''
            continue
        if not w: st=b
        w+=c; pe=e
    if w: out.append([w,st,pe])
    return out
t=0.3; tl={'segs':{}}
for k in order:
    s=a[k]; spoken=s['end'][-1]
    tl['segs'][k]={'start':round(t,3),'end':round(t+spoken,3),'words':[[w,round(t+b,3),round(t+e,3)] for w,b,e in words(s)]}
    t+=spoken+gap_after[k]
tl['total']=round(t,3)
json.dump(tl,open('timeline.json','w'),ensure_ascii=False,indent=1)
# voice track
inputs=[];filt=[]
for i,k in enumerate(order):
    inputs+=['-i',f'audio/seg_{k}.mp3']
    ms=int(tl['segs'][k]['start']*1000)
    filt.append(f'[{i}:a]adelay={ms}|{ms}[a{i}]')
filt.append(''.join(f'[a{i}]' for i in range(len(order)))+f'amix=inputs={len(order)}:normalize=0,apad,atrim=0:{tl["total"]}[v]')
subprocess.check_call(['ffmpeg','-v','error','-y',*inputs,'-filter_complex',';'.join(filt),'-map','[v]','-ar','48000','-ac','1','voice.wav'])
print({k:(v['start'],v['end']) for k,v in tl['segs'].items()}, tl['total'])
