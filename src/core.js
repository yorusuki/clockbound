'use strict';
// ===== 核心：命名空間、工具、輸入、音效、存檔 =====
const G = window.G = {
  W: 960, H: 540,
  ARENA: { x1: 36, y1: 72, x2: 924, y2: 506 },
  state: 'title',
  time: 0,
  enemies: [], projs: [], areas: [], allies: [], parts: [], texts: [], pickups: [], npcs: [],
  shakeAmt: 0, stopT: 0, fade: 0,
  debug: /[?&]debug=1/.test(location.search),
};

G.U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (a) => a[Math.floor(Math.random() * a.length)],
  chance: (p) => Math.random() < p,
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  ang: (a, b) => Math.atan2(b.y - a.y, b.x - a.x),
  angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; },
  weighted(list, wf) {
    let tot = 0; for (const it of list) tot += Math.max(0, wf(it));
    if (tot <= 0) return list[0];
    let r = Math.random() * tot;
    for (const it of list) { r -= Math.max(0, wf(it)); if (r <= 0) return it; }
    return list[list.length - 1];
  },
  // 點到線段距離
  segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
  },
};

// ===== 輸入 =====
G.input = {
  keys: {}, pressed: {}, mx: 480, my: 300, mdown: [false, false, false], mpressed: [false, false, false],
  init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      G.audio.init();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.mdown = [false, false, false]; });
    const toLocal = (e) => {
      const r = canvas.getBoundingClientRect();
      this.mx = (e.clientX - r.left) / r.width * G.W;
      this.my = (e.clientY - r.top) / r.height * G.H;
    };
    window.addEventListener('mousemove', toLocal);
    canvas.addEventListener('mousedown', (e) => { toLocal(e); if (e.button === 1) e.preventDefault(); this.mdown[e.button] = true; this.mpressed[e.button] = true; G.audio.init(); });
    window.addEventListener('mouseup', (e) => { this.mdown[e.button] = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },
  down(...codes) { return codes.some((c) => this.keys[c]); },
  hit(...codes) { return codes.some((c) => this.pressed[c]); },
  endFrame() { this.pressed = {}; this.mpressed = [false, false, false]; },
};

// ===== 音效（WebAudio 合成，不需要音檔）=====
G.audio = {
  ctx: null, master: null, noiseBuf: null, last: {}, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  tone(freq, dur, type = 'square', vol = 0.2, slide = 1, delay = 0) {
    const c = this.ctx; if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol = 0.2, freq = 2000, delay = 0) {
    const c = this.ctx; if (!c) return;
    const t0 = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t0); s.stop(t0 + dur + 0.02);
  },
  play(name) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < 45) return;
    this.last[name] = now;
    switch (name) {
      case 'swing': this.noise(0.08, 0.12, 3500); break;
      case 'hit': this.noise(0.05, 0.22, 1800); this.tone(160, 0.05, 'square', 0.06, 0.5); break;
      case 'crit': this.noise(0.07, 0.28, 2600); this.tone(900, 0.07, 'square', 0.07, 0.5); break;
      case 'shoot': this.tone(720, 0.05, 'square', 0.05, 0.55); break;
      case 'bolt': this.tone(380, 0.06, 'triangle', 0.08, 0.6); this.noise(0.04, 0.06, 4000); break;
      case 'boom': this.noise(0.35, 0.45, 700); this.tone(90, 0.3, 'sine', 0.35, 0.35); break;
      case 'smallboom': this.noise(0.18, 0.25, 900); this.tone(130, 0.15, 'sine', 0.18, 0.4); break;
      case 'dash': this.noise(0.12, 0.14, 5000); break;
      case 'hurt': this.tone(240, 0.2, 'sawtooth', 0.2, 0.4); this.noise(0.1, 0.2, 1200); break;
      case 'coin': this.tone(1250, 0.05, 'square', 0.06); this.tone(1650, 0.07, 'square', 0.06, 1, 0.05); break;
      case 'pick': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.12, 1, i * 0.06)); break;
      case 'cast': this.tone(330, 0.22, 'triangle', 0.15, 2.2); break;
      case 'zap': this.tone(1600, 0.08, 'sawtooth', 0.06, 0.25); break;
      case 'die': this.noise(0.12, 0.15, 900); this.tone(200, 0.12, 'square', 0.05, 0.4); break;
      case 'door': this.tone(196, 0.3, 'triangle', 0.15, 1.5); this.tone(294, 0.3, 'triangle', 0.1, 1.5, 0.1); break;
      case 'clear': [392, 523, 659].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.12, 1, i * 0.09)); break;
      case 'warn': this.tone(110, 0.25, 'sawtooth', 0.08, 1.4); break;
      case 'heal': this.tone(660, 0.25, 'sine', 0.15, 1.5); break;
      case 'select': this.tone(880, 0.05, 'square', 0.05); break;
      case 'boss': this.tone(65, 1.2, 'sawtooth', 0.25, 0.8); this.noise(1.0, 0.2, 300); break;
      case 'win': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.14, 1, i * 0.12)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.14, 1, i * 0.18)); break;
    }
  },
};

// ===== 存檔 =====
G.save = {
  key: 'clockbound_meta_v1',
  load() { try { const s = localStorage.getItem(this.key); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  write(d) { try { localStorage.setItem(this.key, JSON.stringify(d)); } catch (e) { /* 無痕模式等情況存不了就算了 */ } },
};

// ===== 小型特效工具 =====
G.shake = (a) => { G.shakeAmt = Math.min(14, Math.max(G.shakeAmt, a)); };
G.hitstop = (s) => { G.stopT = Math.max(G.stopT, s); };
G.addText = (x, y, str, color = '#fff', size = 12) => {
  if (G.texts.length > 80) G.texts.shift();
  G.texts.push({ x: x + G.U.rand(-6, 6), y, str: String(str), color, size, t: 0, life: 0.75 });
};
G.addPart = (o) => { if (G.parts.length < 700) G.parts.push(Object.assign({ t: 0, life: 0.5, vx: 0, vy: 0, size: 3, color: '#fff', drag: 0.9, glow: false, grav: 0 }, o)); };
G.burst = (x, y, color, n = 8, spd = 160, life = 0.45, size = 3, glow = false) => {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random() * 0.7);
    G.addPart({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.6), size: size * (0.6 + Math.random() * 0.8), color, glow });
  }
};
