/* GUL — поведение сайта на нативном JS (без библиотек). Данные лежат в js/data.js.
   Один файл на все страницы: каждый блок проверяет, есть ли его разметка на странице. */
(function () {
  'use strict';

  var D = window.GUL || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var isMobile = function () { return window.matchMedia('(max-width: 900px)').matches; };
  var canHover = window.matchMedia('(hover: hover)').matches;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* ---------- Иконки (точечные, цвет = currentColor) ---------- */
  var ICON_MENU = '<svg viewBox="0 0 52 52" aria-hidden="true"><path d="M6 12h.08M46 12h-.08M6 25h.08M46 25h-.08M6 38h.08M46 38h-.08M13.92 12h.16M21.92 12h.16M29.92 12h.16M37.92 12h.16M13.92 25h.16M21.92 25h.16M29.92 25h.16M37.92 25h.16M13.92 38h.16M21.92 38h.16M29.92 38h.16M37.92 38h.16" stroke="currentColor" stroke-width="6" stroke-linecap="round" fill="none"/></svg>';
  var ICON_CLOSE = '<svg viewBox="-4 -4 52 52" aria-hidden="true" fill="currentColor"><circle cx="4" cy="4" r="4.1"/><circle cx="40" cy="4" r="4.1"/><circle cx="13" cy="13" r="4.1"/><circle cx="31" cy="13" r="4.1"/><circle cx="22" cy="22" r="4.1"/><circle cx="13" cy="31" r="4.1"/><circle cx="31" cy="31" r="4.1"/><circle cx="4" cy="40" r="4.1"/><circle cx="40" cy="40" r="4.1"/></svg>';
  // стрелка «>» из точек; «<» — та же, отражённая в CSS
  var ICON_ARROW = '<svg viewBox="-4 -4 40 52" aria-hidden="true" fill="currentColor"><circle cx="4" cy="4" r="4.1"/><circle cx="13" cy="13" r="4.1"/><circle cx="22" cy="22" r="4.1"/><circle cx="13" cy="31" r="4.1"/><circle cx="4" cy="40" r="4.1"/></svg>';
  var ICONS = { menu: ICON_MENU, close: ICON_CLOSE, arrow: ICON_ARROW };
  $$('[data-icon]').forEach(function (el) {
    el.insertAdjacentHTML('afterbegin', ICONS[el.getAttribute('data-icon')] || ICON_MENU);
  });

  /* ---------- 1. Меню (одно на все страницы, собирается здесь) ---------- */
  (function () {
    var burger = $('#burger');
    if (!burger) return;
    var menu = document.createElement('aside');
    menu.className = 'menu';
    menu.id = 'menu';
    menu.setAttribute('aria-hidden', 'true');
    menu.setAttribute('inert', '');
    menu.innerHTML =
      '<div class="menu__backdrop" data-menu-close></div>' +
      '<div class="menu__panel" role="dialog" aria-label="Меню">' +
        '<div class="menu__head">' +
          '<a class="menu__brand" href="index.html"><img src="assets/img/лого меню.png" alt="GUL — фестиваль IDM и славянского фолка"></a>' +
          '<button class="menu__close" id="menu-close" type="button" aria-label="Закрыть меню">' + ICON_CLOSE + '</button>' +
        '</div>' +
        '<nav class="menu__nav" aria-label="Разделы">' +
          '<a class="menu__item" href="schedule.html">График сцен</a>' +
          '<a class="menu__item" href="map.html">Карта фестиваля</a>' +
          '<a class="menu__item" href="lineup.html">Лайнап артистов</a>' +
          '<a class="menu__item" href="index.html#contacts">Связь с нами</a>' +
        '</nav>' +
        '<a class="menu__buy" href="tickets.html">Купить билет</a>' +
      '</div>';
    document.body.appendChild(menu);

    var menuClose = $('#menu-close');
    var lastFocus = null;
    function openMenu() {
      lastFocus = document.activeElement;
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      menu.removeAttribute('inert');
      burger.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('no-scroll');
      menuClose.focus({ preventScroll: true });
    }
    function closeMenu() {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      menu.setAttribute('inert', '');
      burger.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('no-scroll');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    burger.setAttribute('aria-controls', 'menu');
    burger.addEventListener('click', openMenu);
    menuClose.addEventListener('click', closeMenu);
    $$('[data-menu-close], .menu__item, .menu__buy', menu).forEach(function (el) { el.addEventListener('click', closeMenu); });
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeMenu(); return; }
      if (e.key !== 'Tab') return;
      var f = $$('a[href], button', menu);
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  })();

  /* ==========================================================
     ГЛАВНАЯ
     ========================================================== */

  /* ---------- Цвет фона зависит от времени суток ---------- */
  if (document.body.classList.contains('page-home')) {
    var hexToRgb = function (h) {
      var n = parseInt(h.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    var applyTimeBg = function () {
      var stops = (D.timeBackgrounds || []).slice().sort(function (a, b) { return a.h - b.h; });
      if (stops.length < 2) return;
      var now = new Date();
      var h = now.getHours() + now.getMinutes() / 60;
      var prev = stops[0], next = stops[stops.length - 1];
      for (var i = 0; i < stops.length - 1; i++) {
        if (h >= stops[i].h && h <= stops[i + 1].h) { prev = stops[i]; next = stops[i + 1]; break; }
      }
      var t = Math.min(1, Math.max(0, (h - prev.h) / (next.h - prev.h || 1)));
      var a = hexToRgb(prev.c), b = hexToRgb(next.c);
      var rgb = a.map(function (v, k) { return Math.round(v + (b[k] - v) * t); });
      document.documentElement.style.setProperty('--bg', 'rgb(' + rgb.join(',') + ')');
    };
    applyTimeBg();
    setInterval(applyTimeBg, 60 * 1000);
  }

  /* ---------- Скролл по блокам ----------
     На телефоне хватает CSS (scroll-snap в style.css). С мышью/тачпадом одно движение
     колеса = переезд ровно на один блок; пока едем — лишние прокруты (инерция тачпада) глотаются. */
  (function () {
    if (!document.documentElement.classList.contains('snap')) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var blocks = $$('.hero, .about, .lineup, .stages, .finale');
    var busy = false, quiet = null;

    function currentIndex() {
      var y = window.scrollY + 2, idx = 0;
      blocks.forEach(function (b, i) { if (b.offsetTop <= y) idx = i; });
      return idx;
    }
    function release() {
      // ждём, пока колесо «затихнет», чтобы инерция не перелистнула ещё блок
      clearTimeout(quiet);
      quiet = setTimeout(function () { busy = false; }, 180);
    }
    function go(dir, e) {
      var i = currentIndex(), cur = blocks[i];
      var top = window.scrollY, bottom = top + window.innerHeight;
      // блок выше экрана — внутри него листаем как обычно
      if (dir > 0 && cur.offsetTop + cur.offsetHeight > bottom + 2) return;
      if (dir < 0 && cur.offsetTop < top - 2) return;
      var target = blocks[i + dir];
      if (!target) return;
      if (e) e.preventDefault();
      busy = true;
      clearTimeout(quiet); quiet = null;
      window.scrollTo({ top: target.offsetTop, behavior: reduceMotion ? 'auto' : 'smooth' });
      var done = function () { window.removeEventListener('scrollend', done); clearTimeout(fallback); release(); };
      var fallback = setTimeout(done, 1000);
      window.addEventListener('scrollend', done);
    }

    window.addEventListener('wheel', function (e) {
      if (isMobile() || document.documentElement.classList.contains('no-scroll') || e.ctrlKey) return;
      if (busy) { e.preventDefault(); if (quiet) release(); return; }
      if (Math.abs(e.deltaY) < 4) return;
      go(e.deltaY > 0 ? 1 : -1, e);
    }, { passive: false });

    window.addEventListener('keydown', function (e) {
      if (busy || document.documentElement.classList.contains('no-scroll')) return;
      if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
      var k = e.key;
      if (k === 'PageDown' || k === 'ArrowDown' || (k === ' ' && !e.shiftKey)) go(1, e);
      else if (k === 'PageUp' || k === 'ArrowUp' || (k === ' ' && e.shiftKey)) go(-1, e);
    });
  })();

  /* ---------- Таймер до начала: ДНИ:ЧЧ:ММ:СС:мс ---------- */
  (function () {
    var el = $('#timer');
    if (!el || !D.eventStart) return;
    var target = new Date(D.eventStart).getTime();
    var pad = function (n, l) { return String(n).padStart(l || 2, '0'); };
    function render() {
      var ms = Math.max(0, target - Date.now());
      var d = Math.floor(ms / 864e5);
      var h = Math.floor(ms / 36e5) % 24;
      var m = Math.floor(ms / 6e4) % 60;
      var s = Math.floor(ms / 1e3) % 60;
      var f = reduceMotion ? 0 : ms % 1000;
      el.textContent = pad(d, 3) + ':' + pad(h) + ':' + pad(m) + ':' + pad(s) + ':' + pad(f, 3);
    }
    render();
    if (reduceMotion) { setInterval(render, 1000); return; }
    (function tick() { render(); requestAnimationFrame(tick); })();
  })();

  /* ---------- Манифест (попап) ---------- */
  (function () {
    var mOpen = $('#manifest-open'), mBox = $('#manifest'), mClose = $('#manifest-close');
    if (!mOpen) return;
    function setManifest(open) {
      mBox.hidden = !open;
      mOpen.setAttribute('aria-expanded', String(open));
      mOpen.textContent = open ? '[ЗАКРЫТЬ МАНИФЕСТ]' : '[ЧИТАТЬ МАНИФЕСТ]';
      if (open && !isMobile()) mClose.focus({ preventScroll: true }); else mOpen.focus({ preventScroll: true });
    }
    mOpen.addEventListener('click', function () { setManifest(mBox.hidden); });
    mClose.addEventListener('click', function () { setManifest(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !mBox.hidden) setManifest(false);
    });
  })();

  /* ---------- Сцены: слайдер ---------- */
  (function () {
    var stages = D.stages || [];
    var media = $('#stage-media');
    if (!media || !stages.length) return;
    var title = $('#stage-title'), text = $('#stage-text'), img = $('#stage-img');
    var i = 0;
    stages.forEach(function (s) { new Image().src = s.image; });
    function show(n) {
      i = (n + stages.length) % stages.length;
      var s = stages[i];
      media.classList.add('is-changing');
      setTimeout(function () {
        title.textContent = s.title;
        text.innerHTML = s.html;           // тексты из data.js (свои, не пользовательские)
        img.style.backgroundImage = 'url("' + s.image + '")';
        media.classList.remove('is-changing');
      }, reduceMotion ? 0 : 200);
    }
    img.style.backgroundImage = 'url("' + stages[0].image + '")';
    $('#stage-prev').addEventListener('click', function () { show(i - 1); });
    $('#stage-next').addEventListener('click', function () { show(i + 1); });

    // свайп на телефоне
    var x0 = null;
    media.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    media.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
    });
    media.addEventListener('pointercancel', function () { x0 = null; });
  })();

  /* ---------- Подписка на новости ---------- */
  (function () {
    var open = $('#sub-open'), form = $('#sub-form'), status = $('#sub-status');
    if (!open || !form) return;
    open.addEventListener('click', function () {
      open.hidden = true; form.hidden = false; $('#sub-email').focus();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.elements.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = 'Проверьте адрес почты'; return; }
      if (!D.subscribeEndpoint) { status.textContent = 'Готово. Вы в списке'; form.reset(); return; }
      status.textContent = '…';
      fetch(D.subscribeEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email })
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        status.textContent = 'Готово. Вы в списке'; form.reset();
      }).catch(function () { status.textContent = 'Не получилось отправить, попробуйте позже'; });
    });
  })();

  /* ---------- Видео: hero и подвал ----------
     Без звука, зацикленное, автоплей, всегда на весь блок (object-fit: cover).
     На телефоне берётся лёгкая версия (если есть). Вне экрана — пауза. */
  $$('video[data-src]').forEach(function (v) {
    if (reduceMotion || saveData) return;
    var mobileSrc = v.getAttribute('data-src-mobile');
    var desktopSrc = v.getAttribute('data-src');
    var src = (isMobile() && mobileSrc) ? mobileSrc : desktopSrc;

    v.addEventListener('error', function () {
      if (src !== desktopSrc) { src = desktopSrc; v.src = src; v.load(); return; }
      v.classList.add('is-missing');
    });
    v.muted = true;
    v.src = src;
    var play = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) play(); else v.pause(); });
      }, { threshold: 0.05 }).observe(v);
    } else { play(); }
  });

  /* ==========================================================
     РАСПИСАНИЕ СЦЕН
     ========================================================== */
  (function () {
    var box = $('#schedule');
    if (!box || !D.schedule) return;
    var stages = D.scheduleStages || [];
    box.innerHTML = D.schedule.map(function (day) {
      return '<section class="day" aria-label="' + esc(day.day + ' ' + day.date) + '">' +
        '<div class="sched__grid day__head" role="row">' +
          '<h2 class="day__name">' + esc(day.day) + '</h2>' +
          '<p class="day__date">' + esc(day.date) + '</p>' +
          stages.map(function (s) { return '<p class="day__stage">' + esc(s) + '</p>'; }).join('') +
        '</div>' +
        '<ol class="day__rows">' +
          day.rows.map(function (r) {
            return '<li class="sched__grid slot">' + r.map(function (c, k) {
              var label = k === 0 ? '' : ' aria-label="' + esc(stages[k - 1] + ': ' + (c === '—' ? 'нет' : c)) + '"';
              return '<span' + label + '>' + esc(c) + '</span>';
            }).join('') + '</li>';
          }).join('') +
        '</ol>' +
      '</section>';
    }).join('');
  })();

  /* ==========================================================
     КАРТА: наведение на точку или объект → объект подсвечивается, вылезает окно
     ========================================================== */
  (function () {
    var stage = $('#map-stage');
    if (!stage || !D.mapPlaces) return;
    var W = D.mapSize[0], H = D.mapSize[1];
    var pct = function (v, of) { return (v / of * 100) + '%'; };
    var panel = $('#place'), pTitle = $('#place-title'), pBody = $('#place-body'), pLink = $('#place-link');
    var current = null, hideTimer = null;

    var html = '';
    D.mapPlaces.forEach(function (p) {
      var b = p.box;
      html += '<div class="obj" data-id="' + p.id + '" style="left:' + pct(b[0], W) + ';top:' + pct(b[1], H) +
              ';width:' + pct(b[2], W) + ';height:' + pct(b[3], H) + '">' +
                '<img class="obj__img" src="' + p.img + '" alt="" draggable="false">' +
                '<span class="obj__hit" data-id="' + p.id + '"' + (p.hit ? ' style="clip-path:polygon(' + p.hit + ')"' : '') + '></span>' +
              '</div>';
    });
    D.mapPlaces.forEach(function (p) {
      html += '<button class="pin" type="button" data-id="' + p.id + '" aria-label="' + esc(p.title) + '" aria-controls="place"' +
              ' style="left:' + pct(p.pin[0], W) + ';top:' + pct(p.pin[1], H) + '"><img src="assets/img/ТОЧКА.svg" alt=""></button>';
    });
    stage.insertAdjacentHTML('beforeend', html);

    var byId = {};
    D.mapPlaces.forEach(function (p) { byId[p.id] = p; });

    function activate(id) {
      clearTimeout(hideTimer);
      if (current === id) return;
      current = id;
      var p = byId[id];
      $$('.obj, .pin', stage).forEach(function (el) { el.classList.toggle('is-active', el.getAttribute('data-id') === id); });
      pTitle.textContent = p.title;
      pBody.innerHTML = p.info.map(function (t) { return '<p>' + t + '</p>'; }).join('');  // тексты из data.js
      if (p.link) { pLink.hidden = false; pLink.href = p.link.href; pLink.textContent = p.link.text + ' →'; }
      else pLink.hidden = true;
      panel.classList.add('is-on');
      panel.setAttribute('aria-hidden', 'false');
    }
    // по умолчанию всегда открыта MAIN: увели курсор / тапнули мимо — возвращаемся к ней
    var DEFAULT_ID = byId.main ? 'main' : D.mapPlaces[0].id;
    function deactivate() { activate(DEFAULT_ID); }
    function scheduleHide() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(deactivate, 350);
    }

    stage.addEventListener('pointerover', function (e) {
      if (e.pointerType === 'touch') return;
      var t = e.target.closest('[data-id]');
      if (t && t.classList.contains('obj')) return;
      if (t) activate(t.getAttribute('data-id'));
    });
    stage.addEventListener('pointerout', function (e) {
      if (e.pointerType === 'touch') return;
      var from = e.target.closest('.pin, .obj__hit');
      var to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.pin, .obj__hit');
      if (from && !to) scheduleHide();
    });
    // мышь может уйти с объекта на само окно — тогда оно не прячется
    panel.addEventListener('pointerenter', function () { clearTimeout(hideTimer); });
    panel.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') scheduleHide(); });

    // тач и клавиатура: тап/фокус открывает, тап мимо — закрывает
    stage.addEventListener('click', function (e) {
      var t = e.target.closest('.pin, .obj__hit');
      if (!t) { if (!canHover) deactivate(); return; }
      activate(t.getAttribute('data-id'));
    });
    stage.addEventListener('focusin', function (e) { if (e.target.classList.contains('pin')) activate(e.target.getAttribute('data-id')); });
    stage.addEventListener('focusout', function (e) { if (!panel.contains(e.relatedTarget)) scheduleHide(); });
    document.addEventListener('click', function (e) {
      if (!canHover && current && !stage.contains(e.target) && !panel.contains(e.target)) deactivate();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') deactivate(); });
    activate(DEFAULT_ID);
  })();

  /* ==========================================================
     ЛАЙНАП АРТИСТОВ
     ========================================================== */
  var GLYPHS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЫЭЮЯ0123456789#%&@$*+=/\\<>[]_ABCDEFGHJKLMNPQRSTUVWXYZ';
  var rnd = function (n) { return Math.floor(Math.random() * n); };
  var glyph = function () { return GLYPHS[rnd(GLYPHS.length)]; };

  (function () {
    var list = $('#artists');
    if (!list || !D.artists) return;
    list.innerHTML = D.artists.map(function (a, i) {
      var chars = Array.prototype.map.call(a.name, function (c) {
        return c === ' ' ? '<span class="ch"> </span>' : '<span class="ch" data-c="' + esc(c) + '">' + esc(c) + '</span>';
      }).join('');
      return '<li class="artist" style="--col:' + (i % 4) + '">' +
        '<h2 class="artist__name" aria-label="' + esc(a.name) + '"><span aria-hidden="true">' + chars + '</span></h2>' +
        '<p class="artist__about">' + esc(a.about) + '</p>' +
      '</li>';
    }).join('');
    if (reduceMotion) return;

    // одна буква под курсором «перещёлкивается» несколько раз
    function flip(ch, times, delay) {
      if (ch._busy) return;
      ch._busy = true;
      var orig = ch.getAttribute('data-c'), n = 0;
      ch.classList.add('is-glitch');
      (function step() {
        if (n++ < times) { ch.textContent = glyph(); setTimeout(step, delay); }
        else { ch.textContent = orig; ch.classList.remove('is-glitch'); ch._busy = false; }
      })();
    }
    // при заходе на имя — волна по всем буквам слева направо
    function scramble(name) {
      $$('.ch[data-c]', name).forEach(function (ch, k) {
        setTimeout(function () { flip(ch, 3 + rnd(4), 45); }, k * 35);
      });
    }
    list.addEventListener('pointerover', function (e) {
      var ch = e.target.closest('.ch[data-c]');
      if (ch) flip(ch, 4 + rnd(4), 55);
      var name = e.target.closest('.artist__name');
      var from = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.artist__name');
      if (name && name !== from) scramble(name);
    });
  })();

  /* ---------- Крестики на фоне «лагают», как плохой свет ---------- */
  (function () {
    var svg = $('#crosses');
    if (!svg || reduceMotion) return;
    var paths = $$('path', svg);
    if (!paths.length) return;

    // часть крестиков мигает постоянно, каждый со своим ритмом
    for (var k = 3; k < paths.length; k += 11) {
      paths[k].classList.add('flk');
      paths[k].style.setProperty('--d', (4 + Math.random() * 7).toFixed(2) + 's');
      paths[k].style.setProperty('--dl', (-Math.random() * 10).toFixed(2) + 's');
    }

    // плюс случайный крестик время от времени гаснет / вспыхивает (по одному)
    var free = paths.filter(function (p) { return !p.classList.contains('flk'); });
    function blink() {
      var p = free[rnd(free.length)];
      var flickers = 1 + rnd(3), i = 0;
      var cls = Math.random() < .2 ? 'is-bright' : 'is-off';
      (function step() {
        p.classList.toggle(cls);
        if (++i < flickers * 2) setTimeout(step, 40 + rnd(120));
        else p.classList.remove(cls);
      })();
      setTimeout(blink, 250 + rnd(900));
    }
    blink();
  })();

  /* ==========================================================
     ПОКУПКА БИЛЕТА
     ========================================================== */
  (function () {
    var form = $('#buy-form');
    if (!form) return;
    var status = $('#buy-status');
    var phone = form.elements.phone;

    phone.addEventListener('input', function () {
      phone.value = phone.value.replace(/[^\d+\s()-]/g, '');
    });
    $$('input', form).forEach(function (i) {
      i.addEventListener('input', function () { i.removeAttribute('aria-invalid'); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = '';
      var bad = function (el, msg) { if (el.setAttribute) el.setAttribute('aria-invalid', 'true'); if (!err) { err = msg; if (el.focus) el.focus(); } };
      if (!form.querySelector('input[name="ticket"]:checked')) bad(form.querySelector('input[name="ticket"]'), 'Выберите категорию билета');
      if (form.elements.name.value.trim().length < 2) bad(form.elements.name, 'Введите имя');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.email.value.trim())) bad(form.elements.email, 'Проверьте email');
      if (phone.value.replace(/\D/g, '').length < 10) bad(phone, 'Проверьте номер телефона');
      if (!form.elements.rules.checked || !form.elements.pd.checked) bad(form.elements.rules.checked ? form.elements.pd : form.elements.rules, 'Нужно согласие с правилами и обработкой данных');
      if (!form.querySelector('input[name="method"]:checked')) bad(form.querySelector('input[name="method"]'), 'Выберите способ оплаты');

      status.className = 'pay__status ' + (err ? 'is-error' : 'is-ok');
      status.textContent = err || 'Заявка принята — ссылка на оплату придёт на почту';
      if (!err) form.reset();
    });
  })();
})();
