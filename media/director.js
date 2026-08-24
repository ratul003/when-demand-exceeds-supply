/* eslint-disable */
/**
 * The film director. Injected into the live site at capture time.
 *
 * The page is lifted into a single transformed "stage" so the camera can dolly
 * and zoom on a real clock instead of scrolling. Every beat is scheduled off one
 * start timestamp, which is what keeps the visuals locked to the narration
 * timeline measured in build_vo.py.
 */
window.FILM = (function () {
  const CYAN = '#06b6d4';
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // A 4:5 social frame is barely half the width of the film frame, so type has
  // to GROW rather than scale down with it, or captions are unreadable on a
  // phone. Portrait rather than "narrow", so the layout survives being rendered
  // at more than 1080 wide. Every social size is expressed against U.
  const SOCIAL = vh() > vw();
  const U = vw() / 1080;
  const K = SOCIAL ? 0.60 * U : 1;

  /** The rectangle the camera frames into. Full viewport for the film, a
   *  centred band for the social cut. */
  const FRAME = SOCIAL ? { top: Math.round(300 * U), h: Math.round(660 * U) }
                       : { top: 0, h: vh() };

  // ── Stage: everything the page rendered, under one transform ────────────────
  const stage = document.createElement('div');
  stage.id = 'film-stage';
  while (document.body.firstChild) stage.appendChild(document.body.firstChild);

  // In the 4:5 social frame the page is clipped into a centred band, with a
  // headline above it and room for big captions below. A wide UI component
  // dropped into a tall frame otherwise leaves two thirds of the shot showing
  // unrelated page, which reads as clutter in a feed.
  const win = document.createElement('div');
  win.id = 'film-window';
  win.appendChild(stage);
  document.body.appendChild(win);

  // Sticky/fixed chrome fights a transformed ancestor, and the film supplies its
  // own framing anyway.
  for (const el of stage.querySelectorAll('*')) {
    const p = getComputedStyle(el).position;
    if (p === 'fixed' || p === 'sticky') el.style.display = 'none';
  }

  const css = document.createElement('style');
  css.textContent = `
    html, body { overflow: hidden !important; height: 100%; margin: 0; background: #06060b; }
    * { scroll-behavior: auto !important; }
    #film-window { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; overflow: hidden; }
    #film-stage { position: absolute; top: 0; left: 0; width: 100vw; transform-origin: 0 0; }
    #film-band { position: absolute; left: 0; top: 0; width: 100%; display: flex;
      flex-direction: column; justify-content: center; padding: 0 54px; opacity: 0;
      transition: opacity .5s; }
    #film-ui { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;
               font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
    #film-vignette { position: absolute; inset: 0;
      background: radial-gradient(ellipse 78% 68% at 50% 46%, transparent 42%, rgba(3,3,8,0.62) 100%); }
    #film-veil { position: absolute; inset: 0; background: #06060b; opacity: 1; }
    #film-scene { position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; opacity: 0; }
    #film-card { position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; background: rgba(6,6,11,0.94); opacity: 0; }
    #film-cursor { position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px;
      border-radius: 50%; background: rgba(255,255,255,0.92);
      box-shadow: 0 0 0 5px rgba(6,182,212,0.30), 0 6px 18px rgba(0,0,0,0.55);
      opacity: 0; transition: opacity .28s; }
    #film-ripple { position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px;
      border-radius: 50%; border: 2px solid ${CYAN}; opacity: 0; }
    #film-caption { position: absolute; left: 50%; bottom: 78px; transform: translateX(-50%);
      max-width: 1180px; padding: 15px 30px; border-radius: 13px;
      background: rgba(6,8,14,0.80); border: 1px solid rgba(255,255,255,0.10);
      backdrop-filter: blur(14px); color: #eef2f7; font-size: 25px; line-height: 1.42;
      letter-spacing: -0.011em; text-align: center; opacity: 0; transition: opacity .28s;
      /* Above the card, so the closing line reads cleanly over the end card
         instead of bleeding through it. */
      z-index: 5; }
    #film-chapter { position: absolute; left: 54px; top: 46px; display: flex; align-items: center;
      gap: 12px; opacity: 0; transition: opacity .45s; }
    #film-chapter .n { font-size: 13px; font-weight: 800; letter-spacing: .22em; color: ${CYAN}; }
    #film-chapter .l { font-size: 13px; letter-spacing: .22em; color: rgba(255,255,255,0.52);
      text-transform: uppercase; }
    #film-chapter .r { width: 26px; height: 1px; background: rgba(255,255,255,0.22); }
    #film-mark { position: absolute; right: 54px; top: 46px; text-align: right; opacity: 0;
      transition: opacity .45s; }
    #film-mark .a { font-size: 14px; color: rgba(255,255,255,0.72); font-weight: 600; }
    #film-mark .b { font-size: 11.5px; color: rgba(255,255,255,0.34); letter-spacing: .13em;
      text-transform: uppercase; margin-top: 3px; }
    #film-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 0;
      background: linear-gradient(90deg, ${CYAN}, #22d3ee); box-shadow: 0 0 12px ${CYAN}aa; }
  `;
  document.head.appendChild(css);

  const ui = document.createElement('div');
  ui.id = 'film-ui';
  ui.innerHTML = `
    <div id="film-vignette"></div>
    <div id="film-cursor"></div><div id="film-ripple"></div>
    <div id="film-chapter"><span class="n"></span><span class="r"></span><span class="l"></span></div>
    <div id="film-mark"><div class="a">Wahid Tawsif Ratul</div><div class="b">Product · Data Science</div></div>
    <div id="film-band">
      <div style="font-size:${(15 * U).toFixed(1)}px;letter-spacing:.3em;color:${CYAN};font-weight:800">EQUILIBRIUM</div>
      <div style="font-size:${(44 * U).toFixed(1)}px;font-weight:800;color:#f1f5f9;letter-spacing:-0.025em;line-height:1.12;margin-top:${Math.round(14 * U)}px">
        When Demand Exceeds Supply<br><span style="color:${CYAN}">in an Online Marketplace</span></div>
      <div style="font-size:${(17 * U).toFixed(1)}px;color:#64748b;margin-top:${Math.round(14 * U)}px">Wahid Tawsif Ratul · Product &amp; Data Science</div>
    </div>
    <div id="film-caption"></div>
    <div id="film-veil"></div>
    <div id="film-scene"></div>
    <div id="film-card"></div>
    <div id="film-bar"></div>`;
  document.body.appendChild(ui);

  win.style.top = FRAME.top + 'px';
  win.style.height = FRAME.h + 'px';

  if (SOCIAL) {
    const s = document.createElement('style');
    s.textContent = `
      #film-caption { font-size: ${(34 * U).toFixed(1)}px; bottom: ${(118 * U).toFixed(0)}px;
                      max-width: 92%; padding: 0; border: none; background: none;
                      backdrop-filter: none; line-height: 1.34; color: #f1f5f9;
                      font-weight: 500; }
      #film-band { height: ${Math.round(300 * U)}px; padding: 0 ${Math.round(54 * U)}px; }
      #film-chapter, #film-mark { display: none; }
      #film-bar { height: ${Math.max(4, Math.round(5 * U))}px; }
    `;
    document.head.appendChild(s);
  }

  const $ = (id) => document.getElementById(id);
  const veil = $('film-veil'), scene = $('film-scene'), card = $('film-card');
  const cursor = $('film-cursor'), ripple = $('film-ripple');
  const capEl = $('film-caption'), chapEl = $('film-chapter'), markEl = $('film-mark');
  const barEl = $('film-bar');

  // ── Tween helper ────────────────────────────────────────────────────────────
  function tween(dur, step, done) {
    const t0 = performance.now();
    (function frame(now) {
      const p = Math.min(1, (now - t0) / dur);
      step(ease(p), p);
      if (p < 1) requestAnimationFrame(frame);
      else if (done) done();
    })(t0);
  }
  const fade = (el, to, dur = 500) => {
    const from = parseFloat(getComputedStyle(el).opacity) || 0;
    tween(dur, (e) => { el.style.opacity = String(from + (to - from) * e); });
  };

  // ── Camera ──────────────────────────────────────────────────────────────────
  const cam = { x: 0, y: 0, s: 1 };
  const applyCam = () =>
    (stage.style.transform = `translate(${-cam.x.toFixed(2)}px, ${-cam.y.toFixed(2)}px) scale(${cam.s.toFixed(4)})`);
  applyCam();

  /** Element geometry expressed in untransformed stage pixels. */
  function stageRect(sel) {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) { console.warn('[film] missing target', sel); return null; }
    const r = el.getBoundingClientRect();
    // Rects are viewport-relative; the stage lives inside the framing window,
    // so subtract the window's offset to get true stage coordinates.
    return {
      x: (r.left + cam.x) / cam.s, y: (r.top - FRAME.top + cam.y) / cam.s,
      w: r.width / cam.s, h: r.height / cam.s,
    };
  }

  function camTo(sel, opts = {}) {
    const r = stageRect(sel);
    if (!r) return;
    const fill = opts.fill ?? 0.82;
    const maxS = opts.maxScale ?? 1.9;
    let s = Math.min((vw() * fill) / r.w, (FRAME.h * (opts.fillY ?? 0.78)) / r.h);
    s = Math.max(opts.minScale ?? 0.75, Math.min(maxS, s)) * (opts.scale ?? 1);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2 + (opts.offsetY ?? 0);
    const to = { x: cx * s - vw() / 2, y: cy * s - FRAME.h / 2, s };
    const from = { ...cam };
    tween(opts.dur ?? 1300, (e) => {
      cam.x = from.x + (to.x - from.x) * e;
      cam.y = from.y + (to.y - from.y) * e;
      cam.s = from.s + (to.s - from.s) * e;
      applyCam();
    });
  }

  // ── Synthetic cursor ────────────────────────────────────────────────────────
  let cx = vw() / 2, cy = vh() / 2;
  function cursorTo(sel, opts = {}) {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const tx = r.left + r.width * (opts.fx ?? 0.5);
    const ty = r.top + r.height * (opts.fy ?? 0.5);
    const fx = cx, fy = cy;
    cursor.style.opacity = '1';
    tween(opts.dur ?? 620, (e) => {
      cx = fx + (tx - fx) * e; cy = fy + (ty - fy) * e;
      cursor.style.left = cx + 'px'; cursor.style.top = cy + 'px';
    });
  }
  function pulse() {
    ripple.style.left = cx + 'px'; ripple.style.top = cy + 'px';
    ripple.style.opacity = '0.9'; ripple.style.transform = 'scale(1)';
    tween(520, (e) => {
      ripple.style.transform = `scale(${1 + e * 2.6})`;
      ripple.style.opacity = String(0.9 * (1 - e));
    });
    cursor.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(0.68)' }, { transform: 'scale(1)' }],
      { duration: 260, easing: 'ease-out' });
  }

  // ── Public beat API ─────────────────────────────────────────────────────────
  const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;

  const API = {
    cam: (sel, opts) => camTo(sel, opts),

    point: (sel, opts) => cursorTo(sel, opts),

    press(sel, opts = {}) {
      const el = document.querySelector(sel);
      if (!el) { console.warn('[film] missing press target', sel); return; }
      cursorTo(el, opts);
      setTimeout(() => { pulse(); el.click(); }, opts.dur ?? 620);
    },

    /** Drag a React-controlled range input, cursor riding the thumb. */
    slider(sel, to, opts = {}) {
      const el = document.querySelector(sel);
      if (!el) return;
      const from = parseFloat(el.value);
      const min = parseFloat(el.min), max = parseFloat(el.max);
      cursor.style.opacity = '1';
      tween(opts.dur ?? 1600, (e) => {
        const v = from + (to - from) * e;
        nativeValue.call(el, String(v));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        const r = el.getBoundingClientRect();
        cx = r.left + ((v - min) / (max - min)) * r.width;
        cy = r.top + r.height / 2;
        cursor.style.left = cx + 'px'; cursor.style.top = cy + 'px';
      });
    },

    hideCursor: () => { cursor.style.opacity = '0'; },

    caption(text) {
      if (!text) { capEl.style.opacity = '0'; return; }
      capEl.textContent = text;
      capEl.style.opacity = '1';
    },

    chapter(n, label) {
      if (!n) { chapEl.style.opacity = '0'; return; }
      chapEl.querySelector('.n').textContent = n;
      chapEl.querySelector('.l').textContent = label;
      chapEl.style.opacity = '1';
    },

    mark: (on) => {
      markEl.style.opacity = on ? '1' : '0';
      $('film-band').style.opacity = (on && SOCIAL) ? '1' : '0';
    },

    veil: (to, dur) => fade(veil, to, dur),

    /** Full-screen chapter card. */
    card(kicker, title, sub, hold = 1500) {
      card.innerHTML = `
        <div style="font-size:${Math.round(13 / K * 0.72)}px;letter-spacing:.34em;color:${CYAN};font-weight:800;margin-bottom:22px">${kicker}</div>
        <div style="font-size:${Math.round(66 * K)}px;font-weight:800;color:#f1f5f9;letter-spacing:-0.028em;text-align:center;line-height:1.06;max-width:90%">${title}</div>
        ${sub ? `<div style="font-size:${Math.round(SOCIAL ? 34 : 22)}px;color:${SOCIAL ? '#cbd5e1' : '#8ea0b5'};margin-top:${SOCIAL ? 22 : 20}px;text-align:center;max-width:86%;line-height:1.4">${sub}</div>` : ''}`;
      fade(card, 1, 420);
      setTimeout(() => fade(card, 0, 520), hold);
    },

    /** Cold-open beats: the scene the whole film argues from. */
    open(step) {
      if (step === 1) {
        scene.innerHTML = `
          <div style="font-size:${Math.round(14 / K * 0.78)}px;letter-spacing:.4em;color:rgba(255,255,255,0.42);margin-bottom:${Math.round(44 * K)}px">23:08 · ANY TUESDAY</div>
          <div id="ko-n" style="font-size:${Math.round(190 * K)}px;font-weight:800;color:#f1f5f9;line-height:0.9;letter-spacing:-0.045em">0</div>
          <div style="font-size:${Math.round(19 / K * 0.78)}px;letter-spacing:.24em;color:${CYAN};margin-top:26px;text-align:center;max-width:88%">PEOPLE WAITING TO TALK TO SOMEONE</div>
          <div id="ko-rows" style="margin-top:${Math.round(64 * K)}px;display:flex;flex-direction:column;gap:15px;align-items:center"></div>`;
        fade(scene, 1, 700);
        const n = document.getElementById('ko-n');
        tween(2400, (e) => { n.textContent = String(Math.round(47 * e)); });
      }
      if (step === 2) {
        const row = document.createElement('div');
        row.style.cssText = `font-size:${Math.round(27 / K * 0.72)}px;color:#e2e8f0;opacity:0;display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:92%`;
        row.innerHTML = `<span style="color:#22c55e;font-weight:800">3</span>
          <span style="color:#8ea0b5">experts online</span>
          <span style="color:#3d4a5c">·</span>
          <span style="color:#8ea0b5">all three already on a call</span>`;
        document.getElementById('ko-rows').appendChild(row);
        fade(row, 1, 600);
      }
      if (step === 3) {
        const row = document.createElement('div');
        row.style.cssText = `font-size:${Math.round(27 / K * 0.72)}px;color:#e2e8f0;opacity:0;display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:92%`;
        row.innerHTML = `<span style="color:#ef4444;font-weight:800">12</span>
          <span style="color:#8ea0b5">experts offline</span>
          <span style="color:#3d4a5c">·</span>
          <span style="color:#ef4444">not one of them was told</span>`;
        document.getElementById('ko-rows').appendChild(row);
        fade(row, 1, 600);
      }
      if (step === 0) fade(scene, 0, 800);
    },

    endcard() {
      card.style.background = '#06060b';   // fully opaque; nothing shows through
      card.innerHTML = `
        <div style="font-size:${Math.round(13 / K * 0.72)}px;letter-spacing:.34em;color:${CYAN};font-weight:800;margin-bottom:24px">EQUILIBRIUM</div>
        <div style="font-size:${Math.round(60 * K)}px;font-weight:800;color:#f1f5f9;letter-spacing:-0.028em;text-align:center;line-height:1.08;max-width:90%">
          When Demand Exceeds Supply</div>
        <div style="font-size:${Math.round(21 / K * 0.80)}px;color:#8ea0b5;margin-top:20px;text-align:center;max-width:82%;line-height:1.5">
          A live operations layer for two-sided marketplaces. Every module here is playable.</div>
        <div style="margin-top:${Math.round(46 * K)}px;padding:13px 26px;border:1px solid ${CYAN}55;border-radius:999px;color:${CYAN};font-size:${Math.round(20 / K * 0.82)}px;text-align:center">
          when-demand-exceeds-supply.vercel.app</div>
        <div style="margin-top:26px;font-size:${Math.round(15 / K * 0.82)}px;color:rgba(255,255,255,0.42)">Wahid Tawsif Ratul</div>`;
      fade(card, 1, 700);
    },

    /**
     * Kick off the scheduled beat list; resolves when the film ends.
     *
     * Recording starts with the page, so the capture always contains some frames
     * of the site loading before the film begins. A one-frame white flash marks
     * t = -0.5s so the encoder can find the true start and trim to it exactly,
     * instead of the head offset being guesswork.
     */
    async run(beats, totalMs) {
      // Magenta, not white: the browser paints a white page before the site's
      // own background lands, and a white marker is indistinguishable from it.
      const flash = document.createElement('div');
      flash.style.cssText = 'position:absolute;inset:0;background:#ff00ff';
      ui.appendChild(flash);
      await new Promise((r) => setTimeout(r, 130));
      flash.remove();
      await new Promise((r) => setTimeout(r, 500));

      for (const [t, method, ...args] of beats) {
        setTimeout(() => {
          try { API[method](...args); }
          catch (err) { console.warn('[film] beat failed', method, args, err); }
        }, t * 1000);
      }
      tween(totalMs, (_, p) => { barEl.style.width = (p * 100).toFixed(2) + '%'; });
      await new Promise((res) => setTimeout(res, totalMs + 400));
    },
  };
  return API;
})();
