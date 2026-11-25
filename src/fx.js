'use strict';
// ===== 像素戰鬥特效（自製）=====
// 粒子固定 120Hz 步進、上限 500、固定種子亂數；色彩層一般混色，光層用加法混色。
(() => {
  const STEP = 1 / 120, MAX = 500, TAU = Math.PI * 2;
  const mulberry32 = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  // 元素色
  G.ELEM = { phys: '#f0f0f0', fire: '#ff8a3a', frost: '#8ae0ff', bolt: '#ffe84a', poison: '#9ae060', shadow: '#c08aff', crit: '#ffd447' };
  G.elemOf = (tags) => {
    if (!tags) return G.ELEM.phys;
    if (tags.includes('fire') || tags.includes('burn')) return G.ELEM.fire;
    if (tags.includes('frost')) return G.ELEM.frost;
    if (tags.includes('chain')) return G.ELEM.bolt;
    if (tags.includes('shadow')) return G.ELEM.shadow;
    return G.ELEM.phys;
  };

  // 顏色變亮（#rrggbb → 混白）
  const lighten = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0');
    return '#' + f(r) + f(g) + f(b);
  };

  const fx = G.fx = {
    rnd: mulberry32(12345), acc: 0,
    parts: [], arcs: [], streaks: [], rings: [], lights: [], bolts: [],
    clear() { this.parts = []; this.arcs = []; this.streaks = []; this.rings = []; this.lights = []; this.bolts = []; },
    r(a, b) { return a + (b - a) * this.rnd(); },

    update(dt) {
      this.acc += Math.min(dt, 0.25);
      let n = 0;
      while (this.acc >= STEP && n < 12) {
        for (const p of this.parts) {
          p.vy += p.g * STEP;
          const d = Math.max(1 - p.drag * STEP, 0);
          p.vx *= d; p.vy *= d;
          p.x += p.vx * STEP; p.y += p.vy * STEP;
          p.life -= STEP;
        }
        this.acc -= STEP; n++;
      }
      if (n >= 12) this.acc = 0;
      this.parts = this.parts.filter((p) => p.life > 0);
      for (const arr of [this.arcs, this.streaks, this.rings, this.lights, this.bolts]) for (const x of arr) x.t += dt;
      const alive = (x) => x.t < x.life;
      this.arcs = this.arcs.filter(alive); this.streaks = this.streaks.filter(alive); this.rings = this.rings.filter(alive);
      this.lights = this.lights.filter(alive); this.bolts = this.bolts.filter(alive);
    },

    add(x, y, vx, vy, life, c, s = 2, g = 0, drag = 0, light = false) {
      if (this.parts.length >= MAX) this.parts.shift();
      this.parts.push({ x, y, vx, vy, life, max: life, c, s, g, drag, light });
    },
    burst(x, y, col, n, speed, life, g = 0, s = 2, light = true, dir = 0, spread = TAU) {
      for (let i = 0; i < n; i++) {
        const a = dir + this.r(-spread / 2, spread / 2), sp = speed * this.r(0.35, 1);
        this.add(x, y, Math.cos(a) * sp, Math.sin(a) * sp, life * this.r(0.6, 1), lighten(col, this.r(0, 0.35)), s, g, 3, light);
      }
    },
    spark(x, y, col, crit = false, dir = 0) {
      this.burst(x, y, col, crit ? 14 : 8, crit ? 190 : 130, 0.28, 120, 2, true, dir, Math.PI * 1.2);
      this.burst(x, y, '#ffffff', crit ? 4 : 2, 70, 0.12, 0, 3, true);
      this.light(x, y, crit ? 22 : 14, col, 0.14);
    },
    slashArc(cx, cy, r, a0, a1, col, w = 3, life = 0.18) { this.arcs.push({ cx, cy, r, a0, a1, col, w, life, t: 0 }); },
    streak(x1, y1, x2, y2, col, w = 3, life = 0.12) { this.streaks.push({ x1, y1, x2, y2, col, w, life, t: 0 }); },
    ring(x, y, r, col, life = 0.3, w = 2, flat = false) { this.rings.push({ x, y, r, col, life, w, flat, t: 0 }); },
    light(x, y, r, col, life = 0.14) { this.lights.push({ x, y, r, col, life, t: 0 }); },
    lightning(pts, col = '#ffe84a', life = 0.2) {
      const out = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        const len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len, ny = (bx - ax) / len;
        for (let k = 1; k < 7; k++) { const j = this.r(-7, 7); out.push([ax + (bx - ax) * k / 7 + nx * j, ay + (by - ay) * k / 7 + ny * j]); }
        out.push(pts[i]);
      }
      this.bolts.push({ pts: out, col, life, t: 0 });
      for (const p of pts.slice(1)) this.light(p[0], p[1], 12, col, 0.12);
    },
    dust(x, y, n = 8) {
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        this.add(x + this.r(-4, 4), y, side * this.r(40, 110), this.r(-70, -20), this.r(0.3, 0.55), this.rnd() < 0.5 ? '#8a7a6a' : '#6a5e52', this.rnd() < 0.3 ? 3 : 2, 160, 2.5, false);
      }
    },
    rise(x, y, col, n = 8, w = 12) {
      for (let i = 0; i < n; i++) this.add(x + this.r(-w, w), y + this.r(-4, 8), this.r(-8, 8), this.r(-60, -25), this.r(0.5, 0.9), lighten(col, this.r(0, 0.4)), 2, -10, 1, true);
    },
    // 依貼圖像素碎裂：每 2px 取一顆，從中心往外噴
    shatter(img, x, y, scale, flip) {
      let data;
      try { data = img.getContext('2d').getImageData(0, 0, img.width, img.height).data; } catch (e) { return; }
      const w = img.width, h = img.height;
      for (let py = 0; py < h; py += 2) for (let px = 0; px < w; px += 2) {
        const i = (py * w + px) * 4;
        if (data[i + 3] < 128) continue;
        const col = '#' + [data[i], data[i + 1], data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
        const lx = (flip ? (w - 1 - px) : px) - w / 2, ly = py - h / 2;
        const a = Math.atan2(ly, lx) + this.r(-0.4, 0.4), sp = this.r(60, 190);
        this.add(x + lx * scale, y + ly * scale, Math.cos(a) * sp, Math.sin(a) * sp - 60, this.r(0.35, 0.7), col, scale + 1, 260, 1.5, false);
      }
    },

    // ---------- 繪製：色彩層 ----------
    draw(ctx) {
      for (const a of this.arcs) {
        const k = a.t / a.life;
        const head = a.a0 + (a.a1 - a.a0) * Math.min(k * 2.5, 1);
        const tail = a.a0 + (a.a1 - a.a0) * Math.max((k - 0.3) / 0.7, 0);
        if (Math.abs(head - tail) < 0.01) continue;
        const s = Math.min(head, tail), e = Math.max(head, tail);
        ctx.globalAlpha = 1 - k * 0.7;
        ctx.strokeStyle = a.col; ctx.lineWidth = a.w;
        ctx.beginPath(); ctx.arc(a.cx, a.cy, a.r, s, e); ctx.stroke();
        ctx.globalAlpha = Math.max(0, 0.9 - k);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(a.cx, a.cy, a.r - a.w * 0.6, s, e); ctx.stroke();
      }
      for (const s of this.streaks) {
        const k = s.t / s.life;
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = s.col; ctx.lineWidth = s.w * (1 - k * 0.5);
        ctx.beginPath(); ctx.moveTo(s.x1 + (s.x2 - s.x1) * k * 0.6, s.y1 + (s.y2 - s.y1) * k * 0.6); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(s.x1 + (s.x2 - s.x1) * (0.3 + k * 0.5), s.y1 + (s.y2 - s.y1) * (0.3 + k * 0.5)); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      }
      for (const r of this.rings) {
        const k = r.t / r.life, rr = r.r * (0.3 + 0.7 * (1 - (1 - k) * (1 - k)));
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = r.col; ctx.lineWidth = r.w;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, rr, rr * (r.flat ? 0.3 : 1), 0, 0, TAU); ctx.stroke();
      }
      for (const b of this.bolts) {
        const k = b.t / b.life;
        ctx.globalAlpha = 1 - k;
        for (const [col, w] of [[b.col, 3], ['#ffffff', 1]]) {
          ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
          b.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
        }
      }
      for (const p of this.parts) {
        ctx.globalAlpha = Math.min(1, Math.max(0, p.life / p.max * 1.6));
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
      }
      ctx.globalAlpha = 1;
    },
    // ---------- 繪製：光層（加法混色）----------
    drawLight(ctx) {
      ctx.globalCompositeOperation = 'lighter';
      for (const l of this.lights) {
        const k = 1 - l.t / l.life;
        ctx.fillStyle = l.col;
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = k * (0.12 + i * 0.1);
          ctx.beginPath(); ctx.arc(Math.round(l.x), Math.round(l.y), Math.max(1, l.r * (1 - i * 0.33)), 0, TAU); ctx.fill();
        }
      }
      // 發光粒子：每兩顆畫一顆光暈
      let i = 0;
      for (const p of this.parts) {
        if (!p.light || (i++ & 1)) continue;
        ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.35;
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x) - p.s, Math.round(p.y) - p.s, p.s * 3, p.s * 3);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
  // 舊的 G.burst 改走像素粒子
  G.burst = (x, y, color, n = 8, spd = 160, life = 0.45, size = 3, glow = false) => fx.burst(x, y, color, n, spd, life, 0, Math.max(2, Math.round(size * 0.7)), glow);
})();
