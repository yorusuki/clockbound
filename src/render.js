'use strict';
// ===== 繪圖 =====
(() => {
  const U = G.U;
  const R = G.render = {};
  let cv, ctx, dpr = 1;
  const TAU = Math.PI * 2;

  R.init = (canvas) => {
    cv = canvas; ctx = cv.getContext('2d');
    const fit = () => {
      const s = Math.min(window.innerWidth / G.W, window.innerHeight / G.H);
      cv.style.width = Math.floor(G.W * s) + 'px';
      cv.style.height = Math.floor(G.H * s) + 'px';
      dpr = Math.min(2, (window.devicePixelRatio || 1) * s);
      cv.width = Math.floor(G.W * dpr); cv.height = Math.floor(G.H * dpr);
      const ui = document.getElementById('ui');
      ui.style.width = cv.style.width; ui.style.height = cv.style.height;
      ui.style.fontSize = (s * 16) + 'px';
    };
    window.addEventListener('resize', fit); fit();
  };

  const gearShape = (g, x, y, r, color, rot = 0, teeth = 12) => {
    g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = color; g.globalAlpha = 0.35;
    g.beginPath();
    for (let i = 0; i < teeth * 2; i++) { const a = i * Math.PI / teeth, rr = i % 2 ? r : r * 0.84; g.lineTo(Math.cos(a - 0.08) * rr, Math.sin(a - 0.08) * rr); g.lineTo(Math.cos(a + 0.08) * rr, Math.sin(a + 0.08) * rr); }
    g.closePath(); g.arc(0, 0, r * 0.35, 0, Math.PI * 2, true); g.fill('evenodd');
    g.globalAlpha = 1; g.restore();
  };
  R.gearShape = gearShape;

  // ---------- 房間背景（預先畫好）----------
  R.makeRoomBg = (pal, obs) => {
    const c = document.createElement('canvas'); c.width = G.W * 2; c.height = G.H * 2;
    const g = c.getContext('2d'); g.scale(2, 2);
    const A = G.ARENA;
    g.fillStyle = pal.wall; g.fillRect(0, 0, G.W, G.H);
    // 地板
    g.fillStyle = pal.floor; g.fillRect(A.x1, A.y1, A.x2 - A.x1, A.y2 - A.y1);
    const ts = 37;
    for (let x = A.x1; x < A.x2; x += ts) for (let y = A.y1; y < A.y2; y += ts) {
      if (Math.random() < 0.55) { g.fillStyle = pal.floor2; g.fillRect(x + 1, y + 1, ts - 2, ts - 2); }
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, ts, ts);
    }
    // 齒輪浮雕
    for (let i = 0; i < 5; i++) gearShape(g, U.rand(A.x1 + 60, A.x2 - 60), U.rand(A.y1 + 60, A.y2 - 60), U.rand(30, 80), pal.gear || pal.floor2, Math.random() * 3);
    // 斑點與裂痕
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '120,110,100'},${U.rand(0.05, 0.15)})`;
      g.beginPath(); g.ellipse(U.rand(A.x1, A.x2), U.rand(A.y1, A.y2), U.rand(4, 30), U.rand(3, 14), Math.random() * 3, 0, TAU); g.fill();
    }
    for (let i = 0; i < 9; i++) {
      g.strokeStyle = pal.accent; g.globalAlpha = 0.35; g.lineWidth = U.rand(1, 2.5);
      let x = U.rand(A.x1, A.x2), y = U.rand(A.y1, A.y2);
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += U.rand(-24, 24); y += U.rand(-24, 24); g.lineTo(x, y); }
      g.stroke(); g.globalAlpha = 1;
    }
    // 牆內緣陰影
    const sh = g.createLinearGradient(0, A.y1, 0, A.y1 + 40);
    sh.addColorStop(0, 'rgba(0,0,0,0.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(A.x1, A.y1, A.x2 - A.x1, 40);
    // 磚牆
    g.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 4; y < A.y1 - 4; y += 16) for (let x = (y / 16 % 2) * 20; x < G.W; x += 40) g.fillRect(x + 2, y, 36, 12);
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3; g.strokeRect(A.x1, A.y1, A.x2 - A.x1, A.y2 - A.y1);
    // 障礙物
    for (const b of obs) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(b.x + 4, b.y + 8, b.w, b.h);
      g.fillStyle = pal.wall; g.fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(b.x, b.y, b.w, 6);
      g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 1; g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      g.fillStyle = pal.accent; g.globalAlpha = 0.5;
      g.fillRect(b.x + b.w * 0.3, b.y + b.h * 0.4, 3, b.h * 0.4); g.globalAlpha = 1;
    }
    return c;
  };

  // ---------- 工具 ----------
  const glow = (x, y, r, color, a = 0.5) => {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  };
  const circle = (x, y, r, fill, stroke, lw = 2) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } };
  const shadow = (x, y, r) => { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.8, r * 0.9, r * 0.35, 0, 0, TAU); ctx.fill(); };

  // ---------- 主繪製 ----------
  R.draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b0809'; ctx.fillRect(0, 0, G.W, G.H);
    if (!G.room || !G.player || (G.state !== 'play' && G.state !== 'pause' && G.state !== 'menu' && G.state !== 'dying' && G.state !== 'over')) { R.drawTitleBg(); return; }
    const sx = Math.round((Math.random() - 0.5) * G.shakeAmt), sy = Math.round((Math.random() - 0.5) * G.shakeAmt);
    ctx.save(); ctx.translate(sx, sy);
    ctx.drawImage(G.room.bg, 0, 0, G.W, G.H);
    drawDoors();
    for (const a of G.areas) if (a.team !== 'fx') drawArea(a);
    drawSpawns();
    drawNpcs();
    for (const k of G.pickups) drawPickup(k);
    for (const a of G.allies) drawAlly(a, true);
    const ents = [...G.enemies, G.player].sort((a, b) => a.y - b.y);
    for (const e of ents) { if (e === G.player) drawPlayer(); else drawEnemy(e); }
    for (const a of G.allies) drawAlly(a, false);
    for (const e of G.enemies) drawTele(e);
    for (const pr of G.projs) drawProj(pr);
    for (const a of G.areas) if (a.team === 'fx') drawFx(a);
    drawParts();
    G.fx.draw(ctx);
    G.fx.drawLight(ctx);
    drawLight();
    for (const t of G.texts) {
      const k = t.t / t.life;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `bold ${t.size}px "Noto Sans TC", sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    R.drawHud();
    if (G.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${G.fade})`; ctx.fillRect(0, 0, G.W, G.H); }
  };

  // 標題 / 營地背景：停在 11:59 的大鐘
  const titleParts = [];
  R.drawTitleBg = () => {
    const gr = ctx.createRadialGradient(480, 160, 20, 480, 300, 640);
    gr.addColorStop(0, '#2a2440'); gr.addColorStop(0.5, '#120f1c'); gr.addColorStop(1, '#07060b');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, G.W, G.H);
    // 停住的星星
    for (let i = 0; i < 60; i++) { const x = (i * 157) % G.W, y = (i * 71) % 300; ctx.globalAlpha = 0.3 + (i % 5) * 0.12; ctx.fillStyle = '#e8e0ff'; ctx.fillRect(x, y, 1.5, 1.5); }
    ctx.globalAlpha = 1;
    // 飄浮的時之砂
    if (titleParts.length < 110) titleParts.push({ x: Math.random() * G.W, y: G.H + 10, vy: U.rand(-15, -45), vx: U.rand(-8, 8), s: U.rand(1, 2.6), a: U.rand(0.3, 1) });
    for (const q of titleParts) {
      q.x += q.vx / 60 + Math.sin(G.time + q.y * 0.01) * 0.3; q.y += q.vy / 60;
      if (q.y < -10) { q.y = G.H + 10; q.x = Math.random() * G.W; }
      ctx.globalAlpha = q.a; ctx.fillStyle = q.s > 2 ? '#ffe3a0' : '#d4a84a'; ctx.fillRect(q.x, q.y, q.s, q.s);
    }
    ctx.globalAlpha = 1;
    // 城市剪影與大鐘塔
    ctx.fillStyle = '#0a0810';
    ctx.beginPath(); ctx.moveTo(0, 540);
    const roofs = [[0, 440], [70, 420], [120, 450], [190, 400], [260, 430], [330, 390], [640, 400], [700, 430], [770, 395], [840, 440], [900, 415], [960, 430]];
    for (const [x, y] of roofs) { ctx.lineTo(x, y); ctx.lineTo(x + 40, y - 18); ctx.lineTo(x + 70, y); }
    ctx.lineTo(960, 540); ctx.fill();
    ctx.fillRect(720, 170, 140, 380);
    ctx.beginPath(); ctx.moveTo(710, 175); ctx.lineTo(790, 70); ctx.lineTo(870, 175); ctx.fill();
    // 鐘面：停在 11:59
    const cx = 790, cy = 245;
    glow(cx, cy, 120, '#d4a84a', 0.25);
    circle(cx, cy, 54, '#e8dcc0', '#8a6a3a', 6);
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 43, cy + Math.sin(a) * 43); ctx.lineTo(cx + Math.cos(a) * 50, cy + Math.sin(a) * 50); ctx.stroke(); }
    const hand = (a, len, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); ctx.stroke(); };
    const shiver = Math.sin(G.time * 30) * 0.004;
    hand(-Math.PI / 2 - Math.PI / 30 + shiver, 42, 2.5);
    hand(-Math.PI / 2 - 0.02, 30, 4.5);
    circle(cx, cy, 4, '#3a2a1a');
    // 窗
    ctx.fillStyle = '#d4a84a'; ctx.globalAlpha = 0.5;
    for (const [x, y] of [[745, 340], [815, 340], [745, 410], [815, 410]]) ctx.fillRect(x, y, 16, 26);
    ctx.globalAlpha = 1;
  };

  // ---------- 門 ----------
  const drawDoors = () => {
    const room = G.room;
    for (const d of room.doors) {
      const T = G.ROOM_TYPES[d.type === 'combat' ? d.reward : d.type] || G.ROOM_TYPES.next;
      const x = d.x, y = G.ARENA.y1;
      ctx.fillStyle = '#050304';
      ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.lineTo(x - 28, y - 30); ctx.arc(x, y - 30, 28, Math.PI, 0); ctx.lineTo(x + 28, y); ctx.fill();
      glow(x, y - 20, 50 * d.open, T.color, 0.45 + Math.sin(G.time * 4) * 0.1);
      ctx.strokeStyle = T.color; ctx.lineWidth = 2; ctx.globalAlpha = d.open;
      ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.lineTo(x - 28, y - 30); ctx.arc(x, y - 30, 28, Math.PI, 0); ctx.lineTo(x + 28, y); ctx.stroke();
      ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(T.icon, x, y - 32);
      ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 11px "Noto Sans TC", sans-serif'; ctx.fillStyle = T.color;
      let label = d.type === 'elite' ? '精英戰' : d.type === 'combat' ? T.label : T.label;
      ctx.fillText(label, x, y + 14);
      ctx.globalAlpha = 1;
    }
    if (room.doorsOpen && room.doors.length && G.player.y > G.ARENA.y1 + 120 && room.t > 1) {
      ctx.globalAlpha = 0.5 + Math.sin(G.time * 5) * 0.3; ctx.fillStyle = '#ffd9a0';
      ctx.font = '12px "Noto Sans TC", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('▲ 往上走進門選擇下一個房間', 480, G.ARENA.y1 + 34); ctx.globalAlpha = 1;
    }
  };

  const drawSpawns = () => {
    for (const s of G.room.spawnQ) {
      const k = 1 - s.t / 0.75;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(G.time * 4);
      ctx.strokeStyle = s.elite ? '#ffd447' : '#a05ad9'; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 18 * k + i * 4, i * 2, i * 2 + 2.2); ctx.stroke(); }
      ctx.restore(); ctx.globalAlpha = 1;
      glow(s.x, s.y, 30, '#6a2a9a', 0.5 * k);
    }
  };

  const drawNpcs = () => {
    for (const n of G.npcs) {
      const bob = Math.sin(G.time * 3) * 3;
      shadow(n.x, n.y, 16);
      if (n.kind === 'reward') {
        const T = G.ROOM_TYPES[n.reward] || G.ROOM_TYPES.sigil;
        glow(n.x, n.y + bob, 50, T.color, 0.6);
        ctx.save(); ctx.translate(n.x, n.y + bob); ctx.rotate(G.time * 1.5);
        ctx.fillStyle = T.color; ctx.globalAlpha = 0.9;
        ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 9 : 17; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill();
        ctx.restore(); ctx.globalAlpha = 1;
        ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(T.icon, n.x, n.y + bob); ctx.textBaseline = 'alphabetic';
        label(n.x, n.y - 30, '觸碰領取' + T.label, T.color);
      } else if (n.kind === 'shop') {
        circle(n.x, n.y, 20, '#3a2a4a', '#c9a0ff');
        ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.moveTo(n.x - 22, n.y - 8); ctx.lineTo(n.x, n.y - 38); ctx.lineTo(n.x + 22, n.y - 8); ctx.fill();
        circle(n.x - 6, n.y - 4, 2.5, '#ffd447'); circle(n.x + 6, n.y - 4, 2.5, '#ffd447');
        label(n.x, n.y - 46, '商人（觸碰交易）', '#c9a0ff');
      } else if (n.kind === 'fountain') {
        circle(n.x, n.y, 24, '#2a3a44', '#6dd8ff', 3);
        glow(n.x, n.y, 40, '#6dd8ff', n.used ? 0.1 : 0.5);
        circle(n.x, n.y, 15, n.used ? '#24323a' : '#4ab8e0');
        label(n.x, n.y - 36, n.used ? '泉水已乾涸' : '泉水（觸碰回復 45% 生命）', '#6dd8ff');
      } else if (n.kind === 'event') {
        ctx.fillStyle = '#3a3036'; ctx.fillRect(n.x - 16, n.y - 30, 32, 44);
        ctx.fillStyle = '#4a3e44'; ctx.fillRect(n.x - 16, n.y - 30, 32, 6);
        glow(n.x, n.y - 10, 40, '#9fd8ff', n.used ? 0.05 : 0.4);
        ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(G.room.event.icon, n.x, n.y - 2);
        label(n.x, n.y - 40, n.used ? G.room.event.name : G.room.event.name + '（觸碰查看）', '#9fd8ff');
      }
    }
  };
  const label = (x, y, s, color) => {
    ctx.font = 'bold 11px "Noto Sans TC", sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(s, x, y);
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  };

  const drawPickup = (k) => {
    if (k.kind === 'gold') {
      glow(k.x, k.y, 10, '#ffd447', 0.4);
      circle(k.x, k.y, k.r, '#ffcf3a', '#a87a10', 1.5);
    } else if (k.kind === 'heal') {
      glow(k.x, k.y, 22, '#6dff8a', 0.5);
      circle(k.x, k.y, k.r, '#3ad65a', '#c8ffd4', 2);
      ctx.fillStyle = '#fff'; ctx.fillRect(k.x - 1.5, k.y - 5, 3, 10); ctx.fillRect(k.x - 5, k.y - 1.5, 10, 3);
    }
  };

  // ---------- 玩家 ----------
  const WEAPON_OF = { erin: ['sword', 'greatsword'], mira: ['staff_fire', 'staff_frost'], toby: ['crossbow', 'heavybow'], grey: ['spear', 'halberd'], lise: ['pistol', 'shotgun'] };
  const drawWeaponSpr = (id, hx, hy, ang, flipY, ext, sc) => {
    const W = G.SPR.weapons[id]; if (!W) return;
    ctx.save();
    ctx.translate(Math.round(hx), Math.round(hy)); ctx.rotate(ang);
    if (flipY) ctx.scale(1, -1);
    ctx.drawImage(W.img, -W.grip[0] * sc + ext, -W.grip[1] * sc, W.img.width * sc, W.img.height * sc);
    ctx.restore();
  };
  const drawPlayer = () => {
    const p = G.player, C = G.CHARS[p.char], FR = G.SPR.chars[p.char];
    if (p.dead || !FR) return;
    const blink = p.iframes > 0 && p.dashT <= 0 && !(p.z > 0) && Math.floor(G.time * 20) % 2 === 0;
    shadow(p.x, p.y + 2, p.r * (p.z > 0 ? 0.7 : 1));
    const sc = G.SPR.SCALE, dir = Math.cos(p.aim) >= 0 ? 1 : -1;
    const pose = G.weaponPose(p);
    const moving = Math.hypot(p.vx, p.vy) > 30 && !p.anim;
    const fk = moving ? (Math.floor(p.walkT * 9) % 4) : 0;
    const frame = [FR.idle, FR.w1, FR.idle, FR.w2][fk];
    const bob = moving && fk % 2 === 0 ? -1 : 0;
    // 身體跟著動作前後移動
    const bx = p.x + Math.cos(p.aim) * pose.body, by = p.y + Math.sin(p.aim) * pose.body * 0.5 - (p.z || 0) + bob;
    const w = frame.width * sc, h = frame.height * sc;
    const left = Math.round(bx - w / 2), top = Math.round(by + 12 - h);
    // 手的世界座標
    const hx = bx + (dir > 0 ? (G.SPR.HAND[0] - frame.width / 2) : (frame.width / 2 - G.SPR.HAND[0])) * sc;
    const hy = top + G.SPR.HAND[1] * sc;
    const wid = WEAPON_OF[p.char][p.stance];
    const wang = p.aim + pose.off * dir;
    const weaponBehind = Math.sin(wang) < -0.2;
    const drawW = () => {
      if (p.char === 'lise' && p.stance === 0) {
        // 雙槍：兩手各一把，開槍的那把後座
        for (const sd of [-1, 1]) {
          const nx = Math.cos(p.aim + Math.PI / 2) * 5 * sd, ny = Math.sin(p.aim + Math.PI / 2) * 5 * sd;
          const fired = p.anim && p.anim.type === 'shoot' && p.anim.side === sd;
          drawWeaponSpr(wid, hx + nx - (dir > 0 ? 0 : 4 * sc), hy + ny, p.aim, dir < 0, fired ? pose.ext : 0, sc);
        }
      } else drawWeaponSpr(wid, hx, hy, wang, dir < 0, pose.ext, sc);
    };
    ctx.save();
    if (blink) ctx.globalAlpha = 0.45;
    if (p.spin) { ctx.translate(bx, by); ctx.rotate(p.spin); ctx.translate(-bx, -by); }
    if (weaponBehind) drawW();
    ctx.save();
    if (dir < 0) { ctx.translate(left + w, top); ctx.scale(-1, 1); ctx.drawImage(frame, 0, 0, w, h); }
    else ctx.drawImage(frame, left, top, w, h);
    ctx.restore();
    if (p.hurtFlash > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, p.hurtFlash * 5) * 0.8;
      const wf = FR[(fk === 1 ? 'w1' : fk === 3 ? 'w2' : 'idle') + '_w'];
      if (dir < 0) { ctx.translate(left + w, top); ctx.scale(-1, 1); ctx.drawImage(wf, 0, 0, w, h); } else ctx.drawImage(wf, left, top, w, h);
      ctx.restore();
    }
    if (!weaponBehind) drawW();
    // 法杖寶珠的微光
    if (p.char === 'mira') { const tx = hx + Math.cos(wang) * 18 * sc, ty = hy + Math.sin(wang) * 18 * sc; glow(tx, ty, 16, p.stance ? '#8ae0ff' : '#ff8a3a', 0.35); }
    ctx.restore();
    glow(p.x, p.y, 26, C.color, 0.14);
  };

  // ---------- 敵人 ----------
  const drawEnemy = (e) => {
    const a = e.alpha ?? 1;
    if (a <= 0.02) return;
    ctx.globalAlpha = a;
    shadow(e.x, e.y, e.r);
    const fl = e.flash > 0;
    const col = fl ? '#ffffff' : e.color;
    const x = e.x, y = e.y + (e.fly ? Math.sin(e.t * 4 + e.seed) * 3 - 6 : 0), r = e.r;
    if (e.elite) glow(x, y, r * 2, '#ffd447', 0.35);
    if (e.boss) glow(x, y, r * 2.2, e.enraged ? '#ff3b3b' : '#a03a2a', 0.4);
    if (e.fuse) { ctx.globalAlpha = 0.25 + e.fuse * 0.3; circle(e.x, e.y, 64, 'rgba(255,60,40,0.3)', '#ff5a3a'); ctx.globalAlpha = a; }
    const eyes = (ex, ey, s = 2, c = '#ff4a3a') => { circle(x + ex, y + ey, s, c); };
    const SP = !e.boss && G.SPR.enemies[e.type];
    if (SP) {
      const sc = e.elite ? 3 : 2, moving = e.state !== 'wind' && e.state !== 'aim' && e.state !== 'fuse' && !(e.st.stun > 0);
      const im = SP[moving && Math.floor(e.t * 7 + e.seed) % 2 ? 1 : 0];
      const w = im.width * sc, h = im.height * sc, flip = Math.cos(e.face || 0) < 0;
      let ox = 0;
      if (e.state === 'wind' || e.state === 'aim' || e.state === 'fuse') ox = Math.sin(e.t * 60) * 1.5;
      const left = Math.round(x - w / 2 + ox), top = Math.round(y + e.r * 0.9 - h);
      const drawIm = (img) => { ctx.save(); if (flip) { ctx.translate(left + w, top); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); } else ctx.drawImage(img, left, top, w, h); ctx.restore(); };
      drawIm(im);
      if (fl) drawIm(SP[2]);
      if (e.castFx > 0) glow(x, y - e.r, 30, '#6a8ad9', 0.7);
      if (e.type === 'brute' && e.state === 'dazed') { ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💫', x, top - 4); }
    } else switch (e.shape) {
      case 'rat':
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, r * 1.2, r * 0.85, e.face, 0, TAU); ctx.fill();
        circle(x + Math.cos(e.face) * r, y + Math.sin(e.face) * r, r * 0.5, col);
        eyes(Math.cos(e.face) * r * 1.1, Math.sin(e.face) * r * 1.1 - 2, 1.8);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - Math.cos(e.face) * r, y - Math.sin(e.face) * r); ctx.lineTo(x - Math.cos(e.face) * r * 2, y - Math.sin(e.face) * r * 2 + Math.sin(e.t * 10) * 3); ctx.stroke();
        break;
      case 'skull':
        circle(x, y, r, col, '#6a6250', 2);
        ctx.fillStyle = '#1a1412'; ctx.fillRect(x - 6, y - 4, 4, 5); ctx.fillRect(x + 2, y - 4, 4, 5); ctx.fillRect(x - 4, y + 4, 8, 2);
        eyes(-4, -2, 1.3); eyes(4, -2, 1.3);
        ctx.save(); ctx.translate(x, y); ctx.rotate(e.face); ctx.fillStyle = '#9a9488'; ctx.fillRect(r - 2, -2, 14, 4); ctx.restore();
        break;
      case 'hood':
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - r, y + r); ctx.quadraticCurveTo(x - r, y - r * 1.3, x, y - r * 1.5); ctx.quadraticCurveTo(x + r, y - r * 1.3, x + r, y + r); ctx.fill();
        circle(x, y - r * 0.3, r * 0.55, '#120a0e');
        eyes(-3, -r * 0.35, 1.8, e.type === 'priest' ? '#ffe36a' : '#ff4a3a'); eyes(3, -r * 0.35, 1.8, e.type === 'priest' ? '#ffe36a' : '#ff4a3a');
        if (e.castFx > 0) glow(x, y - r, 30, '#c05ad9', 0.7);
        break;
      case 'bug':
        circle(x, y, r, col, '#7a2a10', 2);
        glow(x, y, r * 1.5, '#ff6a2a', 0.4 + (e.fuse || 0) * 0.5);
        for (let i = -1; i <= 1; i += 2) { ctx.strokeStyle = '#3a1a0a'; ctx.beginPath(); ctx.moveTo(x - r, y + i * 4); ctx.lineTo(x - r - 5, y + i * 7 + Math.sin(e.t * 20) * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + r, y + i * 4); ctx.lineTo(x + r + 5, y + i * 7 - Math.sin(e.t * 20) * 2); ctx.stroke(); }
        eyes(-3, -3, 1.8, '#ffe36a'); eyes(3, -3, 1.8, '#ffe36a');
        break;
      case 'brute':
        ctx.fillStyle = col; ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - r, y + r * 0.3, r * 2, r * 0.7);
        ctx.fillStyle = '#2a2a30'; ctx.fillRect(x - r * 0.7, y - r * 0.5, r * 1.4, r * 0.4);
        eyes(-5, -r * 0.3, 2, e.state === 'charge' ? '#ffd447' : '#ff4a3a'); eyes(5, -r * 0.3, 2, e.state === 'charge' ? '#ffd447' : '#ff4a3a');
        if (e.state === 'dazed') { ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💫', x, y - r - 6); }
        break;
      case 'wisp':
        glow(x, y, r * 2.4, col, 0.6);
        circle(x, y, r, col);
        circle(x, y, r * 0.5, '#e0fffb');
        break;
      case 'colossus': {
        ctx.save(); ctx.translate(x, y); ctx.rotate(e.t * (e.enraged ? 0.9 : 0.4));
        ctx.fillStyle = col; ctx.beginPath();
        for (let i = 0; i < 24; i++) { const an = i * TAU / 24, rr = i % 2 ? r : r * 0.82; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
        ctx.fill(); ctx.restore();
        circle(x, y, r * 0.62, fl ? '#fff' : '#4a3422', '#b87333', 3);
        ctx.fillStyle = '#2a1a10'; ctx.fillRect(x - r * 0.45, y - 6, r * 0.9, 12);
        eyes(-10, 0, 4, e.enraged ? '#ff3a2a' : '#ffb030'); eyes(10, 0, 4, e.enraged ? '#ff3a2a' : '#ffb030');
        ctx.strokeStyle = '#b87333'; ctx.lineWidth = 3;
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sd * r * 0.6, y + r * 0.5); ctx.lineTo(x + sd * r * 1.15, y + r * 0.9); ctx.stroke(); }
        break; }
      case 'raven': {
        const flap = Math.sin(e.t * 9) * 0.4;
        ctx.fillStyle = col;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * r * 1.8, y - r * (0.8 + flap), x + s * r * 2.4, y + r * 0.3); ctx.quadraticCurveTo(x + s * r * 1.2, y + r * 0.2, x, y + r * 0.5); ctx.fill(); }
        circle(x, y, r * 0.8, fl ? '#fff' : '#2a2640');
        ctx.fillStyle = '#d6c060'; ctx.beginPath(); ctx.moveTo(x - 4, y - 2); ctx.lineTo(x, y + 10); ctx.lineTo(x + 4, y - 2); ctx.fill();
        eyes(-6, -6, 2.5, '#c9b8ff'); eyes(6, -6, 2.5, '#c9b8ff');
        ctx.fillStyle = '#d6c060'; for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * 6 - 1.5, y - r * 0.9 - 6, 3, 7);
        break; }
      case 'witch': {
        // 背後巨大的鐘面
        ctx.globalAlpha = a * 0.55; circle(x, y - 8, r * 2.1, 'rgba(232,220,192,0.12)', '#c9a04a', 2);
        ctx.strokeStyle = '#c9a04a'; ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) { const an = i * TAU / 12; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r * 1.8, y - 8 + Math.sin(an) * r * 1.8); ctx.lineTo(x + Math.cos(an) * r * 2.05, y - 8 + Math.sin(an) * r * 2.05); ctx.stroke(); }
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + Math.cos(-Math.PI / 2 - 0.1) * r * 1.7, y - 8 + Math.sin(-Math.PI / 2 - 0.1) * r * 1.7); ctx.stroke();
        ctx.globalAlpha = a;
        ctx.fillStyle = fl ? '#fff' : '#2a2030';
        ctx.beginPath(); ctx.moveTo(x - r, y + r); ctx.quadraticCurveTo(x - r * 0.8, y - r * 0.2, x, y - r * 0.4); ctx.quadraticCurveTo(x + r * 0.8, y - r * 0.2, x + r, y + r); ctx.fill();
        ctx.fillStyle = col; ctx.fillRect(x - r * 0.7, y + r * 0.2, r * 1.4, 3);
        circle(x, y - r * 0.6, r * 0.45, '#e8d6c8');
        ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.4); ctx.quadraticCurveTo(x, y + r * 0.3, x + r * 0.4, y - r * 0.4); ctx.fill();
        circle(x - 4, y - r * 0.65, 3.2, null, '#c9a04a', 1.5); circle(x + 4, y - r * 0.65, 3.2, null, '#c9a04a', 1.5);
        eyes(-4, -r * 0.65, 1.3, '#4a2a1a'); eyes(4, -r * 0.65, 1.3, '#4a2a1a');
        glow(x, y, r * 2.5, '#d4a84a', 0.2 + Math.sin(e.t * 6) * 0.08);
        break; }
      default: circle(x, y, r, col);
    }
    ctx.globalAlpha = 1;
    // 狀態
    if (e.mark && e.mark.t > 0) { ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🃏', x, y - r - 12 + Math.sin(G.time * 6) * 2); glow(x, y, r * 1.8, '#ff6ad0', 0.3); }
    if (e.st.burn && e.st.burn.t > 0) glow(x, y, r * 1.4, '#ff6a2a', 0.3);
    if (e.st.slow && e.st.slow.t > 0) { ctx.globalAlpha = 0.5; circle(x, y, r + 2, null, '#8fd3ff', 2); ctx.globalAlpha = 1; }
    if (e.st.stun > 0 && !e.boss) { ctx.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const an = e.t * 6 + i * 2.1; ctx.fillRect(x + Math.cos(an) * r - 1.5, y - r - 6 + Math.sin(an) * 3, 3, 3); } }
    // 血條
    if (!e.boss && e.hp < e.maxHp) {
      const w = Math.max(20, r * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2, y - r - 9, w, 4);
      ctx.fillStyle = e.elite ? '#ffd447' : '#e04a4a'; ctx.fillRect(x - w / 2, y - r - 9, w * Math.max(0, e.hp / e.maxHp), 4);
    }
  };

  const drawTele = (e) => {
    if (!e.tele || e.dead) return;
    const t = e.tele;
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(t.a);
    ctx.globalAlpha = 0.25 + Math.sin(G.time * 20) * 0.1;
    ctx.fillStyle = '#ff3b4a'; ctx.fillRect(0, -t.w / 2, t.len, t.w);
    ctx.globalAlpha = 0.7; ctx.strokeStyle = '#ff6a6a'; ctx.lineWidth = 1; ctx.strokeRect(0, -t.w / 2, t.len, t.w);
    ctx.restore(); ctx.globalAlpha = 1;
  };

  // ---------- 範圍 ----------
  const drawArea = (a) => {
    if (a.kind === 'line') {
      const k = a.fired ? 1 : a.t / a.delay;
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.atan2(a.y2 - a.y, a.x2 - a.x));
      const len = Math.hypot(a.x2 - a.x, a.y2 - a.y);
      if (!a.fired) {
        ctx.fillStyle = a.color; ctx.globalAlpha = 0.15; ctx.fillRect(0, -a.w / 2, len, a.w);
        ctx.globalAlpha = 0.4; ctx.fillRect(0, -a.w / 2, len * k, a.w);
      } else {
        const f = 1 - (a.t - a.delay) / 0.22;
        ctx.globalAlpha = Math.max(0, f); ctx.fillStyle = '#ffcf9a'; ctx.fillRect(0, -a.w / 2, len, a.w);
      }
      ctx.restore(); ctx.globalAlpha = 1;
      return;
    }
    if (a.kind === 'ring') {
      if (!a.fired) return;
      const k = U.clamp((a.t - a.delay) / a.expand, 0, 1);
      ctx.globalAlpha = 1 - k * 0.7; circle(a.x, a.y, a.r * k, null, a.color, 6 * (1 - k) + 2);
      ctx.globalAlpha = (1 - k) * 0.2; circle(a.x, a.y, a.r * k, a.color);
      ctx.globalAlpha = 1;
      return;
    }
    if (!a.fired) {
      // 預警
      const k = a.delay > 0 ? a.t / a.delay : 1;
      if (a.visual === 'meteor') {
        ctx.globalAlpha = 0.25; circle(a.x, a.y, a.r, '#ff6a2a33', '#ff8a3d', 2);
        ctx.globalAlpha = 0.35; circle(a.x, a.y, a.r * k, '#ff6a2a');
        ctx.globalAlpha = 1;
        const my = a.y - 300 * (1 - k);
        glow(a.x, my, 30, '#ffb347', 0.9); circle(a.x, my, 9, '#fff1c0');
      } else if (a.team === 'enemy') {
        ctx.globalAlpha = 0.18; circle(a.x, a.y, a.r, a.color);
        ctx.globalAlpha = 0.6; circle(a.x, a.y, a.r, null, a.color, 2);
        ctx.globalAlpha = 0.35; circle(a.x, a.y, a.r * k, a.color);
      } else {
        ctx.globalAlpha = 0.3; circle(a.x, a.y, a.r * 0.4 + a.r * 0.6 * k, a.color);
      }
      ctx.globalAlpha = 1;
      return;
    }
    const since = a.t - a.delay;
    if (a.dur > 0) {
      // 持續的地面（火焰等）
      const life = 1 - since / a.dur;
      ctx.globalAlpha = Math.min(1, life * 3) * 0.3;
      circle(a.x, a.y, a.r, a.color);
      ctx.globalAlpha = 1;
      if (Math.random() < 0.25 * (a.r / 30)) G.addPart({ x: a.x + U.rand(-a.r, a.r) * 0.8, y: a.y + U.rand(-a.r, a.r) * 0.8, vy: -40, life: 0.5, size: 3, color: '#ff8a3d', glow: true });
    }
    if (since < 0.22) {
      const k = since / 0.22;
      ctx.globalAlpha = 1 - k;
      circle(a.x, a.y, a.r * (0.7 + 0.3 * k), a.team === 'enemy' ? '#ff9a7a' : '#ffcf8a');
      ctx.globalAlpha = 1;
    }
  };

  const drawFx = (a) => {
    const life = a.fxLife || 0.3, k = a.t / life;
    if (a.visual === 'swing') {
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.ang);
      ctx.globalAlpha = 1 - k;
      const s = a.flip ? -1 : 1;
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(0, 0, a.r, -a.half * s, a.half * s * (k * 2 - 1), s < 0);
      ctx.arc(0, 0, a.r * 0.55, a.half * s * (k * 2 - 1), -a.half * s, s > 0);
      ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    } else if (a.visual === 'blast') {
      ctx.globalAlpha = (1 - k) * 0.7; circle(a.x, a.y, a.r * (0.5 + k * 0.5), null, a.color, 4 * (1 - k) + 1);
      ctx.globalAlpha = (1 - k) * 0.35; circle(a.x, a.y, a.r * (0.5 + k * 0.5), a.color);
      ctx.globalAlpha = 1;
    } else if (a.visual === 'zap') {
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = a.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(a.x, a.y);
      const n = 6;
      for (let i = 1; i < n; i++) ctx.lineTo(U.lerp(a.x, a.x2, i / n) + U.rand(-8, 8), U.lerp(a.y, a.y2, i / n) + U.rand(-8, 8));
      ctx.lineTo(a.x2, a.y2); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (a.visual === 'thrust') {
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.ang); ctx.globalAlpha = 1 - k;
      ctx.fillStyle = a.color; ctx.beginPath(); ctx.moveTo(10, -10); ctx.lineTo(a.len * (0.6 + 0.4 * k), 0); ctx.lineTo(10, 10); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    } else if (a.visual === 'land') {
      ctx.globalAlpha = 0.25 + k * 0.3; circle(a.x, a.y, a.r, 'rgba(192,224,160,0.15)', a.color, 2);
      circle(a.x, a.y, a.r * k, 'rgba(192,224,160,0.25)'); ctx.globalAlpha = 1;
    } else if (a.visual === 'slash') {
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.ang); ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = a.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-a.r, -a.r * 0.4); ctx.lineTo(a.r, a.r * 0.4); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    }
  };

  // ---------- 召喚物 ----------
  const drawAlly = (a, ground) => {
    const p = G.player;
    if (ground) {
      if (a.kind === 'mine') {
        const armed = a.t >= a.arm;
        circle(a.x, a.y, a.mini ? 5 : 7, '#3a3a40', armed ? '#ff4a3a' : '#777', 2);
        if (armed && Math.floor(G.time * 4 + a.x) % 2 === 0) glow(a.x, a.y, 12, '#ff3b3b', 0.8);
      }
      return;
    }
    switch (a.kind) {
      case 'whirl': {
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.t * 28);
        for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffe9d0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, a.r * 0.85, 0, 1.2); ctx.stroke(); }
        ctx.restore(); ctx.globalAlpha = 0.12; circle(a.x, a.y, a.r, '#ffe9d0'); ctx.globalAlpha = 1;
        break; }
      case 'orbit': case 'embers': {
        const R2 = a.kind === 'orbit' ? a.R : 46, sz = a.kind === 'orbit' ? 7 : 5;
        for (let i = 0; i < a.n; i++) {
          const oa = a.ang + i * TAU / a.n, ox = a.x + Math.cos(oa) * R2, oy = a.y + Math.sin(oa) * R2;
          glow(ox, oy, sz * 3, '#ff9a3d', 0.7); circle(ox, oy, sz, '#ffe08a');
        }
        break; }
      case 'turret': {
        shadow(a.x, a.y, 12);
        circle(a.x, a.y, 12, '#3a4a58', '#9fb8c9', 2);
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.aim); ctx.fillStyle = '#c9d6e0'; ctx.fillRect(0, -3, 16, 6); ctx.restore();
        circle(a.x, a.y, 5, '#ffd27a');
        const k = 1 - a.t / a.life; ctx.fillStyle = '#9fd8ff'; ctx.fillRect(a.x - 12, a.y + 16, 24 * k, 3);
        break; }
      case 'coil': {
        shadow(a.x, a.y, 10);
        ctx.fillStyle = '#3a4a58'; ctx.fillRect(a.x - 7, a.y - 22, 14, 26);
        ctx.strokeStyle = '#c9a04a'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(a.x - 8, a.y - 18 + i * 6); ctx.lineTo(a.x + 8, a.y - 15 + i * 6); ctx.stroke(); }
        glow(a.x, a.y - 22, 18, '#9fd8ff', 0.6 + Math.sin(G.time * 15) * 0.2); circle(a.x, a.y - 22, 5, '#e0f4ff');
        break; }
      case 'drone': {
        glow(a.x, a.y, a.r * 1.6, '#9fd8ff', 0.25);
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.spin);
        ctx.fillStyle = '#c9d6e0'; ctx.beginPath();
        for (let i = 0; i < 12; i++) { const an = i * TAU / 12, rr = i % 2 ? a.r * 0.7 : a.r; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
        ctx.fill(); circle(0, 0, a.r * 0.3, '#3a4a58'); ctx.restore();
        break; }
      case 'shadow': {
        ctx.globalAlpha = 1 - a.t / a.life;
        const k = Math.min(1, a.t / 0.12), x = U.lerp(a.x, a.tx, k), y = U.lerp(a.y, a.ty, k);
        circle(x, y, 10, '#3a2060'); circle(x - 3, y - 2, 1.5, '#e0c0ff'); circle(x + 3, y - 2, 1.5, '#e0c0ff');
        ctx.globalAlpha = 1;
        break; }
      case 'clone': {
        ctx.globalAlpha = 0.5 + Math.sin(a.t * 30) * 0.2; circle(a.x, a.y, 12, '#7d55c7'); ctx.globalAlpha = 1;
        break; }
    }
  };

  // ---------- 投射物 ----------
  const drawProj = (pr) => {
    const a = Math.atan2(pr.vy, pr.vx);
    if (pr.team === 'enemy') {
      if (pr.kind === 'feather') {
        ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(a);
        ctx.fillStyle = pr.color; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-8, -4); ctx.lineTo(-4, 0); ctx.lineTo(-8, 4); ctx.fill();
        ctx.restore();
      } else {
        glow(pr.x, pr.y, pr.r * 2.4, pr.color, 0.45);
        circle(pr.x, pr.y, pr.r, pr.color); circle(pr.x, pr.y, pr.r * 0.45, '#fff2f0');
      }
      return;
    }
    switch (pr.kind) {
      case 'wave': {
        ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(a);
        ctx.globalAlpha = Math.min(1, pr.life * 5);
        ctx.fillStyle = pr.color; ctx.beginPath(); ctx.arc(-14, 0, pr.r + 6, -1.2, 1.2); ctx.arc(-24, 0, pr.r, 1.0, -1.0, true); ctx.fill();
        ctx.restore(); ctx.globalAlpha = 1;
        break; }
      case 'fireball':
        glow(pr.x, pr.y, pr.r * 3, '#ff6a2a', 0.6); circle(pr.x, pr.y, pr.r, '#ffb347'); circle(pr.x, pr.y, pr.r * 0.5, '#fff1c0');
        if (Math.random() < 0.7) G.addPart({ x: pr.x, y: pr.y, vx: U.rand(-30, 30), vy: U.rand(-30, 30), life: 0.3, size: 4, color: '#ff7a2a', glow: true });
        break;
      case 'spear':
        ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(a);
        ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.fillStyle = pr.color; ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(20, 0); ctx.lineTo(8, 5); ctx.fill();
        ctx.restore();
        break;
      case 'grenade':
        shadow(pr.x, pr.y, 5);
        circle(pr.x, pr.y, pr.r, '#5a3a5a', pr.color, 2);
        if (Math.floor(G.time * 12) % 2) glow(pr.x, pr.y, 12, '#ff3b8a', 0.8);
        break;
      case 'shard':
        ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(a);
        glow(0, 0, 12, pr.color, 0.5);
        ctx.fillStyle = '#e0f6ff'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(0, -4); ctx.lineTo(-8, 0); ctx.lineTo(0, 4); ctx.fill();
        ctx.restore();
        break;
      case 'arrow':
        ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(a);
        ctx.strokeStyle = pr.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(6, 0); ctx.stroke();
        ctx.fillStyle = '#d0d8e0'; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(3, -3); ctx.lineTo(3, 3); ctx.fill();
        ctx.restore();
        break;
      default:
        glow(pr.x, pr.y, pr.r * 2.6, pr.color, 0.55);
        ctx.strokeStyle = pr.color; ctx.lineWidth = pr.r * 1.3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pr.x - pr.vx * 0.02, pr.y - pr.vy * 0.02); ctx.lineTo(pr.x, pr.y); ctx.stroke(); ctx.lineCap = 'butt';
        circle(pr.x, pr.y, pr.r * 0.6, '#fff4d0');
    }
  };

  const drawParts = () => {
    for (const q of G.parts) {
      const k = q.t / q.life;
      ctx.globalAlpha = (1 - k) * (q.ghost ? 0.35 : 1);
      if (q.glow) { ctx.globalCompositeOperation = 'lighter'; }
      ctx.fillStyle = q.color;
      const s = q.size * (q.ghost ? 1 : 1 - k * 0.5);
      if (q.ghost) { circle(q.x, q.y, s, q.color); } else ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  };

  // 環境光：玩家周圍明亮，邊緣暗
  let ambient = [];
  const drawLight = () => {
    const p = G.player;
    const gr = ctx.createRadialGradient(p.x, p.y, 120, p.x, p.y, 620);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = gr; ctx.fillRect(-20, -20, G.W + 40, G.H + 40);
    // 飄浮的時之砂
    if (ambient.length < 40) ambient.push({ x: Math.random() * G.W, y: G.H + 5, v: U.rand(10, 30), s: U.rand(1, 2.5) });
    ctx.globalCompositeOperation = 'lighter';
    for (const q of ambient) {
      q.y -= q.v / 60; q.x += Math.sin(G.time + q.v) * 0.2;
      if (q.y < 0) { q.y = G.H + 5; q.x = Math.random() * G.W; }
      ctx.fillStyle = 'rgba(230,190,110,0.45)'; ctx.fillRect(q.x, q.y, q.s, q.s);
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  // ---------- HUD ----------
  const bar = (x, y, w, h, k, col, bg = 'rgba(0,0,0,0.6)') => {
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = col; ctx.fillRect(x, y, w * U.clamp(k, 0, 1), h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  };
  R.drawHud = () => {
    const p = G.player, r = G.run;
    ctx.textBaseline = 'middle';
    // 左上：生命、發條
    bar(14, 12, 220, 16, p.hp / p.maxHp, p.hp / p.maxHp < 0.3 ? '#ff3b3b' : '#d8404a');
    ctx.font = 'bold 11px "Noto Sans TC", sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    ctx.fillText(`生命 ${Math.ceil(p.hp)} / ${p.maxHp}`, 20, 20.5);
    bar(14, 32, 180, 10, p.energy / p.stats.maxEnergy, p.noEnergyT > 0 ? '#ff5a5a' : '#ffa53a');
    ctx.font = '10px "Noto Sans TC", sans-serif'; ctx.fillText(`發條 ${Math.floor(p.energy)}`, 200, 37);
    ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
    ctx.fillStyle = '#ffd447'; ctx.fillText(`🪙 ${p.gold}`, 14, 56);
    ctx.fillStyle = '#e8c870'; ctx.fillText(`⏳ ${r.crystals}`, 84, 56);
    if (p.forcedCrits > 0) { ctx.fillStyle = '#ffd447'; ctx.fillText(`必爆 ×${p.forcedCrits}`, 150, 56); }
    // 中上：樓層
    ctx.textAlign = 'center'; ctx.fillStyle = '#e8d8c8'; ctx.font = 'bold 13px "Noto Sans TC", sans-serif';
    ctx.fillText(`第 ${r.floor} 層・${G.FLOORS[r.floor - 1].name}`, 480, 16);
    ctx.font = '11px "Noto Sans TC", sans-serif'; ctx.fillStyle = '#a89888';
    const rt = G.ROOM_TYPES[G.room.type === 'combat' ? G.room.reward : G.room.type];
    let roomInfo = `房間 ${r.num}/7`;
    if (G.room.phase === 'combat' && G.room.type !== 'boss') roomInfo += `・波次 ${Math.max(1, G.room.waveIdx + 1)}/${G.room.waves.length}`;
    ctx.fillText(roomInfo + (rt ? `・${rt.label}` : ''), 480, 32);
    // 首領血條
    const b = G.room.boss;
    if (b && !b.dead) {
      bar(230, 44, 500, 12, b.hp / b.maxHp, b.enraged ? '#ff3b3b' : '#b83a3a');
      ctx.font = 'bold 12px "Noto Sans TC", sans-serif'; ctx.fillStyle = '#ffd9c0'; ctx.fillText(b.name, 480, 50.5);
    }
    // 右上：刻印
    const ids = Object.keys(p.sigils);
    ctx.textAlign = 'center';
    ids.forEach((id, i) => {
      const s = G.SIGILS[id], x = G.W - 22 - (i % 10) * 26, y = 18 + Math.floor(i / 10) * 26;
      ctx.fillStyle = s.rarity === 'epic' ? 'rgba(160,80,255,0.35)' : s.rarity === 'rare' ? 'rgba(80,140,255,0.3)' : 'rgba(255,255,255,0.12)';
      ctx.fillRect(x - 12, y - 12, 24, 24);
      ctx.font = '14px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(s.icon, x, y);
      if (p.sigils[id] > 1) { ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#ffd447'; ctx.fillText(p.sigils[id], x + 9, y + 8); }
    });
    // 下方：技能欄
    const slots = [['Q', p.slots[0]], ['E', p.slots[1]]];
    slots.forEach(([key, sl], i) => {
      const x = 410 + i * 70, y = 492;
      ctx.fillStyle = 'rgba(10,6,8,0.8)'; ctx.fillRect(x, y, 48, 42);
      ctx.strokeStyle = sl ? '#a8885a' : '#3a3030'; ctx.lineWidth = 2; ctx.strokeRect(x, y, 48, 42);
      if (sl) {
        const S = G.SKILLS[sl.id], cost = G.skillCost(sl), ready = sl.cd <= 0 && p.energy >= cost;
        ctx.globalAlpha = ready ? 1 : 0.4;
        ctx.font = '22px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(S.icon, x + 24, y + 20);
        ctx.globalAlpha = 1;
        if (sl.cd > 0) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; const k = sl.cd / (S.cd * (1 - p.stats.cdr)); ctx.fillRect(x, y + 42 * (1 - k), 48, 42 * k); }
        ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = p.energy >= cost ? '#ffa53a' : '#ff5a5a'; ctx.fillText(cost, x + 38, y + 35);
      }
      ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#e8d8c8'; ctx.fillText(key === 'Q' ? 'Q/右鍵' : 'E', x + 24, y - 6);
    });
    // 姿態
    {
      const C = G.CHARS[p.char], stc = C.stances[p.stance], x = 334, y = 492;
      ctx.fillStyle = 'rgba(10,6,8,0.8)'; ctx.fillRect(x, y, 62, 42);
      ctx.strokeStyle = p.switchCd > 0 ? '#5a4a3a' : C.color; ctx.lineWidth = 2; ctx.strokeRect(x, y, 62, 42);
      ctx.textAlign = 'center'; ctx.font = '18px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(stc.icon, x + 31, y + 16);
      ctx.font = 'bold 10px "Noto Sans TC", sans-serif'; ctx.fillStyle = '#ffe9d0'; ctx.fillText(stc.name, x + 31, y + 34);
      ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#e8d8c8'; ctx.fillText('R 切換', x + 31, y - 6);
    }
    // 閃避
    for (let i = 0; i < p.stats.dashMax; i++) {
      const x = 560 + i * 14, y = 513;
      circle(x, y, 5, i < p.dashCharges ? '#9fd8ff' : 'rgba(255,255,255,0.15)');
    }
    ctx.font = '9px sans-serif'; ctx.fillStyle = '#a89888'; ctx.textAlign = 'left'; ctx.fillText('空白鍵閃避', 553, 528);
    ctx.textBaseline = 'alphabetic';
    // 準心
    const I = G.input;
    ctx.strokeStyle = 'rgba(255,220,180,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(I.mx, I.my, 7, 0, TAU); ctx.moveTo(I.mx - 11, I.my); ctx.lineTo(I.mx - 4, I.my); ctx.moveTo(I.mx + 4, I.my); ctx.lineTo(I.mx + 11, I.my);
    ctx.moveTo(I.mx, I.my - 11); ctx.lineTo(I.mx, I.my - 4); ctx.moveTo(I.mx, I.my + 4); ctx.lineTo(I.mx, I.my + 11); ctx.stroke();
  };
})();
