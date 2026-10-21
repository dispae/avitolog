/* Эффекты с 21st.dev, перенесённые на чистый JS (сайт статичный, без React).
   g — живой градиент на первом экране (Velaris), r — «авитолог / маркетолог» в шапке (TextLoop),
   t — меняющаяся ниша в заголовке кейсов (TextLoop), b — заголовки поднимаются по буквам (BottomUpLetters),
   v — главный заголовок жирнеет у курсора (VariableProximity), s — подсветка рамок карточек (GlowCard). */
(() => {
  /* Какие эффекты включены (1 — да, 0 — нет; g — номер цвета градиента, s — цвет подсветки) */
  const C = { g: 1, r: 1, t: 1, b: 1, v: 1, s: 1, m: 1, c: 1 };

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  /* Телефон: узкий экран или палец вместо мыши — там лишние эффекты не включаем */
  const phone = matchMedia('(max-width: 680px), (hover: none)').matches;
  /* Слабый компьютер (до 4 ядер или до 4 ГБ памяти): эффекты, которые работают от мыши, не включаем */
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const root = document.documentElement;
  Object.keys(C).forEach((k) => root.setAttribute('data-fxp-' + k, C[k]));
  root.classList.toggle('fxp-phone', phone);

  /* ---------- Velaris: живой градиент на WebGL ---------- */
  const VERT = 'attribute vec2 position;varying vec2 vUv;void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
  const FRAG = `precision mediump float;varying vec2 vUv;
uniform vec2 u_resolution;uniform float u_time;uniform float u_grain;uniform vec3 u_colors[4];uniform vec3 u_bg;
uniform float u_vig;uniform float u_glow;uniform vec2 u_center;
vec3 permute(vec3 x){return mod(((x*34.)+1.)*x,289.);}
float snoise(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.);
vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;
vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;
m*=1.79284291400159-.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}
void main(){vec2 uv=vUv;float ratio=u_resolution.x/u_resolution.y;vec2 p=uv-u_center;p.x*=ratio;float t=u_time*.1;
float n1=snoise(p*.4+vec2(t*.2,-t*.3));float n2=snoise(p*.55+vec2(-t*.15,t*.25)+n1*.25);float n3=snoise(p*.75+vec2(t*.1,-t*.2)+n2*.2);
vec3 col=u_bg;float dist=length(p)*1.5;float vignette=1.-smoothstep(.3,1.2,dist);
col=mix(col,u_colors[0],smoothstep(-.2,.5,n1)*.85);col=mix(col,u_colors[1],smoothstep(-.1,.6,n2)*.7);
col=mix(col,u_colors[2],smoothstep(-.3,.4,n3)*.6);col=mix(col,u_colors[3],smoothstep(0.,.7,n1*n2)*.5);
float glow=smoothstep(.8,0.,dist)*u_glow;col+=u_colors[1]*glow;col=mix(col*u_vig,col,vignette);
float grain=fract(sin(dot(uv,vec2(12.9898,78.233)))*43758.5453+u_time);col+=(grain-.5)*u_grain*.1;gl_FragColor=vec4(col,1.);}`;

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

  function velaris(host, o) {
    const canvas = document.createElement('canvas');
    canvas.className = 'fxp-grad-canvas';
    host.appendChild(canvas);
    const gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) { host.classList.add('fxp-grad--fallback'); return; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    gl.uniform1f(U('u_grain'), o.grain);
    gl.uniform3f(U('u_bg'), ...hex(o.bg));
    gl.uniform3fv(U('u_colors'), new Float32Array(o.colors.flatMap(hex)));
    gl.uniform1f(U('u_vig'), o.vig);
    gl.uniform1f(U('u_glow'), o.glow);
    gl.uniform2f(U('u_center'), o.center[0], o.center[1]);
    const uRes = U('u_resolution'), uTime = U('u_time');
    /* Градиент мягкий, поэтому считаем его в половинном разрешении — в 4 раза меньше работы видеокарте */
    const resize = () => {
      /* Не больше ~250 тысяч точек: на большом мониторе градиент не должен нагружать видеокарту сильнее, чем на ноутбуке */
      const cw = host.clientWidth, ch = host.clientHeight;
      const k = Math.min(phone ? 0.34 : 0.5, Math.sqrt(250000 / Math.max(1, cw * ch)));
      canvas.width = Math.max(1, Math.round(cw * k));
      canvas.height = Math.max(1, Math.round(ch * k));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      if (!running) draw(0);
    };
    const start = 20000;
    const draw = (t) => { gl.uniform1f(uTime, (start + t) * 0.001 * o.speed); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    let raf = 0, running = false, visible = true, last = 0;
    /* 30 кадров в секунду хватает для медленного перелива */
    const loop = (t) => { raf = requestAnimationFrame(loop); if (t - last < (phone ? 40 : 32)) return; last = t; draw(t); };
    const sync = () => {
      const should = !reduce && visible && !document.hidden;
      if (should && !running) { running = true; raf = requestAnimationFrame(loop); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); }
    };
    new ResizeObserver(resize).observe(host);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(host);
    document.addEventListener('visibilitychange', sync);
    resize(); sync();
  }

  const GRADIENTS = {
    1: { bg: '#020a1c', colors: ['#0b3f96', '#1f80ff', '#06275e', '#46a8ff'] },
    2: { bg: '#021020', colors: ['#06428a', '#1293f2', '#04305f', '#22c6e8'] },
    3: { bg: '#050a20', colors: ['#16358f', '#2f70f2', '#35208a', '#7a5cff'] },
  };
  if (GRADIENTS[C.g]) {
    const hero = document.querySelector('.hero, .nh');
    if (hero) {
      const layer = document.createElement('div');
      layer.className = 'fxp-grad';
      layer.setAttribute('aria-hidden', 'true');
      hero.insertBefore(layer, hero.firstChild);
      layer.classList.add('fxp-grad--' + C.g);
      /* На страницах ниш первый экран ниже и без фото: там градиент приглушаем, иначе он слишком яркий */
      const niche = hero.classList.contains('nh');
      const dim = (h) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * 0.6).toString(16).padStart(2, '0')).join('');
      const G = niche ? { bg: GRADIENTS[C.g].bg, colors: GRADIENTS[C.g].colors.map(dim) } : GRADIENTS[C.g];
      if (niche) layer.classList.add('fxp-grad--niche');
      velaris(layer, phone
        ? { ...G, speed: 4, grain: 0.18, vig: 0.3, glow: niche ? 0.1 : 0.22, center: [0.5, 0.3] }
        : { ...G, speed: 5, grain: 0.25, vig: niche ? 0.3 : 0.4, glow: niche ? 0.1 : 0.3, center: niche ? [0.72, 0.5] : [0.66, 0.46] });
    }
  }

  /* ---------- Деление заголовка на буквы ---------- */
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('ru', { granularity: 'grapheme' }) : null;
  const chars = (s) => (seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s));
  function split(el) {
    if (el._fxpLetters) return el._fxpLetters;
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 1) { walk(n); return; }
        if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
        const frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'fxp-w';
          w.setAttribute('aria-hidden', 'true');
          chars(part).forEach((ch) => { const l = document.createElement('span'); l.className = 'fxp-l'; l.textContent = ch; w.appendChild(l); });
          frag.appendChild(w);
        });
        n.replaceWith(frag);
      });
    };
    walk(el);
    el._fxpLetters = Array.from(el.querySelectorAll('.fxp-l'));
    /* Градиентный текст (.hl): каждой букве свой кусок общего градиента, построчно — как было */
    const clips = Array.from(el.querySelectorAll('.hl'));
    if (clips.length) {
      const fit = () => clips.forEach((hl) => {
        const lines = new Map();
        hl.querySelectorAll('.fxp-l').forEach((l) => {
          const k = l.offsetTop + l.parentNode.offsetTop, x = l.parentNode.offsetLeft + l.offsetLeft;
          const r = lines.get(k) || { a: 1e9, b: -1e9, ls: [] };
          r.a = Math.min(r.a, x); r.b = Math.max(r.b, x + l.offsetWidth); r.ls.push([l, x]); lines.set(k, r);
        });
        lines.forEach((r) => r.ls.forEach(([l, x]) => { l.style.backgroundSize = (r.b - r.a) + 'px 100%'; l.style.backgroundPosition = (r.a - x) + 'px 0'; }));
      });
      clips.forEach((hl) => hl.classList.add('fxp-hl'));
      fit();
      if (document.fonts) document.fonts.ready.then(fit);
      new ResizeObserver(fit).observe(el);
    }
    return el._fxpLetters;
  }

  /* ---------- BottomUpLetters: буквы поднимаются снизу лесенкой ---------- */
  const EASE = 'cubic-bezier(.18,1,.32,1)';
  function bottomUp(el, delay) {
    const ls = split(el);
    if (reduce) return null;
    const stagger = Math.max(10, Math.min(45, 420 / ls.length));
    el.classList.add('fxp-up-wait');
    return () => {
      el.classList.remove('fxp-up-wait');
      ls.forEach((l, i) => l.animate(
        [{ opacity: 0, transform: 'translateY(.6em)' }, { opacity: 1, transform: 'none' }],
        { duration: 380, delay: delay + i * stagger, easing: EASE, fill: 'backwards' },
      ));
    };
  }
  /* Главный заголовок не анимируем: при открытии сайта он должен быть виден сразу. На телефоне — никаких букв снизу */
  if (C.b && !phone) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target._fxpPlay();
    }), { threshold: 0.25 });
    document.querySelectorAll('main h2').forEach((h) => {
      if (h.id === 'cases-title' && C.t) return;
      h._fxpPlay = bottomUp(h, 80);
      if (h._fxpPlay) io.observe(h);
    });
  }

  /* ---------- VariableProximity: заголовки через один становятся тоньше рядом с курсором ---------- */
  if (C.v && finePointer && !reduce && !weak) {
    const heads = [document.querySelector('#hero-title, #nh-title'), ...document.querySelectorAll('main h2')].filter(Boolean);
    const R = 190, TO = 480;
    const items = heads.slice(0, 1).map((el) => {
      const ls = split(el);
      const from = Math.min(900, parseInt(getComputedStyle(el).fontWeight, 10) || 900);
      const it = { el, ls, from, centers: [], active: false };
      /* Ширину каждой буквы фиксируем по обычному начертанию: тонкая буква не сужает слово, строки не перескакивают */
      const measure = () => {
        ls.forEach((l) => { l.style.width = ''; l.style.fontWeight = ''; l._fxpW = 0; });
        const b = el.getBoundingClientRect();
        const rs = ls.map((l) => l.getBoundingClientRect());
        ls.forEach((l, i) => { l.style.width = rs[i].width + 'px'; });
        it.centers = rs.map((r) => [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2]);
        it.active = false;
      };
      measure();
      if (document.fonts) document.fonts.ready.then(measure);
      new ResizeObserver(measure).observe(el);
      el.classList.add('fxp-prox');
      return it;
    });
    let pt = null, frame = 0;
    const paint = () => {
      frame = 0;
      items.forEach((it) => {
        const b = it.el.getBoundingClientRect();
        const near = pt && pt.y > b.top - R && pt.y < b.bottom + R && pt.x > b.left - R && pt.x < b.right + R;
        if (!near && !it.active) return;
        it.active = near;
        /* Толщину меняем ступенями по 30 и только у тех букв, где она правда поменялась */
        it.ls.forEach((l, i) => {
          let w = 0;
          if (near) {
            const d = Math.hypot(pt.x - b.left - it.centers[i][0], pt.y - b.top - it.centers[i][1]);
            const k = 1 - Math.min(1, d / R);
            if (k > 0) w = Math.round((it.from + (TO - it.from) * k * k * (3 - 2 * k)) / 30) * 30;
            if (w >= it.from) w = 0;
          }
          if (l._fxpW === w) return;
          l._fxpW = w;
          l.style.fontWeight = w ? w : '';
        });
      });
    };
    addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; pt = { x: e.clientX, y: e.clientY }; if (!frame) frame = requestAnimationFrame(paint); }, { passive: true });
    /* при прокрутке не пересчитываем: курсор относительно букв сдвинулся, но новое положение возьмём со следующим движением мыши */
    document.documentElement.addEventListener('pointerleave', () => { pt = null; paint(); });
  }

  /* ---------- TextShimmer: по подписям-плашкам пробегает блик ---------- */
  if (C.m) {
    const shimIO = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('fxp-shim-off', !e.isIntersecting)));
    document.querySelectorAll('main .kicker, .hz-cap, .hero-cue > span:not(.hc-dot)').forEach((el, i) => {
      Array.from(el.childNodes).forEach((n) => {
        if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
        const sp = document.createElement('span');
        sp.className = 'fxp-shim';
        sp.style.animationDelay = (-(i * 0.7)).toFixed(1) + 's';
        sp.textContent = n.nodeValue;
        n.replaceWith(sp);
        shimIO.observe(sp);
      });
    });
  }

  /* ---------- Кнопки каналов: объём, буквы перекатываются в «Подписаться», контур и брызги ---------- */
  if (C.c && !phone) {
    const SPLASH = '<svg class="fxp-splash" viewBox="0 0 342 208" fill="none" aria-hidden="true">' + [
      'M54.1054 99.7837C54.1054 99.7837 40.0984 90.7874 26.6893 97.6362C13.2802 104.485 1.5 97.6362 1.5 97.6362',
      'M285.273 99.7841C285.273 99.7841 299.28 90.7879 312.689 97.6367C326.098 104.486 340.105 95.4893 340.105 95.4893',
      'M281.133 64.9917C281.133 64.9917 287.96 49.8089 302.934 48.2295C317.908 46.6501 319.712 36.5272 319.712 36.5272|.4',
      'M281.133 138.984C281.133 138.984 287.96 154.167 302.934 155.746C317.908 157.326 319.712 167.449 319.712 167.449|.4',
      'M230.578 57.4476C230.578 57.4476 225.785 41.5051 236.061 30.4998C246.337 19.4945 244.686 12.9998 244.686 12.9998',
      'M230.578 150.528C230.578 150.528 225.785 166.471 236.061 177.476C246.337 188.481 244.686 194.976 244.686 194.976',
      'M170.392 57.0278C170.392 57.0278 173.89 42.1322 169.571 29.54C165.252 16.9478 168.751 2.05227 168.751 2.05227|.4',
      'M170.392 150.948C170.392 150.948 173.89 165.844 169.571 178.436C165.252 191.028 168.751 205.924 168.751 205.924|.4',
      'M112.609 57.4476C112.609 57.4476 117.401 41.5051 107.125 30.4998C96.8492 19.4945 98.5 12.9998 98.5 12.9998',
      'M112.609 150.528C112.609 150.528 117.401 166.471 107.125 177.476C96.8492 188.481 98.5 194.976 98.5 194.976',
      'M62.2941 64.9917C62.2941 64.9917 55.4671 49.8089 40.4932 48.2295C25.5194 46.6501 23.7159 36.5272 23.7159 36.5272|.4',
      'M62.2941 145.984C62.2941 145.984 55.4671 161.167 40.4932 162.746C25.5194 164.326 23.7159 174.449 23.7159 174.449|.4',
    ].map((d) => { const [p, o] = d.split('|'); return `<path d="${p}" stroke-width="3" stroke-linecap="round" pathLength="1"${o ? ` stroke-opacity="${o}"` : ''}/>`; }).join('') + '</svg>';
    const letters = (t, cls) => `<span class="fxp-roll-line ${cls}">` + chars(t).map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('') + '</span>';
    const enhance = (a, label, alt, host) => {
      a.classList.add('fxp-btn');
      if (label) {
        label.classList.add('fxp-roll');
        label.setAttribute('aria-hidden', 'true');
        label.innerHTML = letters(label.textContent.trim(), 'fxp-roll-a') + letters(alt, 'fxp-roll-b');
      }
      if (a.classList.contains('tb-link')) a.insertAdjacentHTML('afterbegin', '<span class="fxp-btn-glow" aria-hidden="true"></span>');
      host.insertAdjacentHTML('beforeend', SPLASH + '<svg class="fxp-outline" aria-hidden="true"><rect pathLength="1"/></svg>');
      const fit = () => {
        const r = host.querySelector('.fxp-outline rect'), w = a.offsetWidth + 10, h = a.offsetHeight + 10;
        const rad = Math.min((h - 3) / 2, (parseFloat(getComputedStyle(a).borderTopLeftRadius) || 0) + 4);
        r.setAttribute('x', 1.5); r.setAttribute('y', 1.5); r.setAttribute('width', w - 3); r.setAttribute('height', h - 3); r.setAttribute('rx', rad);
      };
      fit(); new ResizeObserver(fit).observe(a);
      const burst = () => { host.classList.remove('fxp-burst'); void host.offsetWidth; host.classList.add('fxp-burst'); };
      a.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') burst(); });
      a.addEventListener('pointerdown', burst);
    };
    document.querySelectorAll('.tb-link').forEach((a) => enhance(a, a.querySelector('span'), 'Подписаться', a));
    /* Кнопки в последнем блоке обрезают всё, что за краем, поэтому контур и брызги кладём в обёртку */
    document.querySelectorAll('.footer-card .footer-contact').forEach((a) => {
      const wrap = document.createElement('span');
      wrap.className = 'fxp-btn-wrap';
      a.parentNode.insertBefore(wrap, a);
      wrap.appendChild(a);
      enhance(a, a.querySelector('strong'), 'ЗАПУСК', wrap);
      const small = a.querySelector('small');
      if (small) { small.classList.add('fxp-roll'); small.innerHTML = letters(small.textContent.trim(), 'fxp-roll-a') + letters('Отправьте', 'fxp-roll-b'); }
    });
  }

  /* ---------- TextLoop: слово сворачивается и раскрывается заново, рядом мигает курсор ---------- */
  function textLoop(host, words, interval) {
    host.classList.add('fxp-loop');
    host.innerHTML = '<span class="fxp-loop-box" aria-hidden="true"><span class="fxp-loop-bg"></span><span class="fxp-loop-txt"></span><span class="fxp-loop-cur"></span></span><span class="fxp-sr"></span>';
    const txt = host.querySelector('.fxp-loop-txt'), bg = host.querySelector('.fxp-loop-bg'), cur = host.querySelector('.fxp-loop-cur');
    host.querySelector('.fxp-sr').textContent = words.join(', ');
    let i = 0, visible = false;
    txt.textContent = words[0];
    if (reduce) return;
    /* Ширину не анимируем (это пересчёт всей страницы в каждом кадре): слово стирается маской,
       курсор едет трансформацией, а ширина меняется один раз — в момент смены слова */
    const T = { duration: 800, easing: 'ease-in-out' };
    const step = async () => {
      const w0 = txt.offsetWidth;
      const OUT = [{ clipPath: 'inset(0 0 0 0)', opacity: 1 }, { clipPath: 'inset(0 100% 0 0)', opacity: 0 }];
      const hide = [txt.animate(OUT, { ...T, fill: 'forwards' }), bg.animate(OUT, { ...T, fill: 'forwards' }),
        cur.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-w0}px)` }], { ...T, fill: 'forwards' })];
      await Promise.all(hide.map((x) => x.finished));
      i = (i + 1) % words.length;
      txt.textContent = words[i];
      const w1 = txt.offsetWidth;
      hide.forEach((x) => x.cancel());
      await Promise.all([
        txt.animate([...OUT].reverse(), T).finished,
        bg.animate([...OUT].reverse(), T).finished,
        cur.animate([{ transform: `translateX(${-w1}px)` }, { transform: 'translateX(0)' }], T).finished,
      ]);
    };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);
    let busy = false;
    setInterval(() => { if (busy || !visible || document.hidden) return; busy = true; step().finally(() => { busy = false; }); }, interval);
  }
  if (C.r) {
    const role = document.querySelector('.tb-role');
    if (role) {
      role.setAttribute('aria-label', 'авитолог, маркетолог');
      textLoop(role, ['авитолог', 'маркетолог'], 2600);
    }
  }
  if (C.t) {
    const h = !document.querySelector('.nh') && document.querySelector('#cases-title');
    if (h) {
      h.setAttribute('aria-label', 'Реальные кейсы с цифрами из кабинета');
      h.classList.add('fxp-cases');
      h.innerHTML = '<span class="fxp-cases-static">Реальные кейсы в нише</span> <span class="fxp-cases-slot"></span>';
      textLoop(h.querySelector('.fxp-cases-slot'), ['детейлинга', 'кузовного ремонта', 'вывоза мусора', 'автосервиса', 'спецтехники', 'клининга'], 3000);
    }
  }

  /* ---------- GlowCard: рамка карточки подсвечивается там, где курсор ---------- */
  if (C.s && finePointer && !weak) {
    const base = C.s === 2 ? 150 : 198, spread = C.s === 2 ? 60 : 28;
    const cards = Array.from(document.querySelectorAll('.cm-card, .principle, .channel-card, .nh-stat'));
    const shown = new Set();
    const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? shown.add(e.target) : shown.delete(e.target))));
    cards.forEach((card) => {
      card.classList.add('fxp-glowcard');
      const g = document.createElement('span');
      g.className = 'fxp-glow';
      g.setAttribute('aria-hidden', 'true');
      card.appendChild(g);
      io.observe(card);
    });
    /* Размеры карточек читаем прямо в событии мыши (раскладка в этот момент готова), а пишем — в кадре анимации.
       Так браузеру не приходится пересчитывать страницу посреди кадра */
    let f = 0, X = 0, Y = 0, plan = [];
    const paint = () => {
      f = 0;
      const hue = (base + (X / innerWidth) * spread).toFixed(0);
      plan.forEach(([card, on, mx, my]) => {
        card._fxpOn = on;
        card.style.setProperty('--fxp-mx', mx + 'px');
        card.style.setProperty('--fxp-my', my + 'px');
        card.style.setProperty('--fxp-hue', hue);
        card.classList.toggle('fxp-lit', on);
      });
    };
    addEventListener('pointermove', (e) => {
      X = e.clientX; Y = e.clientY;
      plan = [];
      shown.forEach((card) => {
        const r = card.getBoundingClientRect();
        const on = X > r.left - 200 && X < r.right + 200 && Y > r.top - 200 && Y < r.bottom + 200;
        if (on || card._fxpOn) plan.push([card, on, Math.round(X - r.left), Math.round(Y - r.top)]);
      });
      if (plan.length && !f) f = requestAnimationFrame(paint);
    }, { passive: true });
  }
})();
