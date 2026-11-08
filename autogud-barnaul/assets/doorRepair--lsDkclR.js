import{l as G,W as L,A as U,f as V,S as W,V as J,n as K,o as Q,i as D,h as X,b as h,B as P,d as M,a as Y,e as j,C as F,g as Z,k as $,p as ee}from"./carModel-2-m-NQUW.js";const l=(r,a,c)=>{const t=Math.min(1,Math.max(0,(c-r)/(a-r)));return t*t*(3-2*t)},te=new J(-.16,.64),ae=.15,I=.02;function ne(r){const a=new W,c=new h(new P(14,8,14),new M({color:"#2a2d32",side:Y}));c.position.y=2.5,a.add(c);const t=new h(new j(14,14),new M({color:"#4a4d53"}));t.rotation.x=-Math.PI/2,t.position.y=-1.49,a.add(t);const m=new M({color:new F(5,5,5.2)});for(let n=-.9;n<3.2;n+=.34){const o=new h(new P(11,.06,.05),m);o.position.set(0,n,6.9),a.add(o)}for(const n of[-2.5,0,2.5]){const o=new h(new P(11,.05,.22),m);o.position.set(0,6.4,n),a.add(o)}const u=new h(new j(12,12),new M({color:new F(.55,.57,.6)}));u.rotation.x=Math.PI/2,u.position.y=6.45,a.add(u);const d=new h(new j(4,2.2),new M({color:new F(1.4,1.4,1.5)}));d.position.set(-5.5,2.4,3),d.rotation.y=Math.PI/2,a.add(d);const p=new Z(r),s=p.fromScene(a,0).texture;return p.dispose(),a.traverse(n=>{n.geometry&&n.geometry.dispose()}),s}async function re(r,a){const c=await G(a.paint),t=new L({antialias:!0,alpha:!0});t.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75)),t.toneMapping=U,t.outputColorSpace=V,r.appendChild(t.domElement);const m=new W,u=ne(t);m.environment=u,m.add(c.group);for(const e of c.paint)e.roughness=.3,e.clearcoatRoughness=.02,e.normalMap=null,e.needsUpdate=!0;const d=c.panels.get("doorFR")??[],p=d[0].material;p.normalMap=null;const s={uMetal:{value:0},uPrimer:{value:0},uMatte:{value:0},uScratch:{value:1},uDent:{value:te.clone()},uDepth:{value:I},uR:{value:ae},uNM:{value:new K}};p.onBeforeCompile=e=>{Object.assign(e.uniforms,s),e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vObj;
varying vec3 vObjN;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vObj = position;
vObjN = normal;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
varying vec3 vObj;
varying vec3 vObjN;
uniform float uMetal, uPrimer, uMatte, uScratch, uDepth, uR;
uniform vec2 uDent;
uniform mat3 uNM;
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float scratches(vec2 p) {
  vec2 q = p - uDent;
  float d = 1.0;
  d = min(d, seg(q, vec2(-0.21, 0.07), vec2(0.17, 0.115)));
  d = min(d, seg(q, vec2(-0.16, 0.03), vec2(0.2, 0.072)));
  d = min(d, seg(q, vec2(-0.05, -0.02), vec2(0.26, 0.02)));
  d = min(d, seg(q, vec2(0.02, 0.14), vec2(0.3, 0.16)));
  d = min(d, seg(q, vec2(-0.12, -0.06), vec2(0.06, -0.045)));
  return 1.0 - smoothstep(0.0012, 0.0032, d);
}
// Глубина вмятины: вытянутая ямка с заломом по линии удара.
float dentH(vec2 p) {
  float dx = (p.x - uDent.x) / uR, dy = (p.y - uDent.y) / (uR * 0.55);
  float crease = 0.4 * exp(-(dy * dy) / 0.05) * exp(-(dx * dx) / 0.9);
  return -uDepth * (exp(-(dx * dx + dy * dy)) + crease);
}`).replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
if (uDepth > 0.0001) {
  float e = 0.002;
  float hx = (dentH(vObj.xy + vec2(e, 0.0)) - dentH(vObj.xy - vec2(e, 0.0))) / (2.0 * e);
  float hy = (dentH(vObj.xy + vec2(0.0, e)) - dentH(vObj.xy - vec2(0.0, e))) / (2.0 * e);
  vec3 nObj = normalize(normalize(vObjN) + vec3(-hx, -hy, 0.0));
  normal = normalize(uNM * nObj);
  #ifdef DOUBLE_SIDED
    normal *= faceDirection;
  #endif
}`).replace("#include <clearcoat_normal_fragment_maps>",`#include <clearcoat_normal_fragment_maps>
clearcoatNormal = normal;`).replace("#include <color_fragment>",`#include <color_fragment>
vec2 q = (vObj.xy - uDent) * vec2(1.0, 1.45);
float dd = length(q);
float ang = atan(q.y, q.x);
float n1 = fract(sin(dot(floor(vObj.xy * 900.0), vec2(12.9898, 78.233))) * 43758.5453);
// Зачистка: голый металл, вокруг кольца старого грунта и краски, как после шлифовки.
float inMetal = 1.0 - smoothstep(0.135, 0.145, dd);
float ring1 = (1.0 - smoothstep(0.16, 0.168, dd)) * (1.0 - inMetal);
float sanded = (1.0 - smoothstep(0.2, 0.24, dd + 0.01 * sin(ang * 7.0)));
float mMetal = inMetal * uMetal;
float edge = 0.26 + 0.005 * sin(ang * 3.0 + 1.3) + 0.003 * sin(ang * 7.0);
float mPrimer = (1.0 - smoothstep(edge - 0.035, edge, dd)) * uPrimer;
float mSand = sanded * uMetal;
float mMatte = uMatte;
float mScr = scratches(vObj.xy) * uScratch;
vec3 c = diffuseColor.rgb;
c = mix(c, vec3(0.78, 0.79, 0.8), mScr);
c = mix(c, c * 1.35 + 0.04, mSand * (1.0 - ring1) * (1.0 - inMetal));
c = mix(c, vec3(0.38, 0.39, 0.38), ring1 * uMetal);
c = mix(c, vec3(0.66, 0.68, 0.7) * (0.92 + 0.12 * n1), mMetal);
c = mix(c, vec3(0.47, 0.48, 0.47) * (0.97 + 0.05 * n1), mPrimer);
diffuseColor.rgb = c;`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.62, mScr);
roughnessFactor = mix(roughnessFactor, 0.6, mSand);
roughnessFactor = mix(roughnessFactor, 0.28 + 0.2 * n1, mMetal);
roughnessFactor = mix(roughnessFactor, 0.9, mPrimer);
roughnessFactor = mix(roughnessFactor, 0.55, mMatte * (1.0 - mPrimer));`).replace("#include <metalnessmap_fragment>",`#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, 1.0, mMetal);
metalnessFactor = mix(metalnessFactor, 0.0, max(mPrimer, mScr));`).replace("#include <lights_physical_fragment>",`#include <lights_physical_fragment>
material.clearcoat *= 1.0 - max(max(mSand, mPrimer), max(mMatte, mScr));`)},p.needsUpdate=!0;const n=new Q;for(const e of d)n.expandByObject(e);const o=n.getCenter(new D);o.y=Math.min(o.y,.72);const i=new X(24,1,.05,30);let y=new D;const R=()=>{const e=r.getBoundingClientRect(),f=Math.max(1,e.width),x=Math.max(1,e.height);t.setSize(f,x,!1),t.domElement.style.width="100%",t.domElement.style.height="100%",i.aspect=f/x;const k=(n.max.x-n.min.x)/2+.08,A=.5,H=Math.tan($.degToRad(i.fov/2)),O=Math.max(A/H,k/(H*i.aspect))*1.05;y=new D(o.x+O*.42,o.y+O*.14,o.z+O*.9),i.updateProjectionMatrix(),g()};let S=0,b=0,w=0,v=!0;const T=performance.now(),E=()=>{const e=b;s.uDepth.value=I*(1-l(.25,1,e)),s.uScratch.value=1-l(.2,.8,e),s.uMetal.value=l(.3,.9,e)*(1-l(1.3,1.9,e)),s.uPrimer.value=l(1.3,1.9,e)*(1-l(2.3,2.9,e)),s.uMatte.value=l(2.3,2.9,e)*(1-l(3.2,3.95,e))},_=matchMedia("(prefers-reduced-motion: reduce)").matches,C=new ee,N=e=>{w=0;const f=S-b;b+=_||Math.abs(f)<.002?f:f*.09,E();const x=_?0:(e-T)/1e3;i.position.set(y.x+Math.sin(x*.35)*.1,y.y+Math.sin(x*.23)*.03,y.z),i.lookAt(o),i.updateMatrixWorld(),C.multiplyMatrices(i.matrixWorldInverse,d[0].matrixWorld),s.uNM.value.getNormalMatrix(C),t.render(m,i),v&&(!_||Math.abs(S-b)>.001)&&g()};function g(){!w&&v&&(w=requestAnimationFrame(N))}const q=new IntersectionObserver(([e])=>{v=e.isIntersecting&&!document.hidden,v&&g()});q.observe(r);const B=()=>{v=!document.hidden,v&&g()};document.addEventListener("visibilitychange",B);const z=new ResizeObserver(R);return z.observe(r),m.updateMatrixWorld(!0),R(),E(),N(performance.now()),a.onReady?.(),{setStage:e=>{S=e,g()},destroy:()=>{cancelAnimationFrame(w),q.disconnect(),z.disconnect(),document.removeEventListener("visibilitychange",B),c.dispose(),u.dispose(),t.dispose(),t.domElement.remove()}}}export{re as createDoorScene};
