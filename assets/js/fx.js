/* Анимации на Motion (motion.dev, mini-сборка): плавные ниши, окно кейса из карточки, счёт цифр.
   Если у человека в системе включено «уменьшить движение» — ничего не анимируем. */
(() => {
  const M = window.Motion;
  if (!M || !M.animate) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { animate, spring } = M;
  const root = document.documentElement;
  root.classList.add('has-motion');
  const SPRING = (bounce, duration) => ({ type: spring, bounce, duration });
  const EASE_OUT = [0.16, 1, 0.3, 1];
  const EASE_IN = [0.4, 0, 1, 1];
  const done = (a) => (a && a.finished ? a.finished : Promise.resolve(a)).catch(() => {});

  /* ---------- 1. Ниши: плавно раскрываются и сворачиваются ---------- */
  document.querySelectorAll('details.nl-dd').forEach((d) => {
    const sum = d.querySelector('summary');
    if (!sum || !d.querySelector('.nl-list')) return;
    let anim = null, closing = false, dock = false, panel = null;
    const mode = () => { dock = d.classList.contains('nl-dock') && getComputedStyle(d).position === 'absolute'; panel = d.querySelector(dock ? '.nl-pop' : '.nl-list'); };
    const stop = () => { if (anim && anim.stop) anim.stop(); anim = null; };
    const reset = () => { if (!panel) return; panel.style.height = ''; panel.style.marginTop = ''; panel.style.overflow = ''; panel.style.opacity = ''; panel.style.transform = ''; };

    const open = () => {
      stop(); closing = false; reset(); mode();
      d.open = true;
      if (dock) {
        anim = animate(panel, { opacity: [0, 1], transform: ['translateY(14px) scale(.96)', 'translateY(0px) scale(1)'] }, SPRING(0.22, 0.45));
      } else {
        const h = panel.offsetHeight, mt = parseFloat(getComputedStyle(panel).marginTop) || 0;
        panel.style.overflow = 'hidden';
        anim = animate(panel, { height: ['0px', h + 'px'], marginTop: ['0px', mt + 'px'], opacity: [0, 1] }, SPRING(0.12, 0.5));
        done(anim).then(() => { if (d.open && !closing) reset(); });
      }
    };
    const close = () => {
      if (!d.open || closing) return;
      stop(); closing = true; mode();
      if (dock) {
        anim = animate(panel, { opacity: [1, 0], transform: ['translateY(0px) scale(1)', 'translateY(10px) scale(.97)'] }, { duration: 0.18, ease: EASE_IN });
      } else {
        const h = panel.offsetHeight, mt = parseFloat(getComputedStyle(panel).marginTop) || 0;
        panel.style.overflow = 'hidden';
        anim = animate(panel, { height: [h + 'px', '0px'], marginTop: [mt + 'px', '0px'], opacity: [1, 0] }, { duration: 0.28, ease: EASE_IN });
      }
      done(anim).then(() => { if (closing) { d.open = false; closing = false; reset(); } });
    };
    d._open = open; d._close = close;
    sum.addEventListener('click', (e) => { e.preventDefault(); (d.open && !closing) ? close() : open(); });
  });

  /* ---------- 2. Окно кейса вырастает из карточки и сворачивается в неё ---------- */
  const dlg = document.getElementById('case-dialog');
  if (dlg && typeof dlg.showModal === 'function') {
    const nativeShow = dlg.showModal.bind(dlg), nativeClose = dlg.close.bind(dlg);
    let fromCard = null, anim = null, closing = false;
    document.addEventListener('click', (e) => { const c = e.target.closest && e.target.closest('.cm-card'); if (c) fromCard = c; }, true);
    const inView = (r) => r.width > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
    const cardFor = () => {
      const n = parseInt((document.getElementById('dialog-current') || {}).textContent, 10) - 1;
      const all = Array.from(document.querySelectorAll('.cm-card[data-case="' + n + '"]'));
      let best = null, bestD = Infinity;
      all.forEach((c) => { const r = c.getBoundingClientRect(); if (!inView(r)) return; const dd = Math.abs(r.left + r.width / 2 - innerWidth / 2); if (dd < bestD) { bestD = dd; best = c; } });
      return best;
    };
    const fromRect = (card) => {
      const d = dlg.getBoundingClientRect(), r = card.getBoundingClientRect();
      const s = Math.max(r.width / d.width, 0.2);
      return 'translate(' + (r.left - d.left) + 'px,' + (r.top - d.top) + 'px) scale(' + s + ')';
    };
    dlg.showModal = function () {
      nativeShow();
      if (anim && anim.stop) anim.stop();
      closing = false;
      const card = fromCard; fromCard = null;
      dlg.style.transformOrigin = '0 0';
      const start = card && inView(card.getBoundingClientRect()) ? fromRect(card) : 'translate(0px,24px) scale(.96)';
      anim = animate(dlg, { transform: [start, 'translate(0px,0px) scale(1)'], opacity: [0.35, 1] }, SPRING(0.1, 0.55));
      done(anim).then(() => { if (!closing) { dlg.style.transform = ''; dlg.style.opacity = ''; } });
    };
    dlg.close = function () {
      if (!dlg.open || closing) return;
      closing = true;
      if (anim && anim.stop) anim.stop();
      const card = cardFor();
      dlg.classList.add('is-closing');
      dlg.style.transformOrigin = '0 0';
      dlg.style.transform = '';
      const end = card ? fromRect(card) : 'translate(0px,16px) scale(.97)';
      anim = animate(dlg, { transform: ['translate(0px,0px) scale(1)', end], opacity: [1, 0] }, { duration: card ? 0.3 : 0.2, ease: EASE_IN });
      done(anim).then(() => { nativeClose(); dlg.classList.remove('is-closing'); dlg.style.transform = ''; dlg.style.opacity = ''; dlg.style.transformOrigin = ''; closing = false; });
    };
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); dlg.close(); });
  }

  /* ---------- 3. Цифры в кейсах досчитываются при появлении ---------- */
  const fmt = (v, dec, sep) => {
    const parts = v.toFixed(dec).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    return parts.join(',');
  };
  const prep = (el) => {
    if (el.dataset.cnt) return null;
    const node = Array.from(el.childNodes).find((n) => n.nodeType === 3 && /\d/.test(n.textContent));
    if (!node) return null;
    const text = node.textContent, m = text.match(/^(\s*)([\d\s  ]+(?:,\d+)?)(.*)$/);
    if (!m) return null;
    const raw = m[2].trim(), sepM = raw.match(/\d([\s  ])\d/), sep = sepM ? sepM[1] : ' ';
    const dec = raw.includes(',') ? raw.split(',')[1].length : 0;
    const value = parseFloat(raw.replace(/[\s  ]/g, '').replace(',', '.'));
    if (!isFinite(value)) return null;
    const span = document.createElement('span');
    span.className = 'cnt';
    span.textContent = m[2];
    el.replaceChild(span, node);
    if (m[1]) span.before(m[1]);
    if (m[3]) span.after(m[3]);
    span.style.display = 'inline-block';
    span.style.minWidth = Math.ceil(span.getBoundingClientRect().width) + 'px';
    el.dataset.cnt = '1';
    return { span, value, dec, sep, final: m[2] };
  };
  // сразу готовим цифры (ставим 0, место под число резервируем), считаем — когда блок появился на экране
  const scopes = Array.from(document.querySelectorAll('#cases'));
  const groups = scopes.map((scope) => {
    const items = Array.from(scope.querySelectorAll('.cm-num, .cm-cost b')).map(prep).filter(Boolean);
    items.forEach((it) => { it.span.textContent = fmt(0, it.dec, it.sep); });
    return { scope, items };
  });
  const runCount = (items) => {
    const t0 = performance.now(), dur = 1300;
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1), k = 1 - Math.pow(1 - p, 4);
      items.forEach((it) => { it.span.textContent = p < 1 ? fmt(it.value * k, it.dec, it.sep) : it.final; });
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  groups.forEach((g) => {
    if (!g.items.length) return;
    if (!('IntersectionObserver' in window)) { g.items.forEach((it) => { it.span.textContent = it.final; }); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); runCount(g.items); } }, { threshold: 0.2 });
    io.observe(g.scope.querySelector('.cm-wrap, .nc-grid') || g.scope);
  });
})();
