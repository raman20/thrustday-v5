/* ThrustDay — shared front-end. Horizontal-only motion. No backend, no real checkout. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const SHOT = /[?&]shot=1/.test(location.search);
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOTION = !SHOT && !REDUCED;

  /* scroll velocity (feeds streaks + ticker) */
  let vel = 0, lastY = scrollY, boost = 0, smooth = 0;
  addEventListener('scroll', () => { vel += scrollY - lastY; lastY = scrollY; }, { passive: true });
  addEventListener('wheel', e => { vel += e.deltaY * 0.4; }, { passive: true }); // home can't scroll; wheel still adds thrust

  /* ---------- streak canvas (home) ---------- */
  const cv = $('#streaks');
  let draw = () => {};
  if (cv) {
    const ctx = cv.getContext('2d');
    let W, H, lines = [];
    const spawn = init => ({ x: init ? Math.random() * W : W + Math.random() * W * .5, y: H * (.08 + Math.random() * .84),
      len: 80 + Math.random() * 320, sp: 3 + Math.random() * 9, a: .07 + Math.random() * .28, acc: Math.random() < .12 });
    const resize = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
      lines = Array.from({ length: Math.round(Math.min(46, W / 28)) }, () => spawn(true));
    };
    draw = dt => {
      ctx.clearRect(0, 0, W, H);
      const k = 1 + boost;
      for (const l of lines) {
        l.x -= l.sp * k * dt;
        const L = l.len * (.8 + k * .25);
        if (l.x + L < 0) Object.assign(l, spawn(false));
        const c = l.acc ? '255,77,26' : '242,240,234', g = ctx.createLinearGradient(l.x, 0, l.x + L, 0);
        g.addColorStop(0, `rgba(${c},${l.acc ? .8 : l.a})`); g.addColorStop(1, `rgba(${c},0)`);
        ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + L, l.y); ctx.stroke();
      }
    };
    resize(); addEventListener('resize', resize);
    if (!MOTION) draw(0);
    let mx = 0; addEventListener('mousemove', e => { boost = Math.min(5, boost + Math.abs(e.clientX - mx) * .004); mx = e.clientX; });
  }

  /* ---------- ticker ---------- */
  const track = $('.ticker .track');
  let tx = 0, half = 0;
  if (track) {
    track.innerHTML += track.innerHTML;
    const m = () => half = track.scrollWidth / 2; m(); addEventListener('resize', m); document.fonts && document.fonts.ready.then(m);
    if (!MOTION) track.style.transform = 'translate3d(-40px,0,0)';
  }

  /* ---------- rAF loop ---------- */
  let prev = performance.now();
  function frame(now) {
    const dt = Math.min((now - prev) / 16.67, 3); prev = now;
    vel *= .85; smooth += (vel - smooth) * .12;
    boost += (Math.min(Math.abs(smooth) * .15, 6) - boost) * .06;
    draw(dt);
    if (track) {
      tx += (.6 + boost * .8) * dt; if (half) tx %= half;
      track.style.transform = `translate3d(${-tx}px,0,0)`;
    }
    requestAnimationFrame(frame);
  }
  if (MOTION && (cv || track)) requestAnimationFrame(frame);

  /* ---------- home intro ---------- */
  const hero = $('.hero-title');
  if (hero) {
    if (MOTION) { requestAnimationFrame(() => requestAnimationFrame(() => { hero.classList.remove('pre'); boost = 6; })); }
    else hero.classList.remove('pre');
  }

  /* ---------- horizontal entrances ---------- */
  const ents = $$('.in, .wipe');
  if (!MOTION) ents.forEach(e => e.classList.add('on'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    ents.forEach((e, i) => { e.style.transitionDelay = (e.dataset.d || 0) + 's'; io.observe(e); });
  }


  /* ---------- v5: hero video (desktop / portrait sources) ---------- */
  const hv = $('#hero-video');
  if (hv) {
    const mob = matchMedia('(max-width:700px)').matches, k = mob ? 'mob' : 'desk';
    hv.poster = hv.dataset[k + 'Poster'];
    const ready = () => hv.classList.add('ready');
    if (REDUCED) { ready(); }
    else {
      [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(([e, t]) => { const so = document.createElement('source'); so.src = hv.dataset[k + e[0].toUpperCase() + e.slice(1)]; so.type = t; hv.appendChild(so); });
      hv.addEventListener('playing', ready, { once: true });
      hv.load(); const pr = hv.play(); if (pr) pr.catch(ready);
      setTimeout(ready, 1800);
    }
  }

  /* ---------- v5: horizontal panel page transition ---------- */
  if (!REDUCED) {
    const pt = document.createElement('div'); pt.className = 'pt'; pt.setAttribute('aria-hidden', 'true'); document.body.appendChild(pt);
    if (sessionStorage.getItem('td-pt') === '1') {
      sessionStorage.removeItem('td-pt');
      pt.className = 'pt hold';
      requestAnimationFrame(() => requestAnimationFrame(() => { pt.className = 'pt leave'; }));
    }
    addEventListener('pageshow', e => { if (e.persisted) pt.className = 'pt'; });
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || u.hash || u.pathname === location.pathname) return;
      e.preventDefault();
      pt.className = 'pt cover';
      sessionStorage.setItem('td-pt', '1');
      setTimeout(() => { location.href = u.href; }, 300);
    });
  }

  /* ---------- bag (front-end only) ---------- */
  const BAG = 'td-bag';
  const getBag = () => { try { return JSON.parse(localStorage.getItem(BAG)) || []; } catch { return []; } };
  const renderBag = () => $$('.bag sup').forEach(s => s.textContent = getBag().length);
  renderBag();
  const toast = $('.toast');
  let tt;
  const say = msg => { if (!toast) return; toast.textContent = msg; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 2600); };

  /* ---------- shop ---------- */
  $$('.chip[data-filter]').forEach(ch => ch.addEventListener('click', () => {
    $$('.chip[data-filter]').forEach(c => c.setAttribute('aria-pressed', c === ch));
    const f = ch.dataset.filter;
    let n = 0;
    $$('.card').forEach(c => { const show = f === 'all' || c.dataset.type === f; c.classList.toggle('hide', !show); if (show) n++; });
    const cnt = $('#count'); if (cnt) cnt.textContent = String(n).padStart(2, '0');
  }));
  $$('.card').forEach(card => {
    const sizes = $$('.size', card), msg = $('.note', card);
    sizes.forEach(b => b.addEventListener('click', () => { sizes.forEach(s => s.setAttribute('aria-pressed', s === b)); if (msg) { msg.textContent = 'Size ' + b.textContent; msg.classList.remove('err'); } }));
    const add = $('[data-add]', card);
    add && add.addEventListener('click', () => {
      const sel = sizes.find(s => s.getAttribute('aria-pressed') === 'true');
      if (!sel) { msg.textContent = 'Pick a size first'; msg.classList.add('err'); return; }
      const bag = getBag(); bag.push({ id: card.dataset.id, size: sel.textContent }); localStorage.setItem(BAG, JSON.stringify(bag)); renderBag();
      $$('.bag').forEach(b => { b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 900); });
      say(`Added ${$('h2', card).textContent} (${sel.textContent}). Checkout opens at launch.`);
    });
    const nt = $('[data-notify]', card);
    nt && nt.addEventListener('click', () => { const f = $('#email'); if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => f.focus({ preventScroll: true }), 500); } });
  });
  $$('.bag').forEach(b => b.addEventListener('click', e => { e.preventDefault(); const n = getBag().length; say(n ? `${n} item${n > 1 ? 's' : ''} in your bag. Checkout opens at launch.` : 'Your bag is empty.'); }));

  /* ---------- signup ---------- */
  const form = $('#join-form');
  form && form.addEventListener('submit', e => {
    e.preventDefault();
    const v = $('#email').value.trim(), m = $('#form-msg');
    m.classList.remove('ok', 'err');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { m.textContent = 'Check that email.'; m.classList.add('err'); return; }
    m.textContent = 'You\u2019re in.'; m.classList.add('ok'); form.reset();   // TODO: connect Shopify / Klaviyo / Mailchimp
  });

  /* ---------- blogs: drawer reader ---------- */
  const drawer = $('.drawer');
  if (drawer) {
    const body = $('.drawer-body', drawer);
    $$('.post').forEach(p => {
      const tpl = $('#' + p.dataset.post);
      const words = tpl ? tpl.content.textContent.trim().split(/\s+/).length : 0;
      const rt = $('.rt', p); if (rt) rt.textContent = Math.max(1, Math.round(words / 220)) + ' min read';
    });
    const open = slug => {
      const tpl = $('#' + slug); if (!tpl) return;
      body.innerHTML = ''; body.appendChild(tpl.content.cloneNode(true)); body.scrollTop = 0;
      document.documentElement.classList.add('drawer-on');
      history.replaceState(null, '', '#' + slug);
      $('.drawer-close').focus({ preventScroll: true });
    };
    const close = () => { document.documentElement.classList.remove('drawer-on'); history.replaceState(null, '', location.pathname); };
    $$('.post').forEach(p => p.addEventListener('click', () => open(p.dataset.post)));
    $('.drawer-close').addEventListener('click', close);
    $('.scrim').addEventListener('click', close);
    addEventListener('keydown', e => e.key === 'Escape' && close());
    if (location.hash) open(location.hash.slice(1));
  }
})();
