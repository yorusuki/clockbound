'use strict';
// ===== 資料：角色、技能、刻印、裝備、局外成長、事件 =====
(() => {
  const U = G.U;
  const L = (s, k) => (s.ups && s.ups[k]) || 0;
  const aimPoint = (p, maxD) => {
    const a = Math.atan2(G.input.my - p.y, G.input.mx - p.x);
    const d = Math.min(maxD, Math.hypot(G.input.mx - p.x, G.input.my - p.y));
    let x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    // 往回找到不在牆裡的位置
    for (let i = 0; i < 20 && G.pointBlocked(x, y); i++) { x -= Math.cos(a) * 12; y -= Math.sin(a) * 12; }
    const A = G.ARENA;
    return { x: U.clamp(x, A.x1 + 14, A.x2 - 14), y: U.clamp(y, A.y1 + 14, A.y2 - 14), a };
  };
  G.aimPoint = aimPoint;

  // ---------------- 角色（每人兩種姿態，R 鍵或滑鼠中鍵切換）----------------
  G.CHARS = {
    erin: {
      id: 'erin', name: '艾琳', title: '前城衛隊長', weapon: '長劍', icon: '⚔️', color: '#d0565a', cloak: '#6e2630',
      hp: 110, speed: 178, skills: ['whirl', 'wave', 'shadowstep', 'cleave'], start: 'whirl',
      desc: '時間停止的那晚，她的整支小隊都在城牆上停擺了。只有她還能拔劍。',
      stances: [
        { name: '快劍', icon: '🗡️', desc: '三段連斬，第三擊擊退。移動不受影響。' },
        { name: '重劍', icon: '⚔️', desc: '兩段重擊，第二擊暈眩敵人。移速 -10%，受傷 -10%。', stat(s) { s.move -= 0.1; s.armor += 0.1; } },
      ],
    },
    mira: {
      id: 'mira', name: '米菈', title: '天文台見習生', weapon: '星晶法杖', icon: '🔮', color: '#e0a43a', cloak: '#3a2a5a',
      hp: 85, speed: 182, skills: ['fireball', 'orbit', 'meteor', 'frostnova'], start: 'fireball',
      desc: '她在望遠鏡裡看見星星也停住了。她想知道，讓整片天空停下的力量究竟是什麼。',
      stances: [
        { name: '熾焰', icon: '🔥', desc: '高速連射火彈，每第 5 發是會貫穿的大火彈。' },
        { name: '霜寒', icon: '❄️', desc: '射出貫穿的冰晶，會緩速敵人。暴擊率 +5%。', stat(s) { s.crit += 0.05; } },
      ],
    },
    toby: {
      id: 'toby', name: '托比', title: '鐘匠學徒', weapon: '機關十字弓', icon: '⚙️', color: '#4f9fc9', cloak: '#24465c',
      hp: 100, speed: 172, skills: ['turret', 'mines', 'tesla', 'saw'], start: 'turret', lockedBy: 'toby',
      desc: '讓時間停下的，是把他養大的師父。他得親手把師父的鐘重新上緊。',
      stances: [
        { name: '連弩', icon: '🏹', desc: '快速連射小弩箭，略有散布。' },
        { name: '重弩', icon: '🎯', desc: '慢速重箭，貫穿 2 個敵人並強力擊退。', stat(s) { s.summonRate += 0.1; } },
      ],
    },
    grey: {
      id: 'grey', name: '格雷', title: '流浪槍騎士', weapon: '長槍', icon: '🔱', color: '#8fbf6a', cloak: '#2e4a2a',
      hp: 125, speed: 168, skills: ['charge', 'javelin', 'spikering', 'leap'], start: 'charge', lockedBy: 'grey',
      desc: '他在午夜前一刻走進城門，然後城門就再也打不開了。他只想找到出去的路。',
      stances: [
        { name: '突刺', icon: '🔱', desc: '直線長距離突刺，打穿一整排敵人。' },
        { name: '橫掃', icon: '🌪️', desc: '大範圍橫掃，擊退周圍敵人。受傷 -8%。', stat(s) { s.armor += 0.08; } },
      ],
    },
    lise: {
      id: 'lise', name: '莉絲', title: '鐘塔怪盜', weapon: '雙槍', icon: '🔫', color: '#c96ad0', cloak: '#3a1e44',
      hp: 90, speed: 192, skills: ['roll', 'barrage', 'mark', 'grenade'], start: 'roll', lockedBy: 'lise',
      desc: '她收了錢要偷走大鐘的「時之心」。時間停了，委託人也停了。尾款大概是收不到了。',
      stances: [
        { name: '雙槍', icon: '🔫', desc: '左右交替快速射擊，射程較短。' },
        { name: '霰彈', icon: '💥', desc: '一次噴出 5 發彈丸，近距離威力大並擊退。', stat(s) { s.critDmg += 0.2; } },
      ],
    },
  };

  // ---------------- 普攻（每個角色兩種姿態）----------------
  const melee = (p, o) => {
    let n = 0;
    for (const e of G.enemies) {
      if (e.dead || e.untargetable) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d > o.range + e.r) continue;
      const da = Math.abs(U.angDiff(o.ang, Math.atan2(e.y - p.y, e.x - p.x)));
      if (da > o.half && d > e.r + 16) continue;
      G.hitEnemy(e, o.dmg, { tags: ['basic', 'melee'], kb: o.kb, kbAng: o.ang, crit: o.crit, stun: o.stun });
      n++;
    }
    return n;
  };
  const shot = (p, a, o) => {
    const q = Object.assign({ x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 14, vx: Math.cos(a) * o.sp, vy: Math.sin(a) * o.sp, bounce: p.stats.bounce, tags: ['basic', 'projectile'] }, o);
    q.pierce = (o.pierce || 0) + p.stats.pierce;
    return G.addProj(q);
  };
  // 近戰命中後的刀光：依動作方向畫弧
  const swingFx = (p, range, half, side, col, w, life) => {
    const sd = side * (Math.cos(p.aim) >= 0 ? 1 : -1);
    G.fx.slashArc(p.x, p.y - 4, range * 0.85, p.aim - half * sd, p.aim + half * sd, col, w, life);
  };
  const muzzle = (p, dist, col) => {
    const x = p.x + Math.cos(p.aim) * dist, y = p.y - 2 + Math.sin(p.aim) * dist;
    G.fx.light(x, y, 12, col, 0.08);
    G.fx.burst(x, y, col, 3, 90, 0.12, 0, 2, true, p.aim, 0.8);
  };
  G.BASICS = {
    erin: [
      (p, bonus, crit) => {
        const combo = p.combo % 3, fin = combo === 2, side = combo === 1 ? -1 : 1;
        G.playAnim(p, fin ? 'heavy' : 'slash', { side, dur: fin ? 0.36 : 0.22, strike() {
          const ang = p.aim, range = fin ? 70 : 62, half = fin ? 1.15 : 0.95;
          const n = melee(p, { dmg: [10, 10, 19][combo] * bonus, range, half, ang, kb: fin ? 300 : 90, crit });
          if (n > 0) { G.addEnergy(7 + 2 * (n - 1)); if (fin) { G.hitstop(0.04); G.shake(3); } }
          p.lunge = { t: 0.08, a: ang, s: fin ? 300 : 200 };
          swingFx(p, range, half, side, fin ? '#ffcf8a' : '#e8eef8', fin ? 4 : 3, fin ? 0.24 : 0.18);
          G.audio.play('swing');
        } });
        p.combo = (combo + 1) % 3;
        return fin ? 0.46 : 0.28;
      },
      (p, bonus, crit) => {
        const combo = p.combo % 2, side = combo ? -1 : 1;
        G.playAnim(p, 'heavy', { side, dur: combo ? 0.6 : 0.5, strike() {
          const ang = p.aim;
          const n = melee(p, { dmg: [24, 40][combo] * bonus, range: 82, half: 1.25, ang, kb: combo ? 430 : 240, stun: combo ? 0.55 : 0, crit });
          if (n > 0) { G.addEnergy(10 + 3 * (n - 1)); G.hitstop(combo ? 0.08 : 0.04); G.shake(combo ? 4 : 2); }
          p.lunge = { t: 0.1, a: ang, s: 260 };
          swingFx(p, 82, 1.25, side, '#ffb36a', 5, 0.26);
          if (combo) { G.fx.dust(p.x + Math.cos(ang) * 40, p.y + Math.sin(ang) * 40 + 6, 10); G.fx.ring(p.x + Math.cos(ang) * 40, p.y + Math.sin(ang) * 40 + 6, 46, '#ffcf8a', 0.3, 2, true); }
          G.audio.play('swing'); if (combo) G.audio.play('smallboom');
        } });
        p.combo = (combo + 1) % 2;
        return combo ? 0.8 : 0.6;
      },
    ],
    mira: [
      (p, bonus, crit) => {
        p.shotN = (p.shotN || 0) + 1;
        const big = p.shotN % 5 === 0;
        G.playAnim(p, 'cast', { dur: 0.18 });
        shot(p, p.aim, { sp: 590, r: big ? 8 : 5, dmg: (big ? 15 : 7) * bonus, life: 0.75, color: big ? '#ffd447' : '#ffb347', kind: 'ember', energyOnHit: 4, crit, pierce: big ? 1 : 0, tags: ['basic', 'projectile', 'fire'] });
        muzzle(p, 24, '#ff8a3a');
        G.audio.play('shoot');
        return 0.22;
      },
      (p, bonus, crit) => {
        G.playAnim(p, 'cast', { dur: 0.26 });
        shot(p, p.aim, { sp: 520, r: 6, dmg: 11 * bonus, life: 0.8, color: '#9fdcff', kind: 'shard', energyOnHit: 5, crit, pierce: 1, slow: [0.35, 1.5], tags: ['basic', 'projectile', 'frost'] });
        muzzle(p, 24, '#8ae0ff');
        G.audio.play('shoot');
        return 0.34;
      },
    ],
    toby: [
      (p, bonus, crit) => {
        G.playAnim(p, 'shoot', { dur: 0.12 });
        shot(p, p.aim + U.rand(-0.08, 0.08), { sp: 760, r: 3, dmg: 6 * bonus, life: 0.6, color: '#efe2bd', kind: 'arrow', energyOnHit: 3, crit, kb: 30 });
        muzzle(p, 22, '#f0f0f0');
        G.audio.play('bolt');
        return 0.17;
      },
      (p, bonus, crit) => {
        G.playAnim(p, 'blast', { dur: 0.3 });
        shot(p, p.aim, { sp: 860, r: 5, dmg: 24 * bonus, life: 0.75, color: '#ffe9a0', kind: 'arrow', energyOnHit: 8, crit, pierce: 2, kb: 160 });
        muzzle(p, 26, '#ffe9a0');
        G.audio.play('bolt'); G.shake(1.5);
        return 0.62;
      },
    ],
    grey: [
      (p, bonus, crit) => {
        G.playAnim(p, 'thrust', { dur: 0.24, strike() {
          const ang = p.aim, len = 100;
          let n = 0;
          for (const e of G.enemies) {
            if (e.dead || e.untargetable) continue;
            if (U.segDist(e.x, e.y, p.x, p.y, p.x + Math.cos(ang) * len, p.y + Math.sin(ang) * len) < 13 + e.r) {
              G.hitEnemy(e, 15 * bonus, { tags: ['basic', 'melee'], kb: 130, kbAng: ang, crit }); n++;
            }
          }
          if (n > 0) G.addEnergy(7 + 2 * (n - 1));
          p.lunge = { t: 0.07, a: ang, s: 240 };
          G.fx.streak(p.x + Math.cos(ang) * 20, p.y - 2 + Math.sin(ang) * 20, p.x + Math.cos(ang) * (len + 6), p.y - 2 + Math.sin(ang) * (len + 6), '#e0f0d0', 4, 0.13);
          G.audio.play('swing');
        } });
        return 0.38;
      },
      (p, bonus, crit) => {
        const side = (p.combo++ % 2) ? -1 : 1;
        G.playAnim(p, 'sweep', { side, dur: 0.36, strike() {
          const n = melee(p, { dmg: 12 * bonus, range: 76, half: 2.3, ang: p.aim, kb: 200, crit });
          if (n > 0) { G.addEnergy(5 + 2 * (n - 1)); G.shake(2); }
          swingFx(p, 82, 2.3, side, '#d0f0b0', 4, 0.24);
          G.audio.play('swing');
        } });
        return 0.5;
      },
    ],
    lise: [
      (p, bonus, crit) => {
        p.gunSide = -(p.gunSide || 1);
        G.playAnim(p, 'shoot', { side: p.gunSide, dur: 0.12 });
        const a = p.aim, ox = Math.cos(a + Math.PI / 2) * 6 * p.gunSide, oy = Math.sin(a + Math.PI / 2) * 6 * p.gunSide;
        const pr = shot(p, a + U.rand(-0.04, 0.04), { sp: 680, r: 4, dmg: 6 * bonus, life: 0.42, color: '#f0b0ff', kind: 'bolt', energyOnHit: 3, crit });
        pr.x += ox; pr.y += oy;
        G.fx.light(p.x + Math.cos(a) * 22 + ox, p.y - 2 + Math.sin(a) * 22 + oy, 10, '#ffd0f0', 0.06);
        G.audio.play('shoot');
        return 0.15;
      },
      (p, bonus, crit) => {
        G.playAnim(p, 'blast', { dur: 0.32, side: Math.cos(p.aim) >= 0 ? 1 : -1 });
        for (let i = 0; i < 5; i++) shot(p, p.aim + (i - 2) * 0.12 + U.rand(-0.03, 0.03), { sp: U.rand(500, 560), r: 4, dmg: 6.5 * bonus, life: 0.32, color: '#ffd0f0', kind: 'bolt', energyOnHit: 2, crit, kb: 110 });
        p.lunge = { t: 0.06, a: p.aim + Math.PI, s: 180 };
        muzzle(p, 28, '#ffd0f0'); G.fx.burst(p.x + Math.cos(p.aim) * 28, p.y + Math.sin(p.aim) * 28, '#c8c0b4', 6, 60, 0.4, -20, 3, false, p.aim, 1);
        G.audio.play('bolt'); G.shake(2.5);
        return 0.72;
      },
    ],
  };

  // ---------------- 通用：地雷 ----------------
  G.spawnMine = (x, y, o) => {
    G.addAlly({
      kind: 'mine', trap: true, x, y, r: 8, life: o.life || 14, arm: 0.45, dmg: o.dmg, br: o.br, cluster: o.cluster || 0, depth: o.depth || 0, mini: o.mini,
      update(a) {
        if (a.t < a.arm) return;
        for (const e of G.enemies) {
          if (e.dead || e.untargetable) continue;
          if (Math.hypot(e.x - a.x, e.y - a.y) < e.r + 22) { G.detonateMine(a, true); break; }
        }
      },
      onEnd(a) { if (!a.boomed) G.emit('onTrap', { x: a.x, y: a.y, trigger: false, depth: a.depth, mine: a }); },
    });
  };
  G.detonateMine = (a, trigger) => {
    if (a.boomed) return;
    a.boomed = true; a.dead = true; a.ended = true;
    G.areaBlast(a.x, a.y, a.br, a.dmg, { tags: ['summon', 'explosion', 'trap'], depth: a.depth, kb: 260 });
    if (a.cluster > 0) {
      for (let i = 0; i < 2; i++) {
        const ang = Math.random() * Math.PI * 2;
        G.spawnMine(a.x + Math.cos(ang) * 45, a.y + Math.sin(ang) * 45, { dmg: a.dmg * 0.5, br: a.br * 0.7, cluster: 0, life: 6, depth: a.depth + 1, mini: true });
      }
    }
    G.emit('onTrap', { x: a.x, y: a.y, trigger, depth: a.depth, mine: a });
  };

  // ---------------- 技能 ----------------
  // cast(p, slot, pow)：pow 為威力倍率（時間迴圈再施放時較低）
  G.SKILLS = {
    // ===== 艾琳 =====
    whirl: {
      name: '迴旋斬', icon: '🌀', cost: 30, cd: 1.0, char: 'erin',
      desc: '原地旋轉斬擊周圍敵人，旋轉時可移動。',
      ups: [
        { id: 'dmg', name: '鋒銳', desc: '傷害 +30%', max: 3 },
        { id: 'wide', name: '大迴旋', desc: '範圍 +25%', max: 2 },
        { id: 'long', name: '持續旋轉', desc: '多轉 2 圈', max: 2 },
        { id: 'vortex', name: '漩渦', desc: '旋轉時把敵人吸向自己', max: 1 },
        { id: 'flame', name: '火焰之環', desc: '結束時留下燃燒的火環', max: 1 },
      ],
      cast(p, s, pow) {
        const r = 88 * (1 + 0.25 * L(s, 'wide')), ticks = 3 + 2 * L(s, 'long');
        const dmg = 11 * (1 + 0.3 * L(s, 'dmg')) * pow;
        p.moveMulT = { t: ticks * 0.12 + 0.05, m: 0.75 };
        G.addAlly({
          kind: 'whirl', x: p.x, y: p.y, r, life: ticks * 0.12 + 0.06, tickT: 0, dmg, vortex: L(s, 'vortex'), flame: L(s, 'flame'),
          update(a, dt) {
            a.x = p.x; a.y = p.y;
            a.tickT -= dt;
            if (a.vortex) for (const e of G.enemiesInRadius(a.x, a.y, a.r + 60)) { const an = Math.atan2(a.y - e.y, a.x - e.x); if (!e.boss) { e.kvx += Math.cos(an) * 900 * dt * (e.kbRes ?? 1); e.kvy += Math.sin(an) * 900 * dt * (e.kbRes ?? 1); } }
            if (a.tickT <= 0) {
              a.tickT = 0.12;
              for (const e of G.enemiesInRadius(a.x, a.y, a.r)) G.hitEnemy(e, a.dmg, { tags: ['skill', 'melee'], kb: a.vortex ? 0 : 70, kbAng: Math.atan2(e.y - a.y, e.x - a.x) });
              G.audio.play('swing');
            }
          },
          onEnd(a) {
            if (a.flame) G.addArea({ x: a.x, y: a.y, r: a.r, dur: 3, tick: 0.4, dmg: 0, tickDmg: 4, tickTags: ['burn', 'dot', 'skill'], tickNoCrit: true, burn: [3, 2], color: '#ff6a2a', visual: 'fire' });
          },
        });
      },
    },
    wave: {
      name: '劍氣', icon: '🌙', cost: 25, cd: 0.55, char: 'erin',
      desc: '揮出貫穿所有敵人的新月劍氣。',
      ups: [
        { id: 'dmg', name: '鋒銳', desc: '傷害 +30%', max: 3 },
        { id: 'multi', name: '三連月', desc: '額外多 2 道劍氣（扇形）', max: 2 },
        { id: 'burst', name: '月爆', desc: '劍氣消失時爆炸', max: 1 },
        { id: 'ret', name: '迴月', desc: '劍氣會飛回來再打一次', max: 1 },
      ],
      cast(p, s, pow) {
        const n = 1 + 2 * L(s, 'multi'), dmg = 22 * (1 + 0.3 * L(s, 'dmg')) * pow;
        for (let i = 0; i < n; i++) {
          const a = p.aim + (i - (n - 1) / 2) * 0.22;
          G.addProj({
            x: p.x, y: p.y, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, r: 24, dmg, pierce: 999, life: 0.6, noWall: true,
            kind: 'wave', color: '#ffe0b0', tags: ['skill', 'projectile'], kb: 120, ret: L(s, 'ret'), burstL: L(s, 'burst'),
            update(pr) {
              if (pr.ret && !pr.back && pr.t > 0.42) { pr.back = true; pr.vx *= -1; pr.vy *= -1; pr.hit.clear(); pr.life = 0.5; }
            },
            onEnd(pr) { if (pr.burstL) G.areaBlast(pr.x, pr.y, 65, 16 * pow, { tags: ['skill', 'explosion'], color: '#ffe0b0' }); },
          });
        }
        G.fx.slashArc(p.x, p.y - 4, 50, p.aim - 1.2, p.aim + 1.2, '#ffe0b0', 5, 0.22);
        G.audio.play('swing');
      },
    },
    shadowstep: {
      name: '影步突襲', icon: '👤', cost: 20, cd: 1.1, char: 'erin',
      desc: '瞬移到游標方向並斬擊路徑上的敵人，接下來 2 次普攻必定暴擊。',
      ups: [
        { id: 'dmg', name: '鋒銳', desc: '傷害 +30%', max: 3 },
        { id: 'crits', name: '殺意', desc: '必定暴擊的普攻 +1 次', max: 2 },
        { id: 'clone', name: '殘像', desc: '原位置留下會爆炸的殘像', max: 1 },
        { id: 'cheap', name: '輕盈', desc: '發條消耗 -8', max: 1 },
      ],
      costMod: (s) => -8 * L(s, 'cheap'),
      cast(p, s, pow) {
        const t = aimPoint(p, 240);
        const ox = p.x, oy = p.y, dmg = 26 * (1 + 0.3 * L(s, 'dmg')) * pow;
        for (const e of G.enemies) {
          if (e.dead || e.untargetable) continue;
          if (U.segDist(e.x, e.y, ox, oy, t.x, t.y) < 30 + e.r) G.hitEnemy(e, dmg, { tags: ['skill', 'shadow'], kb: 120, kbAng: t.a });
        }
        for (let i = 0; i < 8; i++) G.addPart({ x: U.lerp(ox, t.x, i / 8), y: U.lerp(oy, t.y, i / 8), life: 0.35, size: 9, color: '#7d55c7', drag: 0.8 });
        p.x = t.x; p.y = t.y; G.collideWorld(p);
        p.iframes = Math.max(p.iframes, 0.25);
        p.forcedCrits += 2 + L(s, 'crits');
        if (L(s, 'clone')) G.addAlly({ kind: 'clone', x: ox, y: oy, life: 0.55, r: 12, onEnd(a) { G.areaBlast(a.x, a.y, 75, 30 * pow, { tags: ['skill', 'explosion', 'shadow'], color: '#b07cff' }); } });
        G.audio.play('dash');
      },
    },
    cleave: {
      name: '斷地斬', icon: '🪓', cost: 35, cd: 1.3, char: 'erin',
      desc: '劈開大地，向前方掀起一串岩漿噴發，會暈眩敵人。',
      ups: [
        { id: 'dmg', name: '鋒銳', desc: '傷害 +30%', max: 3 },
        { id: 'length', name: '裂地', desc: '噴發距離 +50%', max: 1 },
        { id: 'fork', name: '三叉', desc: '變成三道噴發', max: 1 },
        { id: 'magma', name: '熔岩', desc: '噴發點留下燃燒地面', max: 1 },
      ],
      cast(p, s, pow) {
        const n = 6 + 3 * L(s, 'length'), lines = L(s, 'fork') ? [-0.4, 0, 0.4] : [0];
        const dmg = 18 * (1 + 0.3 * L(s, 'dmg')) * pow, magma = L(s, 'magma');
        for (const off of lines) {
          const a = p.aim + off;
          for (let i = 0; i < n; i++) {
            const x = p.x + Math.cos(a) * (42 + i * 36), y = p.y + Math.sin(a) * (42 + i * 36);
            if (G.pointBlocked(x, y)) break;
            G.addArea({ x, y, r: 34, delay: 0.04 + i * 0.055, dmg, tags: ['skill'], stun: 0.45, kb: 140, boom: 2, color: '#ff8a3d', visual: 'erupt',
              dur: magma ? 2.2 : 0, tick: 0.45, tickDmg: 3, tickTags: ['burn', 'dot', 'skill'], tickNoCrit: true });
          }
        }
        G.fx.slashArc(p.x, p.y - 4, 60, p.aim - 1.6, p.aim + 1.4, '#ffb36a', 6, 0.26);
        G.fx.dust(p.x + Math.cos(p.aim) * 30, p.y + Math.sin(p.aim) * 30 + 6, 10);
        G.shake(4);
      },
    },
    // ===== 米菈 =====
    fireball: {
      name: '火球術', icon: '☄️', cost: 25, cd: 0.45, char: 'mira',
      desc: '發射會爆炸的火球，並讓敵人燃燒。',
      ups: [
        { id: 'dmg', name: '烈焰', desc: '傷害 +30%', max: 3 },
        { id: 'big', name: '巨焰', desc: '爆炸範圍 +30%', max: 2 },
        { id: 'multi', name: '雙生火', desc: '多發射 1 顆火球', max: 2 },
        { id: 'split', name: '餘焰', desc: '爆炸後噴出 3 顆小火彈', max: 1 },
      ],
      cast(p, s, pow) {
        const n = 1 + L(s, 'multi'), dmg = 26 * (1 + 0.3 * L(s, 'dmg')) * pow, br = 70 * (1 + 0.3 * L(s, 'big'));
        for (let i = 0; i < n; i++) {
          const a = p.aim + (i - (n - 1) / 2) * 0.18;
          G.addProj({
            x: p.x, y: p.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, r: 9, dmg: 8 * pow, life: 1.1, kind: 'fireball', color: '#ff7a2a',
            tags: ['skill', 'projectile', 'fire'], bounce: p.stats.bounce, splitL: L(s, 'split'),
            onEnd(pr) {
              G.areaBlast(pr.x, pr.y, br, dmg, { tags: ['skill', 'explosion', 'fire'], burn: [4, 3], depth: pr.depth });
              if (pr.splitL) for (let k = 0; k < 3; k++) {
                const aa = Math.random() * Math.PI * 2;
                G.addProj({ x: pr.x, y: pr.y, vx: Math.cos(aa) * 300, vy: Math.sin(aa) * 300, r: 5, dmg: 8 * pow, life: 0.5, kind: 'ember', color: '#ff9a4a', tags: ['skill', 'projectile', 'fire'], burn: [3, 2], depth: pr.depth + 1 });
              }
            },
          });
        }
        G.audio.play('cast');
      },
    },
    orbit: {
      name: '星環', icon: '🔆', cost: 35, cd: 2.5, char: 'mira',
      desc: '召喚 3 顆環繞自身的星火，持續灼燒靠近的敵人。',
      ups: [
        { id: 'dmg', name: '烈焰', desc: '傷害 +30%', max: 3 },
        { id: 'more', name: '群星', desc: '星火 +2 顆', max: 2 },
        { id: 'long', name: '長明', desc: '持續時間 +3 秒', max: 1 },
        { id: 'bolt', name: '星射', desc: '星火會自動射擊附近敵人', max: 1 },
      ],
      cast(p, s, pow) {
        const n = 3 + 2 * L(s, 'more');
        G.allies.filter((a) => a.kind === 'orbit').forEach((a) => (a.t = a.life));
        G.addAlly({
          kind: 'orbit', x: p.x, y: p.y, n, R: 72, life: 6 + 3 * L(s, 'long'), ang: 0, cool: new Map(), dmg: 8 * (1 + 0.3 * L(s, 'dmg')) * pow, bolt: L(s, 'bolt'), boltT: 0.5,
          update(a, dt) {
            a.x = p.x; a.y = p.y; a.ang += 3.2 * dt;
            for (let i = 0; i < a.n; i++) {
              const oa = a.ang + i * Math.PI * 2 / a.n, ox = a.x + Math.cos(oa) * a.R, oy = a.y + Math.sin(oa) * a.R;
              for (const e of G.enemiesInRadius(ox, oy, 11)) {
                if ((a.cool.get(e) || 0) > a.t) continue;
                a.cool.set(e, a.t + 0.25);
                G.hitEnemy(e, a.dmg, { tags: ['skill', 'fire'], burn: [2, 2], kb: 60, kbAng: oa });
              }
            }
            if (a.bolt) {
              a.boltT -= dt;
              if (a.boltT <= 0) {
                a.boltT = 0.45;
                const oa = a.ang, ox = a.x + Math.cos(oa) * a.R, oy = a.y + Math.sin(oa) * a.R;
                const tg = G.nearestEnemy(ox, oy, 320);
                if (tg) { const ta = Math.atan2(tg.y - oy, tg.x - ox); G.addProj({ x: ox, y: oy, vx: Math.cos(ta) * 520, vy: Math.sin(ta) * 520, r: 4, dmg: a.dmg * 0.8, life: 0.7, kind: 'ember', tags: ['skill', 'projectile', 'fire'] }); }
              }
            }
          },
        });
        G.audio.play('cast');
      },
    },
    meteor: {
      name: '墜星', icon: '🌠', cost: 40, cd: 1.1, char: 'mira',
      desc: '把一顆停在天上的星星拉下來，砸在游標位置並暈眩敵人。',
      ups: [
        { id: 'dmg', name: '烈焰', desc: '傷害 +30%', max: 3 },
        { id: 'shower', name: '流星雨', desc: '周圍多落下 2 顆小星', max: 2 },
        { id: 'crater', name: '焦土', desc: '落點留下燃燒地面', max: 1 },
        { id: 'fast', name: '急墜', desc: '落下速度加快', max: 1 },
      ],
      cast(p, s, pow) {
        const t = aimPoint(p, 420), dmg = 52 * (1 + 0.3 * L(s, 'dmg')) * pow, delay = 0.65 - 0.25 * L(s, 'fast');
        const crater = L(s, 'crater');
        const mk = (x, y, r, d, dl) => G.addArea({ x, y, r, delay: dl, dmg: d, tags: ['skill', 'explosion', 'fire'], stun: 0.6, kb: 260, boom: r > 70 ? 7 : 3, color: '#ff6a2a', visual: 'meteor', burn: [4, 3],
          dur: crater ? 3 : 0, tick: 0.4, tickDmg: 4, tickTags: ['burn', 'dot', 'skill'], tickNoCrit: true });
        mk(t.x, t.y, 95, dmg, delay);
        for (let i = 0; i < 2 * L(s, 'shower'); i++) {
          const a = Math.random() * Math.PI * 2, d = U.rand(60, 120);
          mk(U.clamp(t.x + Math.cos(a) * d, G.ARENA.x1, G.ARENA.x2), U.clamp(t.y + Math.sin(a) * d, G.ARENA.y1, G.ARENA.y2), 50, dmg * 0.4, delay + 0.15 + i * 0.12);
        }
        G.audio.play('cast');
      },
    },
    frostnova: {
      name: '霜凍新星', icon: '❄️', cost: 30, cd: 1.0, char: 'mira',
      desc: '向四周擴散寒氣，擊退並緩速敵人。',
      ups: [
        { id: 'dmg', name: '凜冽', desc: '傷害 +30%', max: 3 },
        { id: 'wide', name: '寒潮', desc: '範圍 +25%', max: 2 },
        { id: 'freeze', name: '凍結', desc: '已被緩速的敵人會被凍結 1 秒', max: 1 },
        { id: 'double', name: '餘波', desc: '0.4 秒後再擴散一次', max: 1 },
      ],
      cast(p, s, pow) {
        const r = 145 * (1 + 0.25 * L(s, 'wide')), dmg = 20 * (1 + 0.3 * L(s, 'dmg')) * pow, freeze = L(s, 'freeze');
        const mk = (dl) => G.addArea({ kind: 'ring', x: p.x, y: p.y, r, expand: 0.28, delay: dl, dmg, color: '#8fd3ff', visual: 'ring',
          onHitE(a, e) {
            const chilled = e.st.slow && e.st.slow.t > 0;
            G.hitEnemy(e, a.dmg, { tags: ['skill', 'frost'], kb: 320, kbAng: Math.atan2(e.y - a.y, e.x - a.x), slow: [0.5, 2.5] });
            if (freeze && chilled) G.applyStun(e, 1);
          } });
        mk(0);
        if (L(s, 'double')) mk(0.4);
        G.audio.play('cast');
      },
    },
    // ===== 托比 =====
    turret: {
      name: '砲塔', icon: '🗼', cost: 40, cd: 0.9, char: 'toby',
      desc: '在游標處架設砲塔，持續 8 秒自動射擊（最多 2 座）。',
      ups: [
        { id: 'dmg', name: '強化彈藥', desc: '傷害 +30%', max: 3 },
        { id: 'more', name: '量產', desc: '砲塔上限 +1', max: 2 },
        { id: 'rapid', name: '連射', desc: '射速 +30%', max: 1 },
        { id: 'drop', name: '空投', desc: '落地時暈眩周圍敵人', max: 1 },
        { id: 'boom', name: '自毀程序', desc: '砲塔結束時爆炸', max: 1 },
      ],
      cast(p, s, pow) {
        const t = aimPoint(p, 300), max = 2 + L(s, 'more');
        const ts = G.allies.filter((a) => a.kind === 'turret' && !a.ended).sort((a, b) => b.t - a.t);
        while (ts.length >= max) { const o = ts.shift(); o.t = o.life; }
        const dmg = 8 * (1 + 0.3 * L(s, 'dmg')) * pow, boomL = L(s, 'boom');
        if (L(s, 'drop')) G.areaBlast(t.x, t.y, 70, 10 * pow, { tags: ['summon', 'explosion'], stun: 1.0, color: '#9fd8ff' });
        G.addAlly({
          kind: 'turret', summon: true, x: t.x, y: t.y, r: 12, life: 8, fireT: 0.3, aim: p.aim, dmg,
          rate: 0.5 * (1 - 0.3 * L(s, 'rapid')),
          update(a, dt) {
            a.fireT -= dt * p.stats.summonRate;
            const tg = G.nearestEnemy(a.x, a.y, 400);
            if (tg) {
              a.aim = Math.atan2(tg.y - a.y, tg.x - a.x);
              if (a.fireT <= 0) {
                a.fireT = a.rate;
                G.addProj({ x: a.x + Math.cos(a.aim) * 12, y: a.y + Math.sin(a.aim) * 12, vx: Math.cos(a.aim) * 620, vy: Math.sin(a.aim) * 620, r: 4, dmg: a.dmg, life: 0.8, color: '#ffd27a', kind: 'bolt', tags: ['summon', 'projectile'], bounce: p.stats.bounce });
                G.audio.play('shoot');
              }
            }
          },
          onEnd(a) { if (boomL) G.areaBlast(a.x, a.y, 85, 28 * pow, { tags: ['summon', 'explosion'] }); else G.burst(a.x, a.y, '#9fb8c9', 8, 120, 0.4, 3); },
        });
        G.audio.play('cast');
      },
    },
    mines: {
      name: '地雷陣', icon: '💣', cost: 30, cd: 0.7, char: 'toby',
      desc: '在游標附近撒下 3 顆地雷，敵人靠近就爆炸。',
      ups: [
        { id: 'dmg', name: '高爆', desc: '傷害 +30%', max: 3 },
        { id: 'more', name: '佈雷', desc: '地雷 +2 顆', max: 2 },
        { id: 'big', name: '震波', desc: '爆炸範圍 +30%', max: 1 },
        { id: 'cluster', name: '子母雷', desc: '爆炸後分裂出 2 顆小地雷', max: 1 },
      ],
      cast(p, s, pow) {
        const t = aimPoint(p, 320), n = 3 + 2 * L(s, 'more');
        for (let i = 0; i < n; i++) {
          const a = i * Math.PI * 2 / n + Math.random() * 0.5, d = n === 1 ? 0 : U.rand(25, 55 + n * 4);
          let x = t.x + Math.cos(a) * d, y = t.y + Math.sin(a) * d;
          if (G.pointBlocked(x, y)) { x = t.x; y = t.y; }
          G.spawnMine(x, y, { dmg: 28 * (1 + 0.3 * L(s, 'dmg')) * pow, br: 65 * (1 + 0.3 * L(s, 'big')), cluster: L(s, 'cluster') });
        }
        G.audio.play('cast');
      },
    },
    tesla: {
      name: '電能線圈', icon: '⚡', cost: 35, cd: 1.0, char: 'toby',
      desc: '放置線圈，持續放出連鎖閃電（7 秒）。',
      ups: [
        { id: 'dmg', name: '高壓', desc: '傷害 +30%', max: 3 },
        { id: 'chains', name: '跳躍', desc: '連鎖目標 +2', max: 2 },
        { id: 'range', name: '感應', desc: '偵測範圍 +30%', max: 1 },
        { id: 'slow', name: '麻痺', desc: '被電到的敵人會緩速', max: 1 },
      ],
      cast(p, s, pow) {
        const t = aimPoint(p, 300);
        const coils = G.allies.filter((a) => a.kind === 'coil' && !a.ended).sort((a, b) => b.t - a.t);
        while (coils.length >= 2) { const o = coils.shift(); o.t = o.life; }
        G.addAlly({
          kind: 'coil', summon: true, x: t.x, y: t.y, r: 12, life: 7, zapT: 0.2, chains: 3 + 2 * L(s, 'chains'), range: 170 * (1 + 0.3 * L(s, 'range')),
          dmg: 10 * (1 + 0.3 * L(s, 'dmg')) * pow, slow: L(s, 'slow'),
          update(a, dt) {
            a.zapT -= dt * p.stats.summonRate;
            if (a.zapT <= 0) {
              const first = G.nearestEnemy(a.x, a.y, a.range);
              if (first) { a.zapT = 0.6; G.chainLightning(a.x, a.y - 14, first, a.chains + p.stats.chainBonus, a.dmg, 150, { tags: ['summon', 'chain'], slow: a.slow ? [0.4, 1.5] : null }); }
            }
          },
        });
        G.audio.play('cast');
      },
    },
    saw: {
      name: '鋸刃無人機', icon: '🪚', cost: 30, cd: 1.6, char: 'toby',
      desc: '放出追著游標飛行的鋸刃，切割路徑上的敵人（7 秒）。',
      ups: [
        { id: 'dmg', name: '鋒利鋸齒', desc: '傷害 +30%', max: 3 },
        { id: 'more', name: '僚機', desc: '無人機 +1', max: 2 },
        { id: 'big', name: '巨鋸', desc: '體積 +30%', max: 1 },
        { id: 'long', name: '長效電池', desc: '持續時間 +3 秒', max: 1 },
      ],
      cast(p, s, pow) {
        const n = 1 + L(s, 'more');
        G.allies.filter((a) => a.kind === 'drone').forEach((a) => (a.t = a.life));
        for (let i = 0; i < n; i++) {
          G.addAlly({
            kind: 'drone', summon: true, x: p.x, y: p.y, vx: 0, vy: 0, r: 14 * (1 + 0.3 * L(s, 'big')), life: 7 + 3 * L(s, 'long'), off: i * Math.PI * 2 / n, cool: new Map(),
            dmg: 6 * (1 + 0.3 * L(s, 'dmg')) * pow, spin: 0,
            update(a, dt) {
              a.spin += dt * 20;
              const oa = a.t * 2.5 + a.off, od = n > 1 ? 40 : 0;
              const tx = G.input.mx + Math.cos(oa) * od, ty = G.input.my + Math.sin(oa) * od;
              const an = Math.atan2(ty - a.y, tx - a.x), d = Math.hypot(tx - a.x, ty - a.y);
              const sp = Math.min(460, d * 6);
              a.vx = U.lerp(a.vx, Math.cos(an) * sp, 0.12); a.vy = U.lerp(a.vy, Math.sin(an) * sp, 0.12);
              a.x += a.vx * dt * p.stats.summonRate; a.y += a.vy * dt * p.stats.summonRate;
              G.collideWorld(a);
              for (const e of G.enemiesInRadius(a.x, a.y, a.r)) {
                if ((a.cool.get(e) || 0) > a.t) continue;
                a.cool.set(e, a.t + 0.15 / p.stats.summonRate);
                G.hitEnemy(e, a.dmg, { tags: ['summon', 'melee'], kb: 40, kbAng: Math.atan2(e.y - a.y, e.x - a.x) });
              }
            },
          });
        }
        G.audio.play('cast');
      },
    },
    // ===== 格雷 =====
    charge: {
      name: '衝鋒', icon: '🐎', cost: 25, cd: 0.8, char: 'grey',
      desc: '持槍向前猛衝，撞飛路徑上的所有敵人，衝鋒中無敵。',
      ups: [
        { id: 'dmg', name: '破陣', desc: '傷害 +30%', max: 3 },
        { id: 'quake', name: '餘震', desc: '衝鋒結束時震盪周圍', max: 1 },
        { id: 'stun', name: '撼動', desc: '被撞到的敵人暈眩 0.8 秒', max: 1 },
        { id: 'cheap', name: '輕裝', desc: '發條消耗 -10', max: 1 },
      ],
      costMod: (s) => -10 * L(s, 'cheap'),
      cast(p, s, pow) {
        const t = aimPoint(p, 260), ox = p.x, oy = p.y, dmg = 30 * (1 + 0.3 * L(s, 'dmg')) * pow;
        const stun = L(s, 'stun') ? 0.8 : 0, quake = L(s, 'quake');
        p.iframes = Math.max(p.iframes, 0.3);
        p.busy = 0.17;
        G.addAlly({
          kind: 'rush', x: ox, y: oy, life: 0.16, hit: new Set(),
          update(a) {
            const k = Math.min(1, a.t / 0.16);
            p.x = U.lerp(ox, t.x, k); p.y = U.lerp(oy, t.y, k); G.collideWorld(p);
            G.addPart({ x: p.x, y: p.y, life: 0.25, size: 11, color: '#2e4a2a', drag: 0.8, ghost: true });
            for (const e of G.enemiesInRadius(p.x, p.y, 28)) {
              if (a.hit.has(e)) continue; a.hit.add(e);
              G.hitEnemy(e, dmg, { tags: ['skill', 'melee'], kb: 380, kbAng: t.a, stun });
            }
          },
          onEnd() { if (quake) G.areaBlast(p.x, p.y, 95, 20 * pow, { tags: ['skill', 'explosion'], stun: 0.5, color: '#c0e0a0', kb: 300 }); },
        });
        G.fx.dust(ox, oy + 10, 10);
        G.fx.streak(ox, oy - 2, t.x, t.y - 2, '#c0e0a0', 6, 0.2);
        G.audio.play('dash'); G.shake(3);
      },
    },
    javelin: {
      name: '擲槍', icon: '🪃', cost: 25, cd: 0.6, char: 'grey',
      desc: '擲出貫穿所有敵人的長槍。',
      ups: [
        { id: 'dmg', name: '破陣', desc: '傷害 +30%', max: 3 },
        { id: 'multi', name: '槍雨', desc: '多擲出 2 支（扇形）', max: 1 },
        { id: 'pin', name: '釘刺', desc: '被命中的敵人暈眩 0.7 秒', max: 1 },
        { id: 'burst', name: '爆裂槍頭', desc: '長槍落地時爆炸', max: 1 },
      ],
      cast(p, s, pow) {
        const n = L(s, 'multi') ? 3 : 1, dmg = 34 * (1 + 0.3 * L(s, 'dmg')) * pow;
        for (let i = 0; i < n; i++) {
          const a = p.aim + (i - (n - 1) / 2) * 0.2;
          G.addProj({ x: p.x, y: p.y, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, r: 8, dmg, pierce: 999, life: 0.55, kind: 'spear', color: '#e0f0d0',
            tags: ['skill', 'projectile'], kb: 160, stun: L(s, 'pin') ? 0.7 : 0, burstL: L(s, 'burst'),
            onEnd(pr) { if (pr.burstL) G.areaBlast(pr.x, pr.y, 75, 22 * pow, { tags: ['skill', 'explosion'], color: '#c0e0a0' }); } });
        }
        G.audio.play('swing');
      },
    },
    spikering: {
      name: '槍陣', icon: '✴️', cost: 30, cd: 1.0, char: 'grey',
      desc: '把槍插進地面，周圍接連刺出兩圈尖槍。',
      ups: [
        { id: 'dmg', name: '破陣', desc: '傷害 +30%', max: 3 },
        { id: 'wide', name: '三重陣', desc: '再多刺出一圈更外圍的尖槍', max: 1 },
        { id: 'bleed', name: '倒鉤', desc: '被刺中的敵人流血（持續傷害）', max: 1 },
        { id: 'stun', name: '定身', desc: '被刺中的敵人暈眩 0.5 秒', max: 1 },
      ],
      cast(p, s, pow) {
        const dmg = 20 * (1 + 0.3 * L(s, 'dmg')) * pow, rings = L(s, 'wide') ? [70, 130, 190] : [70, 130];
        rings.forEach((R2, ri) => {
          const n = 6 + ri * 4;
          for (let i = 0; i < n; i++) {
            const a = i * Math.PI * 2 / n + ri * 0.3, x = p.x + Math.cos(a) * R2, y = p.y + Math.sin(a) * R2;
            if (G.pointBlocked(x, y)) continue;
            G.addArea({ x, y, r: 30, delay: 0.12 + ri * 0.18, dmg, tags: ['skill', 'melee'], kb: 200, stun: L(s, 'stun') ? 0.5 : 0, burn: L(s, 'bleed') ? [5, 3] : null, color: '#c8e8a8', visual: 'spike', boom: 1 });
          }
        });
        G.audio.play('cast');
      },
    },
    leap: {
      name: '天降', icon: '☄️', cost: 40, cd: 1.2, char: 'grey',
      desc: '高高躍起，落在游標位置造成大範圍衝擊。空中無敵。',
      ups: [
        { id: 'dmg', name: '破陣', desc: '傷害 +30%', max: 3 },
        { id: 'wide', name: '隕擊', desc: '衝擊範圍 +30%', max: 1 },
        { id: 'after', name: '震盪', desc: '落地後再擴散一圈震波', max: 1 },
        { id: 'cheap', name: '輕盈', desc: '發條消耗 -12', max: 1 },
      ],
      costMod: (s) => -12 * L(s, 'cheap'),
      cast(p, s, pow) {
        const t = aimPoint(p, 280), ox = p.x, oy = p.y, dur = 0.4;
        const r = 100 * (1 + 0.3 * L(s, 'wide')), dmg = 45 * (1 + 0.3 * L(s, 'dmg')) * pow, after = L(s, 'after');
        p.iframes = Math.max(p.iframes, dur + 0.1); p.busy = dur;
        G.addArea({ team: 'fx', x: t.x, y: t.y, r, fxLife: dur, color: '#c0e0a0', visual: 'land' });
        G.addAlly({
          kind: 'leap', x: ox, y: oy, life: dur,
          update(a) { const k = Math.min(1, a.t / dur); p.x = U.lerp(ox, t.x, k); p.y = U.lerp(oy, t.y, k); p.z = Math.sin(k * Math.PI) * 70; },
          onEnd() {
            p.z = 0; p.x = t.x; p.y = t.y; G.collideWorld(p);
            G.areaBlast(p.x, p.y, r, dmg, { tags: ['skill', 'explosion'], stun: 0.5, kb: 360, color: '#d8f0b8' });
            G.shake(4); G.hitstop(0.08);
            G.fx.dust(p.x, p.y + 10, 16); G.fx.ring(p.x, p.y + 8, r * 0.8, '#d8f0b8', 0.35, 3, true);
            if (after) G.addArea({ kind: 'ring', x: p.x, y: p.y, r: r * 1.7, expand: 0.3, delay: 0.15, dmg: dmg * 0.5, tags: ['skill'], kb: 250, color: '#c0e0a0', visual: 'ring' });
          },
        });
        G.audio.play('dash');
      },
    },
    // ===== 莉絲 =====
    roll: {
      name: '翻滾射擊', icon: '🌀', cost: 25, cd: 0.7, char: 'lise',
      desc: '向移動方向翻滾，起身時朝四周開火。翻滾中無敵。',
      ups: [
        { id: 'dmg', name: '加量火藥', desc: '傷害 +30%', max: 3 },
        { id: 'more', name: '全方位', desc: '子彈 +6 發', max: 1 },
        { id: 'reload', name: '快速上膛', desc: '翻滾後 3 次普攻必定暴擊', max: 1 },
        { id: 'cheap', name: '身輕如燕', desc: '發條消耗 -8', max: 1 },
      ],
      costMod: (s) => -8 * L(s, 'cheap'),
      cast(p, s, pow) {
        const I = G.input;
        let mx = 0, my = 0;
        if (I.down('KeyA', 'ArrowLeft')) mx--; if (I.down('KeyD', 'ArrowRight')) mx++;
        if (I.down('KeyW', 'ArrowUp')) my--; if (I.down('KeyS', 'ArrowDown')) my++;
        const a = mx || my ? Math.atan2(my, mx) : p.aim, ox = p.x, oy = p.y;
        const n = 10 + 6 * L(s, 'more'), dmg = 9 * (1 + 0.3 * L(s, 'dmg')) * pow;
        p.iframes = Math.max(p.iframes, 0.3); p.busy = 0.18;
        if (L(s, 'reload')) p.forcedCrits += 3;
        G.addAlly({
          kind: 'rush', x: ox, y: oy, life: 0.18,
          update(al) { const k = Math.min(1, al.t / 0.18); p.x = ox + Math.cos(a) * 170 * k; p.y = oy + Math.sin(a) * 170 * k; G.collideWorld(p); p.spin = k * Math.PI * 2; },
          onEnd() {
            p.spin = 0;
            for (let i = 0; i < n; i++) { const b = i * Math.PI * 2 / n; G.addProj({ x: p.x, y: p.y, vx: Math.cos(b) * 560, vy: Math.sin(b) * 560, r: 4, dmg, life: 0.5, color: '#f0b0ff', kind: 'bolt', tags: ['skill', 'projectile'], bounce: p.stats.bounce }); }
            G.audio.play('shoot');
          },
        });
        G.audio.play('dash');
      },
    },
    barrage: {
      name: '彈幕', icon: '🎆', cost: 30, cd: 0.9, char: 'lise',
      desc: '朝前方連續扇形掃射 3 輪。',
      ups: [
        { id: 'dmg', name: '加量火藥', desc: '傷害 +30%', max: 3 },
        { id: 'more', name: '持續掃射', desc: '多掃射 2 輪', max: 1 },
        { id: 'pierce', name: '穿甲彈', desc: '子彈貫穿 1 個敵人', max: 1 },
        { id: 'homing', name: '追蹤彈', desc: '子彈會追蹤敵人', max: 1 },
      ],
      cast(p, s, pow) {
        const vol = 3 + 2 * L(s, 'more'), dmg = 7 * (1 + 0.3 * L(s, 'dmg')) * pow;
        G.addAlly({
          kind: 'timer', life: vol * 0.12, k: 0,
          update(a) {
            while (a.k < vol && a.t >= a.k * 0.12) {
              a.k++;
              for (let i = 0; i < 7; i++) {
                const b = p.aim + (i - 3) * 0.1;
                G.addProj({ x: p.x, y: p.y, vx: Math.cos(b) * 640, vy: Math.sin(b) * 640, r: 4, dmg, life: 0.55, color: '#ffd0f0', kind: 'bolt', tags: ['skill', 'projectile'], pierce: L(s, 'pierce'), homing: L(s, 'homing') ? 5 : 0, bounce: p.stats.bounce });
              }
              G.audio.play('shoot');
            }
          },
        });
      },
    },
    mark: {
      name: '死亡預告', icon: '🃏', cost: 20, cd: 0.8, char: 'lise',
      desc: '對游標附近的敵人射出預告卡：目標受到的傷害 +40%，死亡時爆炸，預告卡再跳到下一個敵人。',
      ups: [
        { id: 'dmg', name: '致命預告', desc: '增傷 +15%，爆炸傷害 +30%', max: 2 },
        { id: 'big', name: '大爆炸', desc: '爆炸範圍 +35%', max: 1 },
        { id: 'jump', name: '連環預告', desc: '可多跳 2 次', max: 1 },
        { id: 'long', name: '長效', desc: '持續時間 +4 秒', max: 1 },
      ],
      cast(p, s, pow) {
        let tg = G.nearestEnemy(G.input.mx, G.input.my, 160) || G.nearestEnemy(p.x, p.y, 500);
        if (!tg) { p.energy += G.skillCost(s); s.cd = 0; return; }
        const mk = { t: 6 + 4 * L(s, 'long'), bonus: 0.4 + 0.15 * L(s, 'dmg'), boom: 40 * (1 + 0.3 * L(s, 'dmg')) * pow, r: 90 * (1 + 0.35 * L(s, 'big')), jumps: 1 + 2 * L(s, 'jump') };
        G.applyMark(tg, mk);
        G.addArea({ team: 'fx', kind: 'zap', x: p.x, y: p.y, x2: tg.x, y2: tg.y, color: '#ff6ad0', visual: 'zap' });
        G.audio.play('zap');
      },
    },
    grenade: {
      name: '黏彈', icon: '💣', cost: 30, cd: 0.8, char: 'lise',
      desc: '丟出會反彈的手榴彈，延遲後爆炸並噴出破片。',
      ups: [
        { id: 'dmg', name: '加量火藥', desc: '傷害 +30%', max: 3 },
        { id: 'cluster', name: '集束彈', desc: '爆炸後再噴出 3 顆小炸彈', max: 1 },
        { id: 'stun', name: '震撼彈', desc: '爆炸會暈眩敵人 1 秒', max: 1 },
        { id: 'big', name: '大口徑', desc: '爆炸範圍 +30%', max: 1 },
      ],
      cast(p, s, pow) {
        const t = aimPoint(p, 340), d = Math.hypot(t.x - p.x, t.y - p.y);
        const dmg = 45 * (1 + 0.3 * L(s, 'dmg')) * pow, r = 90 * (1 + 0.3 * L(s, 'big')), stun = L(s, 'stun') ? 1 : 0, cluster = L(s, 'cluster');
        const boom = (x, y, rr, dd, sub) => {
          G.areaBlast(x, y, rr, dd, { tags: ['skill', 'explosion'], stun, color: '#ffb0e0' });
          for (let i = 0; i < 6; i++) { const b = Math.random() * Math.PI * 2; G.addProj({ x, y, vx: Math.cos(b) * 420, vy: Math.sin(b) * 420, r: 3, dmg: 8 * pow, life: 0.35, color: '#ffd0f0', kind: 'bolt', tags: ['skill', 'projectile'] }); }
          if (sub) for (let i = 0; i < 3; i++) { const b = Math.random() * Math.PI * 2; G.addProj({ team: 'neutral', x, y, vx: Math.cos(b) * 260, vy: Math.sin(b) * 260, r: 5, life: 0.5, kind: 'grenade', color: '#ff9ad0', wallBounce: 3, update(q) { q.vx *= 0.93; q.vy *= 0.93; }, onEnd(q) { boom(q.x, q.y, rr * 0.55, dd * 0.4, false); } }); }
        };
        G.addProj({ team: 'neutral', x: p.x, y: p.y, vx: Math.cos(t.a) * d * 2.6, vy: Math.sin(t.a) * d * 2.6, r: 6, life: 0.8, kind: 'grenade', color: '#ff9ad0', wallBounce: 4,
          update(q, dt) { q.vx *= Math.pow(0.02, dt); q.vy *= Math.pow(0.02, dt); },
          onEnd(q) { boom(q.x, q.y, r, dmg, cluster); } });
        G.audio.play('cast');
      },
    },
  };

  // ---------------- 刻印（被動，可升到 3 級）----------------
  const R = { common: 10, rare: 6, epic: 2.6 };
  G.RARITY_W = R;
  G.SIGILS = {
    bloodthirst: { name: '嗜血', icon: '🩸', rarity: 'common', desc: (l) => `擊殺敵人回復 ${1 + l} 生命`,
      onKill(d, l) { G.healPlayer(1 + l, true); } },
    emberbrand: { name: '熾熱齒輪', icon: '🔥', rarity: 'common', desc: (l) => `普攻使敵人燃燒（每秒 ${2 + 2 * l} 傷害，3 秒）`,
      onHit(d, l) { if (d.tags.includes('basic')) G.applyBurn(d.e, 2 + 2 * l, 3); } },
    shadow: { name: '過去的殘影', icon: '👥', rarity: 'rare', desc: (l) => `命中時 ${10 + 5 * l}% 機率喚出「一秒前的自己」追擊（${8 + 4 * l} 傷害），殘影命中回復 3 發條`,
      onHit(d, l) { if (!d.tags.includes('shadow') && G.canProc(d.depth) && Math.random() < 0.1 + 0.05 * l) G.shadowStrike(d.x, d.y, 8 + 4 * l, d.depth); },
      onShadow() { G.addEnergy(3); } },
    firetrail: { name: '火花軌跡', icon: '👣', rarity: 'common', desc: (l) => `閃避時留下火焰軌跡（每跳 ${2 + 2 * l} 傷害）`,
      onDash(d, l, p) {
        G.addAlly({ kind: 'trailer', x: p.x, y: p.y, life: 0.2, dropT: 0, update(a, dt) {
          a.dropT -= dt;
          if (a.dropT <= 0) { a.dropT = 0.035; G.addArea({ x: p.x, y: p.y, r: 22, dur: 2.4, tick: 0.4, dmg: 0, tickDmg: 2 + 2 * l, tickTags: ['burn', 'dot'], tickNoCrit: true, burn: [1 + l, 2], color: '#ff6a2a', visual: 'fire' }); }
        } });
      } },
    afterimage: { name: '蓄勢', icon: '💨', rarity: 'common', desc: (l) => `閃避後下一次普攻傷害 +${60 * l}%`,
      onDash(d, l, p) { p.nextBasicMul = 1 + 0.6 * l; } },
    corpseburst: { name: '過載爆裂', icon: '💥', rarity: 'rare', desc: (l) => `敵人壞掉時 ${35 + 15 * l}% 機率爆炸（${8 + 6 * l} 傷害）`,
      onKill(d, l) { if (G.canProc(d.depth) && Math.random() < 0.35 + 0.15 * l) G.areaBlast(d.x, d.y, 60, 8 + 6 * l, { tags: ['explosion'], depth: d.depth + 1 }); } },
    ricochet: { name: '彈射', icon: '🎯', rarity: 'rare', desc: (l) => `投射物命中後彈射到另一個敵人（+${l} 次）`,
      stat(s, l) { s.bounce += l; } },
    split: { name: '分裂', icon: '✳️', rarity: 'rare', desc: (l) => `投射物命中時 ${20 + 10 * l}% 機率分裂成 2 發小彈`,
      onHit(d, l) {
        if (!d.tags.includes('projectile') || !G.canProc(d.depth) || Math.random() > 0.2 + 0.1 * l) return;
        const base = d.src && d.src.vx != null ? Math.atan2(d.src.vy, d.src.vx) : Math.random() * 6.28;
        for (const off of [-0.5, 0.5]) {
          const a = base + off;
          G.addProj({ x: d.x, y: d.y, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, r: 4, dmg: Math.max(3, d.dmg * 0.4 / G.player.stats.dmgMul), life: 0.45, kind: 'ember', color: '#ffe08a', tags: ['projectile', 'split'], depth: d.depth + 1, hitSet: [d.e] });
        }
      } },
    critcharge: { name: '暴擊上弦', icon: '🔋', rarity: 'common', desc: (l) => `暴擊時回復 ${3 + 2 * l} 發條`,
      onCrit(d, l) { G.addEnergy(3 + 2 * l); } },
    frost: { name: '冰霜之觸', icon: '🧊', rarity: 'common', desc: (l) => `命中時 ${12 + 6 * l}% 機率緩速敵人；對緩速敵人傷害 +${8 * l}%`,
      onHit(d, l) { if (Math.random() < 0.12 + 0.06 * l) G.applySlow(d.e, 0.45, 2); },
      dmgMod(e, o, l) { return e.st.slow && e.st.slow.t > 0 ? 1 + 0.08 * l : 1; } },
    chain: { name: '連鎖閃電', icon: '🌩️', rarity: 'rare', desc: (l) => `命中時 ${8 + 5 * l}% 機率放出連鎖閃電（${6 + 4 * l} 傷害，${2 + l} 個目標）`,
      onHit(d, l, p) {
        if (d.tags.includes('chain') || !G.canProc(d.depth) || Math.random() > 0.08 + 0.05 * l) return;
        const ex = new Set([d.e]);
        const first = G.nearestEnemy(d.x, d.y, 200, ex);
        if (first) G.chainLightning(d.x, d.y, first, 2 + l + p.stats.chainBonus, 6 + 4 * l, 160, { depth: d.depth });
      } },
    execute: { name: '處決', icon: '⚰️', rarity: 'rare', desc: (l) => `對生命低於 ${12 + 4 * l}% 的敵人造成雙倍傷害（首領 +30%）`,
      dmgMod(e, o, l) { return e.hp / e.maxHp < 0.12 + 0.04 * l ? (e.boss ? 1.3 : 2) : 1; } },
    fury: { name: '狂怒', icon: '😡', rarity: 'common', desc: (l) => `每損失 10% 生命，傷害 +${4 * l}%`,
      dmgMod(e, o, l, p) { return 1 + (1 - p.hp / p.maxHp) * 0.4 * l; } },
    thorns: { name: '反衝彈簧', icon: '🌀', rarity: 'common', desc: (l) => `受傷時爆發衝擊波（${15 + 10 * l} 傷害）`,
      onHurt(d, l, p) { G.areaBlast(p.x, p.y, 115, 15 + 10 * l, { tags: ['explosion'], kb: 380, color: '#9be36b' }); } },
    fullshield: { name: '滿弦護盾', icon: '🛡️', rarity: 'common', desc: (l) => `發條高於 80% 時受到的傷害 -${15 * l}%`,
      takenMod(l, p) { return p.energy >= p.stats.maxEnergy * 0.8 ? 1 - 0.15 * l : 1; } },
    surge: { name: '加速擒縱', icon: '⏩', rarity: 'common', desc: (l) => `施放技能後 3 秒內攻速 +${15 * l}%`,
      onCast(d, l, p) { p.buffAtk = { t: 3, amt: 0.15 * l }; } },
    siphon: { name: '回收發條', icon: '🫧', rarity: 'common', desc: (l) => `擊殺敵人回復 ${4 + 4 * l} 發條`,
      onKill(d, l) { G.addEnergy(4 + 4 * l); } },
    firststrike: { name: '先發制人', icon: '🏹', rarity: 'common', desc: (l) => `對滿血敵人的傷害 +${40 * l}%`,
      dmgMod(e, o, l) { return e.hp >= e.maxHp ? 1 + 0.4 * l : 1; } },
    embers: { name: '環繞齒輪', icon: '⚙️', rarity: 'rare', desc: (l) => `${l} 顆小齒輪環繞身邊，碰到敵人造成 ${5 + 3 * l} 傷害`,
      onRoomStart(d, l, p) {
        G.allies.filter((a) => a.kind === 'embers').forEach((a) => { a.dead = true; a.ended = true; });
        G.addAlly({ kind: 'embers', x: p.x, y: p.y, n: l, life: 1e9, ang: 0, cool: new Map(), dmg: 5 + 3 * l, update(a, dt) {
          a.x = p.x; a.y = p.y; a.ang += 2.6 * dt;
          for (let i = 0; i < a.n; i++) {
            const oa = a.ang + i * Math.PI * 2 / a.n, ox = a.x + Math.cos(oa) * 46, oy = a.y + Math.sin(oa) * 46;
            for (const e of G.enemiesInRadius(ox, oy, 8)) {
              if ((a.cool.get(e) || 0) > a.t) continue;
              a.cool.set(e, a.t + 0.3);
              G.hitEnemy(e, a.dmg, { tags: ['fire'], kb: 40, kbAng: oa });
            }
          }
        } });
      },
      onPick(l, p) { G.SIGILS.embers.onRoomStart(null, l, p); } },
    lucky: { name: '幸運星', icon: '⭐', rarity: 'common', desc: (l) => `暴擊率 +${6 * l}%，暴擊傷害 +${15 * l}%`,
      stat(s, l) { s.crit += 0.06 * l; s.critDmg += 0.15 * l; } },
    greed: { name: '貪婪', icon: '🪙', rarity: 'common', desc: (l) => `銅幣獲得 +${25 * l}%，清房額外得到 ${5 * l} 銅幣`,
      stat(s, l) { s.goldMul += 0.25 * l; },
      onRoomClear(d, l, p) { p.gold += 5 * l; } },
    wildfire: { name: '野火蔓延', icon: '🌋', rarity: 'rare', desc: (l) => `燃燒中的敵人死亡時，火焰擴散到附近敵人（每秒 ${3 + 2 * l}）`,
      onKill(d, l) {
        if (!d.burning) return;
        G.addArea({ team: 'fx', x: d.x, y: d.y, r: 95, color: '#ff6a2a', visual: 'blast', fxLife: 0.25 });
        for (const e of G.enemiesInRadius(d.x, d.y, 95)) G.applyBurn(e, 3 + 2 * l, 3);
      } },
    ignite: { name: '引燃爆擊', icon: '🎇', rarity: 'rare', desc: (l) => `暴擊燃燒中的敵人時引發爆炸（${8 + 6 * l} 傷害）`,
      onCrit(d, l) { if (d.e.st.burn && d.e.st.burn.t > 0 && G.canProc(d.depth)) G.areaBlast(d.x, d.y, 55, 8 + 6 * l, { tags: ['explosion', 'fire'], depth: d.depth + 1 }); } },
    bulwark: { name: '黃銅之軀', icon: '🪨', rarity: 'common', desc: (l) => `最大生命 +${15 * l}，受到傷害 -${5 * l}%`,
      stat(s, l) { s.maxHp += 15 * l; s.armor += 0.05 * l; } },
    swift: { name: '疾行', icon: '🐾', rarity: 'common', desc: (l) => `移動速度 +${6 * l}%，閃避冷卻 -${10 * l}%`,
      stat(s, l) { s.move += 0.06 * l; s.dashCd *= 1 - 0.1 * l; } },
    // 機匠專屬
    turretscrap: { name: '零件回收', icon: '🔩', rarity: 'rare', chars: ['toby'], desc: (l) => `砲塔結束時化為 ${1 + l} 顆地雷`,
      onSummonEnd(a, l, p) {
        if (a.kind !== 'turret') return;
        for (let i = 0; i < 1 + l; i++) { const an = i * Math.PI * 2 / (1 + l); G.spawnMine(a.x + Math.cos(an) * 28, a.y + Math.sin(an) * 28, { dmg: 22, br: 60 }); }
      } },
    trapburst: { name: '連鎖引信', icon: '🧨', rarity: 'rare', chars: ['toby'], desc: (l) => `陷阱觸發或失效時引發額外爆炸（${12 + 8 * l} 傷害，大範圍）`,
      onTrap(d, l) { if (G.canProc(d.depth)) G.areaBlast(d.x, d.y, 75 + 15 * l, 12 + 8 * l, { tags: ['explosion', 'summon'], depth: d.depth + 1, color: '#ffd447' }); } },
    resonance: { name: '機械共鳴', icon: '🔧', rarity: 'common', chars: ['toby'], desc: (l) => `召喚物攻擊速度 +${20 * l}%，傷害 +${10 * l}%`,
      stat(s, l) { s.summonRate += 0.2 * l; s.summonDmg += 0.1 * l; } },
    // 槍騎士 / 怪盜專屬
    spearecho: { name: '槍鋒共鳴', icon: '🔱', rarity: 'rare', chars: ['grey'], desc: (l) => `近戰普攻命中時 ${20 + 10 * l}% 機率向前射出貫穿槍影（${10 + 5 * l} 傷害）`,
      onHit(d, l, p) {
        if (!d.tags.includes('basic') || !d.tags.includes('melee') || !G.canProc(d.depth) || Math.random() > 0.2 + 0.1 * l) return;
        G.addProj({ x: p.x, y: p.y, vx: Math.cos(p.aim) * 640, vy: Math.sin(p.aim) * 640, r: 7, dmg: 10 + 5 * l, pierce: 999, life: 0.45, kind: 'spear', color: '#c0e0a0', tags: ['projectile'], depth: d.depth + 1, hitSet: [d.e] });
      } },
    ammofever: { name: '彈藥狂熱', icon: '🔥', rarity: 'rare', chars: ['lise'], desc: (l) => `暴擊時自動朝最近的敵人補一槍（${6 + 3 * l} 傷害）`,
      onCrit(d, l, p) {
        if (!G.canProc(d.depth)) return;
        const tg = G.nearestEnemy(p.x, p.y, 400); if (!tg) return;
        const a = Math.atan2(tg.y - p.y, tg.x - p.x);
        G.addProj({ x: p.x, y: p.y, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, r: 4, dmg: 6 + 3 * l, life: 0.6, color: '#ffe08a', kind: 'bolt', tags: ['projectile'], depth: d.depth + 1 });
      } },
    // 姿態切換
    shiftshock: { name: '換檔衝擊', icon: '🔄', rarity: 'common', desc: (l) => `切換姿態時釋放衝擊波（${12 + 8 * l} 傷害）`,
      onSwitch(d, l, p) { G.areaBlast(p.x, p.y, 100, 12 + 8 * l, { tags: ['explosion'], kb: 320, color: '#ffe9a0' }); } },
    rhythm: { name: '雙擺節奏', icon: '🎵', rarity: 'rare', desc: (l) => `切換姿態後，接下來 3 次普攻傷害 +${20 * l}%`,
      onSwitch(d, l, p) { p.rhythm = { n: 3, mul: 1 + 0.2 * l }; } },
    windup: { name: '上緊發條', icon: '🔑', rarity: 'common', desc: (l) => `切換姿態時回復 ${6 + 4 * l} 發條`,
      onSwitch(d, l) { G.addEnergy(6 + 4 * l); } },
    // 禁忌刻印（局外解鎖）
    echo: { name: '時間迴圈', icon: '🔁', rarity: 'epic', locked: true, desc: (l) => `施放技能時 ${12 + 8 * l}% 機率自動再施放一次（60% 威力）`,
      onCast(d, l, p) {
        if (d.echo || Math.random() > 0.12 + 0.08 * l) return;
        G.addAlly({ kind: 'timer', life: 0.25, onEnd() { if (!p.dead && G.state === 'play') { G.SKILLS[d.slot.id].cast(p, d.slot, 0.6); G.addText(p.x, p.y - 26, '迴圈！', '#c9a0ff', 13); } } });
      } },
    overload: { name: '超載', icon: '☢️', rarity: 'epic', locked: true, desc: (l) => `技能傷害 +${25 * l}%，但技能發條消耗 +15%`,
      stat(s, l) { s.costMul *= 1.15; },
      dmgMod(e, o, l) { return o.tags && o.tags.includes('skill') ? 1 + 0.25 * l : 1; } },
    tempest: { name: '指針風暴', icon: '🕛', rarity: 'epic', locked: true, desc: (l) => `每 ${6 - l} 次普攻，像時鐘刻度一樣向四周射出 12 發彈（${5 + 3 * l} 傷害）`,
      onBasic(d, l, p) {
        p.tempestN = (p.tempestN || 0) + 1;
        if (p.tempestN < 6 - l) return;
        p.tempestN = 0;
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; G.addProj({ x: p.x, y: p.y, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, r: 5, dmg: 5 + 3 * l, life: 0.6, kind: 'ember', color: '#a8f0ff', tags: ['projectile'], depth: 1 }); }
      } },
    phoenix: { name: '倒轉沙漏', icon: '⌛', rarity: 'epic', locked: true, desc: (l) => `每次清房後，若生命低於 50%，回復 ${10 * l}% 最大生命`,
      onRoomClear(d, l, p) { if (p.hp < p.maxHp * 0.5) G.healPlayer(p.maxHp * 0.1 * l); } },
  };

  // ---------------- 裝備（不可重複）----------------
  G.RELICS = {
    heart: { name: '鐵心護符', icon: '❤️', desc: '最大生命 +25', stat(s) { s.maxHp += 25; } },
    whetstone: { name: '磨刃石', icon: '🗡️', desc: '傷害 +12%', stat(s) { s.dmgMul += 0.12; } },
    boots: { name: '迅捷之靴', icon: '👢', desc: '移動速度 +12%', stat(s) { s.move += 0.12; } },
    gloves: { name: '機簧手套', icon: '🧤', desc: '攻擊速度 +15%', stat(s) { s.atkSpd += 0.15; } },
    monocle: { name: '鷹眼單片鏡', icon: '🧐', desc: '暴擊率 +10%', stat(s) { s.crit += 0.1; } },
    bonecharm: { name: '碎骨項鍊', icon: '💀', desc: '暴擊傷害 +40%', stat(s) { s.critDmg += 0.4; } },
    hourglass: { name: '沙漏', icon: '⏳', desc: '技能冷卻 -25%', stat(s) { s.cdr += 0.25; } },
    flask: { name: '發條油壺', icon: '🧪', desc: '最大發條 +25，發條獲得 +20%', stat(s) { s.maxEnergy += 25; s.energyGain += 0.2; } },
    fang: { name: '吸血獠牙', icon: '🦷', desc: '命中時 5% 機率回復 1 生命', stat(s) { s.lifeOnHit += 0.05; } },
    scale: { name: '守護之鱗', icon: '🐉', desc: '受到傷害 -12%', stat(s) { s.armor += 0.12; } },
    feather: { name: '閃避羽毛', icon: '🪶', desc: '閃避次數 +1', stat(s) { s.dashMax += 1; } },
    purse: { name: '銅幣袋', icon: '💰', desc: '立即獲得 60 銅幣，銅幣獲得 +20%', stat(s) { s.goldMul += 0.2; }, onPick(p) { p.gold += 60; } },
    flameheart: { name: '火焰之心', icon: '🔥', desc: '燃燒傷害 +60%', stat(s) { s.burnMul += 0.6; } },
    belt: { name: '巨人腰帶', icon: '🎗️', desc: '最大生命 +45，移動速度 -6%', stat(s) { s.maxHp += 45; s.move -= 0.06; } },
    glass: { name: '玻璃大砲', icon: '💎', desc: '傷害 +35%，最大生命 -25', stat(s) { s.dmgMul += 0.35; s.maxHp -= 25; } },
    bell: { name: '寂靜之鐘', icon: '🔔', desc: '技能發條消耗 -20%', stat(s) { s.costMul *= 0.8; } },
    ring: { name: '雷鳴戒指', icon: '💍', desc: '連鎖閃電傷害 +50%，連鎖 +1', stat(s) { s.chainMul += 0.5; s.chainBonus += 1; } },
    moss: { name: '再生苔', icon: '🌿', desc: '每清完一個房間回復 8 生命', onRoomClear() { G.healPlayer(8); } },
    gear: { name: '精密齒輪', icon: '⚙️', desc: '召喚物攻速 +25%，傷害 +20%', stat(s) { s.summonRate += 0.25; s.summonDmg += 0.2; } },
    powder: { name: '火藥桶', icon: '🛢️', desc: '爆炸傷害 +35%', stat(s) { s.explodeMul += 0.35; } },
    magnet: { name: '磁石', icon: '🧲', desc: '拾取範圍 ×2，銅幣獲得 +10%', stat(s) { s.magnet *= 2; s.goldMul += 0.1; } },
    quiver: { name: '獵人箭袋', icon: '🏹', desc: '普攻投射物貫穿 +1', stat(s) { s.pierce += 1; } },
  };

  // ---------------- 局外成長 ----------------
  G.META = [
    { id: 'hp', name: '生命強化', icon: '❤️', desc: (l) => `最大生命 +${10 * l}`, max: 5, cost: [8, 14, 22, 32, 45] },
    { id: 'dmg', name: '鋒刃強化', icon: '🗡️', desc: (l) => `傷害 +${5 * l}%`, max: 5, cost: [10, 18, 28, 40, 55] },
    { id: 'gold', name: '行囊', icon: '💰', desc: (l) => `起始銅幣 +${25 * l}`, max: 3, cost: [6, 12, 20] },
    { id: 'energy', name: '強力發條', icon: '🔋', desc: (l) => `最大發條 +${10 * l}，開局發條全滿`, max: 3, cost: [10, 18, 28] },
    { id: 'reroll', name: '命運骰', icon: '🎲', desc: (l) => `每局可重抽獎勵 ${l} 次`, max: 3, cost: [12, 25, 40] },
    { id: 'revive', name: '倒轉時針', icon: '🕰️', desc: () => '每局可復活一次（50% 生命）', max: 1, cost: [60] },
    { id: 'forbidden', name: '禁忌刻印', icon: '📕', desc: () => '解鎖 4 個史詩刻印：時間迴圈、超載、指針風暴、倒轉沙漏', max: 1, cost: [35] },
    { id: 'toby', name: '解鎖：鐘匠學徒 托比', icon: '⚙️', desc: () => '十字弓與機關召喚物', max: 1, cost: [25] },
    { id: 'grey', name: '解鎖：流浪槍騎士 格雷', icon: '🔱', desc: () => '長槍突刺、衝鋒與天降', max: 1, cost: [35] },
    { id: 'lise', name: '解鎖：鐘塔怪盜 莉絲', icon: '🔫', desc: () => '雙槍、霰彈與死亡預告', max: 1, cost: [45] },
  ];

  // ---------------- 事件 ----------------
  G.EVENTS = [
    { id: 'altar', name: '血之擺鐘', icon: '🕯️', text: '一座生鏽的擺鐘，鐘擺停在半空。底座刻著：「以血上弦。」',
      opts: [
        { label: '獻上 20% 最大生命 → 選擇 1 個刻印', ok: (p) => p.hp > p.maxHp * 0.2 + 1, run(p) { p.hp -= Math.round(p.maxHp * 0.2); G.offerRewards('sigil'); } },
        { label: '離開', run() {} },
      ] },
    { id: 'gamble', name: '流浪賭徒', icon: '🎰', text: '一個沒有停擺的賭徒搖著骰盅：「反正時間多得是，40 銅幣，賭一件好東西？」',
      opts: [
        { label: '支付 40 銅幣（50% 獲得裝備）', ok: (p) => p.gold >= 40, run(p) { p.gold -= 40; if (Math.random() < 0.5) { G.ui.toast('賭贏了！'); G.offerRewards('relic'); } else { G.ui.toast('骰子是空的……賭徒笑著消失了'); } } },
        { label: '離開', run() {} },
      ] },
    { id: 'spring', name: '古老泉眼', icon: '⛲', text: '整座城的噴泉都凝固了，只有這一口還在流動。',
      opts: [
        { label: '飲用：回復 40% 生命', run(p) { G.healPlayer(Math.round(p.maxHp * 0.4)); } },
        { label: '裝瓶：最大生命 +10', run(p) { p.bonusHp += 10; G.recalcStats(); G.healPlayer(10); } },
      ] },
    { id: 'pages', name: '鐘匠的筆記', icon: '📜', text: '一本攤開的筆記，寫滿了機關與招式的草圖。',
      opts: [
        { label: '支付 50 銅幣 → 技能強化（三選一）', ok: (p) => p.gold >= 50, run(p) { p.gold -= 50; G.offerRewards('skill'); } },
        { label: '撕下一頁拿去賣：獲得 30 銅幣', run(p) { p.gold += 30; } },
      ] },
    { id: 'residue', name: '破碎的時之砂', icon: '⏳', text: '地上散落著發光的沙粒。據說吞下去，能短暫偷走別人的時間……',
      opts: [
        { label: '吞下：最大生命 -12，選擇 1 個刻印並隨機升級另一個', run(p) { p.bonusHp -= 12; G.recalcStats(); G.upgradeRandomSigil(); G.offerRewards('sigil'); } },
        { label: '離開', run() {} },
      ] },
  ];
})();
