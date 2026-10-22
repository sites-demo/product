(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  var WD_ORDER = [1, 2, 3, 4, 5, 6, 0];
  var S = { view: "book", day: null, today: null, settings: null, dayData: null, fresh: -1, editing: null, notify: null, timer: null, nTimer: null };

  function esc(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function toast(t) {
    var el = $("toast"); el.textContent = t; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 3200);
  }
  function api(method, url, body) {
    var opts = { method: method, headers: { "X-Requested-With": "fetch" }, credentials: "same-origin" };
    if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401 && url !== "/api/admin/login") { showLogin(); throw new Error(j.error || "Нужно войти"); }
        if (!r.ok) { var e = new Error(j.error || "Ошибка " + r.status); e.status = r.status; e.code = j.code; throw e; }
        return j;
      });
    }, function () { throw new Error("Нет связи с сервером. Проверьте интернет"); });
  }
  function fail(e) { if (e && e.message) toast(e.message); }

  // ===== Вход =====
  function showLogin() {
    $("app").hidden = true; $("login").hidden = false; clearInterval(S.timer); clearInterval(S.nTimer);
    setTimeout(function () { $("login-pw").focus(); }, 0);
  }
  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    api("POST", "/api/admin/login", { password: $("login-pw").value }).then(function () {
      $("login-pw").value = ""; $("login-err").hidden = true; start();
    }).catch(function (err) { $("login-err").textContent = err.message; $("login-err").hidden = false; });
  });
  $("logout").addEventListener("click", function () { api("POST", "/api/admin/logout").then(showLogin, showLogin); });

  function fromLink() {
    var m = /^#(\d{4}-\d{2}-\d{2})\/(\d+)$/.exec(location.hash);
    if (!m) return false;
    S.day = m[1]; S.focus = m[2];
    history.replaceState(null, "", location.pathname + location.search);
    return true;
  }
  window.addEventListener("hashchange", function () { if (!$("app").hidden && fromLink()) { setView("book"); } });
  function start() {
    fromLink();
    $("login").hidden = true; $("app").hidden = false;
    api("GET", "/api/admin/settings").then(function (s) {
      S.settings = s; $("brand").textContent = s.shop.name;
      setupBanner(s.privacy);
      return loadOverview(true);
    }).catch(fail);
    clearInterval(S.timer);
    S.timer = setInterval(function () { if (S.view === "book" && !$("dlg").open) loadOverview(false); }, 30000);
  }

  // Без данных владельца политика и согласие показывают заглушку, а сайт нарушает закон о персональных данных
  function setupBanner(p) {
    var missing = !p.operator || !p.inn || !p.address || !p.email;
    $("setup-banner").innerHTML = missing ? "<div class=\"banner\"><span><b>Заполните данные владельца.</b> Без них политика конфиденциальности неполная, и сайт нельзя показывать клиентам.</span><button type=\"button\" class=\"btn btn-sm\" id=\"setup-go\">Заполнить</button></div>" : "";
  }
  $("setup-banner").addEventListener("click", function (e) {
    if (!e.target.closest("#setup-go")) return;
    setView("set");
    setTimeout(function () { var el = $("s-op"); el.scrollIntoView({ block: "center" }); el.focus({ preventScroll: true }); }, 300);
  });

  // ===== Вкладки =====
  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () { setView(b.getAttribute("data-view")); });
  });
  function setView(v) {
    S.view = v;
    document.querySelectorAll(".tab").forEach(function (b) { if (b.getAttribute("data-view") === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    $("v-book").hidden = v !== "book"; $("v-set").hidden = v !== "set"; $("v-notify").hidden = v !== "notify";
    clearInterval(S.nTimer);
    if (v === "book") loadOverview(false);
    if (v === "set") fillSettings();
    if (v === "notify") { loadNotify("force"); S.nTimer = setInterval(loadNotify, 6000); }
    window.scrollTo(0, 0);
  }

  // ===== Записи =====
  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)(), o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.value = .15;
      o.start(); o.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }
  function loadOverview(first) {
    return api("GET", "/api/admin/overview?days=14").then(function (o) {
      S.today = o.today;
      if (!S.day || (S.day < o.today && !S.focus)) S.day = o.today;
      if (S.fresh >= 0 && o.fresh > S.fresh) { beep(); toast("Новая запись с сайта"); }
      S.fresh = o.fresh;
      $("badge").hidden = !o.fresh; $("badge").textContent = o.fresh;
      document.title = (o.fresh ? "(" + o.fresh + ") " : "") + "Записи — " + (S.settings ? S.settings.shop.name : "шиномонтаж");
      $("strip").innerHTML = o.days.map(function (d) {
        var n = d.total ? d.total + " " + plural(d.total, "запись", "записи", "записей") : d.closed ? "выходной" : "нет записей";
        return "<button type=\"button\" class=\"dbtn" + (d.closed ? " is-off" : "") + "\" data-day=\"" + d.day + "\" aria-pressed=\"" + (d.day === S.day) + "\">" +
          "<span class=\"dbtn-l\">" + d.label + "</span><span class=\"dbtn-d\">" + d.date + "</span><span class=\"dbtn-n\">" + n + "</span>" +
          (d.fresh ? "<span class=\"dbtn-new\">новых: " + d.fresh + "</span>" : "") + "</button>";
      }).join("");
      return loadDay(S.day, first);
    }).catch(fail);
  }
  function plural(n, a, b, c) { var m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; }
  $("strip").addEventListener("click", function (e) {
    var b = e.target.closest("[data-day]"); if (!b) return;
    S.day = b.getAttribute("data-day");
    document.querySelectorAll(".dbtn").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    loadDay(S.day);
  });
  function loadDay(day) {
    return api("GET", "/api/admin/day?day=" + day).then(function (d) { S.dayData = d; renderDay(d); }).catch(fail);
  }
  function nowHour() { var d = new Date(Date.now() + 3 * 3600000); return d.getUTCHours() + d.getUTCMinutes() / 60; }
  function renderDay(d) {
    var title = d.title + (d.day === d.today ? ", сегодня" : "");
    $("day-title").textContent = title;
    var banner = "";
    if (d.dayBlock) banner = "<div class=\"banner\"><span><b>День закрыт для записи.</b> " + esc(d.dayBlock.note || "") + "</span><button class=\"btn btn-sm\" data-unblock=\"" + d.dayBlock.id + "\">Открыть день</button></div>";
    else if (d.closedWeekday) banner = "<div class=\"banner\"><span><b>Выходной по графику.</b> На сайте записаться нельзя.</span></div>";
    $("day-banner").innerHTML = banner;
    var past = d.day < d.today ? 99 : d.day === d.today ? nowHour() : -1;
    var html = d.hours.map(function (h) {
      var active = h.bookings.filter(function (b) { return b.status !== "cancelled"; }).length;
      var isPast = h.hour + 1 <= past;
      var body = h.bookings.map(card).join("");
      if (h.block) body += "<div class=\"closed\"><span class=\"lbl\">Закрыто для записи" + (h.block.note ? ": " + esc(h.block.note) : "") + "</span><button class=\"btn btn-sm\" data-unblock=\"" + h.block.id + "\">Открыть</button></div>";
      else if (!isPast && !d.dayBlock && !h.outside && active < d.posts) body += "<div class=\"free\"><span class=\"lbl\">Свободно</span><button class=\"btn btn-sm\" data-add=\"" + h.hour + "\">Записать</button><button class=\"btn btn-sm btn-ghost\" data-block=\"" + h.hour + "\">Закрыть</button></div>";
      else if (!h.bookings.length) body += "<div class=\"free\"><span class=\"lbl\">" + (isPast ? "Прошло" : "—") + "</span></div>";
      return "<div class=\"hour" + (isPast ? " is-past" : "") + "\"><div class=\"h-time\">" + h.hour + ":00</div><div class=\"h-body\">" + body + "</div></div>";
    }).join("");
    if (!d.dayBlock) html += "<div class=\"hour\"><div class=\"h-time\"></div><div class=\"h-body\"><div class=\"free\"><span class=\"lbl\"></span><button class=\"btn btn-sm btn-ghost\" data-block-day>Закрыть весь день для записи</button></div></div></div>";
    $("hours").innerHTML = html;
    if (S.focus) {
      var el = document.querySelector("#hours [data-bid=\"" + S.focus + "\"]");
      S.focus = null;
      if (el) { el.classList.add("is-focus"); el.setAttribute("tabindex", "-1"); el.scrollIntoView({ block: "center" }); el.focus({ preventScroll: true }); }
      else toast("Запись не найдена: возможно, её перенесли");
    }
  }
  function card(b, withDay) {
    var acts = [];
    if (b.status === "new") acts.push(["confirmed", "Подтвердить", "btn-ok"]);
    if (b.status === "confirmed") { acts.push(["done", "Выполнена", ""]); acts.push(["no_show", "Не приехал", ""]); }
    if (b.status === "done" || b.status === "no_show") acts.push(["confirmed", "Вернуть", ""]);
    if (b.status === "cancelled") acts.push(["confirmed", "Восстановить", ""]);
    var btns = acts.map(function (a) { return "<button class=\"btn btn-sm " + a[2] + "\" data-st=\"" + a[0] + "\" data-id=\"" + b.id + "\">" + a[1] + "</button>"; }).join("");
    if (b.status !== "cancelled") btns += "<button class=\"btn btn-sm\" data-edit=\"" + b.id + "\">Изменить</button>";
    if (b.status === "new" || b.status === "confirmed") btns += "<button class=\"btn btn-sm btn-ghost btn-danger\" data-st=\"cancelled\" data-id=\"" + b.id + "\">Отменить</button>";
    var meta = [b.car, b.comment].filter(Boolean).map(esc).join(" · ");
    return "<article class=\"bc st-" + b.status + "\" data-bid=\"" + b.id + "\">" +
      "<div class=\"bc-top\"><span class=\"pill st-" + b.status + "\">" + b.statusText + "</span>" + (withDay ? "<span class=\"bc-when\">" + esc(b.when) + "</span>" : "") +
      "<span class=\"bc-svc\">" + esc(b.service) + " · <span class=\"nw\">" + esc(b.sizeText) + "</span> · <span class=\"nw\">" + esc(b.priceText) + "</span></span></div>" +
      "<div class=\"bc-who\"><b>" + esc(b.name) + "</b>" + (b.phone ? "<a href=\"tel:" + b.phone.replace(/[^\d+]/g, "") + "\">" + esc(b.phone) + "</a>" : "") + "</div>" +
      (meta ? "<div class=\"bc-meta\">" + meta + "</div>" : "") +
      (b.source === "admin" ? "<div class=\"bc-meta\">Записан в админке</div>" : "") +
      "<div class=\"bc-act\">" + btns + (withDay ? "<button class=\"btn btn-sm btn-ghost\" data-goto=\"" + b.day + "\">Открыть день</button>" : "") + "</div></article>";
  }
  function findBooking(id) {
    var all = [];
    if (S.dayData) S.dayData.hours.forEach(function (h) { all = all.concat(h.bookings); });
    (S.results || []).forEach(function (b) { all.push(b); });
    return all.filter(function (b) { return b.id === id; })[0];
  }
  function reloadAfter() { loadOverview(false); if ($("q").value.trim().length >= 2) search(); }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, a"); if (!t || $("v-book").hidden) return;
    if (t.hasAttribute("data-st")) {
      var id = +t.getAttribute("data-id"), st = t.getAttribute("data-st"), b = findBooking(id);
      if (st === "cancelled" && !confirm("Отменить запись" + (b ? ": " + b.name + ", " + b.when : "") + "?")) return;
      setStatus(id, st, false);
    }
    if (t.hasAttribute("data-edit")) openDialog(findBooking(+t.getAttribute("data-edit")));
    if (t.hasAttribute("data-add")) openDialog(null, +t.getAttribute("data-add"));
    if (t.hasAttribute("data-block")) {
      var note = prompt("Закрыть " + t.getAttribute("data-block") + ":00 для записи. Причина (необязательно):", "");
      if (note === null) return;
      api("POST", "/api/admin/blocks", { day: S.day, hour: +t.getAttribute("data-block"), note: note }).then(reloadAfter).catch(fail);
    }
    if (t.hasAttribute("data-block-day")) {
      var why = prompt("Закрыть весь день для записи с сайта. Причина (необязательно):", "");
      if (why === null) return;
      api("POST", "/api/admin/blocks", { day: S.day, hour: null, note: why }).then(reloadAfter).catch(fail);
    }
    if (t.hasAttribute("data-unblock")) api("DELETE", "/api/admin/blocks/" + t.getAttribute("data-unblock")).then(reloadAfter).catch(fail);
    if (t.hasAttribute("data-goto")) { S.day = t.getAttribute("data-goto"); $("q").value = ""; $("results").innerHTML = ""; loadOverview(false); $("day-title").focus(); }
  });
  function setStatus(id, st, force) {
    api("PATCH", "/api/admin/bookings/" + id, force ? { status: st, force: true } : { status: st }).then(function () {
      toast({ confirmed: "Запись подтверждена", done: "Отмечено: выполнена", no_show: "Отмечено: не приехал", cancelled: "Запись отменена" }[st] || "Сохранено");
      reloadAfter();
    }).catch(function (e) {
      if (e.code === "busy" && confirm(e.message + ". Всё равно восстановить?")) return setStatus(id, st, true);
      fail(e);
    });
  }

  // ===== Поиск =====
  var qTimer;
  $("q").addEventListener("input", function () { clearTimeout(qTimer); qTimer = setTimeout(search, 300); });
  function search() {
    var v = $("q").value.trim();
    if (v.length < 2) { S.results = []; $("results").innerHTML = ""; return; }
    api("GET", "/api/admin/search?q=" + encodeURIComponent(v)).then(function (r) {
      S.results = r.results;
      $("results").innerHTML = r.results.length ? r.results.map(function (b) { return card(b, true); }).join("") : "<p class=\"hint\">Ничего не нашлось.</p>";
    }).catch(fail);
  }

  // ===== Окно записи =====
  function opts(list, val) { return list.map(function (o) { return "<option value=\"" + esc(o[0]) + "\"" + (String(o[0]) === String(val) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join(""); }
  function hourOpts(val) {
    var s = S.settings, out = [];
    for (var h = Math.min(s.hours.open, 7); h <= Math.max(s.hours.close, 21); h++) out.push([h, h + ":00" + (h < s.hours.open || h >= s.hours.close ? " (не рабочее)" : "")]);
    return opts(out, val);
  }
  function openDialog(b, hour) {
    var s = S.settings;
    S.editing = b ? b.id : null;
    $("dlg-title").textContent = b ? "Изменить запись" : "Записать клиента";
    $("dlg-save").textContent = b ? "Сохранить" : "Записать";
    $("f-svc").innerHTML = opts(s.services.map(function (x) { return [x.id, x.title]; }), b ? b.serviceId : s.services[0].id);
    $("f-size").innerHTML = opts(s.sizes.map(function (z, i) { return [i, z]; }).concat([[-1, "Не знаю"]]), b ? b.size : -1);
    $("f-day").value = b ? b.day : S.day;
    $("f-hour").innerHTML = hourOpts(b ? b.hour : hour != null ? hour : s.hours.open);
    $("f-name").value = b ? b.name : ""; $("f-phone").value = b ? b.phone : ""; $("f-car").value = b ? b.car : ""; $("f-comment").value = b ? b.comment : "";
    $("dlg-err").hidden = true;
    $("dlg").showModal();
    $(b ? "f-name" : "f-name").focus();
  }
  $("dlg-close").addEventListener("click", function () { $("dlg").close(); });
  function saveDialog(force) {
    var body = { svc: $("f-svc").value, size: +$("f-size").value, day: $("f-day").value, hour: +$("f-hour").value, name: $("f-name").value, phone: $("f-phone").value, car: $("f-car").value, comment: $("f-comment").value };
    if (force) body.force = true;
    var req = S.editing ? api("PATCH", "/api/admin/bookings/" + S.editing, body) : api("POST", "/api/admin/bookings", body);
    req.then(function () {
      $("dlg").close(); toast(S.editing ? "Запись изменена" : "Клиент записан");
      if (!S.editing) S.day = body.day;
      reloadAfter();
    }).catch(function (e) {
      if (e.code === "busy" && confirm(e.message + ". Записать всё равно?")) return saveDialog(true);
      $("dlg-err").textContent = e.message; $("dlg-err").hidden = false;
    });
  }
  $("dlg-form").addEventListener("submit", function (e) { e.preventDefault(); saveDialog(false); });
  $("add").addEventListener("click", function () { openDialog(null); });
  $("export").addEventListener("click", function (e) { e.preventDefault(); location.href = "/api/admin/export.csv"; });

  // ===== Настройки =====
  function fillSettings() {
    api("GET", "/api/admin/settings").then(function (s) {
      S.settings = s;
      $("s-name").value = s.shop.name; $("s-phone").value = s.shop.phone; $("s-address").value = s.shop.address; $("s-note").value = s.shop.addressNote; $("s-map").value = s.shop.mapUrl;
      var hs = []; for (var h = 0; h <= 24; h++) hs.push([h, h + ":00"]);
      $("s-open").innerHTML = opts(hs.slice(0, 24), s.hours.open); $("s-close").innerHTML = opts(hs.slice(1), s.hours.close);
      $("s-wd").innerHTML = WD_ORDER.map(function (i) { return "<button type=\"button\" class=\"wd\" data-wd=\"" + i + "\" aria-pressed=\"" + (s.hours.closedWeekdays.indexOf(i) >= 0) + "\">" + WD[i] + "</button>"; }).join("");
      $("s-posts").value = s.posts; $("s-ahead").value = s.daysAhead; $("s-lead").value = s.leadMinutes; $("s-remind").checked = !!s.remindCall;
      $("s-op").value = s.privacy.operator; $("s-inn").value = s.privacy.inn; $("s-op-addr").value = s.privacy.address || ""; $("s-email").value = s.privacy.email; $("s-ret").value = s.retentionDays;
      renderServices(s.services);
      $("set-err").hidden = true;
    }).catch(fail);
  }
  $("s-wd").addEventListener("click", function (e) {
    var b = e.target.closest("[data-wd]"); if (!b) return;
    b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
  });
  function renderServices(list) {
    $("s-services").innerHTML = list.map(function (x, i) {
      return "<div class=\"svc\" data-svc-id=\"" + esc(x.id) + "\"><div class=\"svc-head\"><h3>Услуга " + (i + 1) + "</h3><button type=\"button\" class=\"btn btn-sm btn-ghost btn-danger\" data-del-svc>Удалить</button></div>" +
        "<div class=\"grid2\"><label class=\"fld\"><span>Название</span><input data-k=\"title\" value=\"" + esc(x.title) + "\"></label>" +
        "<label class=\"fld\"><span>Пояснение</span><input data-k=\"sub\" value=\"" + esc(x.sub) + "\"></label>" +
        "<label class=\"fld\"><span>Цена за</span><input data-k=\"unit\" value=\"" + esc(x.unit) + "\" placeholder=\"Пусто, если за комплект\"></label>" +
        "<label class=\"fld\"><span>Сколько занимает, минут</span><input data-k=\"minutes\" type=\"number\" min=\"5\" max=\"600\" inputmode=\"numeric\" value=\"" + x.minutes + "\"></label></div>" +
        "<div class=\"grid4\">" + S.settings.sizes.map(function (z, j) {
          return "<label class=\"fld\"><span>" + esc(z) + "</span><input data-price=\"" + j + "\" type=\"number\" min=\"0\" inputmode=\"numeric\" value=\"" + (x.prices[j] != null ? x.prices[j] : "") + "\"></label>";
        }).join("") + "</div></div>";
    }).join("");
  }
  function readServices() {
    return Array.prototype.map.call(document.querySelectorAll("#s-services .svc"), function (el) {
      var o = { id: el.getAttribute("data-svc-id"), prices: [] };
      el.querySelectorAll("[data-k]").forEach(function (inp) { o[inp.getAttribute("data-k")] = inp.getAttribute("data-k") === "minutes" ? +inp.value : inp.value; });
      el.querySelectorAll("[data-price]").forEach(function (inp) { o.prices[+inp.getAttribute("data-price")] = inp.value === "" ? null : +inp.value; });
      return o;
    });
  }
  $("s-services").addEventListener("click", function (e) {
    var b = e.target.closest("[data-del-svc]"); if (!b) return;
    if (document.querySelectorAll("#s-services .svc").length < 2) { toast("Нужна хотя бы одна услуга"); return; }
    if (!confirm("Удалить эту услугу с сайта?")) return;
    var list = readServices(), el = b.closest(".svc"), idx = Array.prototype.indexOf.call(el.parentNode.children, el);
    list.splice(idx, 1); renderServices(list);
  });
  $("s-add-svc").addEventListener("click", function () {
    var list = readServices();
    list.push({ id: "", title: "", sub: "", unit: "", minutes: 30, prices: S.settings.sizes.map(function () { return null; }) });
    renderServices(list);
    var all = document.querySelectorAll("#s-services .svc"); all[all.length - 1].querySelector("input").focus();
  });
  $("set-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var wd = Array.prototype.filter.call(document.querySelectorAll("[data-wd]"), function (b) { return b.getAttribute("aria-pressed") === "true"; }).map(function (b) { return +b.getAttribute("data-wd"); });
    var body = {
      shop: { name: $("s-name").value, phone: $("s-phone").value, address: $("s-address").value, addressNote: $("s-note").value, mapUrl: $("s-map").value },
      hours: { open: +$("s-open").value, close: +$("s-close").value, closedWeekdays: wd },
      posts: +$("s-posts").value, daysAhead: +$("s-ahead").value, leadMinutes: +$("s-lead").value, retentionDays: +$("s-ret").value, remindCall: $("s-remind").checked,
      services: readServices(),
      privacy: { operator: $("s-op").value, inn: $("s-inn").value, address: $("s-op-addr").value, email: $("s-email").value }
    };
    api("PUT", "/api/admin/settings", body).then(function () {
      $("set-err").hidden = true; toast("Сохранено. На сайте уже новые данные"); fillSettings();
      setupBanner(body.privacy);
      $("brand").textContent = body.shop.name;
    }).catch(function (err) { $("set-err").textContent = err.message; $("set-err").hidden = false; });
  });
  $("pw-form").addEventListener("submit", function (e) {
    e.preventDefault();
    api("PUT", "/api/admin/password", { current: $("pw-cur").value, next: $("pw-new").value }).then(function () {
      $("pw-cur").value = ""; $("pw-new").value = ""; $("pw-err").hidden = true; toast("Пароль изменён");
    }).catch(function (err) { $("pw-err").textContent = err.message; $("pw-err").hidden = false; });
  });

  // ===== Уведомления =====
  var INFO = {
    tg: { name: "Telegram", steps: ["Откройте в Telegram бота @BotFather и отправьте ему /newbot.", "Придумайте боту имя и адрес, который заканчивается на bot.", "BotFather пришлёт токен: длинную строку с двоеточием. Вставьте её сюда."], ph: "123456789:AA…" },
    max: { name: "MAX", steps: ["Зайдите на платформу «MAX для партнёров» (business.max.ru) и подтвердите бизнес через Госуслуги.", "В разделе «Чат-боты» создайте бота. Модерация занимает до двух рабочих дней.", "Когда бот опубликован, скопируйте в его настройках «Токен доступа» и вставьте сюда."], ph: "Токен доступа" }
  };
  function loadNotify(e) {
    if (S.view !== "notify") return;
    // Не перерисовываем, пока человек вводит токен
    if (e !== "force" && document.activeElement && document.activeElement.closest && document.activeElement.closest("#msgr") && document.activeElement.tagName === "INPUT") return;
    api("GET", "/api/admin/notify").then(renderNotify).catch(fail);
  }
  function renderNotify(n) {
    S.notify = n;
    var active = document.activeElement && document.activeElement.id;
    var typed = {}; ["tg-token", "max-token", "tg-base"].forEach(function (id) { if ($(id)) typed[id] = $(id).value; });
    $("msgr").innerHTML = ["tg", "max"].map(function (t) {
      var st = n.status[t], info = INFO[t];
      var line = !st.configured ? "<span class=\"dot\"></span>Не подключён"
        : st.ok ? "<span class=\"dot ok\"></span>Работает" + (st.bot ? ": бот @" + esc(st.bot.username) : "")
        : st.error ? "<span class=\"dot bad\"></span>" + esc(st.error) : "<span class=\"dot\"></span>Проверяем связь…";
      var html = "<div class=\"panel\"><h2>" + info.name + "</h2><p class=\"st-line\">" + line + "</p>";
      if (!st.configured) html += "<ol class=\"steps\">" + info.steps.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>";
      if (t === "tg" && st.configured && st.error && !st.ok) html += "<p class=\"hint\" style=\"margin-bottom:12px\">Если сервер сайта в России, Telegram может не отвечать: его там блокируют. Подключите MAX или укажите ниже адрес прокси для Telegram.</p>";
      html += "<div class=\"row\"><label class=\"fld\"><span>Токен бота</span><input id=\"" + t + "-token\" type=\"password\" autocomplete=\"off\" placeholder=\"" + (st.configured ? "Токен сохранён. Вставьте новый, чтобы заменить" : info.ph) + "\"></label>" +
        "<button class=\"btn btn-main\" data-save-token=\"" + t + "\">Сохранить</button>" + (st.configured ? "<button class=\"btn btn-ghost btn-danger\" data-off=\"" + t + "\">Отключить</button>" : "") + "</div>";
      if (t === "tg") html += "<details style=\"margin-top:10px\"" + (st.apiBase ? " open" : "") + "><summary>Прокси для Telegram</summary><div class=\"row\"><label class=\"fld\"><span>Адрес сервера Bot API</span><input id=\"tg-base\" placeholder=\"https://…\" value=\"" + esc(st.apiBase) + "\"><small>Нужен, только если Telegram не отвечает. Пустое поле: напрямую.</small></label><button class=\"btn\" data-save-base>Сохранить</button></div></details>";
      if (st.ok && st.links) {
        html += "<div class=\"connect\"><b>Подключите чат, куда присылать записи</b>" +
          "<div class=\"row\"><a class=\"btn\" href=\"" + esc(st.links.direct) + "\" target=\"_blank\" rel=\"noopener\">Получать себе в личку</a>" +
          (st.links.group ? "<a class=\"btn\" href=\"" + esc(st.links.group) + "\" target=\"_blank\" rel=\"noopener\">Получать в группу</a>" : "") + "</div>" +
          "<p class=\"hint\">Или отправьте боту этот код:</p><p class=\"code\">" + esc(n.code) + "</p>" +
          "<p class=\"hint\">Код действует 30 минут. <button class=\"btn btn-ghost btn-sm\" data-new-code>Новый код</button></p></div>";
      }
      return html + "</div>";
    }).join("");
    Object.keys(typed).forEach(function (id) { if ($(id) && typed[id]) $(id).value = typed[id]; });
    if (active && $(active)) $(active).focus();
    $("chats").innerHTML = n.chats.length ? n.chats.map(function (c) {
      return "<div class=\"chat\"><span class=\"tag\">" + (c.transport === "tg" ? "Telegram" : "MAX") + "</span><span class=\"t\">" + esc(c.title || "Чат без названия") + "</span><button class=\"btn btn-sm btn-ghost btn-danger\" data-del-chat=\"" + c.id + "\">Отключить</button></div>";
    }).join("") : "<p class=\"hint\">Пока ни одного. Подключите бота выше и отправьте ему код.</p>";
    $("morning").checked = n.morning;
    $("tg-personal").checked = n.tgPersonal;
    var hs = []; for (var h = 5; h <= 12; h++) hs.push([h, "в " + h + ":00"]);
    $("morning-h").innerHTML = opts(hs, n.morningHour);
  }
  $("v-notify").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-save-token")) {
      var t = b.getAttribute("data-save-token"), v = $(t + "-token").value.trim();
      if (!v) { toast("Вставьте токен"); $(t + "-token").focus(); return; }
      var body = {}; body[t] = { token: v };
      b.disabled = true; b.textContent = "Проверяем…";
      api("PUT", "/api/admin/notify", body).then(function (n) { $(t + "-token").value = ""; renderNotify(n); toast(n.status[t].ok ? "Бот подключён" : "Токен сохранён"); })
        .catch(function (err) { b.disabled = false; b.textContent = "Сохранить"; fail(err); });
    }
    if (b.hasAttribute("data-off")) {
      var t2 = b.getAttribute("data-off");
      if (!confirm("Отключить " + INFO[t2].name + "? Записи перестанут туда приходить.")) return;
      var off = {}; off[t2] = { token: "" };
      api("PUT", "/api/admin/notify", off).then(renderNotify).catch(fail);
    }
    if (b.hasAttribute("data-save-base")) api("PUT", "/api/admin/notify", { tg: { apiBase: $("tg-base").value } }).then(function (n) { renderNotify(n); toast("Сохранено"); }).catch(fail);
    if (b.hasAttribute("data-new-code")) api("POST", "/api/admin/notify/code").then(renderNotify).catch(fail);
    if (b.hasAttribute("data-del-chat")) { if (confirm("Отключить этот чат?")) api("DELETE", "/api/admin/chats/" + b.getAttribute("data-del-chat")).then(renderNotify).catch(fail); }
  });
  $("test").addEventListener("click", function () {
    $("test-res").textContent = "Отправляем…";
    api("POST", "/api/admin/notify/test").then(function (r) {
      $("test-res").textContent = r.error && !r.sent ? r.error : "Отправлено в чатов: " + r.sent + (r.failed ? ". Не дошло: " + r.failed + " (" + r.error + ")" : "");
    }).catch(function (err) { $("test-res").textContent = err.message; });
  });
  function saveMorning() { api("PUT", "/api/admin/notify", { morning: $("morning").checked, morningHour: +$("morning-h").value }).then(function () { toast("Сохранено"); }).catch(fail); }
  $("morning").addEventListener("change", saveMorning);
  $("tg-personal").addEventListener("change", function () {
    api("PUT", "/api/admin/notify", { tgPersonal: $("tg-personal").checked }).then(function (n) { renderNotify(n); toast(n.tgPersonal ? "Имя и телефон будут приходить в Telegram" : "В Telegram будет приходить ссылка на запись"); }).catch(fail);
  });
  $("morning-h").addEventListener("change", saveMorning);

  // ===== Старт =====
  api("GET", "/api/admin/session").then(function (s) {
    if (!s.notify) document.querySelector("[data-view=\"notify\"]").hidden = true;
    if (s.admin) start(); else showLogin();
  }).catch(function () { showLogin(); });
})();
