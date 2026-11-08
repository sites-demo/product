import{W as ue,A as ge,t as pe,S as ae,h as ne,M as oe,V as he,G as fe,b as r,g as S,B as R,H as ve,w as we,f as C,a as Me,C as V,u as xe,z as be,o as N}from"./three.module-C-4C4AAP.js";const v=(c,o,t)=>{const a=Math.min(1,Math.max(0,(t-c)/(o-c)));return a*a*(3-2*a)};function Y(c,o){const t=(o-.6)/.48;let a=.05*(1-t*t);return a-=.07*(c/1.5)**2,a+=.004*Math.exp(-(((o-.84)/.012)**2)),o>.84&&(a-=(o-.84)*.16),a}const D=new he(-.12,.7),X=.15,ye=.02;function Se(c){const o=new ae,t=new r(new R(14,8,14),new C({color:"#2a2d32",side:Me}));t.position.y=2.5,o.add(t);const a=new r(new S(14,14),new C({color:"#4a4d53"}));a.rotation.x=-Math.PI/2,a.position.y=-1.49,o.add(a);const w=new C({color:new V(5,5,5.2)});for(let u=-.9;u<3.2;u+=.34){const g=new r(new R(11,.06,.05),w);g.position.set(0,u,6.9),o.add(g)}for(const u of[-2.5,0,2.5]){const g=new r(new R(11,.05,.22),w);g.position.set(0,6.4,u),o.add(g)}const p=new r(new S(12,12),new C({color:new V(.55,.57,.6)}));p.rotation.x=Math.PI/2,p.position.y=6.45,o.add(p);const i=new r(new S(4,2.2),new C({color:new V(1.4,1.4,1.5)}));i.position.set(-5.5,2.4,3),i.rotation.y=Math.PI/2,o.add(i);const l=new xe(c),h=l.fromScene(o,0).texture;return l.dispose(),o.traverse(u=>{u.geometry&&u.geometry.dispose()}),h}function j(c,o,t,a,w,p){const i=new S(o-c,a-t,w,p);i.translate((c+o)/2,(t+a)/2,0);const l=i.attributes.position;for(let h=0;h<l.count;h++)l.setZ(h,Y(l.getX(h),l.getY(h)));return i.computeVertexNormals(),i}function Fe(c,o){const t=new ue({antialias:!0,alpha:!0});t.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75)),t.toneMapping=ge,t.outputColorSpace=pe,c.appendChild(t.domElement);const a=new ae,w=Se(t);a.environment=w;const p=new ne({color:o.paint,metalness:.45,roughness:.32,clearcoat:1,clearcoatRoughness:.02}),i=p.clone(),l=new oe({color:"#0b0c0e",roughness:.6}),h=new ne({color:"#0a0d10",metalness:0,roughness:.04,clearcoat:1}),u=new oe({color:"#d7dbe0",metalness:1,roughness:.12}),g={uMetal:{value:0},uPrimer:{value:0},uMatte:{value:0},uScratch:{value:1},uDent:{value:D.clone()}};p.onBeforeCompile=e=>{Object.assign(e.uniforms,g),e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vObj;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vObj = position;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
varying vec3 vObj;
uniform float uMetal, uPrimer, uMatte, uScratch;
uniform vec2 uDent;
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
}`).replace("#include <color_fragment>",`#include <color_fragment>
vec2 q = (vObj.xy - uDent) * vec2(1.0, 1.45);
float dd = length(q);
float ang = atan(q.y, q.x);
float n1 = fract(sin(dot(floor(vObj.xy * 900.0), vec2(12.9898, 78.233))) * 43758.5453);
// Зачистка: голый металл, вокруг кольца старого грунта и краски, как после шлифовки.
float inMetal = 1.0 - smoothstep(0.135, 0.145, dd);
float ring1 = (1.0 - smoothstep(0.16, 0.168, dd)) * (1.0 - inMetal);
float ring2 = (1.0 - smoothstep(0.18, 0.19, dd)) * (1.0 - inMetal) * (1.0 - ring1);
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
material.clearcoat *= 1.0 - max(max(mSand, mPrimer), max(mMatte, mScr));`)};const P=new fe;a.add(P);const F=.006,B=new r(j(-.56+F,.56-F,.27,.985,340,220),p),se=new r(j(-1.6,-.56-F,.27,.985,90,80),i),re=new r(j(.56+F,1.7,.27,.985,90,80),i),ce=new r(j(-1.6,1.7,.16,.27-F,60,6),i);P.add(B,se,re,ce);const H=new r(new S(3.4,1),l);H.position.set(.05,.57,-.06),P.add(H);const k=new r(new S(3.3,.42),h);k.position.set(.05,1.2,-.02),k.rotation.x=-.32;const L=new r(new R(3.3,.02,.04),l);L.position.set(.05,.995,-.005);const A=new r(new R(.09,.44,.03),l);A.position.set(.56,1.2,-.01),A.rotation.x=-.32,P.add(k,L,A);const z=new r(new ve(.016,.12,6,16),u);z.rotation.z=Math.PI/2,z.position.set(.3,.8,Y(.3,.8)+.014),z.scale.set(1,1,.55),P.add(z);const M=B.geometry.attributes.position,U=B.geometry.attributes.normal,W=[];for(let e=0;e<M.count;e++){const n=M.getX(e)-D.x,s=M.getY(e)-D.y;n*n+s*s<(X*3)**2&&W.push(e)}const _=(e,n,s)=>{const m=(e-D.x)/X,d=(n-D.y)/(X*.55),x=.4*Math.exp(-(d*d)/.05)*Math.exp(-(m*m)/.9);return Y(e,n)-s*(Math.exp(-(m*m+d*d))+x)};let Z=-1;const ie=e=>{if(Math.abs(e-Z)<1e-5)return;Z=e;const n=.002;for(const s of W){const m=M.getX(s),d=M.getY(s);M.setZ(s,_(m,d,e));const x=(_(m+n,d,e)-_(m-n,d,e))/(2*n),y=(_(m,d+n,e)-_(m,d-n,e))/(2*n),T=Math.hypot(x,y,1);U.setXYZ(s,-x/T,-y/T,1/T)}M.needsUpdate=!0,U.needsUpdate=!0},f=new we(24,1,.05,30),le=new N(-.02,.6,0);let E=new N;const J=()=>{const e=c.getBoundingClientRect(),n=Math.max(1,e.width),s=Math.max(1,e.height);t.setSize(n,s,!1),t.domElement.style.width="100%",t.domElement.style.height="100%",f.aspect=n/s;const m=.68,d=.42,x=Math.tan(be.degToRad(f.fov/2)),y=Math.max(d/x,m/(x*f.aspect))*1.05;E=new N(.62,.86,y).normalize().multiplyScalar(y),E.y=.6+y*.12,f.updateProjectionMatrix(),q()};let I=0,G=0,O=0,b=!0,me=performance.now();const K=()=>{const e=G;ie(ye*(1-v(.25,1,e))),g.uScratch.value=1-v(.2,.8,e),g.uMetal.value=v(.3,.9,e)*(1-v(1.3,1.9,e)),g.uPrimer.value=v(1.3,1.9,e)*(1-v(2.3,2.9,e)),g.uMatte.value=v(2.3,2.9,e)*(1-v(3.2,3.95,e))},Q=matchMedia("(prefers-reduced-motion: reduce)").matches,de=e=>{O=0;const n=I-G;G+=Math.abs(n)<.002?n:n*.09,K();const s=Q?0:(e-me)/1e3;f.position.set(E.x+Math.sin(s*.35)*.08,E.y+Math.sin(s*.23)*.03,E.z),f.lookAt(le),t.render(a,f),b&&(!Q||Math.abs(I-G)>.001)&&q()};function q(){!O&&b&&(O=requestAnimationFrame(de))}const $=new IntersectionObserver(([e])=>{b=e.isIntersecting&&!document.hidden,b&&q()});$.observe(c);const ee=()=>{b=!document.hidden,b&&q()};document.addEventListener("visibilitychange",ee);const te=new ResizeObserver(J);return te.observe(c),J(),K(),t.render(a,f),o.onReady?.(),{setStage:e=>{I=e,q()},destroy:()=>{cancelAnimationFrame(O),$.disconnect(),te.disconnect(),document.removeEventListener("visibilitychange",ee),a.traverse(e=>{const n=e.geometry;n&&n.dispose()});for(const e of[p,i,l,h,u])e.dispose();w.dispose(),t.dispose(),t.domElement.remove()}}}export{Fe as createDoorScene};
