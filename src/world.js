'use strict';
// ===== 世界：投射物、範圍效果、召喚物、拾取物、傷害與觸發系統 =====
(() => {
  const U = G.U;

  // ---------- 事件匯流排（刻印/裝備的觸發點）----------
  let procBudget = 0;
  G.resetProcBudget = () => { procBudget = 80; };
  G.canProc = (depth) => depth < 3 && procBudget-- > 0;
  G.emit = (ev, d) => {
    const p = G.player; if (!p) return;
    for (const id in p.sigils) { const s = G.SIGILS[id]; if (s && s[ev]) s[ev](d, p.sigils[id], p); }
    for (const id of p.relics) { const r = G.RELICS[id]; if (r && r[ev]) r[ev](d, p); }
  };

  // ---------- 碰撞 ----------
  G.collideWorld = (o, bounce = false) => {
    const A = G.ARENA;
    let hitWall = false;
    if (o.x < A.x1 + o.r) { o.x = A.x1 + o.r; hitWall = true; if (bounce) o.vx = Math.abs(o.vx); }
    if (o.x > A.x2 - o.r) { o.x = A.x2 - o.r; hitWall = true; if (bounce) o.vx = -Math.abs(o.vx); }
    if (o.y < A.y1 + o.r) { o.y = A.y1 + o.r; hitWall = true; if (bounce) o.vy = Math.abs(o.vy); }
    if (o.y > A.y2 - o.r) { o.y = A.y2 - o.r; hitWall = true; if (bounce) o.vy = -Math.abs(o.vy); }
    const obs = G.room ? G.room.obstacles : [];
    for (const b of obs) {
      const cx = U.clamp(o.x, b.x, b.x + b.w), cy = U.clamp(o.y, b.y, b.y + b.h);
      const dx = o.x - cx, dy = o.y - cy, d2 = dx * dx + dy * dy;
      if (d2 < o.r * o.r) {
        hitWall = true;
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2), push = o.r - d;
          o.x += dx / d * push; o.y += dy / d * push;
        } else {
          // 中心在方塊內：往最近的邊推出去
          const l = o.x - b.x, r = b.x + b.w - o.x, t = o.y - b.y, bt = b.y + b.h - o.y;
          const m = Math.min(l, r, t, bt);
          if (m === l) o.x = b.x - o.r; else if (m === r) o.x = b.x + b.w + o.r; else if (m === t) o.y = b.y - o.r; else o.y = b.y + b.h + o.r;
        }
      }
    }
    return hitWall;
  };
  G.pointBlocked = (x, y) => {
    const A = G.ARENA;
    if (x < A.x1 || x > A.x2 || y < A.y1 || y > A.y2) return true;
    for (const b of (G.room ? G.room.obstacles : [])) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
    return false;
  };

  // ---------- 查詢 ----------
  G.liveEnemies = () => G.enemies.filter((e) => !e.dead && !e.spawning);
  G.nearestEnemy = (x, y, maxD = 9999, exclude) => {
    let best = null, bd = maxD;
    for (const e of G.enemies) {
      if (e.dead || e.untargetable || (exclude && exclude.has(e))) continue;
      const d = Math.hypot(e.x - x, e.y - y) - e.r;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  };
  G.enemiesInRadius = (x, y, r) => G.enemies.filter((e) => !e.dead && !e.untargetable && Math.hypot(e.x - x, e.y - y) < r + e.r);

  // ---------- 狀態異常 ----------
  G.applyMark = (e, mk) => { if (!e.dead) e.mark = Object.assign({}, mk); };
  G.applyBurn = (e, dps, dur) => {
    if (e.dead) return;
    const b = e.st.burn;
    if (!b || b.t <= 0) e.st.burn = { dps, t: dur, tick: 0.5 };
    else { b.dps = Math.max(b.dps, dps) + dps * 0.25; b.t = Math.max(b.t, dur); }
  };
  G.applySlow = (e, amt, dur) => {
    if (e.dead) return;
    const s = e.st.slow;
    if (!s || s.t <= 0 || amt >= s.amt) e.st.slow = { amt, t: dur }; else s.t = Math.max(s.t, dur);
  };
  G.applyStun = (e, dur) => {
    if (e.dead) return;
    const d = e.boss ? dur * 0.25 : dur * (e.stunRes || 1);
    e.st.stun = Math.max(e.st.stun || 0, d);
  };

  // ---------- 對敵人造成傷害（所有玩家方傷害都走這裡）----------
  G.hitEnemy = (e, base, o = {}) => {
    if (!e || e.dead || e.untargetable) return 0;
    const p = G.player, s = p.stats, tags = o.tags || [];
    let dmg = base * s.dmgMul;
    if (tags.includes('burn')) dmg *= s.burnMul;
    if (tags.includes('summon')) dmg *= s.summonDmg;
    if (tags.includes('chain')) dmg *= s.chainMul;
    if (tags.includes('explosion')) dmg *= s.explodeMul;
    for (const id in p.sigils) { const sg = G.SIGILS[id]; if (sg.dmgMod) dmg *= sg.dmgMod(e, o, p.sigils[id], p); }
    let crit = false;
    if (!o.noCrit) {
      crit = !!o.crit || Math.random() < s.crit;
      if (crit) dmg *= s.critDmg;
    }
    if (e.armorMul) dmg *= e.armorMul;
    if (e.mark && e.mark.t > 0) dmg *= 1 + e.mark.bonus;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    if (!(e.flashCd > 0)) { e.flash = e.boss ? 0.05 : 0.07; e.flashCd = e.boss ? 0.2 : 0.12; }
    e.hurtT = 1.5;
    const dot = tags.includes('dot');
    G.addText(e.x, e.y - e.r - 4, dmg, crit ? '#ffd447' : dot ? '#ff9a4a' : '#f4f0ea', crit ? 17 : dot ? 10 : 13);
    if (o.kb) {
      const m = e.boss ? 0.05 : (e.kbRes != null ? e.kbRes : 1);
      e.kvx += Math.cos(o.kbAng) * o.kb * m; e.kvy += Math.sin(o.kbAng) * o.kb * m;
    }
    if (o.stun) G.applyStun(e, o.stun);
    if (o.burn) G.applyBurn(e, o.burn[0], o.burn[1]);
    if (o.slow) G.applySlow(e, o.slow[0], o.slow[1]);
    if (!dot) {
      G.audio.play(crit ? 'crit' : 'hit');
      const dir = o.kbAng != null ? o.kbAng : Math.atan2(e.y - p.y, e.x - p.x);
      G.fx.spark(e.x - Math.cos(dir) * e.r * 0.5, e.y - 4 - Math.sin(dir) * e.r * 0.5, crit ? G.ELEM.crit : G.elemOf(tags), crit, dir);
      if (crit) { G.hitstop(0.06); G.shake(2); }
    }
    if (s.lifeOnHit && !dot && Math.random() < s.lifeOnHit) G.healPlayer(1, true);
    if (!o.noProc && !dot) {
      const info = { e, dmg, tags, crit, depth: o.depth || 0, x: e.x, y: e.y, src: o.src };
      G.emit('onHit', info);
      if (crit) G.emit('onCrit', info);
    }
    if (e.hp <= 0) G.killEnemy(e, o);
    return dmg;
  };

  G.killEnemy = (e, o = {}) => {
    if (e.dead) return;
    e.dead = true;
    G.run.kills++;
    G.audio.play('die');
    const spr = G.SPR && G.SPR.enemies[e.type];
    if (spr) G.fx.shatter(spr[0], e.x, e.y - 4, e.elite ? 3 : 2, Math.cos(e.face || 0) < 0);
    else G.burst(e.x, e.y, e.color || '#888', e.boss ? 40 : 12, e.boss ? 320 : 180, 0.6, 3.5);
    if (e.boss) { G.fx.burst(e.x, e.y, '#ffe9a0', 40, 260, 0.8, 0, 3, true); G.fx.ring(e.x, e.y + e.r * 0.6, e.r * 3, '#ffe9a0', 0.6, 3, true); G.fx.light(e.x, e.y, 60, '#ffe9a0', 0.4); }
    else G.shake(1.5);
    if (!e.noLoot) {
      const g = Math.round((e.gold || 1) * G.player.stats.goldMul);
      G.dropGold(e.x, e.y, g);
    }
    const info = { e, x: e.x, y: e.y, depth: o.depth || 0, tags: o.tags || [], burning: e.st.burn && e.st.burn.t > 0 };
    G.emit('onKill', info);
    if (e.mark && e.mark.t > 0) {
      const m = e.mark; e.mark = null;
      G.areaBlast(e.x, e.y, m.r, m.boom, { tags: ['skill', 'explosion'], color: '#ff6ad0', depth: (o.depth || 0) + 1 });
      if (m.jumps > 0) {
        const nx = G.nearestEnemy(e.x, e.y, 280, new Set([e]));
        if (nx) { G.applyMark(nx, Object.assign({}, m, { jumps: m.jumps - 1, t: Math.max(m.t, 4) })); G.addArea({ team: 'fx', kind: 'zap', x: e.x, y: e.y, x2: nx.x, y2: nx.y, color: '#ff6ad0', visual: 'zap' }); }
      }
    }
    if (e.onDeath) e.onDeath(e);
    if (e.boss) G.onBossDefeated(e);
  };

  // ---------- 玩家受傷 / 治療 ----------
  G.hurtPlayer = (dmg, srcName) => {
    const p = G.player;
    if (!p || p.dead || p.dashT > 0 || p.iframes > 0 || G.state !== 'play' || (G.room && G.room.phase === 'cleared')) return false;
    let d = dmg * (1 - p.stats.armor);
    for (const id in p.sigils) { const sg = G.SIGILS[id]; if (sg.takenMod) d *= sg.takenMod(p.sigils[id], p); }
    d = Math.max(1, Math.round(d));
    p.hp -= d;
    p.iframes = 0.7;
    p.hurtFlash = 0.25;
    G.addText(p.x, p.y - 20, '-' + d, '#ff4a4a', 16);
    G.shake(7); G.hitstop(0.06);
    G.audio.play('hurt');
    G.burst(p.x, p.y, '#ff3b3b', 10, 170, 0.4, 3);
    G.run.damageTaken += d;
    G.emit('onHurt', { dmg: d });
    if (p.hp <= 0) {
      if (G.run.reviveAvail) {
        G.run.reviveAvail = false;
        p.hp = Math.round(p.maxHp * 0.5);
        p.iframes = 2.5;
        G.addText(p.x, p.y - 34, '時針倒轉！', '#ffd447', 20);
        G.areaBlast(p.x, p.y, 200, 40, { tags: ['explosion'], color: '#ffd447', kb: 400 });
        G.audio.play('win');
      } else {
        p.hp = 0; p.dead = true;
        G.onPlayerDeath();
      }
    }
    return true;
  };
  G.healPlayer = (n, quiet) => {
    const p = G.player; if (!p || p.dead) return;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + n);
    const got = Math.round(p.hp - before);
    if (got > 0 && !quiet) { G.addText(p.x, p.y - 22, '+' + got, '#6dff8a', 14); G.audio.play('heal'); G.fx.rise(p.x, p.y, '#6dff8a', 12, 12); }
  };
  G.addEnergy = (n) => { const p = G.player; if (!p) return; p.energy = Math.min(p.stats.maxEnergy, p.energy + n * p.stats.energyGain); };

  // ---------- 生成物件 ----------
  G.addProj = (o) => {
    const p = Object.assign({ r: 5, vx: 0, vy: 0, dmg: 5, team: 'player', life: 1, pierce: 0, bounce: 0, tags: [], color: '#ffb347', kind: 'bolt', t: 0, depth: 0 }, o);
    p.hit = new Set(o.hitSet || []);
    G.projs.push(p);
    return p;
  };
  G.addArea = (o) => {
    const a = Object.assign({ r: 50, team: 'player', delay: 0, dur: 0, tick: 0.5, dmg: 0, tags: [], color: '#ff8a3d', kind: 'circle', t: 0, fired: false, tickT: 0, depth: 0 }, o);
    a.hit = new Set();
    G.areas.push(a);
    return a;
  };
  G.addAlly = (o) => {
    const a = Object.assign({ t: 0, life: 5, r: 10 }, o);
    G.allies.push(a);
    return a;
  };

  // 玩家方的瞬間爆炸
  G.areaBlast = (x, y, r, dmg, o = {}) => {
    const targets = G.enemiesInRadius(x, y, r);
    for (const e of targets) {
      G.hitEnemy(e, dmg, Object.assign({ kb: o.kb || 180, kbAng: Math.atan2(e.y - y, e.x - x) }, o));
    }
    const col = o.color || '#ff8a3d';
    G.fx.burst(x, y, col, Math.min(30, 10 + Math.round(r / 5)), Math.min(260, r * 2.2), 0.45, 40, 2, true);
    G.fx.burst(x, y, '#ffffff', 4, 80, 0.15, 0, 3, true);
    G.fx.ring(x, y, r, col, 0.28, 3);
    G.fx.ring(x, y + 6, r * 0.8, col, 0.35, 2, true);
    G.fx.light(x, y, Math.min(70, r * 0.7), col, 0.2);
    G.shake(Math.min(8, r / 14));
    G.audio.play(r > 80 ? 'boom' : 'smallboom');
    return targets.length;
  };

  // 連鎖閃電
  G.chainLightning = (sx, sy, first, count, dmg, range, o = {}) => {
    const hit = new Set();
    let cur = first, px = sx, py = sy;
    for (let i = 0; i < count; i++) {
      if (!cur) cur = G.nearestEnemy(px, py, range, hit);
      if (!cur) break;
      hit.add(cur);
      G.fx.lightning([[px, py - 4], [cur.x, cur.y - 4]], '#ffe84a', 0.2);
      G.hitEnemy(cur, dmg, Object.assign({ tags: ['chain'] }, o, { depth: (o.depth || 0) + 1 }));
      if (o.slow) G.applySlow(cur, o.slow[0], o.slow[1]);
      px = cur.x; py = cur.y;
      cur = G.nearestEnemy(px, py, range, hit);
    }
    G.audio.play('zap');
  };

  // 影子突襲
  G.shadowStrike = (x, y, dmg, depth) => {
    G.addAlly({
      kind: 'shadow', x: x + U.rand(-30, 30), y: y + U.rand(-30, 30), life: 0.35, r: 10,
      tx: x, ty: y, dmg, depth, done: false,
      update(a) {
        if (!a.done && a.t > 0.12) {
          a.done = true;
          const ts = G.enemiesInRadius(a.tx, a.ty, 40);
          for (const e of ts) G.hitEnemy(e, a.dmg, { tags: ['shadow'], depth: a.depth + 1, kb: 60, kbAng: Math.atan2(e.y - a.y, e.x - a.x) });
          G.addArea({ team: 'fx', x: a.tx, y: a.ty, r: 40, color: '#b07cff', visual: 'slash', ang: Math.atan2(a.ty - a.y, a.tx - a.x) });
          G.emit('onShadow', { x: a.tx, y: a.ty, depth: a.depth });
        }
      },
    });
  };

  // ---------- 掉落物 ----------
  G.dropGold = (x, y, amount) => {
    let left = amount;
    while (left > 0) {
      const v = left >= 10 ? 5 : 1; left -= v;
      const a = Math.random() * Math.PI * 2, s = U.rand(40, 160);
      G.pickups.push({ kind: 'gold', v, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: v >= 5 ? 6 : 4, t: 0 });
    }
  };
  G.dropHeal = (x, y, v) => { G.pickups.push({ kind: 'heal', v, x, y, vx: 0, vy: 0, r: 8, t: 0 }); };

  // ---------- 更新 ----------
  G.updateProjs = (dt) => {
    const p = G.player;
    for (const pr of G.projs) {
      pr.t += dt;
      if (pr.update) pr.update(pr, dt);
      if (pr.homing) {
        const tgt = G.nearestEnemy(pr.x, pr.y, 260, pr.hit);
        if (tgt) {
          const cur = Math.atan2(pr.vy, pr.vx), want = Math.atan2(tgt.y - pr.y, tgt.x - pr.x);
          const na = cur + U.clamp(U.angDiff(cur, want), -pr.homing * dt, pr.homing * dt);
          const sp = Math.hypot(pr.vx, pr.vy);
          pr.vx = Math.cos(na) * sp; pr.vy = Math.sin(na) * sp;
        }
      }
      if (pr.accel) { pr.vx *= 1 + pr.accel * dt; pr.vy *= 1 + pr.accel * dt; }
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      pr.life -= dt;
      if (pr.team === 'player' && pr.kind !== 'grenade' && (pr.trailT = (pr.trailT || 0) + dt) > 0.025) {
        pr.trailT = 0;
        G.fx.add(pr.x, pr.y, -pr.vx * 0.05, -pr.vy * 0.05, 0.16, pr.color, pr.r > 6 ? 3 : 2, 0, 4, true);
      }
      if (pr.life <= 0) { G.endProj(pr); continue; }
      if (!pr.noWall && G.pointBlocked(pr.x, pr.y)) {
        if (pr.wallBounce > 0) {
          pr.wallBounce--;
          pr.x -= pr.vx * dt; pr.y -= pr.vy * dt;
          if (G.pointBlocked(pr.x + pr.vx * dt, pr.y)) pr.vx = -pr.vx; else pr.vy = -pr.vy;
        } else { G.endProj(pr); continue; }
      }
      if (pr.team === 'player') {
        for (const e of G.enemies) {
          if (e.dead || e.untargetable || pr.hit.has(e)) continue;
          if (Math.hypot(e.x - pr.x, e.y - pr.y) < e.r + pr.r) {
            pr.hit.add(e);
            const ang = Math.atan2(pr.vy, pr.vx);
            G.hitEnemy(e, pr.dmg, { tags: pr.tags, depth: pr.depth, kb: pr.kb || 40, kbAng: ang, crit: pr.crit, burn: pr.burn, slow: pr.slow, stun: pr.stun, src: pr });
            if (pr.onHitE) pr.onHitE(pr, e);
            if (pr.tags.includes('basic')) G.addEnergy(pr.energyOnHit || 4);
            if (pr.bounce > 0) {
              const nx = G.nearestEnemy(pr.x, pr.y, 260, pr.hit);
              if (nx) {
                pr.bounce--;
                const sp = Math.hypot(pr.vx, pr.vy), a = Math.atan2(nx.y - pr.y, nx.x - pr.x);
                pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp; pr.life = Math.max(pr.life, 0.5);
                continue;
              }
            }
            if (pr.pierce > 0) { pr.pierce--; continue; }
            G.endProj(pr, e);
            break;
          }
        }
      } else if (pr.team === 'enemy' && p && !p.dead) {
        if (Math.hypot(p.x - pr.x, p.y - pr.y) < p.r * 0.8 + pr.r) {
          if (G.hurtPlayer(pr.dmg)) G.endProj(pr);
        }
      }
    }
    G.projs = G.projs.filter((x) => !x.dead);
  };
  G.endProj = (pr, hitE) => {
    if (pr.dead) return;
    pr.dead = true;
    if (pr.onEnd) pr.onEnd(pr, hitE);
    if (pr.team === 'player') G.emit('onProjEnd', pr);
    if (pr.team === 'enemy' || pr.kind === 'bolt') G.burst(pr.x, pr.y, pr.color, 3, 80, 0.2, 2);
  };

  G.updateAreas = (dt) => {
    const p = G.player;
    for (const a of G.areas) {
      a.t += dt;
      if (a.follow) { a.x = a.follow.x; a.y = a.follow.y; }
      if (a.team === 'fx') { if (a.t > (a.fxLife || 0.3)) a.dead = true; continue; }
      if (!a.fired && a.t >= a.delay) {
        a.fired = true;
        if (a.onFire) a.onFire(a);
        if (a.kind !== 'ring') G.areaDamage(a);
        if (a.boom) { G.shake(a.boom); G.audio.play(a.r > 80 ? 'boom' : 'smallboom'); G.burst(a.x, a.y, a.color, 14, a.r * 2.5, 0.45, 3.5, true); }
      }
      if (a.fired && a.kind === 'ring') {
        // 擴散環：每個目標只會被打一次
        const k = U.clamp((a.t - a.delay) / a.expand, 0, 1);
        a.curR = a.r * k;
        if (a.team === 'player') {
          for (const e of G.enemies) {
            if (e.dead || a.hit.has(e)) continue;
            const d = Math.hypot(e.x - a.x, e.y - a.y);
            if (d < a.curR + e.r) { a.hit.add(e); a.onHitE ? a.onHitE(a, e) : G.hitEnemy(e, a.dmg, { tags: a.tags, depth: a.depth, kb: a.kb, kbAng: Math.atan2(e.y - a.y, e.x - a.x), slow: a.slow, stun: a.stun }); }
          }
        }
      }
      if (a.fired && a.dur > 0 && a.kind !== 'ring') {
        a.tickT += dt;
        if (a.tickT >= a.tick) { a.tickT -= a.tick; a.hit.clear(); G.areaDamage(a, true); }
      }
      const total = a.delay + Math.max(a.dur, a.kind === 'ring' ? a.expand : 0.22);
      if (a.t >= total) a.dead = true;
    }
    G.areas = G.areas.filter((x) => !x.dead);
  };
  G.areaContains = (a, x, y, r) => {
    if (a.kind === 'line') return U.segDist(x, y, a.x, a.y, a.x2, a.y2) < a.w / 2 + r;
    return Math.hypot(x - a.x, y - a.y) < a.r + r;
  };
  G.areaDamage = (a, isTick) => {
    if (a.team === 'enemy') {
      const p = G.player;
      if (p && !p.dead && a.dmg > 0 && G.areaContains(a, p.x, p.y, p.r * 0.7)) G.hurtPlayer(a.dmg);
    } else if (a.team === 'player') {
      for (const e of G.enemies) {
        if (e.dead || e.untargetable || a.hit.has(e)) continue;
        if (G.areaContains(a, e.x, e.y, e.r)) {
          a.hit.add(e);
          if (a.onHitE) { a.onHitE(a, e); continue; }
          const tags = isTick ? a.tickTags || a.tags : a.tags;
          G.hitEnemy(e, isTick ? (a.tickDmg != null ? a.tickDmg : a.dmg) : a.dmg, { tags, depth: a.depth, kb: isTick ? 0 : a.kb, kbAng: Math.atan2(e.y - a.y, e.x - a.x), burn: a.burn, slow: a.slow, stun: isTick ? 0 : a.stun, noCrit: isTick && a.tickNoCrit });
        }
      }
    }
  };

  G.updateAllies = (dt) => {
    for (const a of G.allies) {
      a.t += dt;
      if (a.update) a.update(a, dt);
      if (a.t >= a.life || a.dead) {
        if (!a.ended) { a.ended = true; if (a.onEnd) a.onEnd(a); if (a.summon) G.emit('onSummonEnd', a); }
        a.dead = true;
      }
    }
    G.allies = G.allies.filter((x) => !x.dead);
  };

  G.updatePickups = (dt) => {
    const p = G.player; if (!p) return;
    const cleared = G.room && G.room.phase !== 'combat';
    for (const k of G.pickups) {
      k.t += dt;
      const d = Math.hypot(p.x - k.x, p.y - k.y);
      if (k.t > 0.35 && (cleared || d < 110 * p.stats.magnet)) {
        const a = Math.atan2(p.y - k.y, p.x - k.x), sp = cleared ? 520 : 360;
        k.vx = U.lerp(k.vx, Math.cos(a) * sp, 0.15); k.vy = U.lerp(k.vy, Math.sin(a) * sp, 0.15);
      } else { k.vx *= 0.9; k.vy *= 0.9; }
      k.x += k.vx * dt; k.y += k.vy * dt;
      G.collideWorld(k);
      if (d < p.r + k.r + 4 && k.t > 0.25) {
        k.dead = true;
        if (k.kind === 'gold') { p.gold += k.v; G.run.goldEarned += k.v; G.audio.play('coin'); }
        else if (k.kind === 'heal') { G.healPlayer(k.v); G.burst(p.x, p.y, '#6dff8a', 10, 120, 0.5, 3, true); }
      }
    }
    G.pickups = G.pickups.filter((x) => !x.dead);
  };

  G.updateFx = (dt) => {
    for (const q of G.parts) {
      q.t += dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      const f = Math.pow(q.drag, dt * 60);
      q.vx *= f; q.vy *= f; q.vy += q.grav * dt;
    }
    G.parts = G.parts.filter((q) => q.t < q.life);
    for (const t of G.texts) { t.t += dt; t.y -= 28 * dt; }
    G.texts = G.texts.filter((t) => t.t < t.life);
  };
})();
