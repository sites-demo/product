// Демо-версия сервера для GitHub Pages: тот же API, что у настоящего сервера (app/server.js, app/lib/core.js),
// но записи и настройки лежат в localStorage этого браузера. Сайт и админка на одном адресе, поэтому видят одни данные.
(function () {
  "use strict";
  // Несколько демо лежат на одном адресе sites-demo.github.io, поэтому у каждого свой ключ в localStorage
  var ROOT = document.currentScript ? new URL(".", document.currentScript.src).pathname : "/";
  var KEY = "shina-demo-v1:" + ROOT, PASSWORD = "demo", TZ_OFFSET_MIN = 180;
  var WD_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  var WD_FULL = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  var MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  var STATUSES = ["new", "confirmed", "done", "no_show", "cancelled"];
  var STATUS_TEXT = { new: "Новая", confirmed: "Подтверждена", done: "Выполнена", no_show: "Не приехал", cancelled: "Отменена" };

  var DEFAULTS = {
    shop: {
      name: "Шиномонтаж",
      phone: "+7 (812) 923-98-06",
      address: "пер. Щуппа, 5",
      addressNote: "Красное Село, рядом с проспектом Ленина",
      mapUrl: "https://yandex.ru/maps/org/shinomontazh/1151076734/",
      coords: [59.72696, 30.08442]
    },
    hours: { open: 11, close: 20, closedWeekdays: [] },
    posts: 1,
    daysAhead: 7,
    leadMinutes: 40,
    sizes: ["R13–R15", "R16–R17", "R18–R19", "R20 и больше"],
    sizesShort: ["R13–15", "R16–17", "R18–19", "R20+"],
    services: [
      { id: "season", title: "Сезонная смена колёс", sub: "Снять, поставить, отбалансировать", minutes: 40, prices: [2000, 2400, 2900, 3600], unit: "" },
      { id: "balance", title: "Балансировка", sub: "Если руль дрожит на скорости", minutes: 30, prices: [1000, 1200, 1500, 1900], unit: "" },
      { id: "puncture", title: "Ремонт прокола", sub: "Колесо спускает", minutes: 30, prices: [600, 700, 800, 1000], unit: "за колесо" },
      { id: "storage", title: "Хранение шин", sub: "До следующего сезона, в тёплом складе", minutes: 15, prices: [3000, 3500, 4000, 4800], unit: "за сезон" }
    ],
    notify: { morning: true, morningHour: 10 },
    privacy: { operator: "", inn: "", email: "" },
    retentionDays: 365
  };
  // Данные конкретного шиномонтажа подставляет сборка (demo/build.py)
  var CLIENT = window.SHINA_DEMO_CLIENT || {};
  if (CLIENT.shop) {
    ["name", "phone", "address", "addressNote", "mapUrl", "coords"].forEach(function (k) { if (CLIENT.shop[k] != null) DEFAULTS.shop[k] = CLIENT.shop[k]; });
    if (CLIENT.shop.open != null) DEFAULTS.hours = { open: CLIENT.shop.open, close: CLIENT.shop.close, closedWeekdays: CLIENT.shop.closedWeekdays || [] };
    if (CLIENT.shop.services) DEFAULTS.services = CLIENT.shop.services;
  }

  // ===== Время по Москве =====
  function pad(n) { return String(n).padStart(2, "0"); }
  function local(ms) {
    var d = new Date((ms == null ? Date.now() : ms) + TZ_OFFSET_MIN * 60000);
    return { day: d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()), hour: d.getUTCHours(), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }
  function isDay(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T00:00:00Z")); }
  function addDays(day, n) {
    var d = new Date(Date.parse(day + "T00:00:00Z") + n * 864e5);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function weekday(day) { return new Date(day + "T00:00:00Z").getUTCDay(); }
  function diffDays(a, b) { return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5); }
  function dayTitle(day) { var d = new Date(day + "T00:00:00Z"); return WD_FULL[d.getUTCDay()] + ", " + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()]; }
  function whenText(day, hour) { return dayTitle(day) + ", " + hour + ":00"; }

  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function rub(n) { return num(n) + " ₽"; }
  function priceText(s, size) {
    if (size == null || size < 0) return "от " + rub(s.prices[0]) + (s.unit ? " " + s.unit : "");
    return rub(s.prices[size]) + (s.unit ? " " + s.unit : "");
  }
  function normPhone(v) {
    var d = String(v || "").replace(/\D/g, "");
    if (d.length === 11 && (d[0] === "7" || d[0] === "8")) d = d.slice(1);
    if (d.length !== 10) return null;
    return "+7 (" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6, 8) + "-" + d.slice(8, 10);
  }
  function clean(v, max) { return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }
  function hex(n) { var s = ""; for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16); return s; }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }

  // ===== Хранилище =====
  var memory = null;
  function load() {
    var st = null;
    try { st = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { st = memory; }
    if (!st) st = memory;
    // Каждый день демо начинается заново, чтобы примеры записей были на сегодня и ближайшие дни
    if (!st || st.seedDay !== local().day) st = seed();
    memory = st;
    return st;
  }
  function save(st) {
    memory = st;
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* приватный режим: работаем в памяти */ }
  }
  function settings(st) {
    var out = copy(DEFAULTS), saved = st.settings || {};
    Object.keys(saved).forEach(function (key) {
      if (out[key] && typeof out[key] === "object" && !Array.isArray(out[key]) && saved[key] && typeof saved[key] === "object" && !Array.isArray(saved[key])) out[key] = Object.assign(out[key], saved[key]);
      else out[key] = saved[key];
    });
    return out;
  }

  function seed() {
    var now = local(), today = now.day, ts = new Date().toISOString();
    var st = {
      seedDay: today, settings: {}, bookings: [], blocks: [], nextId: 1, nextBlock: 1, admin: false,
      bots: { tg: { token: true, username: CLIENT.bot || "shina_ks_bot" }, max: { token: true, username: CLIENT.bot || "shina_ks_bot" } },
      chats: [{ id: 1, transport: "tg", title: "Владелец" }, { id: 2, transport: "max", title: "Мастера шиномонтажа" }], nextChat: 3,
      code: String(100000 + Math.floor(Math.random() * 900000))
    };
    var s = settings(st);
    function add(dayOffset, hour, svc, size, name, phone, car, status, extra) {
      var day = addDays(today, dayOffset), sv = s.services.filter(function (x) { return x.id === svc; })[0];
      st.bookings.push(Object.assign({
        id: st.nextId++, created_at: ts, updated_at: ts, source: "site", service_id: sv.id, service_title: sv.title, size: size, price_text: priceText(sv, size),
        day: day, hour: hour, name: name, phone: phone, car: car, comment: "", status: status, token: hex(32)
      }, extra || {}));
    }
    // Сегодня: прошедшие часы уже выполнены, остальные подтверждены или ждут подтверждения
    var plan = [[11, "season", 1, "Андрей", "+7 (921) 340-12-45", "Hyundai Solaris"], [12, "puncture", 0, "Виктор Петрович", "+7 (952) 118-07-33", "Lada Granta"],
      [14, "balance", 2, "Ольга", "+7 (911) 762-55-10", "Kia Sportage"], [16, "season", 2, "Игорь", "+7 (931) 205-90-18", "Toyota RAV4"], [18, "storage", 1, "Наталья", "+7 (904) 611-23-84", "Skoda Octavia"]];
    plan.forEach(function (p, i) {
      var status = (p[0] + 1) * 60 <= now.minutes ? (i === 1 ? "no_show" : "done") : p[0] * 60 <= now.minutes ? "confirmed" : (i % 2 ? "new" : "confirmed");
      add(0, p[0], p[1], p[2], p[3], p[4], p[5], status);
    });
    add(1, 11, "season", 1, "Марина", "+7 (921) 455-08-61", "Lada Vesta", "new");
    add(1, 13, "season", 2, "Сергей", "+7 (911) 230-44-97", "Volkswagen Tiguan", "confirmed", { source: "admin", comment: "Записал по телефону, свои шины в багажнике" });
    add(1, 16, "balance", 1, "Дмитрий", "+7 (950) 027-61-40", "Ford Focus", "new");
    add(1, 18, "puncture", -1, "Алексей", "+7 (962) 714-38-25", "", "confirmed");
    add(2, 12, "season", 3, "Елена Сергеевна", "+7 (921) 908-16-72", "BMW X5", "confirmed");
    add(2, 17, "storage", 1, "Павел", "+7 (981) 360-75-09", "Renault Duster", "new");
    add(3, 11, "season", 0, "Татьяна", "+7 (911) 581-29-36", "Kia Rio", "confirmed");
    // Круглосуточный шиномонтаж: показываем и ночную запись
    if (s.hours.open === 0 && s.hours.close === 24) add(1, 2, "puncture", 1, "Роман", "+7 (981) 702-46-15", "Kia Ceed", "new", { comment: "Пробил колесо на трассе" });
    st.blocks.push({ id: st.nextBlock++, day: addDays(today, 2), hour: 14, note: "мастер на выезде" });
    return st;
  }

  // ===== Свободное время и записи (как в app/lib/core.js) =====
  function active(b) { return b.status !== "cancelled"; }
  function countSlot(st, day, hour) { return st.bookings.filter(function (b) { return b.day === day && b.hour === hour && active(b); }).length; }
  function blocksRange(st, from, to) {
    return st.blocks.filter(function (b) { return b.day >= from && b.day <= to; })
      .sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : (a.hour == null ? -1 : a.hour) - (b.hour == null ? -1 : b.hour); });
  }
  function byOrder(a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : a.hour - b.hour || a.id - b.id; }
  function byRange(st, from, to) { return st.bookings.filter(function (b) { return b.day >= from && b.day <= to; }).sort(byOrder); }
  function byId(st, id) { return st.bookings.filter(function (b) { return b.id === id; })[0] || null; }

  function inWindow(s, day) { var n = diffDays(local().day, day); return n >= 0 && n < s.daysAhead; }
  function freeHours(s, day, counts, blocks) {
    if (s.hours.closedWeekdays.indexOf(weekday(day)) >= 0) return [];
    var dayBlocks = blocks.filter(function (b) { return b.day === day; });
    if (dayBlocks.some(function (b) { return b.hour == null; })) return [];
    var now = local(), out = [];
    for (var h = s.hours.open; h < s.hours.close; h++) {
      if (day === now.day && h * 60 < now.minutes + s.leadMinutes) continue;
      if (day < now.day) continue;
      if (dayBlocks.some(function (b) { return b.hour === h; })) continue;
      if ((counts[day + "|" + h] || 0) >= s.posts) continue;
      out.push(h);
    }
    return out;
  }
  function slotState(st, from, to) {
    var counts = {};
    st.bookings.forEach(function (b) { if (active(b) && b.day >= from && b.day <= to) counts[b.day + "|" + b.hour] = (counts[b.day + "|" + b.hour] || 0) + 1; });
    return { counts: counts, blocks: blocksRange(st, from, to) };
  }
  function publicData(st) {
    var s = settings(st), today = local().day, last = addDays(today, s.daysAhead - 1), ss = slotState(st, today, last), days = [];
    for (var i = 0; i < s.daysAhead; i++) { var d = addDays(today, i); days.push({ day: d, free: freeHours(s, d, ss.counts, ss.blocks) }); }
    return {
      shop: s.shop, hours: s.hours, sizes: s.sizes, sizesShort: s.sizesShort, daysAhead: s.daysAhead,
      services: s.services.map(function (x) { return { id: x.id, title: x.title, sub: x.sub, minutes: x.minutes, prices: x.prices, unit: x.unit }; }),
      today: today, days: days
    };
  }
  function isFree(st, s, day, hour) { var ss = slotState(st, day, day); return freeHours(s, day, ss.counts, ss.blocks).indexOf(hour) >= 0; }
  function sizeText(s, size) { return size < 0 ? "размер посмотрит мастер" : s.sizes[size] || ""; }
  function view(st, b) {
    if (!b) return null;
    return {
      id: b.id, createdAt: b.created_at, source: b.source, serviceId: b.service_id, service: b.service_title,
      size: b.size, sizeText: sizeText(settings(st), b.size), priceText: b.price_text, day: b.day, hour: b.hour,
      when: whenText(b.day, b.hour), name: b.name, phone: b.phone, car: b.car, comment: b.comment, status: b.status, statusText: STATUS_TEXT[b.status]
    };
  }
  function validate(s, body, opts) {
    var svc = s.services.filter(function (x) { return x.id === body.svc; })[0];
    if (!svc) return { error: "Выберите услугу" };
    var size = Number(body.size);
    if (!Number.isInteger(size) || size < -1 || size >= s.sizes.length) return { error: "Выберите размер колёс" };
    if (!isDay(body.day)) return { error: "Выберите день" };
    var hour = Number(body.hour);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return { error: "Выберите время" };
    var name = clean(body.name, 60);
    if (!name) return { error: "Напишите имя" };
    var phone = normPhone(body.phone);
    if (!phone) return { error: "Нужен номер телефона из 10 цифр после +7" };
    if (!opts.admin && !inWindow(s, body.day)) return { error: "На этот день запись ещё не открыта" };
    return { data: { svc: svc, size: size, day: body.day, hour: hour, name: name, phone: phone, car: clean(body.car, 60), comment: clean(body.comment, 300) } };
  }
  function create(st, d, source) {
    var ts = new Date().toISOString(), token = hex(32);
    var row = { id: st.nextId++, created_at: ts, updated_at: ts, source: source, service_id: d.svc.id, service_title: d.svc.title, size: d.size, price_text: priceText(d.svc, d.size),
      day: d.day, hour: d.hour, name: d.name, phone: d.phone, car: d.car, comment: d.comment, status: source === "admin" ? "confirmed" : "new", token: token };
    st.bookings.push(row);
    return { row: row, token: token };
  }
  function book(st, body) {
    var s = settings(st), v = validate(s, body, {});
    if (v.error) return { status: 400, error: v.error };
    var d = v.data, today = local().day;
    var mine = st.bookings.filter(function (b) { return b.phone === d.phone && b.day >= today && (b.status === "new" || b.status === "confirmed"); }).length;
    if (mine >= 3) return { status: 409, error: "На этот номер уже есть несколько записей. Чтобы записаться ещё, позвоните нам" };
    if (!isFree(st, s, d.day, d.hour)) return { status: 409, code: "taken", error: "Это время только что заняли. Выберите другое" };
    var r = create(st, d, "site"); r.status = 200; return r;
  }
  function adminCreate(st, body) {
    var s = settings(st), v = validate(s, body, { admin: true });
    if (v.error) return { status: 400, error: v.error };
    if (!body.force && countSlot(st, v.data.day, v.data.hour) >= s.posts) return { status: 409, code: "busy", error: "На это время уже есть запись" };
    var r = create(st, v.data, "admin"); r.status = 200; return r;
  }
  function adminUpdate(st, id, body) {
    var b = byId(st, id);
    if (!b) return { status: 404, error: "Запись не найдена" };
    var s = settings(st), ts = new Date().toISOString();
    if (body.status != null && Object.keys(body).every(function (k) { return k === "status" || k === "force"; })) {
      if (STATUSES.indexOf(body.status) < 0) return { status: 400, error: "Неизвестный статус" };
      if (body.status !== "cancelled" && b.status === "cancelled" && !body.force && countSlot(st, b.day, b.hour) >= s.posts)
        return { status: 409, code: "busy", error: "Это время уже занято другой записью" };
      b.status = body.status; b.updated_at = ts;
      return { status: 200, row: b };
    }
    var merged = {
      svc: body.svc != null ? body.svc : b.service_id, size: body.size != null ? body.size : b.size, day: body.day || b.day, hour: body.hour != null ? body.hour : b.hour,
      name: body.name != null ? body.name : b.name, phone: body.phone != null ? body.phone : b.phone, car: body.car != null ? body.car : b.car, comment: body.comment != null ? body.comment : b.comment
    };
    var v = validate(s, merged, { admin: true });
    if (v.error) return { status: 400, error: v.error };
    var d = v.data, moved = d.day !== b.day || d.hour !== b.hour;
    if (moved && b.status !== "cancelled" && !body.force && countSlot(st, d.day, d.hour) >= s.posts) return { status: 409, code: "busy", error: "На это время уже есть запись" };
    Object.assign(b, { service_id: d.svc.id, service_title: d.svc.title, size: d.size, price_text: priceText(d.svc, d.size), day: d.day, hour: d.hour, name: d.name, phone: d.phone, car: d.car, comment: d.comment, updated_at: ts });
    return { status: 200, row: b };
  }
  function clientCancel(st, id, token) {
    var b = byId(st, id);
    if (!b || !b.token || String(token || "") !== b.token) return { status: 404, error: "Запись не найдена" };
    if (b.status === "cancelled") return { status: 200 };
    if (b.status !== "new" && b.status !== "confirmed") return { status: 409, error: "Эту запись уже нельзя отменить на сайте. Позвоните нам" };
    var now = local();
    if (b.day < now.day || (b.day === now.day && b.hour * 60 <= now.minutes)) return { status: 409, error: "Время записи уже прошло" };
    b.status = "cancelled"; b.updated_at = new Date().toISOString();
    return { status: 200 };
  }
  function adminDay(st, day) {
    var s = settings(st), blocks = blocksRange(st, day, day), rows = byRange(st, day, day).map(function (b) { return view(st, b); }), hours = [];
    var from = s.hours.open, to = s.hours.close;
    rows.forEach(function (r) { from = Math.min(from, r.hour); to = Math.max(to, r.hour + 1); });
    for (var h = from; h < to; h++) {
      hours.push({ hour: h, outside: h < s.hours.open || h >= s.hours.close, bookings: rows.filter(function (r) { return r.hour === h; }), block: blocks.filter(function (b) { return b.hour === h; })[0] || null });
    }
    return { day: day, title: dayTitle(day), today: local().day, posts: s.posts, closedWeekday: s.hours.closedWeekdays.indexOf(weekday(day)) >= 0, dayBlock: blocks.filter(function (b) { return b.hour == null; })[0] || null, hours: hours };
  }
  function overview(st, days) {
    var s = settings(st), today = local().day, out = [];
    for (var i = 0; i < days; i++) {
      var d = addDays(today, i), rows = st.bookings.filter(function (b) { return b.day === d && active(b); });
      out.push({ day: d, label: i === 0 ? "Сегодня" : i === 1 ? "Завтра" : WD_SHORT[weekday(d)], date: Number(d.slice(8)), total: rows.length,
        fresh: rows.filter(function (b) { return b.status === "new"; }).length, closed: s.hours.closedWeekdays.indexOf(weekday(d)) >= 0 });
    }
    return { today: today, days: out, fresh: st.bookings.filter(function (b) { return b.status === "new" && b.day >= today; }).length };
  }

  // ===== Настройки из админки (как validateSettings в app/server.js) =====
  function int(v, min, max) { var n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null; }
  function validateSettings(body, cur) {
    var out = {};
    if (body.shop) {
      var s = body.shop, shop = Object.assign({}, cur.shop);
      if (s.name != null) shop.name = clean(s.name, 60) || cur.shop.name;
      if (s.phone != null) { var p = normPhone(s.phone); if (!p) return { error: "Телефон: нужен номер из 10 цифр после +7" }; shop.phone = p; }
      if (s.address != null) shop.address = clean(s.address, 100);
      if (s.addressNote != null) shop.addressNote = clean(s.addressNote, 150);
      if (s.mapUrl != null) { var u = clean(s.mapUrl, 300); if (u && !/^https:\/\//.test(u)) return { error: "Ссылка на карту должна начинаться с https://" }; shop.mapUrl = u; }
      if (s.coords != null) {
        var c = [Number(s.coords[0]), Number(s.coords[1])];
        if (!(c[0] >= -90 && c[0] <= 90 && c[1] >= -180 && c[1] <= 180)) return { error: "Неверные координаты" };
        shop.coords = c;
      }
      out.shop = shop;
    }
    if (body.hours) {
      var o = int(body.hours.open, 0, 23), cl = int(body.hours.close, 1, 24);
      if (o == null || cl == null || cl <= o) return { error: "Время закрытия должно быть позже открытия" };
      var wd = Array.isArray(body.hours.closedWeekdays) ? body.hours.closedWeekdays.map(Number).filter(function (n, i, a) { return Number.isInteger(n) && n >= 0 && n <= 6 && a.indexOf(n) === i; }) : [];
      if (wd.length === 7) return { error: "Нельзя сделать выходными все дни недели" };
      out.hours = { open: o, close: cl, closedWeekdays: wd.sort() };
    }
    if (body.posts != null) { var n1 = int(body.posts, 1, 10); if (n1 == null) return { error: "Сколько машин одновременно: от 1 до 10" }; out.posts = n1; }
    if (body.daysAhead != null) { var n2 = int(body.daysAhead, 1, 60); if (n2 == null) return { error: "Запись вперёд: от 1 до 60 дней" }; out.daysAhead = n2; }
    if (body.leadMinutes != null) { var n3 = int(body.leadMinutes, 0, 1440); if (n3 == null) return { error: "Неверное время до записи" }; out.leadMinutes = n3; }
    if (body.retentionDays != null) { var n4 = int(body.retentionDays, 30, 3650); if (n4 == null) return { error: "Хранение записей: от 30 до 3650 дней" }; out.retentionDays = n4; }
    if (body.services) {
      if (!Array.isArray(body.services) || !body.services.length || body.services.length > 20) return { error: "Нужна хотя бы одна услуга" };
      var ids = {}, list = [];
      for (var i = 0; i < body.services.length; i++) {
        var sv = body.services[i], title = clean(sv.title, 60);
        if (!title) return { error: "У каждой услуги должно быть название" };
        var id = /^[a-z0-9_-]{1,24}$/.test(sv.id || "") && !ids[sv.id] ? sv.id : "s" + hex(6);
        ids[id] = true;
        var prices = cur.sizes.map(function (_, k) { return int(Array.isArray(sv.prices) ? sv.prices[k] : null, 0, 1000000); });
        if (prices.some(function (x) { return x == null; })) return { error: "Проверьте цены у услуги «" + title + "»: нужны целые числа" };
        list.push({ id: id, title: title, sub: clean(sv.sub, 100), minutes: int(sv.minutes, 5, 600) || 30, prices: prices, unit: clean(sv.unit, 30) });
      }
      out.services = list;
    }
    if (body.privacy) {
      var pr = body.privacy;
      out.privacy = { operator: clean(pr.operator, 150), inn: clean(pr.inn, 12).replace(/\D/g, ""), email: clean(pr.email, 100) };
    }
    return { data: out };
  }

  // ===== Уведомления: в демо боты не подключаются, показываем, как это выглядит =====
  function notifyState(st) {
    var s = settings(st).notify, status = {};
    ["tg", "max"].forEach(function (t) {
      var b = st.bots[t];
      status[t] = { configured: !!b.token, ok: !!b.token, error: null, bot: b.token ? { username: b.username } : null, apiBase: b.apiBase || "", checking: false, links: null };
    });
    return { status: status, chats: st.chats.map(function (c) { return { id: c.id, transport: c.transport, title: c.title }; }), code: st.code, codeExp: Date.now() + 1800000, morning: s.morning, morningHour: s.morningHour };
  }
  function updateNotify(st, b) {
    var cur = settings(st).notify;
    if (b.tg) {
      if (b.tg.token != null) {
        var t = String(b.tg.token).trim();
        if (t && !/^\d{5,}:[\w-]{30,}$/.test(t)) return { status: 400, data: { error: "Токен Telegram выглядит иначе: 123456789:ABC… Скопируйте его из @BotFather целиком" } };
        st.bots.tg.token = !!t;
        if (!t) st.chats = st.chats.filter(function (c) { return c.transport !== "tg"; });
      }
      if (b.tg.apiBase != null) {
        var u = String(b.tg.apiBase).trim().replace(/\/+$/, "");
        if (u && !/^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(u)) return { status: 400, data: { error: "Адрес прокси должен начинаться с https://" } };
        st.bots.tg.apiBase = u;
      }
    }
    if (b.max && b.max.token != null) {
      var m = String(b.max.token).trim();
      if (m.length > 400 || /\s/.test(m)) return { status: 400, data: { error: "Токен MAX выглядит неправильно" } };
      st.bots.max.token = !!m;
      if (!m) st.chats = st.chats.filter(function (c) { return c.transport !== "max"; });
    }
    var next = { morning: cur.morning, morningHour: cur.morningHour };
    if (b.morning != null) next.morning = !!b.morning;
    if (b.morningHour != null) { var h = int(b.morningHour, 0, 23); if (h == null) return { status: 400, data: { error: "Неверный час сводки" } }; next.morningHour = h; }
    st.settings.notify = next;
    return { status: 200, data: notifyState(st) };
  }

  // ===== Выгрузка для Excel =====
  function csv(rows) {
    var head = ["Дата", "Время", "Услуга", "Размер", "Цена", "Имя", "Телефон", "Машина", "Комментарий", "Статус", "Откуда", "Создана"];
    function cell(v) { var s = String(v == null ? "" : v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
    var lines = rows.map(function (b) { return [b.day, b.hour + ":00", b.service, b.sizeText, b.priceText.replace(/ /g, " "), b.name, b.phone, b.car, b.comment, b.statusText, b.source === "admin" ? "админка" : "сайт", b.createdAt].map(cell).join(";"); });
    return "﻿" + [head.join(";")].concat(lines).join("\r\n");
  }
  function exportCsv() {
    var st = load(), today = local().day, from = addDays(today, -30), to = addDays(today, 60);
    var blob = new Blob([csv(byRange(st, from, to).map(function (b) { return view(st, b); }))], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "zapisi-" + from + "-" + to + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ===== Маршруты (как в app/server.js) =====
  function ok(data) { return { status: 200, data: data }; }
  function err(status, error, code) { return { status: status, data: { error: error, code: code } }; }
  function handle(method, path, query, body) {
    var st = load(), m, r, s;
    if (method === "GET" && path === "/public") return ok(publicData(st));
    if (method === "POST" && path === "/bookings") {
      if (body.website) return ok({ id: 0, token: "", when: "" });
      if (body.consent !== true) return err(400, "Нужно согласие на обработку персональных данных");
      r = book(st, body);
      if (r.status !== 200) return err(r.status, r.error, r.code);
      save(st);
      var b = view(st, r.row);
      return ok({ id: b.id, token: r.token, when: b.when, service: b.service, sizeText: b.sizeText, priceText: b.priceText, name: b.name, phone: b.phone, car: b.car });
    }
    if (method === "POST" && (m = /^\/bookings\/(\d+)\/cancel$/.exec(path))) {
      r = clientCancel(st, Number(m[1]), body.token);
      if (r.status !== 200) return err(r.status, r.error);
      save(st); return ok({ ok: true });
    }
    if (method === "POST" && path === "/admin/login") {
      if (body.password !== PASSWORD) return err(401, "Неверный пароль. В демо-версии пароль: " + PASSWORD);
      st.admin = true; save(st); return ok({ ok: true });
    }
    if (method === "POST" && path === "/admin/logout") { st.admin = false; save(st); return ok({ ok: true }); }
    if (method === "GET" && path === "/admin/session") return ok({ admin: !!st.admin, shop: settings(st).shop.name, notify: true });
    if (path.indexOf("/admin/") === 0 && !st.admin) return err(401, "Нужно войти заново");

    if (method === "GET" && path === "/admin/overview") return ok(overview(st, int(query.get("days"), 1, 60) || 14));
    if (method === "GET" && path === "/admin/day") {
      var day = query.get("day") || local().day;
      return isDay(day) ? ok(adminDay(st, day)) : err(400, "Неверная дата");
    }
    if (method === "GET" && path === "/admin/search") {
      var raw = clean(query.get("q"), 60).toLowerCase(), digits = raw.replace(/\D/g, "");
      if (raw.length < 2) return ok({ results: [] });
      var today = local().day, rows = byRange(st, addDays(today, -90), addDays(today, 90)).map(function (x) { return view(st, x); });
      var found = rows.filter(function (x) { return (digits.length >= 3 && x.phone.replace(/\D/g, "").indexOf(digits) >= 0) || x.name.toLowerCase().indexOf(raw) >= 0 || x.car.toLowerCase().indexOf(raw) >= 0; });
      return ok({ results: found.reverse().slice(0, 30) });
    }
    if (method === "POST" && path === "/admin/bookings") {
      r = adminCreate(st, body);
      if (r.status !== 200) return err(r.status, r.error, r.code);
      save(st); return ok({ booking: view(st, r.row) });
    }
    if (method === "PATCH" && (m = /^\/admin\/bookings\/(\d+)$/.exec(path))) {
      r = adminUpdate(st, Number(m[1]), body);
      if (r.status !== 200) return err(r.status, r.error, r.code);
      save(st); return ok({ booking: view(st, r.row) });
    }
    if (method === "POST" && path === "/admin/blocks") {
      var hour = body.hour == null ? null : Number(body.hour);
      if (!isDay(body.day)) return err(400, "Неверная дата");
      if (hour != null && (!Number.isInteger(hour) || hour < 0 || hour > 23)) return err(400, "Неверное время");
      st.blocks = st.blocks.filter(function (x) { return !(x.day === body.day && x.hour === hour); });
      var id = st.nextBlock++;
      st.blocks.push({ id: id, day: body.day, hour: hour, note: clean(body.note, 100) });
      save(st); return ok({ id: id });
    }
    if (method === "DELETE" && (m = /^\/admin\/blocks\/(\d+)$/.exec(path))) {
      st.blocks = st.blocks.filter(function (x) { return x.id !== Number(m[1]); });
      save(st); return ok({ status: 200 });
    }
    if (method === "GET" && path === "/admin/settings") {
      s = settings(st);
      return ok({ shop: s.shop, hours: s.hours, posts: s.posts, daysAhead: s.daysAhead, leadMinutes: s.leadMinutes, sizes: s.sizes, services: s.services, privacy: s.privacy, retentionDays: s.retentionDays });
    }
    if (method === "PUT" && path === "/admin/settings") {
      var v = validateSettings(body, settings(st));
      if (v.error) return err(400, v.error);
      Object.keys(v.data).forEach(function (k) { st.settings[k] = v.data[k]; });
      save(st); return ok({ ok: true });
    }
    if (method === "PUT" && path === "/admin/password") return err(400, "В демо-версии пароль не меняется. На настоящем сайте здесь задаётся свой пароль");
    if (method === "GET" && path === "/admin/notify") return ok(notifyState(st));
    if (method === "PUT" && path === "/admin/notify") { r = updateNotify(st, body); if (r.status === 200) save(st); return r; }
    if (method === "POST" && path === "/admin/notify/code") { st.code = String(100000 + Math.floor(Math.random() * 900000)); save(st); return ok(notifyState(st)); }
    if (method === "POST" && path === "/admin/notify/test") {
      var n = st.chats.filter(function (c) { return st.bots[c.transport].token; }).length;
      return ok(n ? { sent: n, failed: 0 } : { sent: 0, failed: 0, error: "Нет подключённых чатов" });
    }
    if (method === "DELETE" && (m = /^\/admin\/chats\/(\d+)$/.exec(path))) {
      st.chats = st.chats.filter(function (c) { return c.id !== Number(m[1]); });
      save(st); return ok(notifyState(st));
    }
    return err(404, "Не найдено");
  }

  // Подменяем fetch только для адресов …/api/…, всё остальное идёт в сеть как обычно
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = new URL(typeof input === "string" ? input : input.url, location.href), m = /\/api(\/[^?#]*)$/.exec(url.pathname);
    if (!m) return realFetch(input, init);
    init = init || {};
    var method = String(init.method || "GET").toUpperCase(), body = {};
    try { body = init.body ? JSON.parse(init.body) || {} : {}; } catch (e) { body = {}; }
    return new Promise(function (resolve) {
      setTimeout(function () {
        var r;
        try { r = handle(method, m[1], url.searchParams, body); }
        catch (e) { console.error(e); r = err(500, "Ошибка демо-версии. Обновите страницу"); }
        resolve(new Response(JSON.stringify(r.data), { status: r.status, headers: { "Content-Type": "application/json; charset=utf-8" } }));
      }, 150);
    });
  };

  // ===== Для демо-панели админки =====
  var HEAD = { new: "🆕 <b>Новая запись</b>", confirmed: "✅ <b>Подтверждена</b>", done: "✔️ <b>Выполнена</b>", no_show: "🚫 <b>Не приехал</b>", cancelled: "❌ <b>Отменена</b>" };
  function esc(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  // Последняя новая запись (или просто последняя) в том виде, в каком её пришлёт бот (тот же текст, что в app/lib/notify.js)
  // pin: запись, на кнопку которой только что нажали; показываем её, пока не придёт запись новее since
  function botMessage(pin, since) {
    var st = load(), today = local().day;
    var list = st.bookings.filter(function (b) { return b.day >= today; }).sort(function (a, b) { return b.id - a.id; });
    var pinned = pin && list.filter(function (x) { return x.id === pin; })[0];
    var pick = pinned && list[0].id <= since ? pinned : list.filter(function (x) { return x.status === "new"; })[0] || list[0], b = pick && view(st, pick);
    if (!b) return null;
    var lines = [HEAD[b.status], "<b>" + esc(capital(dayTitle(b.day))) + ", " + b.hour + ":00</b>", esc(b.service) + " · " + esc(b.sizeText) + " · " + esc(b.priceText), esc(b.name) + ", " + esc(b.phone)];
    if (b.car) lines.push("Машина: " + esc(b.car));
    if (b.comment) lines.push("Комментарий: " + esc(b.comment));
    if (b.source === "admin") lines.push("<i>Добавлена в админке</i>");
    var buttons = b.status === "new" ? [["Подтвердить", "confirmed"], ["Отменить", "cancelled"]] : b.status === "confirmed" ? [["Отменить запись", "cancelled"]] : [];
    return { id: b.id, maxId: list[0].id, html: lines.join("<br>"), buttons: buttons, transports: st.chats.map(function (c) { return c.transport; }) };
  }
  window.SHINA_DEMO = { botMessage: botMessage, exportCsv: exportCsv, reset: function () { save(seed()); }, password: PASSWORD };
})();
