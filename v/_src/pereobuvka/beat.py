# Hard phonk-style beat, 150 BPM, synced to the video beats. Everything is synthesized.
import numpy as np, wave
SR=48000;BPM=150;B=60/BPM;TOTAL=20.0
N=int((TOTAL+0.01)*SR)
L=np.zeros(N);R=np.zeros(N)
rng=np.random.default_rng(11)
def add(at,x,g=1.0,pan=0.0):
    s=int(round(at*SR))
    if s>=N:return
    x=x[:N-max(s,0)]
    if s<0:x=x[-s:];s=0
    L[s:s+len(x)]+=x*g*(1-pan)**.5*1.0;R[s:s+len(x)]+=x*g*(1+pan)**.5*1.0
def env(n,a,d):t=np.arange(n)/SR;return np.minimum(1,t/max(a,1e-4))*np.exp(-t/d)
def noise(n):return rng.standard_normal(n)
def onepole(x,a):
    # vectorised-ish one-pole lowpass via recursion in chunks
    y=np.empty_like(x);acc=0.0
    for i in range(len(x)):acc+=a*(x[i]-acc);y[i]=acc
    return y
def hp(x,a):return x-onepole(x,a)
def kick(hard=1.0):
    n=int(.35*SR);t=np.arange(n)/SR
    f=45+170*np.exp(-t/0.035);ph=2*np.pi*np.cumsum(f)/SR
    x=np.sin(ph)*np.exp(-t/0.16)
    x+=0.5*noise(n)*np.exp(-t/0.004)
    return np.tanh(x*2.2*hard)*0.9
def clap():
    n=int(.25*SR);t=np.arange(n)/SR;e=np.zeros(n)
    for d in (0,.011,.022):e+=np.exp(-np.maximum(0,t-d)/0.012)*(t>=d)
    e+=0.5*np.exp(-t/0.09)
    x=hp(noise(n),0.25)*e
    return np.tanh(x*1.6)*0.6
def hat(open_=False):
    n=int((.18 if open_ else .05)*SR);t=np.arange(n)/SR
    x=hp(noise(n),0.6)*np.exp(-t/(0.06 if open_ else 0.012))
    return x*0.35
def bell(f,d=0.22):
    n=int(d*1.6*SR);t=np.arange(n)/SR
    sq=lambda fr:np.sign(np.sin(2*np.pi*fr*t))
    x=(sq(f)+sq(f*1.4836))*0.5
    x=hp(x,0.2)
    return np.tanh(x*np.exp(-t/d)*1.3)*0.22
def bass808(f0,dur,glide_to=None):
    n=int(dur*SR);t=np.arange(n)/SR
    f=np.full(n,f0)
    if glide_to:f=f0+(glide_to-f0)*np.clip((t-dur*0.55)/(dur*0.3),0,1)
    x=np.sin(2*np.pi*np.cumsum(f)/SR)
    e=np.minimum(1,t/0.004)*np.exp(-t/0.9)*np.clip((dur-t)/0.03,0,1)
    return np.tanh(x*e*2.8)*0.55
def boom():
    n=int(1.6*SR);t=np.arange(n)/SR
    f=30+90*np.exp(-t/0.12);x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/0.6)
    x+=onepole(noise(n),0.05)*np.exp(-t/0.25)*1.5
    return np.tanh(x*1.8)*0.8
def whoosh(d=.35,up=True):
    n=int(d*SR);t=np.arange(n)/SR;x=noise(n);y=np.empty(n);acc=0
    a=(0.02+0.35*(t/d)) if up else (0.37-0.35*(t/d))
    for i in range(n):acc+=a[i]*(x[i]-acc);y[i]=acc
    return y*np.sin(np.pi*t/d)**2*0.9
def thud():
    n=int(.3*SR);t=np.arange(n)/SR;f=60+80*np.exp(-t/0.03)
    return np.tanh(np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/0.09)*3)*0.8+onepole(noise(n),.15)*np.exp(-t/0.03)*0.6
def clank():
    n=int(.6*SR);t=np.arange(n)/SR;x=np.zeros(n)
    for f,a in ((523,1),(1187,.7),(1893,.5),(2731,.35),(3611,.25)):x+=a*np.sin(2*np.pi*f*t)*np.exp(-t/(0.25/ (f/523)**.4))
    return x*0.35+noise(n)*np.exp(-t/0.005)*0.3
def whistle(d,f0,f1):
    n=int(d*SR);t=np.arange(n)/SR;f=f0*(f1/f0)**(t/d)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.minimum(1,t/0.02)*np.clip((d-t)/0.05,0,1)*0.25
def blip(f=880,d=.08):
    n=int(d*SR);t=np.arange(n)/SR;return np.sign(np.sin(2*np.pi*f*t))*np.exp(-t/0.02)*0.12
def ding():
    n=int(.9*SR);t=np.arange(n)/SR
    return (np.sin(2*np.pi*1568*t)+.5*np.sin(2*np.pi*2349*t))*np.exp(-t/0.3)*0.25
def riser(d):
    n=int(d*SR);t=np.arange(n)/SR;x=noise(n);y=np.empty(n);acc=0
    a=0.01+0.5*(t/d)**2
    for i in range(n):acc+=a[i]*(x[i]-acc);y[i]=acc
    tone=np.sin(2*np.pi*np.cumsum(200*2**(3*t/d))/SR)*0.25
    return (y*0.8+tone)*(t/d)**2*0.7

