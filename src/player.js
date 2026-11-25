'use strict';
// ===== 玩家：建立、能力值計算、操作 =====
(() => {
  const U = G.U;

  // ---------- 攻擊動作（蓄力 → 揮擊 → 收招）----------
  G.ANIM = {
    slash: { dur: 0.22, charge: -1.5, strike: 1.35, back: 3, fwd: 7 },
    heavy: { dur: 0.4, charge: -2.1, strike: 1.7, back: 4, fwd: 9 },
    sweep: { dur: 0.36, charge: -2.5, strike: 2.5, back: 3, fwd: 6 },
    thrust: { dur: 0.22, ext: 18, back: 4, fwd: 9 },
    cast: { dur: 0.26, charge: -0.8, strike: 0.15, back: 2, fwd: 3 },
    throw: { dur: 0.3, charge: -2.0, strike: 0.6, back: 3, fwd: 6 },
    shoot: { dur: 0.14, recoil: 4 },
    blast: { dur: 0.3, recoil: 8, kick: -0.4 },
    spin: { dur: 0.45 },
  };
  const SKILL_ANIM = { whirl: 'spin', wave: 'slash', shadowstep: 'thrust', cleave: 'heavy', fireball: 'cast', orbit: 'cast', meteor: 'cast', frostnova: 'cast',
    turret: 'throw', mines: 'throw', tesla: 'throw', saw: 'throw', charge: 'thrust', javelin: 'throw', spikering: 'heavy', leap: 'heavy',
    roll: 'spin', barrage: 'shoot', mark: 'shoot', grenade: 'throw' };
  // strike 會在動作 32% 時觸發（近戰的命中判定就在這一刻）
  G.playAnim = (p, type, o = {}) => {
    if (p.anim && p.anim.strike && !p.anim.fired) { p.anim.fired = true; p.anim.strike(); }
    p.anim = { type, t: 0, dur: o.dur || G.ANIM[type].dur, side: o.side || 1, strike: o.strike || null, fired: false };
  };
  const ease = (x) => 1 - (1 - x) * (1 - x);
  // 由動作狀態算出：武器角度偏移、往前伸出的距離、身體前後位移
  G.weaponPose = (p) => {
    const ranged = p.char === 'mira' || p.char === 'toby' || p.char === 'lise';
    const idle = (ranged ? 0.08 : 0.45) + Math.sin(G.time * 2) * 0.04;
    const A = p.anim;
    if (!A) return { off: idle, ext: 0, body: 0 };
    const D = G.ANIM[A.type], k = Math.min(1, A.t / A.dur);
    if (A.type === 'spin') return { off: k * Math.PI * 4, ext: 0, body: 0 };
    if (A.type === 'shoot' || A.type === 'blast') {
      const r = (1 - k) * (1 - k);
      return { off: (D.kick || 0) * r * A.side, ext: -D.recoil * r, body: -D.recoil * 0.4 * r };
    }
    if (A.type === 'thrust') {
      if (k < 0.3) { const e = ease(k / 0.3); return { off: 0, ext: -D.back * e, body: -D.back * e }; }
      if (k < 0.45) { const e = (k - 0.3) / 0.15; return { off: 0, ext: -D.back + (D.ext + D.back) * e, body: -D.back + (D.fwd + D.back) * e }; }
      const e = ease((k - 0.45) / 0.55); return { off: 0, ext: D.ext * (1 - e), body: D.fwd * (1 - e) };
    }
    let off, body;
    if (k < 0.3) { const e = ease(k / 0.3); off = idle + (D.charge - idle) * e; body = -D.back * e; }
    else if (k < 0.45) { const e = (k - 0.3) / 0.15; off = D.charge + (D.strike - D.charge) * e; body = -D.back + (D.fwd + D.back) * e; }
    else { const e = ease((k - 0.45) / 0.55); off = D.strike + (idle - D.strike) * e; body = D.fwd * (1 - e); }
    return { off: off * A.side, ext: 0, body };
  };

  G.makePlayer = (charId) => {
    const C = G.CHARS[charId], m = G.meta.up;
    const p = {
      char: charId, x: 480, y: 470, r: 12, vx: 0, vy: 0, aim: -Math.PI / 2,
      hp: 1, maxHp: 1, energy: 0, bonusHp: 0,
      dashT: 0, dashDir: 0, dashCharges: 1, dashRe: 0, iframes: 0, hurtFlash: 0,
      atkCd: 0, combo: 0, comboT: 0, forcedCrits: 0, nextBasicMul: 1, stance: 0, switchCd: 0, busy: 0, z: 0, spin: 0,
      slots: [{ id: C.start, ups: {}, cd: 0 }, null],
      sigils: {}, relics: [], gold: 25 * (m.gold || 0),
      stats: null, buffAtk: null, moveMulT: null, lunge: null, walkT: 0,
    };
    G.player = p;
    G.recalcStats(true);
    p.hp = p.maxHp;
    p.energy = (m.energy || 0) > 0 ? p.stats.maxEnergy : 40;
    p.dashCharges = p.stats.dashMax;
    return p;
  };

  G.recalcStats = (init) => {
    const p = G.player, C = G.CHARS[p.char], m = G.meta.up;
    const s = {
      maxHp: C.hp + 10 * (m.hp || 0) + p.bonusHp, move: 1, speed: C.speed, dmgMul: 1 + 0.05 * (m.dmg || 0), atkSpd: 1,
      crit: 0.05, critDmg: 1.6, cdr: 0, armor: 0, maxEnergy: 100 + 10 * (m.energy || 0), energyGain: 1, goldMul: 1,
      burnMul: 1, costMul: 1, dashMax: 1, dashCd: 0.85, summonRate: 1, summonDmg: 1, chainMul: 1, chainBonus: 0,
      explodeMul: 1, lifeOnHit: 0, magnet: 1, pierce: 0, bounce: 0,
    };
    const stc = C.stances[p.stance || 0]; if (stc.stat) stc.stat(s);
    for (const id of p.relics) { const r = G.RELICS[id]; if (r.stat) r.stat(s); }
    for (const id in p.sigils) { const sg = G.SIGILS[id]; if (sg.stat) sg.stat(s, p.sigils[id]); }
    s.armor = Math.min(0.6, s.armor);
    s.cdr = Math.min(0.6, s.cdr);
    s.maxHp = Math.max(20, Math.round(s.maxHp));
    const old = p.maxHp;
    p.stats = s;
    p.maxHp = s.maxHp;
    if (!init) {
      if (p.maxHp > old) p.hp += p.maxHp - old;
      p.hp = Math.min(p.hp, p.maxHp);
      p.energy = Math.min(p.energy, s.maxEnergy);
      p.dashCharges = Math.min(p.dashCharges, s.dashMax);
    }
  };

  G.switchStance = () => {
    const p = G.player, C = G.CHARS[p.char];
    p.stance = (p.stance + 1) % C.stances.length;
    p.switchCd = 0.8; p.combo = 0; p.atkCd = Math.min(p.atkCd, 0.1);
    G.recalcStats();
    const st = C.stances[p.stance];
    G.addText(p.x, p.y - 30, st.icon + ' ' + st.name, C.color, 14);
    G.addArea({ team: 'fx', x: p.x, y: p.y, r: 34, color: C.color, visual: 'blast', fxLife: 0.25, follow: p });
    G.audio.play('select'); G.audio.play('swing');
    G.emit('onSwitch', {});
  };

  G.skillCost = (slot) => {
    const S = G.SKILLS[slot.id];
    return Math.max(5, Math.round((S.cost + (S.costMod ? S.costMod(slot) : 0)) * G.player.stats.costMul));
  };

  G.updatePlayer = (dt) => {
    const p = G.player, I = G.input, s = p.stats;
    if (!p || p.dead) return;
    p.iframes = Math.max(0, p.iframes - dt);
    p.hurtFlash = Math.max(0, p.hurtFlash - dt);
    if (p.buffAtk) { p.buffAtk.t -= dt; if (p.buffAtk.t <= 0) p.buffAtk = null; }
    if (p.moveMulT) { p.moveMulT.t -= dt; if (p.moveMulT.t <= 0) p.moveMulT = null; }
    p.energy = Math.min(s.maxEnergy, p.energy + 3 * dt * s.energyGain);

    // 瞄準
    p.aim = Math.atan2(I.my - p.y, I.mx - p.x);

    // 姿態切換
    p.switchCd = Math.max(0, p.switchCd - dt);
    if ((I.hit('KeyR') || I.mpressed[1]) && p.switchCd <= 0) G.switchStance();

    // 攻擊動作推進
    if (p.anim) {
      p.anim.t += dt;
      if (p.anim.strike && !p.anim.fired && p.anim.t >= p.anim.dur * 0.32) { p.anim.fired = true; p.anim.strike(); }
      if (p.anim.t >= p.anim.dur) p.anim = null;
    }

    // 衝鋒、跳躍等動作中：位置交給技能控制
    if (p.busy > 0) {
      p.busy -= dt;
      for (const sl of p.slots) if (sl) sl.cd = Math.max(0, sl.cd - dt);
      return;
    }

    // 移動
    let mx = 0, my = 0;
    if (I.down('KeyA', 'ArrowLeft')) mx -= 1;
    if (I.down('KeyD', 'ArrowRight')) mx += 1;
    if (I.down('KeyW', 'ArrowUp')) my -= 1;
    if (I.down('KeyS', 'ArrowDown')) my += 1;
    const ml = Math.hypot(mx, my);
    if (ml > 0) { mx /= ml; my /= ml; }

    // 閃避
    if (p.dashCharges < s.dashMax) {
      p.dashRe += dt;
      if (p.dashRe >= s.dashCd) { p.dashRe = 0; p.dashCharges++; }
    }
    if (I.hit('Space', 'ShiftLeft', 'ShiftRight') && p.dashCharges > 0 && p.dashT <= 0) {
      p.dashCharges--;
      p.dashT = 0.16;
      p.dashDir = ml > 0 ? Math.atan2(my, mx) : p.aim;
      G.audio.play('dash');
      G.fx.dust(p.x, p.y + 10, 8);
      G.emit('onDash', {});
    }

    if (p.dashT > 0) {
      p.dashT -= dt;
      p.vx = Math.cos(p.dashDir) * 640; p.vy = Math.sin(p.dashDir) * 640;
      if (Math.random() < 0.9) G.addPart({ x: p.x, y: p.y, life: 0.25, size: 11, color: G.CHARS[p.char].cloak, drag: 0.8, ghost: true });
      if (p.dashT <= 0) p.iframes = Math.max(p.iframes, 0.08);
    } else {
      const sp = s.speed * s.move * (p.moveMulT ? p.moveMulT.m : 1) * (p.atkCd > 0 && (p.char === 'erin' || p.char === 'grey') ? (p.char === 'erin' && p.stance === 1 ? 0.6 : 0.82) : 1);
      p.vx = U.lerp(p.vx, mx * sp, 0.35); p.vy = U.lerp(p.vy, my * sp, 0.35);
    }
    let vx = p.vx, vy = p.vy;
    if (p.lunge) { p.lunge.t -= dt; vx += Math.cos(p.lunge.a) * p.lunge.s; vy += Math.sin(p.lunge.a) * p.lunge.s; if (p.lunge.t <= 0) p.lunge = null; }
    p.x += vx * dt; p.y += vy * dt;
    G.collideWorld(p);
    if (ml > 0) p.walkT += dt;

    // 普攻
    p.atkCd -= dt;
    p.comboT -= dt;
    if (p.comboT <= 0) p.combo = 0;
    if ((I.mdown[0] || I.down('KeyJ')) && p.atkCd <= 0 && p.dashT <= 0) {
      let crit = false;
      if (p.forcedCrits > 0) { p.forcedCrits--; crit = true; }
      let bonus = p.nextBasicMul; p.nextBasicMul = 1;
      if (p.rhythm && p.rhythm.n > 0) { bonus *= p.rhythm.mul; p.rhythm.n--; }
      const iv = G.BASICS[p.char][p.stance](p, bonus, crit);
      const spd = s.atkSpd + (p.buffAtk ? p.buffAtk.amt : 0);
      p.atkCd = iv / spd;
      p.comboT = 0.65;
      G.emit('onBasic', {});
    }

    // 技能
    for (let i = 0; i < 2; i++) {
      const sl = p.slots[i];
      if (!sl) continue;
      sl.cd = Math.max(0, sl.cd - dt);
      const pressed = i === 0 ? (I.mpressed[2] || I.mdown[2] || I.down('KeyQ', 'KeyK')) : I.down('KeyE', 'KeyL');
      if (pressed && sl.cd <= 0) {
        const cost = G.skillCost(sl);
        if (p.energy >= cost) {
          p.energy -= cost;
          const S = G.SKILLS[sl.id];
          sl.cd = S.cd * (1 - s.cdr);
          if (SKILL_ANIM[sl.id]) G.playAnim(p, SKILL_ANIM[sl.id], { side: Math.random() < 0.5 ? 1 : -1 });
          S.cast(p, sl, 1);
          G.emit('onCast', { slot: sl, echo: false });
        } else if (I.hit('KeyQ', 'KeyE', 'KeyK', 'KeyL') || I.mpressed[2]) {
          p.noEnergyT = 0.4;
          G.audio.play('select');
        }
      }
    }
    p.noEnergyT = Math.max(0, (p.noEnergyT || 0) - dt);
  };
})();
