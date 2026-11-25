// Живая азбука: буквы падают на первый экран, их можно кидать, по нажатию буква подпрыгивает и говорит слово.
(function () {
  var M = window.Matter;
  var hero = document.getElementById('hero');
  if (!M || !hero) return;
  var box = hero.querySelector('.toys');
  var hint = hero.querySelector('.hint');
  var Engine = M.Engine, Bodies = M.Bodies, Composite = M.Composite, Body = M.Body, Constraint = M.Constraint, Sleeping = M.Sleeping;

  var WORDS = {
    A: ['A is for apple', 'яблоко'], B: ['B is for ball', 'мяч'], C: ['C is for cat', 'кот'], D: ['D is for dog', 'собака'],
    E: ['E is for egg', 'яйцо'], F: ['F is for fish', 'рыба'], H: ['H is for house', 'дом'], K: ['K is for kite', 'воздушный змей'],
    L: ['L is for lion', 'лев'], M: ['M is for moon', 'луна'], O: ['O is for orange', 'апельсин'], S: ['S is for sun', 'солнце'],
    T: ['T is for tree', 'дерево'], Z: ['Z is for zebra', 'зебра'],
    apple: ['Apple', 'яблоко'], ball: ['Ball', 'мяч'], star: ['Star', 'звезда']
  };
  var COLORS = [['#FF5A36', '#C93A1B'], ['#3366FF', '#1D44C2'], ['#FFC12E', '#D99400'], ['#1DB972', '#0F8A51'], ['#FF78AE', '#D24F86'], ['#8D63FF', '#6338D9']];
  var SVG = {
    apple: '<svg viewBox="0 0 100 100"><path d="M50 30 C 30 16, 8 30, 12 56 C 16 82, 36 96, 50 88 C 64 96, 84 82, 88 56 C 92 30, 70 16, 50 30 Z" fill="#FF5A36" stroke="#221D3D" stroke-width="4" stroke-linejoin="round"/><path d="M28 46 C 30 38, 36 34, 42 34" fill="none" stroke="#FFB199" stroke-width="5" stroke-linecap="round"/><path d="M50 30 C 50 22, 52 14, 56 8" fill="none" stroke="#221D3D" stroke-width="4" stroke-linecap="round"/><path d="M55 18 C 64 8, 78 10, 82 14 C 76 22, 64 24, 55 18 Z" fill="#1DB972" stroke="#221D3D" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    ball: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#FFFBF3" stroke="#221D3D" stroke-width="4"/><path d="M50 6 C 30 26, 30 74, 50 94 C 34 90, 10 74, 8 46 C 18 26, 34 12, 50 6 Z" fill="#3366FF" stroke="#221D3D" stroke-width="3.5" stroke-linejoin="round"/><path d="M50 6 C 70 26, 70 74, 50 94 C 66 90, 90 74, 92 46 C 82 26, 66 12, 50 6 Z" fill="#FFC12E" stroke="#221D3D" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 100 100"><path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z" fill="#FFC12E" stroke="#221D3D" stroke-width="4" stroke-linejoin="round"/></svg>'
  };

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = 1.15;
  var world = engine.world;
  var items = [], solids = [], W = 0, H = 0, running = false, last = 0;

  function makeToy(kind, i) {
    var d = document.createElement('div');
    d.className = 'toy';
    var c = COLORS[i % COLORS.length];
    if (SVG[kind]) d.innerHTML = SVG[kind];
    else { d.innerHTML = '<span>' + kind + '</span>'; d.style.setProperty('--c', c[0]); d.style.setProperty('--d', c[1]); }
    box.appendChild(d);
    return d;
  }

  function size() {
    W = hero.clientWidth; H = hero.clientHeight;
  }

  function rectOf(el) {
    var r = el.getBoundingClientRect(), h = hero.getBoundingClientRect();
    return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height };
  }

  // тела для текста: каждая строка заголовка и абзаца отдельно, чтобы буквы ложились прямо на слова
  function lineRects(el) {
    var out = [], h = hero.getBoundingClientRect();
    if (el.tagName === 'A') { var r = rectOf(el); out.push(r); return out; }
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
    var floorH = 26, t = 200;
    solids.push(Bodies.rectangle(W / 2, H - floorH + t / 2, W * 3, t, { isStatic: true, friction: 0.9 }));
    solids.push(Bodies.rectangle(-t / 2, H / 2 - 400, t, H * 3, { isStatic: true }));
    solids.push(Bodies.rectangle(W + t / 2, H / 2 - 400, t, H * 3, { isStatic: true }));
    hero.querySelectorAll('[data-solid]').forEach(function (el) {
      lineRects(el).forEach(function (r) {
        if (r.w < 4 || r.h < 4) return;
        solids.push(Bodies.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, { isStatic: true, chamfer: { radius: Math.min(8, r.h / 3) }, friction: 0.8 }));
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
      var opts = { restitution: isPic ? 0.55 : 0.32, friction: 0.6, frictionAir: 0.012, density: 0.002, angle: (Math.random() - 0.5) * 0.9 };
      if (isPic && kind !== 'star') b = Bodies.circle(x, y, w / 2 * 0.94, opts);
      else if (isPic) b = Bodies.polygon(x, y, 5, w / 2 * 0.82, opts);
      else b = Bodies.rectangle(x, y, w * 0.9, h * 0.88, Object.assign({ chamfer: { radius: Math.min(w, h) * 0.16 } }, opts));
      if (small && !reduce) Body.setVelocity(b, { x: (Math.random() - 0.5) * 3, y: -5 - Math.random() * 5 });
      var it = { el: el, b: b, w: w, h: h, kind: kind, i: i };
      el._it = it;
      items.push(it);
    });
    Composite.add(world, items.map(function (it) { return it.b; }));
  }

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

  // голос
  var voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    var v = speechSynthesis.getVoices().filter(function (x) { return /^en[-_]/i.test(x.lang); });
    voice = v.filter(function (x) { return /GB/i.test(x.lang); })[0] || v.filter(function (x) { return /US/i.test(x.lang); })[0] || v[0] || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = voice ? voice.lang : 'en-GB'; if (voice) u.voice = voice;
      u.rate = 0.85; u.pitch = 1.15;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  var bubble = document.createElement('div');
  bubble.className = 'bubble';
  hero.appendChild(bubble);
  var bt = 0;
  function showWord(it) {
    var w = WORDS[it.kind]; if (!w) return;
    bubble.innerHTML = w[0] + '<small>' + w[1] + '</small>';
    var x = Math.max(90, Math.min(W - 90, it.b.position.x)), y = Math.max(70, it.b.position.y - it.h / 2 - 16);
    bubble.style.left = x + 'px'; bubble.style.top = y + 'px';
    bubble.classList.add('on');
    clearTimeout(bt); bt = setTimeout(function () { bubble.classList.remove('on'); }, 1900);
    say(w[0]);
  }

  function jump(it) {
    Sleeping.set(it.b, false);
    Body.setVelocity(it.b, { x: (Math.random() - 0.5) * 6, y: -13 - Math.random() * 3 });
    Body.setAngularVelocity(it.b, (Math.random() - 0.5) * 0.35);
  }

  // перетаскивание и нажатие
  var drag = null;
  function pt(e) { var h = hero.getBoundingClientRect(); return { x: e.clientX - h.left, y: e.clientY - h.top }; }
  box.addEventListener('pointerdown', function (e) {
    var el = e.target.closest('.toy'); if (!el) return;
    e.preventDefault();
    var it = el._it, p = pt(e);
    Sleeping.set(it.b, false);
    var c = Constraint.create({ pointA: p, bodyB: it.b, pointB: { x: p.x - it.b.position.x, y: p.y - it.b.position.y }, stiffness: 0.12, damping: 0.08, length: 0 });
    Composite.add(world, c);
    drag = { it: it, c: c, x: e.clientX, y: e.clientY, moved: false, t: Date.now() };
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
    if (!drag.moved && Date.now() - drag.t < 600) { jump(drag.it); showWord(drag.it); }
    drag = null;
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  function init() {
    size();
    buildSolids();
    addToys();
    render();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); }).observe(hero);
    } else start();
    setTimeout(function () { if (hint) hint.classList.add('on'); }, reduce ? 0 : 2200);
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
