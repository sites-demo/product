(function(){
'use strict';
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var HOVER=window.matchMedia&&matchMedia('(hover: hover)').matches;
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function plural(n,a,b,c){var m=n%10,h=n%100;return m===1&&h!==11?a:m>=2&&m<=4&&(h<12||h>14)?b:c}
var WA='https://wa.me/79939755707?text=';

/* reveal */
var io=null;
function reveal(el){if(io)io.observe(el);else el.classList.add('in')}
if('IntersectionObserver' in window&&!RM){
  io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -10% 0px',threshold:.05});
}
$$('.rv,.mask').forEach(reveal);
['.works','.incl','.guar','.faq'].forEach(function(s){$$(s+' > *').forEach(function(el,i){el.style.setProperty('--rd',(i%4*0.07)+'s')})});

/* showcase */
var show=$('.show');
if(show){
  var slides=$$('.slide',show),meta=JSON.parse(show.getAttribute('data-meta')),cur=0,timer=null,typing=null,DUR=7000,paused=false,visible=true;
  var urlEl=$('.b-url b',show),nameEl=$('.s-name',show),typeEl=$('.s-type',show),numEl=$('.num',show),bar=$('.progress i',show);
  function loadSlide(s){$$('[data-src]',s).forEach(function(x){x.src=x.getAttribute('data-src');x.removeAttribute('data-src')});$$('[data-srcset]',s).forEach(function(x){x.srcset=x.getAttribute('data-srcset');x.removeAttribute('data-srcset')})}
  function type(t){clearInterval(typing);if(RM){urlEl.textContent=t;return}var i=0;urlEl.textContent='';typing=setInterval(function(){i++;urlEl.textContent=t.slice(0,i);if(i>=t.length)clearInterval(typing)},38)}
  function run(s){var img=$('img',s),scr=$('.screen',show);s.classList.remove('run');img.style.setProperty('--shift','0px');
    function go(){var d=img.getBoundingClientRect().height-scr.getBoundingClientRect().height;if(d>0&&!RM){void img.offsetWidth;s.classList.add('run');img.style.setProperty('--shift',(-Math.min(d,d*0.62))+'px')}}
    if(img.complete&&img.naturalHeight)setTimeout(go,500);else img.addEventListener('load',function(){setTimeout(go,300)},{once:true})}
  function prog(){if(!bar)return;bar.classList.remove('go');void bar.offsetWidth;if(!RM){bar.style.setProperty('--dur',DUR+'ms');bar.classList.add('go')}}
  function goTo(n){if(n===cur)return;var prev=slides[cur];cur=(n+slides.length)%slides.length;var s=slides[cur];loadSlide(s);loadSlide(slides[(cur+1)%slides.length]);
    slides.forEach(function(x){x.classList.remove('under');x.style.zIndex=''});prev.classList.add('under');prev.style.zIndex=1;s.classList.remove('on');s.style.zIndex=2;void s.offsetWidth;s.classList.add('on');
    setTimeout(function(){prev.classList.remove('on','under','run');prev.style.zIndex=''},1150);
    var m=meta[cur];type(m[0]);nameEl.textContent=m[1];typeEl.textContent=m[2];numEl.textContent=('0'+(cur+1)).slice(-2)+' / '+('0'+slides.length).slice(-2);run(s);prog();schedule()}
  function schedule(){clearTimeout(timer);if(RM||paused||!visible)return;timer=setTimeout(function(){goTo(cur+1)},DUR)}
  $('.prev',show).addEventListener('click',function(){goTo(cur-1)});
  $('.next',show).addEventListener('click',function(){goTo(cur+1)});
  if(HOVER){show.addEventListener('mouseenter',function(){paused=true;clearTimeout(timer);if(bar)bar.classList.remove('go')});show.addEventListener('mouseleave',function(){paused=false;prog();schedule()})}
  if('IntersectionObserver' in window)new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible){prog();schedule()}else clearTimeout(timer)}).observe(show);
  document.addEventListener('visibilitychange',function(){if(document.hidden)clearTimeout(timer);else{prog();schedule()}});
  window.addEventListener('load',function(){loadSlide(slides[1])});
  type(meta[0][0]);run(slides[0]);prog();schedule();
}

/* ribbon pause offscreen */
var rib=$('.ribbon');if(rib&&'IntersectionObserver' in window)new IntersectionObserver(function(es){rib.classList.toggle('pause',!es[0].isIntersecting)}).observe(rib);

/* works: hover scroll */
if(HOVER&&!RM)$$('.work').forEach(function(w){var pic=$('.work-pic',w),long=null;
  w.addEventListener('mouseenter',function(){if(!long){long=document.createElement('img');long.className='long';long.alt='';long.src=w.getAttribute('data-long');pic.appendChild(long)}
    function go(){var d=long.getBoundingClientRect().height-pic.getBoundingClientRect().height;long.style.transform='translateY('+(-Math.max(0,d))+'px)'}
    if(long.complete&&long.naturalHeight)requestAnimationFrame(go);else long.onload=function(){requestAnimationFrame(go)}});
  w.addEventListener('mouseleave',function(){if(long){long.style.transition='opacity .3s,transform .6s cubic-bezier(.2,.7,.2,1)';long.style.transform='translateY(0)';setTimeout(function(){long.style.transition=''},600)}})});

