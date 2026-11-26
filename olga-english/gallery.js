// Просмотр фото: свайп между фото, свайп вниз закрывает, щипок и двойное касание увеличивают,
// кнопка «назад» на телефоне закрывает просмотр, а не уходит со страницы.
(function () {
  var GAP = 16, OPEN_MS = 280;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var closeTimer = 0, lb, bg, track, cnt, cap, bx, bp, bn, slides = [], items = [], idx = 0, isOpen = false, pushed = false, lastFocus = null;
  var VW = 0, VH = 0;
  var z = { s: 1, x: 0, y: 0 };

  var ICON = {
    x: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    p: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    n: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  function build() {
    lb = document.createElement('div');
    lb.className = 'lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Просмотр фото');
    lb.innerHTML = '<div class="lb-bg"></div><div class="lb-track"></div>' +
      '<div class="lb-bar lb-ui"><span class="lb-cnt" aria-live="polite"></span><button class="lb-btn lb-x" type="button" aria-label="Закрыть">' + ICON.x + '</button></div>' +
      '<p class="lb-cap lb-ui"></p>' +
      '<button class="lb-btn lb-p lb-ui" type="button" aria-label="Предыдущее фото">' + ICON.p + '</button>' +
      '<button class="lb-btn lb-n lb-ui" type="button" aria-label="Следующее фото">' + ICON.n + '</button>';
    document.body.appendChild(lb);
    bg = lb.querySelector('.lb-bg'); track = lb.querySelector('.lb-track');
    cnt = lb.querySelector('.lb-cnt'); cap = lb.querySelector('.lb-cap');
    bx = lb.querySelector('.lb-x'); bp = lb.querySelector('.lb-p'); bn = lb.querySelector('.lb-n');
    bx.addEventListener('click', function () { close(); });
    bp.addEventListener('click', function () { go(idx - 1); });
    bn.addEventListener('click', function () { go(idx + 1); });
    lb.addEventListener('pointerdown', down);
    lb.addEventListener('pointermove', move);
    lb.addEventListener('pointerup', up);
    lb.addEventListener('pointercancel', up);
    lb.addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('keydown', key);
    window.addEventListener('popstate', function () { if (isOpen) { pushed = false; close(true); } });
    window.addEventListener('resize', function () { if (isOpen) relayout(); });
  }

  function measure() { VW = window.innerWidth; VH = window.innerHeight; }
  function relayout() {
    measure();
    slides.forEach(function (sl, k) {
      sl.el.style.left = k * (VW + GAP) + 'px';
      if (sl.img) { var b = baseSize(items[k]); sl.img.style.width = b.w + 'px'; sl.img.style.height = b.h + 'px'; }
    });
    setZoom(1, 0, 0, false);
    place(0, false);
  }

  // размер фото без увеличения: вписано в экран, но не больше настоящего размера
  function baseSize(it) {
    var f = Math.min(VW / it.w, VH / it.h, 1);
    return { w: it.w * f, h: it.h * f };
  }

  function load(i) {
    var it = items[i], sl = slides[i];
    if (!it || !sl || sl.img) return;
    var img = document.createElement('img');
    var b = baseSize(it);
    img.alt = it.alt; img.draggable = false;
    img.width = Math.round(b.w); img.height = Math.round(b.h);
    img.style.width = b.w + 'px'; img.style.height = b.h + 'px';
    img.src = it.thumb;
    if (it.full !== it.thumb) {
      var hi = new Image();
      hi.onload = function () { img.src = it.full; };
      hi.src = it.full;
    }
    sl.el.appendChild(img); sl.img = img;
  }

  function open(list, i, from) {
    if (!lb) build();
    clearTimeout(closeTimer);
    measure();
    items = list; idx = i; lastFocus = from;
    track.innerHTML = ''; slides = [];
    items.forEach(function (it, k) {
      var el = document.createElement('div');
      el.className = 'lb-slide';
      el.style.left = k * (VW + GAP) + 'px';
      track.appendChild(el);
      slides.push({ el: el, img: null });
    });
    lb.hidden = false; lb.classList.remove('calm');
    document.documentElement.classList.add('lb-open');
    isOpen = true;
    place(0, false);
    [idx, idx + 1, idx - 1].forEach(load);
    z = { s: 1, x: 0, y: 0 };
    ui();
    if (!pushed) { try { history.pushState({ lb: 1 }, ''); pushed = true; } catch (e) {} }
    var img = slides[idx].img, r = from && from.getBoundingClientRect();
    if (!reduce && r && r.width) {
      // фото вырастает из миниатюры
      var b = baseSize(items[idx]);
      var k = Math.max(r.width / b.w, r.height / b.h);
      var dx = r.left + r.width / 2 - VW / 2, dy = r.top + r.height / 2 - VH / 2;
      img.style.transition = 'none';
      img.style.transformOrigin = '50% 50%';
      img.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ')';
      void img.offsetWidth;
      img.style.transition = 'transform ' + OPEN_MS + 'ms cubic-bezier(.2,.8,.2,1)';
      img.style.transform = '';
      setTimeout(function () { img.style.transition = ''; img.style.transformOrigin = ''; }, OPEN_MS + 20);
    }
    requestAnimationFrame(function () { lb.classList.add('on'); bg.style.opacity = ''; });
    bx.focus({ preventScroll: true });
  }

  function close(fromHistory) {
    if (!isOpen) return;
    isOpen = false;
    if (pushed && !fromHistory) { pushed = false; try { history.back(); } catch (e) {} }
    var it = items[idx], img = slides[idx] && slides[idx].img, src = it && it.src;
    var r = src && src.getBoundingClientRect();
    var visible = r && r.width && r.bottom > 0 && r.top < VH;
    lb.classList.remove('on');
    var done = function () {
      lb.hidden = true; track.innerHTML = ''; slides = [];
      bg.style.opacity = ''; bg.style.transition = '';
      document.documentElement.classList.remove('lb-open');
    };
    if (reduce || !img) { done(); }
    else {
      img.style.transformOrigin = '50% 50%';
      img.style.transition = 'transform ' + OPEN_MS + 'ms cubic-bezier(.2,.8,.2,1), opacity ' + OPEN_MS + 'ms';
      if (visible && z.s === 1) {
        var b = baseSize(it), k = Math.max(r.width / b.w, r.height / b.h);
        img.style.transform = 'translate(' + (r.left + r.width / 2 - VW / 2) + 'px,' + (r.top + r.height / 2 - VH / 2) + 'px) scale(' + k + ')';
      } else {
        img.style.opacity = '0';
        img.style.transform = 'scale(.94)';
      }
      closeTimer = setTimeout(done, OPEN_MS);
    }
    var lf = lastFocus;
    if (lf && lf.focus) lf.focus({ preventScroll: true });
  }

  function place(dx, anim) {
    track.style.transition = anim && !reduce ? 'transform .32s cubic-bezier(.2,.8,.2,1)' : 'none';
    track.style.transform = 'translate3d(' + (-idx * (VW + GAP) + dx) + 'px,0,0)';
  }

  function go(i) {
    if (i < 0 || i >= items.length) { place(0, true); return; }
    if (i !== idx) { setZoom(1, 0, 0, false); resetDrag(slides[idx]); }
    idx = i;
    [idx, idx + 1, idx - 1].forEach(load);
    place(0, true);
    ui();
  }

  function ui() {
    var it = items[idx];
    cnt.textContent = items.length > 1 ? (idx + 1) + ' из ' + items.length : '';
    cap.textContent = it.cap || '';
    bp.disabled = idx === 0; bn.disabled = idx === items.length - 1;
    bp.hidden = bn.hidden = items.length < 2;
  }

  // ----- увеличение -----
  function cur() { return slides[idx] && slides[idx].img; }
  function bounds(s) {
    var b = baseSize(items[idx]), bxp = (VW - b.w) / 2, byp = (VH - b.h) / 2;
    var w = b.w * s, h = b.h * s, o = {};
    if (w <= VW) { o.minX = o.maxX = (VW - w) / 2 - bxp; } else { o.minX = VW - bxp - w; o.maxX = -bxp; }
    if (h <= VH) { o.minY = o.maxY = (VH - h) / 2 - byp; } else { o.minY = VH - byp - h; o.maxY = -byp; }
    return o;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function setZoom(s, x, y, anim) {
    var img = cur(); if (!img) return;
    if (s <= 1.01) { s = 1; x = 0; y = 0; }
    else { var o = bounds(s); x = clamp(x, o.minX, o.maxX); y = clamp(y, o.minY, o.maxY); }
    z = { s: s, x: x, y: y };
    img.style.transition = anim && !reduce ? 'transform .25s ease-out' : 'none';
    img.style.transformOrigin = '0 0';
    img.style.transform = s === 1 ? '' : 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
  }
  // точка экрана остаётся под пальцем при смене масштаба
  function zoomAt(px, py, s2, base) {
    var b = baseSize(items[idx]), bxp = (VW - b.w) / 2, byp = (VH - b.h) / 2;
    var u = (px - bxp - base.x) / base.s, v = (py - byp - base.y) / base.s;
    return { s: s2, x: px - bxp - s2 * u, y: py - byp - s2 * v };
  }
  function onImage(x, y) {
    var img = cur(); if (!img) return false;
    var r = img.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  // ----- жесты -----
  var P = {}, g = null, lastTap = 0, lastTapX = 0, lastTapY = 0, tapTimer = 0;
  function pts() { return Object.keys(P).map(function (k) { return P[k]; }); }
  function resetDrag(sl) {
    if (!sl || !sl.img) return;
    sl.dy = 0;
    sl.img.style.transition = reduce ? 'none' : 'transform .25s ease-out';
    sl.img.style.transform = z.s === 1 ? '' : sl.img.style.transform;
    bg.style.transition = 'opacity .25s'; bg.style.opacity = '';
  }

  function down(e) {
    if (e.target.closest('button')) return;
    e.preventDefault();
    try { lb.setPointerCapture(e.pointerId); } catch (x) {}
    P[e.pointerId] = { x: e.clientX, y: e.clientY };
    var p = pts();
    if (p.length === 2) {
      var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      g = { type: 'pinch', d0: d || 1, base: { s: z.s, x: z.x, y: z.y }, cx: (p[0].x + p[1].x) / 2, cy: (p[0].y + p[1].y) / 2 };
    } else if (p.length === 1) {
      g = { type: 'idle', x0: e.clientX, y0: e.clientY, t0: performance.now(), base: { s: z.s, x: z.x, y: z.y }, lx: e.clientX, lt: performance.now(), vx: 0, vy: 0 };
    }
  }

  function move(e) {
    if (!P[e.pointerId] || !g) return;
    P[e.pointerId] = { x: e.clientX, y: e.clientY };
    var p = pts();
    if (g.type === 'pinch' && p.length >= 2) {
      var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      var cx = (p[0].x + p[1].x) / 2, cy = (p[0].y + p[1].y) / 2;
      var s2 = clamp(g.base.s * d / g.d0, 0.8, 5);
      var t = zoomAt(g.cx, g.cy, s2, g.base);
      t.x += cx - g.cx; t.y += cy - g.cy;
      var img = cur();
      z = t;
      if (img) { img.style.transition = 'none'; img.style.transformOrigin = '0 0'; img.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px) scale(' + t.s + ')'; }
      return;
    }
    if (p.length !== 1) return;
    var dx = e.clientX - g.x0, dy = e.clientY - g.y0, now = performance.now();
    var dt = now - g.lt || 16;
    g.vx = (e.clientX - g.lx) / dt; g.vy = (e.clientY - (g.ly || g.y0)) / dt; g.lx = e.clientX; g.ly = e.clientY; g.lt = now;
    if (g.type === 'idle') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (z.s > 1) g.type = 'pan';
      else g.type = Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'drop';
    }
    if (g.type === 'pan') { setZoom(z.s, g.base.x + dx, g.base.y + dy, false); return; }
    if (g.type === 'swipe') {
      var edge = (idx === 0 && dx > 0) || (idx === items.length - 1 && dx < 0);
      place(edge ? dx / 3 : dx, false);
      return;
    }
    if (g.type === 'drop') {
      var sl = slides[idx]; if (!sl || !sl.img) return;
      sl.dy = dy;
      var k = 1 - Math.min(Math.abs(dy) / VH, 1) * 0.25;
      sl.img.style.transition = 'none';
      sl.img.style.transformOrigin = '50% 50%';
      sl.img.style.transform = 'translate(' + dx * 0.4 + 'px,' + dy + 'px) scale(' + k + ')';
      bg.style.transition = 'none';
      bg.style.opacity = String(Math.max(0.15, 1 - Math.abs(dy) / (VH * 0.6)));
    }
  }

  function up(e) {
    if (!P[e.pointerId]) return;
    delete P[e.pointerId];
    var left = pts().length;
    if (!g) return;
    if (g.type === 'pinch') {
      if (left === 0) {
        if (z.s < 1.05) setZoom(1, 0, 0, true); else setZoom(z.s > 5 ? 5 : z.s, z.x, z.y, true);
        g = null;
      } else {
        // остался один палец: продолжаем как перетаскивание увеличенного фото
        var q = pts()[0];
        g = { type: z.s > 1 ? 'pan' : 'idle', x0: q.x, y0: q.y, t0: performance.now(), base: { s: z.s, x: z.x, y: z.y }, lx: q.x, lt: performance.now(), vx: 0, vy: 0 };
      }
      return;
    }
    if (left) return;
    var dx = e.clientX - g.x0, dy = e.clientY - g.y0, type = g.type;
    if (type === 'swipe') {
      var far = Math.abs(dx) > VW * 0.18 || Math.abs(g.vx) > 0.45;
      if (far && dx < 0) go(idx + 1); else if (far && dx > 0) go(idx - 1); else place(0, true);
    } else if (type === 'drop') {
      if (Math.abs(dy) > 110 || Math.abs(g.vy) > 0.6) close(); else resetDrag(slides[idx]);
    } else if (type === 'idle' && e.type === 'pointerup') {
      tap(e.clientX, e.clientY, e.pointerType);
    }
    g = null;
  }

  function tap(x, y, kind) {
    var now = performance.now();
    if (now - lastTap < 300 && Math.hypot(x - lastTapX, y - lastTapY) < 40) {
      clearTimeout(tapTimer); lastTap = 0;
      if (z.s > 1) setZoom(1, 0, 0, true);
      else if (onImage(x, y)) { var t = zoomAt(x, y, 2.5, z); setZoom(t.s, t.x, t.y, true); }
      return;
    }
    lastTap = now; lastTapX = x; lastTapY = y;
    var on = onImage(x, y);
    clearTimeout(tapTimer);
    if (kind === 'mouse') { if (!on && z.s === 1) close(); return; }
    tapTimer = setTimeout(function () {
      if (!isOpen) return;
      if (on || z.s > 1) lb.classList.toggle('calm');
      else close();
    }, 260);
  }

  function key(e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    else if (e.key === 'Tab') {
      var f = [bx, bp, bn].filter(function (b) { return !b.hidden && !b.disabled && b.offsetParent; });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }

  // ----- миниатюры на странице -----
  var groups = {};
  document.querySelectorAll('a[data-g]').forEach(function (a) {
    var name = a.getAttribute('data-g');
    var im = a.querySelector('img');
    var it = {
      src: a, full: a.getAttribute('href'), thumb: im ? (im.currentSrc || im.src) : a.getAttribute('href'),
      w: +a.getAttribute('data-w') || 1200, h: +a.getAttribute('data-h') || 900,
      alt: im ? im.alt : '', cap: a.getAttribute('data-cap') || ''
    };
    (groups[name] = groups[name] || []).push(it);
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      e.preventDefault();
      it.thumb = im ? (im.currentSrc || im.src) : it.full;
      var list = groups[name];
      open(list, list.indexOf(it), a);
    });
  });
})();
