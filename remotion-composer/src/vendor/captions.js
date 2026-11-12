/* VENDORED from https://github.com/Vibha-Ramprakash/claude-caption-styles (captions.js), MIT License,
   Copyright (c) 2026 Vibha Ramprakash (@vibha.in.progress). Local change: Bangla fallback ('Hind Siliguri') appended to the
   font stacks below so Bangla glyphs render; Latin glyphs keep the style's own font. Also: pop-sticker `stickers` option (default off); guard `nx` at the last word in phrases() (crashed in auto line-break mode). Used by components/StyledCaptions.tsx. */
/* Claude Caption Styles: 7 free caption styles for vertical videos.
   Made by @vibha.in.progress · MIT licence · https://instagram.com/vibha.in.progress

   One small engine, no build step. Give it your words with timings and a style, then call seek(t)
   with the video time. The same code drives the live preview and the frame-by-frame render, so
   what you see in the browser is what you get in the MP4.

   const cap = CaptionStyles.create(stageElement, { words, style: 'pop-sticker' });
   cap.seek(video.currentTime);   // call every frame
*/
(function (root) {
  'use strict';

  /* ---------- fonts (Google Fonts, loaded by the page) ---------- */
  const SANS = "'Inter Tight','Hind Siliguri',system-ui,sans-serif", SERIF = "'Newsreader','Hind Siliguri',Georgia,serif",
    MONO = "'JetBrains Mono','Hind Siliguri',ui-monospace,monospace", ANTON = "'Anton','Hind Siliguri',Impact,sans-serif",
    TYPE = "'Special Elite','Hind Siliguri','Courier New',monospace";
  const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Anton&family=Inter+Tight:wght@500;700;800;900&family=JetBrains+Mono:wght@500&family=Newsreader:ital,opsz,wght@0,6..72,500;1,6..72,500&family=Special+Elite&display=swap';
  const FONT_FACES = ['900 40px "Inter Tight"', '800 40px "Inter Tight"', '700 40px "Inter Tight"', '500 40px Newsreader',
    'italic 500 40px Newsreader', '500 40px "JetBrains Mono"', '400 40px Anton', '400 40px "Special Elite"'];
  const SVGNS = 'http://www.w3.org/2000/svg';
  const SH = '0 .3cqw 1cqw rgba(0,0,0,.55),0 0 3.5cqw rgba(0,0,0,.35)';

  const CSS = `
.cs-stage{position:relative;container-type:size;overflow:hidden}
.cs-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.cs-t{position:absolute;translate:-50% -50%;white-space:nowrap;line-height:1;color:#fff;font-family:${SANS};text-shadow:${SH}}
.cs-t.l{translate:0 -50%}
.cs-L{display:inline-block;position:relative}
.cs-cur{display:inline-block;width:.5em;height:1em;background:#fff;vertical-align:-.14em;margin-left:.08em}`;
  function injectCSS() {
    if (typeof document === 'undefined' || document.getElementById('cs-css')) return;
    const s = document.createElement('style'); s.id = 'cs-css'; s.textContent = CSS; document.head.appendChild(s);
    if (!document.querySelector('link[data-cs-fonts]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONTS_URL; l.dataset.csFonts = '1'; document.head.appendChild(l);
    }
  }
  async function fontsReady() {
    injectCSS();
    try { await Promise.all(FONT_FACES.map(f => document.fonts.load(f))); await document.fonts.ready; } catch (e) { /* fall back to system fonts */ }
  }

  /* ---------- the clock: every animation is driven by the video time ---------- */
  let C = null; // the caption instance currently stepping
  function A(e, kf, o) {
    const a = e.animate(kf, Object.assign({ duration: 500, easing: 'cubic-bezier(.2,.9,.25,1.1)', fill: 'both' }, o || {}));
    a.pause(); a._t0 = C.t; a.currentTime = 0; C.anims.push(a); return a;
  }
  const later = (ms, fn) => C.timers.push({ at: C.t + ms / 1000, fn });
  const R = () => C.rng();
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- small helpers ---------- */
  const D = (w, t) => Math.max(0, (w.s - t) * 1000);                       // ms until a word is spoken
  const fit = (len, max, budget) => Math.min(max, budget / (Math.max(1, len) * 0.58)); // font size that fits the width
  const up = s => s.toUpperCase();
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const letters = s => [...s].map(ch => '<span class="cs-L">' + (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>').join('');
  const words = a => a.map(x => x.t).join(' ');
  function T(L, html, o) {
    o = o || {}; const e = document.createElement('div'); e.className = 'cs-t' + (o.ax === 'l' ? ' l' : ''); e.innerHTML = html;
    e.style.left = (o.x == null ? 50 : o.x) + '%'; e.style.top = (o.y == null ? 50 : o.y) + '%'; e.style.fontSize = (o.s || 8) + 'cqw';
    if (o.st) Object.assign(e.style, o.st); L.appendChild(e); return e;
  }
  function rowEl(L, css) {
    const r = document.createElement('div');
    r.style.cssText = 'position:absolute;left:0;right:0;top:' + C.y + '%;translate:0 -50%;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:.6cqw 2.4cqw;padding:0 7%;color:#fff;text-shadow:' + SH + ';' + css;
    L.appendChild(r); return r;
  }
  function fadeOut(els) {
    els.forEach(e => { if (!e || !e.isConnected) return; A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'linear', fill: 'forwards' }); later(160, () => e.remove()); });
  }

  /* ---------- the 7 styles ----------
     enter(c, phrase, t) builds one line and returns its elements; exit(c, els) plays it out (default: quick fade).
     A phrase is { i, s, e, w: [{ t, s, e, k }], big, txt }. k = key word (gets the highlight colour). */
  const STYLES = [
    {
      id: 'editorial-highlight', name: 'Editorial Highlight',
      look: 'Magazine serif. The key word lands on a deep-red paper strip, with a little page number above the line.',
      enter(c, ph, t) {
        const r = rowEl(c.L, 'align-items:baseline;gap:.6cqw 2cqw;font:500 ' + (ph.txt.length > 18 ? 9 : 10.5) + 'cqw ' + SERIF + ';text-shadow:0 .4cqw 1.6cqw rgba(0,0,0,.45)');
        const lab = document.createElement('div'); lab.textContent = String(ph.i + 1).padStart(2, '0') + ' / ' + String(c.phrases.length).padStart(2, '0');
        lab.style.cssText = 'position:absolute;left:8%;top:-5.5cqw;font:500 2.4cqw ' + MONO + ';letter-spacing:.12em;color:#f3d9c6'; r.appendChild(lab);
        ph.w.forEach((x, i) => {
          const s = document.createElement('span'); s.textContent = x.t; s.style.cssText = 'display:inline-block;position:relative;isolation:isolate';
          if (i % 2 === 1 && x !== ph.big) s.style.fontStyle = 'italic';
          if (x === ph.big) {
            s.style.padding = '0 1.4cqw'; const bg = document.createElement('i');
            bg.style.cssText = 'position:absolute;inset:10% 0 2% 0;background:#c2412d;z-index:-1;transform-origin:left'; s.appendChild(bg);
            A(bg, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { delay: D(x, t), duration: 320, easing: 'cubic-bezier(.3,.7,.2,1)' });
          }
          r.appendChild(s); A(s, [{ opacity: 0, transform: 'translateX(-2cqw)' }, { opacity: 1, transform: 'none' }], { delay: D(x, t), duration: 360, easing: 'cubic-bezier(.3,.7,.2,1)' });
        });
        return [r];
      }
    },
    {
      id: 'pop-sticker', name: 'Pop Sticker',
      options: { stickers: false }, // local change: stars/flowers/hearts off by default (setOption('stickers', true) restores them)
      look: 'Loud colour blocks with black outlines and hard shadows, little stickers popping in around them. Key words go purple and get a star.',
      enter(c, ph, t) {
        const r = rowEl(c.L, 'gap:1.6cqw;font:900 ' + (ph.txt.length > 18 ? 8.6 : 10) + 'cqw ' + SANS + ';text-shadow:none');
        const COL = [['#c6ff3d', '#111'], ['#ffd60a', '#111'], ['#ff8fd8', '#111'], ['#fff', '#111']];
        ph.w.forEach((x, i) => {
          const s = document.createElement('span'); s.textContent = x.t; const cl = x.k ? ['#8a3cff', '#fff'] : COL[(i + ph.i) % 4];
          s.style.cssText = 'display:inline-block;position:relative;background:' + cl[0] + ';color:' + cl[1] + ';padding:.5cqw 2cqw;border:.5cqw solid #111;box-shadow:1.3cqw 1.3cqw 0 #111;border-radius:1.4cqw;letter-spacing:-.02em'; r.appendChild(s);
          A(s, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1.18)', offset: .55 }, { opacity: 1, transform: 'scale(.94)', offset: .8 }, { opacity: 1, transform: 'scale(1)' }], { delay: D(x, t), duration: 440 });
          if (x.k && c.opt('stickers')) {
            const st = document.createElement('i'); st.textContent = '★';
            st.style.cssText = 'position:absolute;right:-4cqw;top:-5cqw;font-style:normal;font-size:7cqw;color:#ffd60a;-webkit-text-stroke:.4cqw #111'; s.appendChild(st);
            A(st, [{ transform: 'scale(0)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { delay: D(x, t) + 200, duration: 380 });
          }
        });
        const MINI = [['★', '#ffd60a'], ['✦', '#fff'], ['♥', '#ff5a8a'], ['✿', '#c6ff3d'], ['●', '#8ad8ff'], ['✚', '#ff8fd8']];
        for (let j = 0; j < (c.opt('stickers') ? 4 : 0); j++) {
          const m = MINI[(ph.i * 3 + j) % MINI.length], w = ph.w[j % ph.w.length]; const e = document.createElement('i'); e.textContent = m[0];
          e.style.cssText = 'position:absolute;left:' + (8 + ((j * 29 + ph.i * 17) % 84)) + '%;top:' + (j % 2 ? '-9cqw' : 'calc(100% + 1.5cqw)') + ';font-style:normal;font-size:' + (4.2 + ((j + ph.i) % 3) * 1.1) + 'cqw;line-height:1;color:' + m[1] + ';-webkit-text-stroke:.32cqw #111;text-shadow:.5cqw .5cqw 0 #111;font-family:' + SANS;
          r.appendChild(e);
          A(e, [{ opacity: 0, transform: 'scale(0) rotate(-30deg)' }, { opacity: 1, transform: 'scale(1.25) rotate(8deg)', offset: .6 }, { opacity: 1, transform: 'none' }], { delay: D(w, t) + 120 + j * 60, duration: 360 });
        }
        return [r];
      }
    },
    {
      id: 'paper-plane', name: 'Paper Plane',
      look: 'A paper plane in your highlight colour flies across and pulls the line in behind it. Key words in the same colour.',
      enter(c, ph, t) {
        const d = D(ph.w[0], t), dur = Math.max(500, (ph.e - ph.s) * 700);
        const e = T(c.L, ph.w.map(x => x.k ? '<span style="color:var(--hl)">' + esc(x.t) + '</span>' : esc(x.t)).join(' '), { x: 50, y: c.y, s: fit(ph.txt.length, 9.5, 86), st: { fontWeight: 800 } });
        A(e, [{ clipPath: 'inset(-30% 100% -30% 0)' }, { clipPath: 'inset(-30% -5% -30% 0)' }], { delay: d, duration: dur, easing: 'cubic-bezier(.4,0,.2,1)' });
        const p = document.createElementNS(SVGNS, 'svg'); p.setAttribute('viewBox', '0 0 40 30');
        p.style.cssText = 'position:absolute;top:' + (c.y - 4.2) + '%;left:0;width:13cqw;height:9.75cqw;overflow:visible;filter:drop-shadow(0 .6cqw .6cqw rgba(0,0,0,.4))';
        p.innerHTML = '<path d="M39 15 L1 1 L11 15 L1 29 Z" style="fill:var(--hl)"/><path d="M39 15 L11 15 L1 29 Z" fill="rgba(0,0,0,.2)"/><path d="M39 15 L11 15 L6 22 Z" fill="rgba(255,255,255,.28)"/>';
        c.L.appendChild(p);
        A(p, [{ transform: 'translate(-9cqw,4cqw)', opacity: 1 }, { transform: 'translate(92cqw,-1cqw)', opacity: 1, offset: .92 }, { transform: 'translate(104cqw,-4cqw)', opacity: 0 }], { delay: d, duration: dur, easing: 'cubic-bezier(.4,0,.2,1)' });
        return [e, p];
      }
    },
    {
      id: 'smoke-exit', name: 'Smoke Exit',
      look: 'Chunky sans words, key word in your highlight colour. When the line ends it dissolves into smoke, and the key word smokes in its own colour.',
      enter(c, ph, t) {
        const r = rowEl(c.L, 'font:900 ' + (ph.txt.length > 16 ? 9.5 : 11) + 'cqw ' + SANS + ';letter-spacing:-.03em');
        ph.w.forEach(x => {
          const s = document.createElement('span'); s.innerHTML = letters(x.t); s.style.cssText = 'display:inline-block;position:relative';
          if (x.k) { s.style.color = 'var(--hl)'; s.dataset.k = 1; }
          r.appendChild(s); A(s, [{ opacity: 0, transform: 'translateY(3cqw)' }, { opacity: 1, transform: 'none' }], { delay: D(x, t), duration: 300 });
        });
        return [r];
      },
      exit(c, els) {
        els.forEach(row => {
          if (!row.isConnected) return;
          [...row.querySelectorAll('.cs-L')].forEach((l, i) => A(l, [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translate(' + (R() * 10 - 5) + 'cqw,' + (-7 - R() * 10) + 'cqw) scale(1.6)', filter: 'blur(2cqw)' }], { delay: i * 14, duration: 640, easing: 'ease-in', fill: 'forwards' }));
          [...row.children].forEach(s => {
            const k = !!s.dataset.k, n = k ? 12 : 5;
            for (let j = 0; j < n; j++) {
              const p = document.createElement('i'); const sz = (k ? 3.2 : 2.4) + R() * 2;
              p.style.cssText = 'position:absolute;left:' + (R() * 100) + '%;top:' + (30 + R() * 40) + '%;width:' + sz + 'cqw;height:' + sz + 'cqw;border-radius:50%;background:' + (k ? 'radial-gradient(circle,var(--hl) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(255,255,255,.7) 0%,transparent 70%)') + ';filter:blur(.5cqw);pointer-events:none';
              s.appendChild(p);
              A(p, [{ opacity: k ? .95 : .7, transform: 'none' }, { opacity: 0, transform: 'translate(' + (R() * 10 - 5) + 'cqw,' + (-9 - R() * 12) + 'cqw) scale(' + (2.2 + R() * 1.4) + ')' }], { delay: j * 25, duration: 950, easing: 'ease-out', fill: 'forwards' });
            }
          });
          later(1000, () => row.remove());
        });
      }
    },
    {
      id: 'explosive-breakup', name: 'Explosive Breakup',
      look: 'Big condensed caps hold for the line, then every letter blasts outward. The key word explodes in sparks of your highlight colour.',
      enter(c, ph, t) {
        const r = rowEl(c.L, 'font:400 ' + (ph.txt.length > 18 ? 10 : 12) + 'cqw ' + ANTON + ';letter-spacing:.02em');
        ph.w.forEach(x => {
          const s = document.createElement('span'); s.innerHTML = letters(up(x.t)); s.style.display = 'inline-block';
          if (x.k) { s.style.color = 'var(--hl)'; s.dataset.k = 1; }
          r.appendChild(s); A(s, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], { delay: D(x, t), duration: 220 });
        });
        return [r];
      },
      exit(c, els) {
        els.forEach(row => {
          if (!row.isConnected) return;
          [...row.children].forEach(s => {
            const k = !!s.dataset.k;
            [...s.querySelectorAll('.cs-L')].forEach(l => {
              const a = R() * Math.PI * 2, d = 22 + R() * 24;
              A(l, [{ transform: 'none', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d + 'cqw,' + Math.sin(a) * d + 'cqw) rotate(' + (R() * 400 - 200) + 'deg) scale(.5)', opacity: 0, filter: 'blur(.8cqw)' }], { duration: 620, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
              if (k) for (let j = 0; j < 5; j++) {
                const p = document.createElement('i'); const b = R() * Math.PI * 2, dd = 10 + R() * 26, sz = .8 + R() * 1.4;
                p.style.cssText = 'position:absolute;left:50%;top:50%;width:' + sz + 'cqw;height:' + sz + 'cqw;border-radius:50%;background:var(--hl);box-shadow:0 0 1.6cqw var(--hl);pointer-events:none';
                l.appendChild(p);
                A(p, [{ transform: 'none', opacity: 1 }, { transform: 'translate(' + Math.cos(b) * dd + 'cqw,' + Math.sin(b) * dd + 'cqw) scale(.3)', opacity: 0 }], { duration: 560 + R() * 240, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'forwards' });
              }
            });
          });
          later(820, () => row.remove());
        });
      }
    },
    {
      id: 'rolodex-flip', name: 'Rolodex Flip',
      look: 'The line builds word by word and each new word flips down like a rolodex card. Key words in your highlight colour.',
      enter(c, ph, t) {
        const r = rowEl(c.L, 'perspective:40cqw;font:800 ' + (ph.txt.length > 18 ? 8.6 : 10) + 'cqw ' + SANS + ';letter-spacing:-.02em');
        ph.w.forEach((x, i) => {
          const s = document.createElement('span'); s.textContent = x.t; s.style.cssText = 'display:inline-block;transform-origin:50% 0' + (x.k ? ';color:var(--hl)' : ''); r.appendChild(s);
          A(s, [{ opacity: 0, transform: 'rotateX(-95deg)' }, { opacity: 1, transform: 'rotateX(0)' }], { delay: D(x, t), duration: 420, easing: 'cubic-bezier(.2,1,.3,1)' });
          const nx = ph.w[i + 1]; if (nx) A(s, [{ opacity: 1 }, { opacity: .62 }], { delay: D(nx, t), duration: 250, fill: 'forwards' });
        });
        return [r];
      }
    },
    {
      id: 'retro-typer', name: 'Retro Typer',
      look: 'Typewriter letters typed in time with your voice, with a blinking block cursor. Key words type in your highlight colour. Option: a soft hazy box behind.',
      options: { box: false },
      enter(c, ph, t) {
        const st = c.opt('box')
          ? { fontFamily: TYPE, background: 'rgba(14,10,7,.28)', boxShadow: '0 0 6cqw 5cqw rgba(14,10,7,.28)', padding: '1.4cqw 2.4cqw', borderRadius: '5cqw', textShadow: '0 .2cqw .9cqw rgba(0,0,0,.5)' }
          : { fontFamily: TYPE, textShadow: '0 .3cqw 1.4cqw rgba(0,0,0,.75),0 0 4cqw rgba(0,0,0,.45)' };
        const e = T(c.L, '<span class="ty"></span><span class="cs-cur"></span>', { x: 12, y: c.y, ax: 'l', s: ph.txt.length > 18 ? 6.2 : 7.2, st });
        c.data.ty = e.querySelector('.ty');
        A(e.querySelector('.cs-cur'), [{ opacity: 1 }, { opacity: 1, offset: .5 }, { opacity: 0, offset: .5001 }, { opacity: 0 }], { duration: 800, iterations: Infinity, easing: 'linear' });
        const ch = []; ph.w.forEach((x, wi) => {
          const s = (wi ? ' ' : '') + x.t, nx = ph.w[wi + 1], end = Math.min(nx ? nx.s : ph.e - .05, x.e + .1), dur = Math.max(.05, Math.min(.3, (end - x.s) * .85));
          [...s].forEach((k, j) => ch.push([x.s + dur * j / s.length, k, x.k]));
        });
        c.data.ch = ch; c.data.n = -1; A(e, [{ opacity: 0 }, { opacity: 1 }], { delay: D(ph.w[0], t), duration: 120 });
        return [e];
      },
      tick(c, t) {
        if (!c.data.ch || !c.data.ty || !c.data.ty.isConnected) return; let n = 0; for (const q of c.data.ch) { if (q[0] <= t) n++; else break; }
        if (n === c.data.n) return; c.data.n = n; let h = '', k = false;
        for (let i = 0; i < n; i++) { const q = c.data.ch[i]; if (q[2] !== k) { if (k) h += '</span>'; if (q[2]) h += '<span style="color:var(--hl)">'; k = q[2]; } h += esc(q[1]); }
        if (k) h += '</span>'; c.data.ty.innerHTML = h;
      }
    }
  ];
  const byId = id => STYLES.find(s => s.id === id) || STYLES[0];

  /* ---------- words -> caption lines ----------
     words: [{ w: 'Hello', s: 0.21, e: 0.48, k: true, br: true }]   (also accepts t/word/text and start/end)
     k  = key word, gets the highlight colour (pick ~1 per line).
     br = end the line after this word. If any word has br, lines break only at br, punctuation and long pauses.
     Without any br, lines also break at 4 words or ~20 letters. */
  function phrases(input, o) {
    o = o || {}; const maxW = o.maxWords || 4, maxC = o.maxChars || 20, gap = o.gap == null ? .45 : o.gap;
    const W = (input || []).map(x => ({ t: String(x.w ?? x.t ?? x.word ?? x.text ?? '').trim(), s: +(x.s ?? x.start), e: +(x.e ?? x.end), k: !!(x.k || x.key), br: !!x.br }))
      .filter(x => x.t && isFinite(x.s) && isFinite(x.e)).sort((a, b) => a.s - b.s);
    const manual = W.some(x => x.br); // you marked your own line breaks: follow them (plus punctuation and long pauses)
    const groups = []; let cur = [];
    W.forEach((w, i) => {
      cur.push(w); const nx = W[i + 1]; const len = words(cur).length;
      const auto = !manual && (cur.length >= maxW || (nx && cur.length >= 2 && len + 1 + nx.t.length > maxC));
      if (!nx || w.br || /[.!?…,;:]$/.test(w.t) || nx.s - w.e > gap || auto) { groups.push(cur); cur = []; }
    });
    const P = groups.map((w, i) => ({ i, s: Math.max(0, w[0].s - 0.1), w, big: w.find(x => x.k) || w[w.length - 1], txt: words(w) }));
    P.forEach((p, i) => { const last = p.w[p.w.length - 1].e, nx = P[i + 1]; p.e = nx ? Math.max(p.s + .2, Math.min(nx.s, last + 1.2)) : last + .8; });
    return P;
  }

  /* ---------- one caption player on one stage ---------- */
  function create(stage, cfg) {
    injectCSS(); cfg = cfg || {};
    stage.classList.add('cs-stage');
    const L = document.createElement('div'); L.className = 'cs-layer'; stage.appendChild(L);
    const c = {
      stage, L, t: -1, k: -1, els: [], anims: [], timers: [], data: {}, rng: Math.random,
      phrases: [], style: byId(cfg.style), y: cfg.y == null ? 64 : +cfg.y, size: cfg.size == null ? 1 : +cfg.size,
      seed: cfg.seed == null ? 7 : +cfg.seed, options: Object.assign({}, cfg.options || {}),
      opt(name) { const d = (this.style.options || {})[name]; return name in this.options ? this.options[name] : d; }
    };
    function reset() {
      c.anims.forEach(a => a.cancel()); c.anims = []; c.timers = []; L.innerHTML = ''; c.k = -1; c.els = []; c.data = {}; c.t = -1;
    }
    function layout() { L.style.transformOrigin = '50% ' + c.y + '%'; L.style.transform = c.size === 1 ? '' : 'scale(' + c.size + ')'; }
    function seek(t) {
      C = c; t = Math.max(0, +t || 0);
      if (c.t >= 0 && t < c.t - 0.05) reset();
      c.t = t;
      if (c.timers.length) { const due = c.timers.filter(x => t >= x.at); c.timers = c.timers.filter(x => t < x.at); due.forEach(x => { try { x.fn(); } catch (e) { console.error(e); } }); }
      let k = -1; for (const p of c.phrases) { if (t >= p.s && t < p.e) k = p.i; }
      if (k !== c.k) {
        if (c.k >= 0) { c.rng = mulberry32(c.seed * 1000 + c.k * 101 + 7); try { (c.style.exit || ((cc, els) => fadeOut(els)))(c, c.els, c.phrases[c.k]); } catch (e) { console.error(c.style.name, e); } }
        c.els = []; c.k = k; c.data = {};
        if (k >= 0) { c.rng = mulberry32(c.seed * 1000 + k * 101); try { c.els = c.style.enter(c, c.phrases[k], t) || []; } catch (e) { console.error(c.style.name, e); } }
      }
      if (c.style.tick) { try { c.style.tick(c, t, c.phrases[Math.max(0, k)]); } catch (e) { console.error(c.style.name, e); } }
      c.anims = c.anims.filter(a => {
        const tg = a.effect && a.effect.target;
        if (!tg || !tg.isConnected) { a.cancel(); return false; }
        a.currentTime = Math.max(0, (t - a._t0) * 1000); return true;
      });
      C = null;
    }
    const api = {
      seek,
      reset,
      setWords(w, o) { c.phrases = phrases(w, o || cfg.lines); reset(); return api; },
      setStyle(id) { c.style = byId(id); reset(); return api; },
      setHighlight(col) { stage.style.setProperty('--hl', col); return api; },
      setY(y) { c.y = +y; layout(); reset(); return api; },
      setSize(s) { c.size = +s; layout(); return api; },
      setOption(name, v) { c.options[name] = v; reset(); return api; },
      get phrases() { return c.phrases; },
      get style() { return c.style.id; },
      get duration() { const p = c.phrases[c.phrases.length - 1]; return p ? p.e : 0; },
      destroy() { reset(); L.remove(); }
    };
    api.setHighlight(cfg.highlight || '#ffd23f'); layout(); api.setWords(cfg.words || []);
    return api;
  }

  root.CaptionStyles = { create, phrases, fontsReady, STYLES: STYLES.map(s => ({ id: s.id, name: s.name, look: s.look, options: s.options || {} })) };
})(typeof window !== 'undefined' ? window : globalThis);
