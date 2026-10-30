import json, numpy as np, wave
SR=48000
tl=json.load(open('timeline.json'));S=tl['segs'];T=tl['total']
wt=lambda s,i:S[s]['words'][i][1]
N=int(T*SR)+SR
def save(name,x):
    x=np.clip(x,-1,1);st=(x*32767).astype(np.int16)
    w=wave.open(name,'wb');w.setnchannels(2 if x.ndim==2 else 1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(st.tobytes());w.close()
def lp(x,a):
    y=np.empty_like(x);acc=0.0
    for i in range(len(x)):acc+=a*(x[i]-acc);y[i]=acc
    return y
# ---- music: warm pad + soft pluck arpeggio, 84 bpm
rng=np.random.default_rng(3)
bpm=84;beat=60/bpm;bar=4*beat
mtof=lambda m:440*2**((m-69)/12)
chords=[[53,57,60,64],[57,60,64,67],[50,53,57,60],[46,50,53,57]]  # Fmaj7 Am7 Dm7 Bbmaj7
music=np.zeros((N,2))
t=np.arange(N)/SR
for b in range(int(T/bar)+2):
    ch=chords[b%4];t0=b*bar;i0=int(t0*SR);L=int(bar*SR*1.15)
    if i0>=N:break
    L=min(L,N-i0);tt=np.arange(L)/SR
    env=np.minimum(1,tt/0.6)*np.exp(-np.maximum(0,tt-bar)/0.25)
    pad=np.zeros(L)
    for m in ch:
        f=mtof(m)
        for d in(-0.08,0.08):
            ph=2*np.pi*f*(1+d/100)*tt
            pad+=np.sin(ph)+0.25*np.sin(2*ph)+0.08*np.sin(3*ph)
    pad*=env*0.018
    music[i0:i0+L,0]+=pad;music[i0:i0+L,1]+=pad
    # bass
    f=mtof(ch[0]-12);bl=np.sin(2*np.pi*f*tt)*np.exp(-tt/1.2)*np.minimum(1,tt/0.02)*0.09
    music[i0:i0+L,0]+=bl;music[i0:i0+L,1]+=bl
    # arpeggio 8ths
    arp=[ch[0]+12,ch[2]+12,ch[1]+12,ch[3]+12,ch[2]+12,ch[1]+12,ch[3]+12,ch[2]+12]
    for k,m in enumerate(arp):
        s=int((t0+k*beat/2)*SR)
        if s>=N:break
        l=min(int(0.9*SR),N-s);ta=np.arange(l)/SR;f=mtof(m)
        note=(np.sin(2*np.pi*f*ta)+0.3*np.sin(4*np.pi*f*ta))*np.exp(-ta/0.28)*np.minimum(1,ta/0.004)*0.035*(1 if k%2==0 else .7)
        pan=0.5+0.25*np.sin(k)
        music[s:s+l,0]+=note*(1-pan)*1.4;music[s:s+l,1]+=note*pan*1.4
    # soft brushed hat + kick
    for k in range(8):
        s=int((t0+k*beat/2)*SR)
        if s+2400>N:break
        h=rng.standard_normal(2400)*np.exp(-np.arange(2400)/SR/0.012)*0.012
        h=h-lp(h,0.3)
        music[s:s+2400,0]+=h;music[s:s+2400,1]+=h
    for k in (0,2.5):
        s=int((t0+k*beat)*SR);l=int(.25*SR)
        if s+l>N:break
        ta=np.arange(l)/SR;kk=np.sin(2*np.pi*(55+90*np.exp(-ta/0.03))*ta)*np.exp(-ta/0.12)*0.13
        music[s:s+l,0]+=kk;music[s:s+l,1]+=kk
for c in range(2):music[:,c]=lp(music[:,c],0.35)
fade=np.ones(N);fo=int((T-1.2)*SR);fade[fo:]=np.linspace(1,0,N-fo).clip(0);fade[:int(.3*SR)]=np.linspace(0,1,int(.3*SR))
music*=fade[:,None]
save('music.wav',music[:int(T*SR)])
# ---- sfx
sfx=np.zeros(N)
def add(at,x,g=1.0):
    s=int(at*SR);e=min(N,s+len(x));sfx[s:e]+=x[:e-s]*g
def pop(f1=900,f2=1350):
    l=int(.16*SR);ta=np.arange(l)/SR;f=np.where(ta<.05,f1,f2)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-ta/0.045)*np.minimum(1,ta/0.002)*0.5
def tap():
    l=int(.05*SR);ta=np.arange(l)/SR;n=rng.standard_normal(l);n=lp(n,0.25)
    return (n*0.6+np.sin(2*np.pi*1800*ta)*0.4)*np.exp(-ta/0.008)*0.6
def whoosh():
    l=int(.32*SR);ta=np.arange(l)/SR;n=rng.standard_normal(l);out=np.zeros(l);acc=0
    a=0.02+0.25*(ta/ta[-1])
    for i in range(l):acc+=a[i]*(n[i]-acc);out[i]=acc
    return out*np.sin(np.pi*ta/ta[-1])**2*0.9
def key():
    l=int(.03*SR);ta=np.arange(l)/SR;n=rng.standard_normal(l);return (n-lp(n,.4))*np.exp(-ta/0.005)*0.18
for i in (0,2,4):add(wt('q',i)-.05,pop(),0.55)
t=S['fam']['start']+.1
while t<S['link']['start']-.1:add(t,key(),0.5);t+=0.085+rng.random()*0.07
sent=wt('link',4)-.05
add(sent,whoosh(),0.35)
add(wt('link',4)+.1,pop(760,1140),0.45)
TAP_CARD=S['link']['end']+.05;add(TAP_CARD,tap(),0.6)
add(wt('site',8)-.05,tap(),0.6)                       # chip
T_BTN=wt('site',13)-.1;add(T_BTN,tap(),0.6)
add(wt('task',4),whoosh(),0.35)                        # send
add(S['less']['start']-.3,pop(),0.45)                 # owner receives
add(S['less']['start']+1.1,whoosh(),0.3)               # owner replies
T7b=wt('less',4)-.15
for i in range(3):add(T7b+.1+i*.25,pop(1200,1600),0.22)
save('sfx.wav',sfx[:int(T*SR)])
print('ok')