E1=41.2;G1=49.0;D1=36.7;C1=32.7;A1=55.0
notes808=[E1,E1,G1,D1]           # per bar
BELL0=554.0
bellPat=[(0,0),(3,0),(6,3),(8,5),(10,3),(12,7),(13,5),(14,3)]  # (16th step, semitone)
bellPat2=[(0,12),(2,10),(3,7),(6,10),(8,7),(10,5),(12,3),(14,5)]
s16=B/4

def bar_groove(bar_start_beat,bar_idx,drop=False,cut_after=None):
    t0=bar_start_beat*B
    for st in range(16):
        tt=t0+st*s16;beat=bar_start_beat+st/4
        if cut_after is not None and beat>=cut_after:break
        if st%4==0:add(tt,kick(1.15 if drop else 1.0),0.95)
        if drop and st in(10,):add(tt,kick(1.1),0.75)
        if st in(4,12):add(tt,clap(),0.8,0.0)
        # hats: 8ths, plus rolls
        if st%2==0:add(tt,hat(),0.8 if st%4==2 else 0.5,0.3)
        if drop and st in (13,14,15):add(tt,hat(),0.45,-0.3)
        if drop and st==6:add(tt,hat(True),0.5,0.3)
    # 808
    f=notes808[bar_idx%4]
    if cut_after is None or bar_start_beat<cut_after:
        add(t0,bass808(f,B*2.4,f*(2**(-2/12)) if drop else None),0.9 if drop else 0.7)
        if cut_after is None or bar_start_beat+2.5<cut_after:add(t0+B*2.5,bass808(f*(2**(3/12)) if bar_idx%2 else f,B*1.4),0.7 if drop else 0.55)
    pat=bellPat2 if (drop and bar_idx%2) else bellPat
    for st,semi in pat:
        beat=bar_start_beat+st/4
        if cut_after is not None and beat>=cut_after:break
        add(t0+st*s16,bell(BELL0*2**(semi/12)*(2 if drop else 1)*(0.5 if not drop else 0.5)),0.9 if drop else 0.75,0.15)

def tick():
    n=int(.03*SR);t=np.arange(n)/SR;return np.sin(2*np.pi*2600*t)*np.exp(-t/0.006)*0.35
def ratchet(d):
    out=np.zeros(int(d*SR))
    for k in range(int(d/0.035)):
        n=int(.02*SR);s=int(k*0.035*SR);x=hp(noise(n),.5)*np.exp(-np.arange(n)/SR/0.004)*0.5
        out[s:s+n]+=x[:len(out)-s]
    return out
def tapestop(d):
    n=int(d*SR);t=np.arange(n)/SR;f=120*(1-t/d)**2+20
    return np.tanh(np.sin(2*np.pi*np.cumsum(f)/SR)*2)*np.clip((d-t)/0.05,0,1)*0.5
def buzz(d=.3):
    n=int(d*SR);t=np.arange(n)/SR;x=np.sign(np.sin(2*np.pi*155*t))*(0.6+0.4*np.sign(np.sin(2*np.pi*31*t)))
    return onepole(x,.25)*np.minimum(1,t/0.01)*np.clip((d-t)/0.02,0,1)*0.22
def horn(d=.35,f=420):
    n=int(d*SR);t=np.arange(n)/SR;x=np.sign(np.sin(2*np.pi*f*t))+np.sign(np.sin(2*np.pi*f*1.26*t))
    return onepole(x,.35)*np.minimum(1,t/0.01)*np.clip((d-t)/0.03,0,1)*0.12
def scratch():
    n=int(.35*SR);t=np.arange(n)/SR;f=900*np.abs(np.sin(2*np.pi*4*t))+150
    return hp(noise(n),.3)*0.3*np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/0.2)
# chaos groove b0..b11
add(0,boom(),0.6)
for i,bb in enumerate((0,4,8)):bar_groove(bb,i,cut_after=11)
for k in range(0,9):add(k*B,buzz(),0.9)
for k in (1.5,3.5,5,6.5,9.5):add(k*B,horn(.3,400+60*(int(k)%3)),0.9,(-1)**int(k)*.5)
add(7*B,whoosh(.35),0.6);add(8*B,thud(),1.0)
for k in range(8):add(8*B+k*0.07,blip(900+k*130,.05),0.5,(-1)**k*.5)
# freeze
add(11*B,scratch(),1.0);add(12.5*B,riser(1.5*B),0.5)
# calm groove under the voice b14..b38
for i,bb in enumerate((14,18,22,26,30,34)):bar_groove(bb,i,cut_after=38.5)
add(14*B,boom(),0.6)
for tt in (16,21,26):add(tt*B,blip(1500,.05),0.9)
add(27*B,ding(),0.7);add(33*B,ding(),0.8)
# end
add(38.5*B,boom(),0.8);add(38.5*B,bell(BELL0),0.6)
for i,bb in enumerate((38.5,42.5,46.5)):
    for st in range(0,16,4):
        if bb+st/4<49.5:add((bb+st/4)*B,kick(.8),0.45)
mix=np.stack([L,R],1)
# glue: soft clip + simple tail fade
mix=np.tanh(mix*0.42)
fo=int((TOTAL-1.0)*SR);mix[fo:]*=np.linspace(1,0,N-fo)[:,None]

x=(np.clip(mix,-1,1)*32767).astype(np.int16)
w=wave.open('beat.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(x.tobytes());w.close()
print('ok',N/SR)
