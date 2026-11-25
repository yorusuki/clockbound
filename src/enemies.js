'use strict';
// ===== 敵人與首領 =====
(() => {
  const U = G.U;
  const HP_M = [1, 1.8, 2.8], DMG_M = [1, 1.3, 1.6];

  const toP = (e) => Math.atan2(G.player.y - e.y, G.player.x - e.x);
  const dP = (e) => Math.hypot(G.player.x - e.x, G.player.y - e.y);
  const spdOf = (e) => e.spd * (e.st.slow && e.st.slow.t > 0 ? 1 - e.st.slow.amt : 1) * (e.enraged ? 1.25 : 1);
  const step = (e, a, sp, dt) => { e.x += Math.cos(a) * sp * dt; e.y += Math.sin(a) * sp * dt; e.face = a; };
  G.eShoot = (x, y, a, sp, dmg, o = {}) => G.addProj(Object.assign({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6, dmg, team: 'enemy', life: 5, color: '#ff5a6a', kind: 'ebullet' }, o));
  G.eArea = (o) => G.addArea(Object.assign({ team: 'enemy', color: '#ff3b4a', visual: 'warn', boom: 2 }, o));
  const ring = (e, n, sp, dmg, off = 0, o) => { for (let i = 0; i < n; i++) G.eShoot(e.x, e.y, off + i * Math.PI * 2 / n, sp, dmg, o); };
  // 保持距離移動
  const kite = (e, dt, near, far) => {
    const d = dP(e), a = toP(e), sp = spdOf(e);
    if (d < near) step(e, a + Math.PI, sp, dt);
    else if (d > far) step(e, a, sp, dt);
    else { e.strafe = e.strafe || (Math.random() < 0.5 ? 1 : -1); step(e, a + e.strafe * Math.PI / 2, sp * 0.6, dt); if (Math.random() < dt * 0.5) e.strafe *= -1; }
    e.face = a;
  };

  G.ENEMIES = {
    rat: { name: '發條鼠', hp: 16, r: 9, spd: 128, dmg: 7, gold: 1, color: '#b0946a', cost: 1, shape: 'rat',
      ai(e, dt) { step(e, toP(e) + Math.sin(e.t * 5 + e.seed) * 0.45, spdOf(e), dt); } },
    skeleton: { name: '停擺衛兵', hp: 34, r: 13, spd: 72, dmg: 10, gold: 2, color: '#b8bcc8', cost: 2, shape: 'skull',
      ai(e, dt) {
        if (e.state === 'move') {
          step(e, toP(e), spdOf(e), dt);
          if (dP(e) < 85 && e.timer <= 0) { e.state = 'wind'; e.timer = 0.55; e.lockA = toP(e); }
        } else if (e.state === 'wind') {
          e.tele = { kind: 'line', a: e.lockA, len: 90, w: 26 };
          if (e.timer <= 0) { e.state = 'lunge'; e.timer = 0.22; e.tele = null; }
        } else if (e.state === 'lunge') {
          step(e, e.lockA, 360, dt);
          if (e.timer <= 0) { e.state = 'move'; e.timer = 0.9; }
        }
      } },
    archer: { name: '鐘樓弩手', hp: 22, r: 11, spd: 86, dmg: 8, gold: 2, color: '#86b062', cost: 2, shape: 'hood',
      ai(e, dt) {
        if (e.state === 'aim') {
          e.tele = { kind: 'line', a: toP(e), len: 380, w: 3 };
          if (e.timer <= 0) { G.eShoot(e.x, e.y, toP(e), 250, e.dmg); e.state = 'move'; e.timer = U.rand(1.6, 2.3); e.tele = null; G.audio.play('shoot'); }
          return;
        }
        kite(e, dt, 190, 300);
        if (e.timer <= 0) { e.state = 'aim'; e.timer = 0.5; }
      } },
    bomber: { name: '火藥甲蟲', hp: 12, r: 10, spd: 155, dmg: 16, gold: 1, color: '#e0702e', cost: 1.5, shape: 'bug',
      ai(e, dt) {
        if (e.state === 'fuse') {
          e.fuse = 1 - e.timer / 0.6;
          if (e.timer <= 0) { G.eArea({ x: e.x, y: e.y, r: 64, dmg: e.dmg, delay: 0, boom: 5, color: '#ff6a2a' }); G.burst(e.x, e.y, '#ff8a3d', 18, 260, 0.5, 4, true); e.noLoot = false; G.killEnemy(e); }
          return;
        }
        step(e, toP(e), spdOf(e), dt);
        if (dP(e) < 48) { e.state = 'fuse'; e.timer = 0.6; e.contact = false; }
      } },
    caster: { name: '齒輪術士', hp: 28, r: 12, spd: 62, dmg: 12, gold: 3, color: '#6a8ad9', cost: 3, shape: 'hood',
      ai(e, dt) {
        kite(e, dt, 220, 330);
        if (e.timer <= 0) {
          e.timer = U.rand(2.8, 3.6);
          const p = G.player;
          for (let i = 0; i < 3; i++) {
            const a = Math.random() * Math.PI * 2, d = i === 0 ? 0 : U.rand(40, 90);
            G.eArea({ x: p.x + Math.cos(a) * d + p.vx * 0.3, y: p.y + Math.sin(a) * d + p.vy * 0.3, r: 42, delay: 0.95, dmg: e.dmg, color: '#b05ad9' });
          }
          e.castFx = 0.4;
        }
      } },
    brute: { name: '重錘傀儡', hp: 95, r: 18, spd: 56, dmg: 16, gold: 4, color: '#7a808c', cost: 4, kbRes: 0.25, stunRes: 0.6, shape: 'brute',
      ai(e, dt) {
        if (e.state === 'move') {
          step(e, toP(e), spdOf(e), dt);
          if (dP(e) < 280 && e.timer <= 0) { e.state = 'aim'; e.timer = 0.75; }
        } else if (e.state === 'aim') {
          e.lockA = toP(e);
          e.tele = { kind: 'line', a: e.lockA, len: 330, w: e.r * 2 };
          if (e.timer <= 0) { e.state = 'charge'; e.timer = 0.85; e.tele = null; }
        } else if (e.state === 'charge') {
          step(e, e.lockA, 420, dt);
          if (G.collideWorld(e)) { e.state = 'dazed'; e.timer = 1.2; G.shake(4); G.audio.play('smallboom'); }
          else if (e.timer <= 0) { e.state = 'move'; e.timer = 2.5; }
        } else if (e.state === 'dazed') {
          if (e.timer <= 0) { e.state = 'move'; e.timer = 2.5; }
        }
      } },
    wisp: { name: '遊蕩鐘靈', hp: 22, r: 10, spd: 95, dmg: 8, gold: 3, color: '#5ad1c9', cost: 3, fly: true, shape: 'wisp',
      ai(e, dt) {
        const a = toP(e) + Math.PI / 2 * (e.seed > 3 ? 1 : -1), d = dP(e);
        step(e, d > 200 ? toP(e) : d < 140 ? toP(e) + Math.PI : a, spdOf(e), dt);
        if (e.timer <= 0) { e.timer = U.rand(2.6, 3.4); ring(e, 8, 150, e.dmg, Math.random(), { color: '#5ad1c9' }); }
      } },
    priest: { name: '調音師', hp: 42, r: 13, spd: 52, dmg: 9, gold: 4, color: '#d6c060', cost: 3.5, shape: 'hood',
      ai(e, dt) {
        kite(e, dt, 230, 330);
        e.healT = (e.healT ?? 3) - dt;
        if (e.healT <= 0) {
          e.healT = 4;
          for (const o of G.enemies) if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 230) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.25); G.burst(o.x, o.y, '#7dff9a', 6, 80, 0.5, 2.5, true); }
          G.addArea({ team: 'fx', x: e.x, y: e.y, r: 230, color: '#7dff9a', visual: 'blast', fxLife: 0.35 });
        }
        if (e.timer <= 0) { e.timer = 2.6; G.eShoot(e.x, e.y, toP(e), 130, e.dmg, { homingP: 1.6, r: 8, color: '#ffe36a', life: 4 }); }
      } },
  };

  // ---------------- 首領 ----------------
  G.BOSSES = {
    colossus: { name: '鏽鐵門衛', hp: 1500, r: 36, spd: 46, dmg: 14, color: '#7a5034', shape: 'colossus',
      attacks: ['slam', 'roots', 'summon', 'rush', 'roots'],
      run(e, dt, atk) {
        const ph2 = e.phase === 2;
        if (atk === 'slam') {
          if (e.at === 0) { G.eArea({ x: e.x, y: e.y, r: 125, delay: 0.9, dmg: 20, boom: 9, color: '#ff5a3a' }); G.audio.play('warn'); }
          if (e.at >= 0.9 && !e.f1) { e.f1 = true; ring(e, ph2 ? 26 : 16, 175, 11, Math.random(), { color: '#ff9a4a', r: 7 }); }
          return e.at > (ph2 ? 1.4 : 1.8);
        }
        if (atk === 'roots') {
          const vol = ph2 ? 3 : 2;
          for (let v = 0; v < vol; v++) {
            if (e.at >= v * 0.7 && !e['v' + v]) {
              e['v' + v] = true;
              const base = toP(e), n = ph2 ? 5 : 3;
              for (let i = 0; i < n; i++) {
                const a = base + (i - (n - 1) / 2) * 0.28;
                G.eArea({ kind: 'line', x: e.x, y: e.y, x2: e.x + Math.cos(a) * 560, y2: e.y + Math.sin(a) * 560, w: 30, r: 0, delay: 0.8, dmg: 16, color: '#c0603a', boom: 2 });
              }
              G.audio.play('warn');
            }
          }
          return e.at > vol * 0.7 + 0.9;
        }
        if (atk === 'summon') {
          if (e.at === 0) { const list = ph2 ? ['rat', 'rat', 'bomber', 'bomber'] : ['rat', 'rat', 'rat']; G.summonAround(e, list); }
          return e.at > 1.0;
        }
        if (atk === 'rush') {
          if (e.at < 0.65) { e.lockA = toP(e); e.tele = { kind: 'line', a: e.lockA, len: 420, w: e.r * 2 }; return false; }
          e.tele = null;
          step(e, e.lockA, 520, dt);
          if (G.collideWorld(e) || e.at > 1.35) { G.shake(6); return true; }
          return false;
        }
        return true;
      } },
    raven: { name: '機械夜鶯', hp: 2600, r: 26, spd: 120, dmg: 16, color: '#3a5a66', fly: true, shape: 'raven',
      attacks: ['swoop', 'fan', 'spiral', 'swoop', 'summon'],
      run(e, dt, atk) {
        const ph2 = e.phase === 2;
        if (atk === 'swoop') {
          const reps = ph2 ? 3 : 2, cyc = 1.05;
          const k = Math.floor(e.at / cyc), lt = e.at - k * cyc;
          if (k >= reps) { e.tele = null; return true; }
          if (lt < 0.55) { e.lockA = toP(e); e.tele = { kind: 'line', a: e.lockA, len: 700, w: e.r * 2 }; e.contact = false; }
          else { e.tele = null; e.contact = true; step(e, e.lockA, 760, dt); G.collideWorld(e); if (Math.random() < 0.5) G.addPart({ x: e.x, y: e.y, size: 10, life: 0.3, color: '#2a2640', ghost: true }); }
          return false;
        }
        if (atk === 'fan') {
          const vol = 3;
          for (let v = 0; v < vol; v++) if (e.at >= v * 0.38 && !e['v' + v]) {
            e['v' + v] = true;
            const n = ph2 ? 7 : 5, base = toP(e);
            for (let i = 0; i < n; i++) G.eShoot(e.x, e.y, base + (i - (n - 1) / 2) * 0.16, 270, 10, { color: '#c9b8ff', kind: 'feather' });
            G.audio.play('shoot');
          }
          kite(e, dt, 200, 320);
          return e.at > 1.6;
        }
        if (atk === 'spiral') {
          e.spT = (e.spT || 0) - dt;
          if (e.spT <= 0) {
            e.spT = 0.085;
            const arms = ph2 ? 3 : 2;
            for (let i = 0; i < arms; i++) G.eShoot(e.x, e.y, e.at * 2.2 + i * Math.PI * 2 / arms, 165, 9, { color: '#c9b8ff', kind: 'feather' });
          }
          return e.at > 2.4;
        }
        if (atk === 'summon') {
          if (e.at === 0) G.summonAround(e, ph2 ? ['wisp', 'wisp', 'wisp'] : ['wisp', 'wisp']);
          kite(e, dt, 220, 320);
          return e.at > 1.2;
        }
        return true;
      } },
    witch: { name: '停時者 奧斯瓦德', hp: 4000, r: 22, spd: 95, dmg: 16, color: '#c9a04a', fly: true, shape: 'witch',
      attacks: ['pillars', 'spiral', 'blink', 'summon', 'pillars', 'blink'],
      run(e, dt, atk) {
        const ph2 = e.phase === 2;
        if (atk === 'pillars') {
          const n = ph2 ? 10 : 6;
          const k = Math.floor(e.at / 0.22);
          if (k < n && !e['v' + k]) {
            e['v' + k] = true;
            const p = G.player;
            G.eArea({ x: p.x + p.vx * 0.35, y: p.y + p.vy * 0.35, r: 52, delay: 0.75, dmg: 18, color: '#ff4a2a', boom: 3 });
          }
          kite(e, dt, 220, 340);
          return e.at > n * 0.22 + 0.8;
        }
        if (atk === 'spiral') {
          e.spT = (e.spT || 0) - dt;
          if (e.spT <= 0) {
            e.spT = 0.1;
            for (let i = 0; i < 2; i++) G.eShoot(e.x, e.y, e.at * 1.9 + i * Math.PI, 170, 10, { color: '#ff6a4a' });
            if (ph2) for (let i = 0; i < 2; i++) G.eShoot(e.x, e.y, -e.at * 1.9 + i * Math.PI + 0.5, 150, 10, { color: '#ffb04a' });
          }
          return e.at > 2.6;
        }
        if (atk === 'blink') {
          if (e.at < 0.35) { e.alpha = 1 - e.at / 0.35; e.untargetable = true; return false; }
          if (!e.f1) {
            e.f1 = true;
            const A = G.ARENA, p = G.player;
            for (let i = 0; i < 30; i++) {
              const x = U.rand(A.x1 + 60, A.x2 - 60), y = U.rand(A.y1 + 60, A.y2 - 60);
              if (Math.hypot(x - p.x, y - p.y) > 240 && !G.pointBlocked(x, y)) { e.x = x; e.y = y; break; }
            }
          }
          if (e.at < 0.7) { e.alpha = (e.at - 0.35) / 0.35; return false; }
          e.alpha = 1; e.untargetable = false;
          if (!e.f2) { e.f2 = true; ring(e, 22, 190, 11, Math.random(), { color: '#ff6a4a' }); if (ph2) G.addAlly({ kind: 'timer', life: 0.3, onEnd() { if (!e.dead) ring(e, 22, 150, 11, 0.14, { color: '#ffb04a' }); } }); G.audio.play('boom'); }
          return e.at > 1.3;
        }
        if (atk === 'summon') {
          if (e.at === 0) {
            G.summonAround(e, ph2 ? ['caster', 'skeleton', 'brute'] : ['caster', 'skeleton', 'skeleton']);
            if (ph2) for (let i = 0; i < 4; i++) G.eShoot(e.x, e.y, i * Math.PI / 2 + 0.6, 110, 12, { homingP: 1.4, r: 9, color: '#ffd447', life: 5 });
          }
          kite(e, dt, 220, 340);
          return e.at > 1.3;
        }
        return true;
      } },
  };

  G.summonAround = (e, list) => {
    for (const t of list) {
      const a = Math.random() * Math.PI * 2, d = U.rand(70, 130);
      const A = G.ARENA;
      G.queueSpawn(t, U.clamp(e.x + Math.cos(a) * d, A.x1 + 30, A.x2 - 30), U.clamp(e.y + Math.sin(a) * d, A.y1 + 30, A.y2 - 30), false, true);
    }
  };

  // ---------------- 建立 ----------------
  G.makeEnemy = (type, x, y, elite, minion) => {
    const f = G.run.floor - 1;
    const T = G.ENEMIES[type];
    const e = {
      type, name: T.name, x, y, r: T.r, hp: T.hp * HP_M[f], spd: T.spd * U.rand(0.92, 1.08), dmg: Math.round(T.dmg * DMG_M[f]), gold: T.gold, color: T.color,
      contact: true, kbRes: T.kbRes ?? 1, stunRes: T.stunRes ?? 1, fly: !!T.fly, shape: T.shape,
      st: {}, kvx: 0, kvy: 0, flash: 0, hurtT: 0, state: 'move', timer: U.rand(0.6, 1.6), t: 0, face: 0, seed: Math.random() * 6.28, ai: T.ai,
    };
    if (minion) e.gold = 0;
    if (elite) {
      e.elite = true; e.hp *= 2.6; e.r = Math.round(e.r * 1.3); e.dmg = Math.round(e.dmg * 1.25); e.gold *= 4; e.kbRes *= 0.5; e.stunRes *= 0.6;
    }
    e.maxHp = e.hp;
    return e;
  };
  G.makeBoss = (id, x, y) => {
    const B = G.BOSSES[id];
    const e = {
      type: id, name: B.name, boss: true, x, y, r: B.r, hp: B.hp, maxHp: B.hp, spd: B.spd, dmg: B.dmg, color: B.color, gold: 0, noLoot: true,
      contact: true, kbRes: 0, fly: !!B.fly, shape: B.shape, st: {}, kvx: 0, kvy: 0, flash: 0, hurtT: 0, t: 0, face: Math.PI / 2, seed: 1,
      phase: 1, mode: 'idle', modeT: 1.2, atk: null, at: 0, atkIdx: 0, alpha: 1,
    };
    e.ai = (e, dt) => {
      if (e.phase === 1 && e.hp < e.maxHp * 0.5) {
        e.phase = 2; e.enraged = true;
        G.addText(e.x, e.y - 50, G.STORY.bosses[G.run.floor - 1].rage, '#ff4a4a', 22); G.shake(10); G.audio.play('boss');
        G.burst(e.x, e.y, '#ff3b3b', 30, 300, 0.7, 4, true);
      }
      if (e.mode === 'idle') {
        e.modeT -= dt;
        const d = dP(e);
        if (d > 160) step(e, toP(e), spdOf(e), dt); else e.face = toP(e);
        if (e.modeT <= 0) {
          e.atk = B.attacks[e.atkIdx % B.attacks.length]; e.atkIdx++;
          if (Math.random() < 0.3) e.atkIdx++;
          e.mode = 'attack'; e.at = 0;
          for (const k of ['f1', 'f2', 'v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9']) e[k] = false;
        }
      } else {
        const done = B.run(e, dt, e.atk);
        e.at += dt;
        if (done) { e.mode = 'idle'; e.modeT = e.phase === 2 ? U.rand(0.45, 0.8) : U.rand(0.8, 1.3); e.tele = null; e.contact = true; e.alpha = 1; e.untargetable = false; }
      }
    };
    return e;
  };

  // ---------------- 更新 ----------------
  G.updateEnemies = (dt) => {
    const p = G.player;
    for (const e of G.enemies) {
      if (e.dead) continue;
      e.t += dt; e.timer -= dt; e.flash -= dt; e.flashCd -= dt; e.hurtT -= dt;
      if (e.castFx) e.castFx -= dt;
      const st = e.st;
      if (st.burn && st.burn.t > 0) {
        st.burn.t -= dt; st.burn.tick -= dt;
        if (st.burn.tick <= 0) { st.burn.tick = 0.5; G.hitEnemy(e, st.burn.dps * 0.5, { tags: ['burn', 'dot'], noCrit: true }); if (Math.random() < 0.6) G.addPart({ x: e.x + U.rand(-6, 6), y: e.y - 4, vy: -50, life: 0.5, size: 3, color: '#ff8a3d', glow: true }); }
        if (e.dead) continue;
      }
      if (st.slow && st.slow.t > 0) st.slow.t -= dt;
      if (e.mark && e.mark.t > 0) e.mark.t -= dt;
      // 擊退
      e.x += e.kvx * dt; e.y += e.kvy * dt;
      const decay = Math.pow(0.0015, dt);
      e.kvx *= decay; e.kvy *= decay;
      if (st.stun > 0) { st.stun -= dt; e.tele = null; }
      else e.ai(e, dt);
      if (e.dead) continue;
      if (e.fly) { const A = G.ARENA; e.x = U.clamp(e.x, A.x1 + e.r, A.x2 - e.r); e.y = U.clamp(e.y, A.y1 + e.r, A.y2 - e.r); }
      else G.collideWorld(e);
      // 接觸傷害
      if (e.contact && !(st.stun > 0) && p && !p.dead && (e.alpha ?? 1) > 0.5) {
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r - 3) G.hurtPlayer(e.dmg);
      }
    }
    // 互相推開
    const es = G.enemies;
    for (let i = 0; i < es.length; i++) {
      const a = es[i]; if (a.dead) continue;
      for (let j = i + 1; j < es.length; j++) {
        const b = es[j]; if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 0.01) {
          const d = Math.sqrt(d2), push = (rr - d) / 2, nx = dx / d, ny = dy / d;
          const wa = a.boss ? 0 : b.boss ? 2 : 1, wb = b.boss ? 0 : a.boss ? 2 : 1;
          a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wb; b.y += ny * push * wb;
        }
      }
    }
    G.enemies = G.enemies.filter((e) => !e.dead);
  };

  // 敵方追蹤彈：在投射物更新前轉向
  G.updateEnemyHoming = (dt) => {
    const p = G.player; if (!p) return;
    for (const pr of G.projs) {
      if (pr.team !== 'enemy' || !pr.homingP) continue;
      const cur = Math.atan2(pr.vy, pr.vx), want = Math.atan2(p.y - pr.y, p.x - pr.x);
      const na = cur + U.clamp(U.angDiff(cur, want), -pr.homingP * dt, pr.homingP * dt), sp = Math.hypot(pr.vx, pr.vy);
      pr.vx = Math.cos(na) * sp; pr.vy = Math.sin(na) * sp;
    }
  };
})();
