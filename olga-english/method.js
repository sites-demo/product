// Доска с шаблонами: нажали на вопросительное слово, на доске вопрос и ответ с to be.
// Подчёркнутое слово в ответе меняется по нажатию, остальная фраза остаётся той же.
(function () {
  var wb = document.querySelector('.wb');
  var list = document.querySelector('.qw');
  if (!wb || !list) return;

  var T = {
    what: { q: 'What is your name?', rq: 'Как тебя зовут?', a: 'My name is {}.', s: [['Anna', 'Меня зовут Анна.'], ['Max', 'Меня зовут Макс.'], ['Sophie', 'Меня зовут Софи.']] },
    where: { q: 'Where are you?', rq: 'Где ты?', a: 'I am {}.', s: [['at home', 'Я дома.'], ['in the park', 'Я в парке.'], ['on the plane', 'Я в самолёте.'], ['at school', 'Я в школе.']] },
    when: { q: 'When are you at school?', rq: 'Когда ты в школе?', a: 'I am at school {}.', s: [['in the morning', 'Я в школе утром.'], ['on Monday', 'Я в школе в понедельник.'], ['at 8 o’clock', 'Я в школе в 8 часов.']] },
    how: { q: 'How are you?', rq: 'Как ты?', a: 'I am {}.', s: [['fine', 'У меня всё хорошо.'], ['happy', 'Мне весело.'], ['cold', 'Мне холодно.'], ['sleepy', 'Мне хочется спать.']] },
    who: { q: 'Who is she?', rq: 'Кто она?', a: 'She is {}.', s: [['my mom', 'Она моя мама.'], ['my teacher', 'Она моя учительница.'], ['my sister', 'Она моя сестра.']] },
    why: { q: 'Why are you happy?', rq: 'Почему тебе весело?', a: 'Because it is {}.', s: [['Friday', 'Потому что пятница.'], ['my birthday', 'Потому что у меня день рождения.'], ['summer', 'Потому что лето.']] },
    whose: { q: 'Whose cat is it?', rq: 'Чей это кот?', a: 'It is {} cat.', s: [['my', 'Это мой кот.'], ['her', 'Это её кот.'], ['our', 'Это наш кот.']] },
    which: { q: 'Which bag is yours?', rq: 'Какая сумка твоя?', a: 'The {} bag is mine.', s: [['red', 'Красная сумка моя.'], ['blue', 'Синяя сумка моя.'], ['big', 'Большая сумка моя.']] }
  };

  var qEl = wb.querySelector('.wb-q'), aEl = wb.querySelector('.wb-a'), ruEl = wb.querySelector('.wb-ru');
  var cur = 'where', idx = 0;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // записанный голос: voice/m/<слово>-<номер>.mp3; если файл не загрузился, говорит браузер
  var au = null, fileOk = !!window.Audio;
  var enVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    var en = speechSynthesis.getVoices().filter(function (x) { return /^en[-_]/i.test(x.lang); });
    enVoice = en.filter(function (x) { return /GB/i.test(x.lang); })[0] || en.filter(function (x) { return /US/i.test(x.lang); })[0] || en[0] || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', pickVoice); }
  function soundOn() { var b = document.querySelector('.snd'); return !b || b.getAttribute('aria-pressed') !== 'false'; }
  function browserSay(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = enVoice ? enVoice.lang : 'en-GB'; if (enVoice) u.voice = enVoice;
      u.rate = 0.85; u.pitch = 1.1;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function say(force) {
    if (!force && !soundOn()) return;
    var t = T[cur], text = t.q + ' ' + t.a.replace('{}', t.s[idx][0]);
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
    if (!fileOk) { browserSay(text); return; }
    try {
      if (!au) {
        au = new Audio();
        au.preload = 'auto';
        au.addEventListener('error', function () { fileOk = false; browserSay(au.dataset.text || ''); });
      }
      au.pause();
      au.dataset.text = text;
      au.src = 'voice/m/' + cur + '-' + idx + '.mp3';
      var p = au.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) { fileOk = false; browserSay(text); }
  }

  function esc(x) { return x.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function nb(x) { return x.replace(/ (\S{1,2}) /g, ' $1 '); }

  function render(write) {
    var t = T[cur], w = cur.charAt(0).toUpperCase() + cur.slice(1);
    qEl.innerHTML = '<b>' + w + '</b>' + esc(t.q.slice(w.length));
    var parts = t.a.split('{}');
    aEl.innerHTML = esc(parts[0]) + '<button class="wb-slot" type="button" aria-label="Поменять слово">' + esc(t.s[idx][0]) + '</button>' + esc(parts[1]);
    ruEl.textContent = nb(t.rq + ' ' + t.s[idx][1]);
    if (write && !reduce) { wb.classList.remove('write'); void wb.offsetWidth; wb.classList.add('write'); }
  }

  function pick(btn) {
    var w = btn.getAttribute('data-w'); if (!T[w]) return;
    list.querySelectorAll('button[data-w]').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    var cs = getComputedStyle(btn.parentNode);
    wb.style.setProperty('--c', (cs.getPropertyValue('--d') || cs.getPropertyValue('--c')).trim());
    cur = w; idx = 0;
    render(true);
    say(false);
  }

  function next() {
    var t = T[cur]; idx = (idx + 1) % t.s.length;
    var hadFocus = document.activeElement && document.activeElement.classList.contains('wb-slot');
    wb.classList.remove('write');
    render(false);
    var s = aEl.querySelector('.wb-slot');
    if (hadFocus) s.focus();
    if (!reduce) { s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); }
    say(false);
  }

  list.addEventListener('click', function (e) { var b = e.target.closest('button[data-w]'); if (b) pick(b); });
  aEl.addEventListener('click', function (e) { if (e.target.closest('.wb-slot')) next(); });
  wb.querySelector('.wb-next').addEventListener('click', next);
  wb.querySelector('.wb-say').addEventListener('click', function () { say(true); });
})();
