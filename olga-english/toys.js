// Живая азбука: буквы падают на первый экран, их можно кидать, по нажатию буква подпрыгивает и говорит слово.
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- звук: свой голос из voice/, если файла нет, говорит браузер ----------
  var TEXT = {
    A: 'A is for apple', B: 'B is for ball', C: 'C is for cat', D: 'D is for dog', E: 'E is for egg', F: 'F is for fish',
    G: 'G is for giraffe', H: 'H is for house', I: 'I is for ice cream', J: 'J is for juice', K: 'K is for kite', L: 'L is for lion',
    M: 'M is for moon', N: 'N is for nose', O: 'O is for orange', P: 'P is for pig', Q: 'Q is for queen', R: 'R is for rabbit',
    S: 'S is for sun', T: 'T is for tree', U: 'U is for umbrella', V: 'V is for violin', W: 'W is for whale', X: 'X is for fox',
    Y: 'Y is for yo-yo', Z: 'Z is for zebra', apple: 'Apple', ball: 'Ball', star: 'Star',
    hello: 'Hello! Давай играть! Нажми на букву!', five: 'Ура! Уже пять слов!', all: 'Вау! Все буквы собраны! Ты молодец!'
  };
  var RU = {
    A: 'яблоко', B: 'мяч', C: 'кот', D: 'собака', E: 'яйцо', F: 'рыба', G: 'жираф', H: 'дом', I: 'мороженое', J: 'сок',
    K: 'воздушный змей', L: 'лев', M: 'луна', N: 'нос', O: 'апельсин', P: 'поросёнок', Q: 'королева', R: 'кролик', S: 'солнце',
    T: 'дерево', U: 'зонтик', V: 'скрипка', W: 'кит', X: 'лиса', Y: 'йо-йо', Z: 'зебра', apple: 'яблоко', ball: 'мяч', star: 'звезда'
  };

  var soundOn = true;
  try { soundOn = localStorage.getItem('azbuka-sound') !== 'off'; } catch (e) {}
  var sndBtn = document.querySelector('.snd');
  function paintSnd() { if (sndBtn) sndBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false'); }
  paintSnd();

  // записанный голос лежит в voice/<буква>.mp3; если файл не загрузился, говорит браузер
  var au = null, voiceOk = !!window.Audio, queue = [], cur = '';
  var enVoice = null, ruVoice = null;
  function pickVoices() {
    if (!('speechSynthesis' in window)) return;
    var all = speechSynthesis.getVoices();
    var en = all.filter(function (x) { return /^en[-_]/i.test(x.lang); });
    enVoice = en.filter(function (x) { return /GB/i.test(x.lang); })[0] || en.filter(function (x) { return /US/i.test(x.lang); })[0] || en[0] || null;
    ruVoice = all.filter(function (x) { return /^ru/i.test(x.lang); })[0] || null;
  }
  if ('speechSynthesis' in window) { pickVoices(); speechSynthesis.onvoiceschanged = pickVoices; }
  function speak(kind) {
    try {
      if (!('speechSynthesis' in window) || !TEXT[kind]) return;
      speechSynthesis.cancel();
      var ru = /[а-яё]/i.test(TEXT[kind]);
      var u = new SpeechSynthesisUtterance(TEXT[kind]);
      var v = ru ? ruVoice : enVoice;
      u.lang = v ? v.lang : (ru ? 'ru-RU' : 'en-GB'); if (v) u.voice = v;
      u.rate = ru ? 1 : 0.85; u.pitch = 1.15;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function playNow(kind) {
    cur = kind;
    if (!voiceOk) { speak(kind); return; }
    try {
      if (!au) {
        au = new Audio();
        au.preload = 'auto';
        au.addEventListener('error', function () { voiceOk = false; speak(cur); });
        au.addEventListener('ended', function () { if (queue.length) playNow(queue.shift()); });
      }
      au.src = 'voice/' + kind + '.mp3';
      var p = au.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) { voiceOk = false; speak(kind); }
  }
  // play: сразу, перебивая; after: дождаться конца текущей фразы
  function play(kind, after) {
    if (!soundOn) return;
    if (after && au && !au.paused && !au.ended && voiceOk) { queue.push(kind); return; }
    if (after && !voiceOk && 'speechSynthesis' in window && speechSynthesis.speaking) { setTimeout(function () { play(kind); }, 1300); return; }
    queue = [];
    playNow(kind);
  }
  function hush() {
    queue = [];
    try { if (au) au.pause(); } catch (e) {}
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
  }
  if (sndBtn) sndBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    try { localStorage.setItem('azbuka-sound', soundOn ? 'on' : 'off'); } catch (e) {}
    paintSnd();
    if (soundOn) play('hello'); else hush();
  });

  // ---------- наклейки прилипают при прокрутке ----------
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  // ---------- HELLO из магнитиков в конце ----------
  var hl = document.querySelector('.hl');
  if (hl) {
    if ('IntersectionObserver' in window && !reduce) {
      var ho = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { hl.classList.add('in'); ho.disconnect(); } }, { threshold: 0.6 });
      ho.observe(hl);
    } else hl.classList.add('in');
    hl.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        hl.querySelectorAll('button').forEach(function (x, i) {
          x.classList.remove('hop');
          setTimeout(function () { void x.offsetWidth; x.classList.add('hop'); }, i * 70);
        });
        play('hello');
      });
    });
  }

  // ---------- физика первого экрана ----------
  var M = window.Matter;
  var hero = document.getElementById('hero');
  if (!M || !hero) return;
  var box = hero.querySelector('.toys');
  var hint = hero.querySelector('.hint');
  var score = hero.querySelector('.score');
  var tip = hero.querySelector('.tip');
  var Engine = M.Engine, Bodies = M.Bodies, Composite = M.Composite, Body = M.Body, Constraint = M.Constraint, Sleeping = M.Sleeping, Events = M.Events;

  var COLORS = [['#FF5A36', '#C93A1B'], ['#3366FF', '#1D44C2'], ['#FFC12E', '#D99400'], ['#1DB972', '#0F8A51'], ['#FF78AE', '#D24F86'], ['#8D63FF', '#6338D9']];
  var SVG = {
    apple: '<svg viewBox="0 0 100 100"><path d="M50 30 C 30 16, 8 30, 12 56 C 16 82, 36 96, 50 88 C 64 96, 84 82, 88 56 C 92 30, 70 16, 50 30 Z" fill="#FF5A36" stroke="#221D3D" stroke-width="4" stroke-linejoin="round"/><path d="M28 46 C 30 38, 36 34, 42 34" fill="none" stroke="#FFB199" stroke-width="5" stroke-linecap="round"/><path d="M50 30 C 50 22, 52 14, 56 8" fill="none" stroke="#221D3D" stroke-width="4" stroke-linecap="round"/><path d="M55 18 C 64 8, 78 10, 82 14 C 76 22, 64 24, 55 18 Z" fill="#1DB972" stroke="#221D3D" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    ball: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#FFFBF3" stroke="#221D3D" stroke-width="4"/><path d="M50 6 C 30 26, 30 74, 50 94 C 34 90, 10 74, 8 46 C 18 26, 34 12, 50 6 Z" fill="#3366FF" stroke="#221D3D" stroke-width="3.5" stroke-linejoin="round"/><path d="M50 6 C 70 26, 70 74, 50 94 C 66 90, 90 74, 92 46 C 82 26, 66 12, 50 6 Z" fill="#FFC12E" stroke="#221D3D" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 100 100"><path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z" fill="#FFC12E" stroke="#221D3D" stroke-width="4" stroke-linejoin="round"/></svg>'
  };

  var engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = 1.15;
  var world = engine.world;
  var items = [], byBody = {}, solids = [], W = 0, H = 0, running = false, last = 0;
  // буквы, рамка экрана и строки текста сталкиваются по своим правилам: во время тряски буквы пролетают сквозь текст
  var C_LETTER = 1, C_TEXT = 2, C_FRAME = 4, ceil = false, textBottom = 0, flying = 0;
  var kinds = [], seen = {}, seenN = 0, touched = false;

  function makeToy(kind, i) {
    var d = document.createElement('div');
    d.className = 'toy';
    var c = COLORS[i % COLORS.length];
    if (SVG[kind]) d.innerHTML = SVG[kind];
    else { d.innerHTML = '<span>' + kind + '</span>'; d.style.setProperty('--c', c[0]); d.style.setProperty('--d', c[1]); }
    box.appendChild(d);
    return d;
  }

  function size() { W = hero.clientWidth; H = hero.clientHeight; }

  function rectOf(el) {
    var r = el.getBoundingClientRect(), h = hero.getBoundingClientRect();
    return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height };
  }

  // тела для текста: каждая строка заголовка и абзаца отдельно, чтобы буквы ложились прямо на слова
  function lineRects(el) {
    var out = [], h = hero.getBoundingClientRect();
    if (el.hidden) return out;
    if (el.tagName === 'A' || el.tagName === 'BUTTON') { out.push(rectOf(el)); return out; }
    var range = document.createRange(); range.selectNodeContents(el);
    var rows = {};
    Array.prototype.forEach.call(range.getClientRects(), function (r) {
      if (r.width < 2) return;
      var key = Math.round(r.top / 6);
      var row = rows[key];
      if (!row) rows[key] = { l: r.left, r: r.right, t: r.top, b: r.bottom };
      else { row.l = Math.min(row.l, r.left); row.r = Math.max(row.r, r.right); row.t = Math.min(row.t, r.top); row.b = Math.max(row.b, r.bottom); }
    });
    Object.keys(rows).forEach(function (k) {
      var q = rows[k], pad = (q.b - q.t) * 0.16;
      out.push({ x: q.l - h.left, y: q.t - h.top + pad, w: q.r - q.l, h: q.b - q.t - pad * 1.6 });
    });
    return out;
  }

  function buildSolids() {
    if (solids.length) Composite.remove(world, solids);
    solids = [];
    var floorH = 26, t = 200, frame = { category: C_FRAME };
    solids.push(Bodies.rectangle(W / 2, H - floorH + t / 2, W * 3, t, { isStatic: true, friction: 0.9, collisionFilter: frame }));
    solids.push(Bodies.rectangle(-t / 2, H / 2 - 400, t, H * 3, { isStatic: true, collisionFilter: frame }));
    solids.push(Bodies.rectangle(W + t / 2, H / 2 - 400, t, H * 3, { isStatic: true, collisionFilter: frame }));
    // потолок появляется после первой тряски, чтобы буквы отскакивали и не улетали за экран
    if (ceil) solids.push(Bodies.rectangle(W / 2, -t / 2, W * 3, t, { isStatic: true, collisionFilter: frame }));
    textBottom = 0;
    hero.querySelectorAll('[data-solid]').forEach(function (el) {
      lineRects(el).forEach(function (r) {
        if (r.w < 4 || r.h < 4) return;
        textBottom = Math.max(textBottom, r.y + r.h);
        solids.push(Bodies.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, { isStatic: true, chamfer: { radius: Math.min(8, r.h / 3) }, friction: 0.8, collisionFilter: { category: C_TEXT } }));
      });
    });
    Composite.add(world, solids);
  }

  function addToys() {
    var small = W < 700;
    var fs = small ? Math.max(58, Math.min(80, W * 0.19)) : Math.max(96, Math.min(138, W * 0.085));
    var letters = small ? 'ABCDEHKLOS' : 'ABCDEFHKLMOSTZ';
    // правая граница текста: справа от неё на компьютере свободная зона для кучи букв
    var zoneL = 0;
    hero.querySelectorAll('[data-solid]').forEach(function (el) { lineRects(el).forEach(function (r) { zoneL = Math.max(zoneL, r.x + r.w); }); });
    zoneL += 30;
    var list = letters.split('');
    list.splice(3, 0, 'apple'); list.splice(7, 0, 'ball'); list.push('star');
    if (!small) list.push('O');
    list.forEach(function (kind, i) {
      if (kinds.indexOf(kind) < 0) kinds.push(kind);
      var el = makeToy(kind, i);
      var isPic = !!SVG[kind];
      var w, h, b;
      if (isPic) {
        var s = Math.round(fs * (kind === 'star' ? 0.8 : 0.9));
        el.firstChild.setAttribute('width', s); el.firstChild.setAttribute('height', s);
        w = h = s;
      } else {
        el.style.setProperty('--fs', fs + 'px');
        w = el.offsetWidth; h = el.offsetHeight;
      }
      // где появляется: на телефоне рядами над полом и подпрыгивают, на компьютере падают сверху справа от текста
      var x, y;
      if (small) {
        var cols = Math.max(3, Math.floor((W - 20) / (fs * 0.95)));
        var col = i % cols, row = Math.floor(i / cols);
        x = 10 + (col + 0.5) * ((W - 20) / cols) + (Math.random() - 0.5) * 10;
        y = H - 26 - (row + 0.5) * fs * 0.95 - 6;
      } else {
        x = zoneL + 50 + Math.random() * Math.max(40, W - zoneL - 100);
        y = -140 - i * 75 - Math.random() * 60;
      }
      if (reduce) y = H - 120 - Math.random() * 60;
      var opts = { restitution: isPic ? 0.55 : 0.32, friction: 0.6, frictionAir: 0.012, density: 0.002, angle: (Math.random() - 0.5) * 0.9, collisionFilter: { category: C_LETTER, mask: C_LETTER | C_TEXT | C_FRAME } };
      if (isPic && kind !== 'star') b = Bodies.circle(x, y, w / 2 * 0.94, opts);
      else if (isPic) b = Bodies.polygon(x, y, 5, w / 2 * 0.82, opts);
      else b = Bodies.rectangle(x, y, w * 0.9, h * 0.88, Object.assign({ chamfer: { radius: Math.min(w, h) * 0.16 } }, opts));
      if (small && !reduce) Body.setVelocity(b, { x: (Math.random() - 0.5) * 3, y: -5 - Math.random() * 5 });
      var it = { el: el, b: b, w: w, h: h, kind: kind, i: i, sq: 0 };
      el._it = it;
      byBody[b.id] = it;
      items.push(it);
    });
    Composite.add(world, items.map(function (it) { return it.b; }));
    if (score) score.querySelector('i').textContent = kinds.length;
  }

  // буква чуть сплющивается, когда шлёпается о пол или о другую букву
  function squash(it) {
    if (reduce || !it) return;
    var now = Date.now();
    if (now - it.sq < 260) return;
    it.sq = now;
    it.el.classList.add('sq');
    setTimeout(function () { it.el.classList.remove('sq'); }, 140);
  }
  Events.on(engine, 'collisionStart', function (ev) {
    ev.pairs.forEach(function (p) {
      var a = p.bodyA, b = p.bodyB;
      var hit = Math.abs(a.velocity.y - b.velocity.y) + Math.abs(a.velocity.x - b.velocity.x) * 0.5;
      if (hit < 6) return;
      squash(byBody[a.id]); squash(byBody[b.id]);
    });
  });

  function render() {
    for (var k = 0; k < items.length; k++) {
      var it = items[k], b = it.b, a = b.angle;
      if (b.isSleeping && it.drawn) continue;
      it.el.style.transform = 'translate(' + (b.position.x - it.w / 2).toFixed(1) + 'px,' + (b.position.y - it.h / 2).toFixed(1) + 'px) rotate(' + a.toFixed(3) + 'rad)';
      it.el.style.setProperty('--sx', Math.sin(a).toFixed(3));
      it.el.style.setProperty('--sy', Math.cos(a).toFixed(3));
      it.drawn = true;
    }
  }

  function loop(t) {
    if (!running) return;
    var dt = Math.min(1000 / 60, t - (last || t)) || 1000 / 60;
    last = t;
    Engine.update(engine, dt);
    if (flying) land();
    // если кто-то улетел за край, возвращаем на пол
    items.forEach(function (it) {
      var p = it.b.position;
      if (p.y > H + 200 || p.x < -200 || p.x > W + 200) { Body.setPosition(it.b, { x: W * 0.7, y: -60 }); Body.setVelocity(it.b, { x: 0, y: 0 }); }
    });
    render();
    requestAnimationFrame(loop);
  }

  function start() { if (running) return; running = true; last = 0; requestAnimationFrame(loop); }
  function stop() { running = false; }

  var bubble = document.createElement('div');
  bubble.className = 'bubble';
  hero.appendChild(bubble);
  var bt = 0;
  function showWord(it) {
    var t = TEXT[it.kind]; if (!t) return;
    bubble.innerHTML = t + '<small>' + RU[it.kind] + '</small>';
    var x = Math.max(90, Math.min(W - 90, it.b.position.x)), y = Math.max(70, it.b.position.y - it.h / 2 - 16);
    bubble.style.left = x + 'px'; bubble.style.top = y + 'px';
    bubble.classList.add('on');
    clearTimeout(bt); bt = setTimeout(function () { bubble.classList.remove('on'); }, 1900);
    play(it.kind);
    count(it.kind);
  }

  // счётчик собранных слов появляется только после первого нажатия
  function count(kind) {
    if (!score || seen[kind]) return;
    seen[kind] = 1; seenN++;
    if (score.hidden) { score.hidden = false; if (tip) tip.hidden = true; buildSolids(); wake(); }
    score.querySelector('b').textContent = seenN;
    score.classList.remove('pop'); void score.offsetWidth; score.classList.add('pop');
    if (seenN === 5 && kinds.length > 5) play('five', true);
    if (seenN === kinds.length) {
      play('all', true);
      items.forEach(function (x, i) { setTimeout(function () { jump(x); }, i * 60); });
    }
  }

  function wake() { items.forEach(function (x) { Sleeping.set(x.b, false); }); }

  function jump(it) {
    Sleeping.set(it.b, false);
    Body.setVelocity(it.b, { x: (Math.random() - 0.5) * 6, y: -13 - Math.random() * 3 });
    Body.setAngularVelocity(it.b, (Math.random() - 0.5) * 0.35);
  }

  // пока никто не трогал, буквы по очереди подмигивают
  var wt = 0;
  function invite() {
    clearTimeout(wt);
    if (touched || reduce) return;
    wt = setTimeout(function () {
      if (touched) return;
      if (running && items.length) {
        var it = items[Math.floor(Math.random() * items.length)];
        it.el.classList.remove('wig'); void it.el.offsetWidth; it.el.classList.add('wig');
        setTimeout(function () { it.el.classList.remove('wig'); }, 750);
      }
      invite();
    }, 2600);
  }

  // перетаскивание и нажатие
  var drag = null;
  function pt(e) { var h = hero.getBoundingClientRect(); return { x: e.clientX - h.left, y: e.clientY - h.top }; }
  box.addEventListener('pointerdown', function (e) {
    var el = e.target.closest('.toy'); if (!el) return;
    e.preventDefault();
    touched = true; clearTimeout(wt);
    var it = el._it, p = pt(e);
    Sleeping.set(it.b, false);
    var c = Constraint.create({ pointA: p, bodyB: it.b, pointB: { x: p.x - it.b.position.x, y: p.y - it.b.position.y }, stiffness: 0.12, damping: 0.08, length: 0 });
    Composite.add(world, c);
    drag = { it: it, c: c, x: e.clientX, y: e.clientY, moved: false, t: Date.now() };
    el.classList.add('drag');
    try { el.setPointerCapture(e.pointerId); } catch (er) {}
    if (hint) hint.classList.remove('on');
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    drag.c.pointA = pt(e);
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 8) drag.moved = true;
  });
  function release() {
    if (!drag) return;
    Composite.remove(world, drag.c);
    drag.it.el.classList.remove('drag');
    if (!drag.moved && Date.now() - drag.t < 600) { jump(drag.it); showWord(drag.it); }
    drag = null;
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  // ---------- тряска телефона: буквы разлетаются по всему экрану и перемешиваются ----------
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var canMotion = 'DeviceMotionEvent' in window && coarse;
  var needAsk = canMotion && typeof DeviceMotionEvent.requestPermission === 'function';
  var settled = !needAsk, asking = false, lastKick = 0, lastG = null, peaks = [], boomT = 0, gT = 0;
  function listenMotion() {
    window.removeEventListener('devicemotion', onMotion);
    window.addEventListener('devicemotion', onMotion);
  }
  // на айфоне Safari даёт датчик только после разрешения, спросить можно только по нажатию
  function askMotion() {
    if (settled || asking || !needAsk) return;
    asking = true;
    try {
      DeviceMotionEvent.requestPermission().then(function (st) {
        asking = false;
        settled = true;
        if (st !== 'granted') return;
        listenMotion();
        shakeHint();
      }).catch(function () { asking = false; });
    } catch (e) { asking = false; }
  }
  function shakeHint() {
    if (!items.length) return;
    clearTimeout(bt);
    bubble.innerHTML = 'Shake it!<small>потряси телефон</small>';
    bubble.style.left = W / 2 + 'px'; bubble.style.top = Math.max(70, H - 230) + 'px';
    bubble.classList.add('on');
    bt = setTimeout(function () { bubble.classList.remove('on'); }, 2200);
  }

  // буквы взрываются от центра кучи, на секунду становятся почти невесомыми и пролетают сквозь текст
  function boom() {
    var now = Date.now();
    if (now - boomT < 1300) return;
    boomT = now;
    touched = true; clearTimeout(wt);
    if (hint) hint.classList.remove('on');
    if (!ceil) { ceil = true; buildSolids(); }
    hero.classList.remove('quake'); void hero.offsetWidth; hero.classList.add('quake');
    try { if (navigator.vibrate) navigator.vibrate([40, 30, 60]); } catch (e) {}
    var cx = 0, cy = 0;
    items.forEach(function (it) { cx += it.b.position.x; cy += it.b.position.y; });
    cx /= items.length; cy /= items.length;
    engine.gravity.y = 0.06;
    clearTimeout(gT);
    gT = setTimeout(function () { engine.gravity.y = 0.6; gT = setTimeout(function () { engine.gravity.y = 1.15; }, 350); }, 1100);
    flying = 1;
    items.forEach(function (it) {
      var b = it.b;
      if (drag && drag.it === it) return;
      Sleeping.set(b, false);
      b.collisionFilter.mask = C_LETTER | C_FRAME;
      var dx = b.position.x - cx + (Math.random() - 0.5) * 60, dy = b.position.y - cy - 40;
      var d = Math.sqrt(dx * dx + dy * dy) || 1, sp = 15 + Math.random() * 11;
      Body.setVelocity(b, { x: dx / d * sp + (Math.random() - 0.5) * 8, y: Math.min(dy / d * sp, 0) - 9 - Math.random() * 12 });
      Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.7);
      squash(it);
    });
  }
  // упавшие ниже текста буквы снова на нём лежат
  function land() {
    if (engine.gravity.y < 1) return;
    var left = 0;
    items.forEach(function (it) {
      var b = it.b;
      if (b.collisionFilter.mask & C_TEXT) return;
      if (b.position.y - it.h / 2 > textBottom + 4) b.collisionFilter.mask = C_LETTER | C_TEXT | C_FRAME;
      else left++;
    });
    if (!left || Date.now() - boomT > 9000) flying = 0;
  }

  function onMotion(e) {
    if (!running || !items.length) return;
    var a = e.acceleration, ax, ay, az;
    if (a && a.x != null) { ax = a.x; ay = a.y; az = a.z || 0; }
    else {
      // нет гироскопа: считаем рывок как разницу между замерами
      var g = e.accelerationIncludingGravity;
      if (!g || g.x == null) return;
      if (!lastG) { lastG = { x: g.x, y: g.y, z: g.z || 0 }; return; }
      ax = g.x - lastG.x; ay = g.y - lastG.y; az = (g.z || 0) - lastG.z; lastG = { x: g.x, y: g.y, z: g.z || 0 };
    }
    var now = Date.now();
    var m3 = Math.sqrt(ax * ax + ay * ay + az * az);
    // сильная тряска: три резких рывка меньше чем за секунду
    if (m3 > 11 && (!peaks.length || now - peaks[peaks.length - 1] > 90)) {
      peaks.push(now);
      peaks = peaks.filter(function (t) { return now - t < 900; });
      if (peaks.length >= 3) { peaks = []; boom(); return; }
    }
    // лёгкая тряска: буквы дрожат и отстают от телефона
    var ang = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * Math.PI / 180;
    var sx = ax * Math.cos(ang) + ay * Math.sin(ang), sy = -ax * Math.sin(ang) + ay * Math.cos(ang);
    var m = Math.sqrt(sx * sx + sy * sy);
    if (m < 3 || now - lastKick < 60) return;
    lastKick = now;
    touched = true; clearTimeout(wt);
    var k = Math.min(m, 20);
    items.forEach(function (it) {
      var b = it.b;
      if (drag && drag.it === it) return;
      Sleeping.set(b, false);
      var vx = b.velocity.x - sx * 0.45 + (Math.random() - 0.5) * k * 0.35;
      var vy = b.velocity.y + sy * 0.45 - Math.random() * k * 0.3;
      var sp = Math.sqrt(vx * vx + vy * vy);
      if (sp > 18) { vx *= 18 / sp; vy *= 18 / sp; }
      Body.setVelocity(b, { x: vx, y: vy });
      Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.2);
    });
  }
  if (canMotion) {
    listenMotion();
    if (tip) tip.firstChild.nodeValue = 'Нажми на букву или потряси телефон';
    // touchend и click Safari считает настоящим нажатием, по ним можно спросить доступ
    box.addEventListener('touchend', askMotion, { passive: true });
    if (tip) tip.addEventListener('click', askMotion);
    if (sndBtn) sndBtn.addEventListener('click', askMotion);
  }

  function init() {
    size();
    buildSolids();
    addToys();
    render();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); }).observe(hero);
    } else start();
    setTimeout(function () { if (hint && !touched) hint.classList.add('on'); }, reduce ? 0 : 2200);
    invite();
  }

  var rt = 0, lastW = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (hero.clientWidth === lastW && Math.abs(hero.clientHeight - H) < 80) return;
      lastW = hero.clientWidth;
      size(); buildSolids();
      items.forEach(function (it) {
        Sleeping.set(it.b, false);
        var p = it.b.position;
        Body.setPosition(it.b, { x: Math.max(40, Math.min(W - 40, p.x)), y: Math.min(p.y, H - 80) });
      });
    }, 150);
  });

  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { lastW = hero.clientWidth; init(); });
})();