/* filters (works page) */
var fb=$$('.filters button'),items=$$('.work'),cnt=$('.count');
fb.forEach(function(b){b.addEventListener('click',function(){var n=0;fb.forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});items.forEach(function(p){p.hidden=b.dataset.group!=='Все'&&p.dataset.group!==b.dataset.group;if(!p.hidden){n++;p.classList.add('in')}});if(cnt)cnt.textContent=n+' '+plural(n,'работа','работы','работ')})});

/* timeline progress */
var tl=$('.timeline');
if(tl){var lis=$$('li',tl),fill=$('.tl-fill',tl);
  function tick(){var r=tl.getBoundingClientRect(),vh=window.innerHeight,p=Math.max(0,Math.min(1,(vh*0.75-r.top)/(r.height+vh*0.25)));if(RM)p=1;if(fill)fill.style.setProperty('--p',p.toFixed(3));lis.forEach(function(li,i){li.classList.toggle('lit',p>=(i/(lis.length))+0.02||RM)})}
  var ticking=false;window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(function(){tick();ticking=false})}},{passive:true});tick()}

/* giant S parallax */
var giant=$('.giant');
if(giant&&!RM){window.addEventListener('scroll',function(){var r=giant.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)giant.style.setProperty('--gy',((r.top-innerHeight)*0.12).toFixed(1)+'px')},{passive:true})}

/* faq */
$$('.qa').forEach(function(d){var s=$('summary',d);if(d.open)d.classList.add('op');s.addEventListener('click',function(e){e.preventDefault();if(d.classList.contains('op')){d.classList.remove('op');setTimeout(function(){if(!d.classList.contains('op'))d.open=false},RM?0:450)}else{d.open=true;requestAnimationFrame(function(){requestAnimationFrame(function(){d.classList.add('op')})})}})});

/* copy helper */
function copy(t,hint,okText){function ok(){hint.textContent=okText}function fail(){hint.textContent='Скопируйте и отправьте: '+t}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,fail);else fail()}

/* final send */
var sendIn=$('#send-link');
if(sendIn){var sendWa=$('#send-wa'),sendTg=$('#send-tg'),sendHint=$('#send-hint');
  function txt(){var v=sendIn.value.trim();return 'Здравствуйте. Хочу посмотреть, как может выглядеть мой сайт. '+(v?'Моя компания: '+v:'Ссылка на мою компанию: ')}
  function upd(){sendWa.href=WA+encodeURIComponent(txt())}
  sendIn.addEventListener('input',upd);upd();
  sendWa.addEventListener('click',function(e){if(!sendIn.value.trim()){e.preventDefault();sendIn.focus();sendHint.textContent='Вставьте ссылку на карточку в картах или напишите название и город.'}});
  sendTg.addEventListener('click',function(){copy(txt(),sendHint,'Текст скопирован. Вставьте его в чат Telegram, он уже открывается.')});
}

/* builder */
var mock=$('#mock');
if(mock){var N=JSON.parse(mock.getAttribute('data-n'));
  var st={n:'remont',name:'',city:'',c:'#adea76',ink:'#0d1510',light:false};
  function msg(){var d=N[st.n];return 'Здравствуйте. Собрал черновик в конструкторе на studio-sait.ru. Компания: '+(st.name||'(название)')+(st.city?', город '+st.city:'')+', ниша: '+d.t.toLowerCase()+'. Хочу посмотреть свой вариант сайта.'}
  function slug(s){var m={'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};return s.toLowerCase().split('').map(function(ch){return m[ch]!==undefined?m[ch]:/[a-z0-9]/.test(ch)?ch:(ch===' '||ch==='-'?'-':'')}).join('').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,24)}
  function render(w){var d=N[st.n];
    $('.m-name',mock).textContent=st.name||'Ваша компания';
    $('.m-city',mock).textContent=st.city||'Ваш город';
    $('.b-url b',mock).textContent=(slug(st.name)||'vash-sait')+'.ru';
    $('.m-tag',mock).textContent=d.t;$('.m-h',mock).textContent=d.h;$('.m-s',mock).textContent=d.s;$('.m-b1',mock).textContent=d.c;
    var l=$('.m-list',mock);l.innerHTML='';d.l.forEach(function(x){var s=document.createElement('span');s.textContent=x;l.appendChild(s)});
    mock.style.setProperty('--a',st.c);mock.style.setProperty('--ai',st.ink);mock.classList.toggle('light',st.light);
    var ex=$('#b-ex');ex.href='/portfolio/'+d.ex+'/';ex.textContent=d.exn+' ↗';
    $('#b-wa').href=WA+encodeURIComponent(msg());
    if(w&&!RM){var h=$('.m-hero',mock);h.classList.remove('wipe');void h.offsetWidth;h.classList.add('wipe')}}
  $('#b-name').addEventListener('input',function(e){st.name=e.target.value.trim();render()});
  $('#b-city').addEventListener('input',function(e){st.city=e.target.value.trim();render()});
  $$('#b-niche .chip').forEach(function(b){b.addEventListener('click',function(){$$('#b-niche .chip').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});st.n=b.dataset.n;render(true)})});
  $$('#b-color .sw').forEach(function(b){b.addEventListener('click',function(){$$('#b-color .sw').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});st.c=b.dataset.c;st.ink=b.dataset.ink;render()})});
  $('#b-light').addEventListener('change',function(e){st.light=e.target.checked;render()});
  $('#b-tg').addEventListener('click',function(){copy(msg(),$('#b-hint'),'Текст скопирован. Вставьте его в чат Telegram, он уже открывается.')});
  render();
}
})();
