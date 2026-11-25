'use strict';
// ===== 冒險流程：樓層、房間、波次、獎勵、商店、事件 =====
(() => {
  const U = G.U;
  const ROOMS_PER_FLOOR = 7; // 第 7 間是首領
  G.FLOORS = [
    { name: '齒輪下城', boss: 'colossus', pool: { rat: 4, skeleton: 3, archer: 2.5, bomber: 2 }, pal: { floor: '#2a231e', floor2: '#322920', wall: '#120e0a', accent: '#b87333', gear: '#5a3e26' } },
    { name: '月光歌劇院', boss: 'raven', pool: { rat: 2, skeleton: 3, archer: 2.5, bomber: 2, caster: 2.5, brute: 1.5, wisp: 2 }, pal: { floor: '#1e2430', floor2: '#252c3a', wall: '#0c0f16', accent: '#5a8a9a', gear: '#2e3e52' } },
    { name: '大鐘塔', boss: 'witch', pool: { skeleton: 2.5, archer: 2, bomber: 2, caster: 2.5, brute: 2, wisp: 2.5, priest: 1.5 }, pal: { floor: '#221c2c', floor2: '#2a2236', wall: '#0e0a14', accent: '#d4a84a', gear: '#4a3a5a' } },
  ];
  G.ROOM_TYPES = {
    skill: { label: '技能', icon: '📘', color: '#5aa0ff' },
    sigil: { label: '刻印', icon: '✴️', color: '#ff8a3d' },
    relic: { label: '裝備', icon: '🎁', color: '#ffd447' },
    gold: { label: '銅幣', icon: '🪙', color: '#ffe08a' },
    heal: { label: '生命果', icon: '🍎', color: '#6dff8a' },
    elite: { label: '精英', icon: '💀', color: '#ff5a5a' },
    shop: { label: '商店', icon: '🛒', color: '#c9a0ff' },
    event: { label: '事件', icon: '❓', color: '#9fd8ff' },
    fountain: { label: '泉水', icon: '⛲', color: '#6dd8ff' },
    boss: { label: '首領', icon: '👑', color: '#ff3b3b' },
    next: { label: '下一層', icon: '🌀', color: '#c9a0ff' },
  };

  // ---------------- 開始 / 結束 ----------------
  G.startRun = (charId) => {
    G.run = { char: charId, floor: 1, num: 0, rerolls: G.meta.up.reroll || 0, crystals: 0, kills: 0, time: 0, damageTaken: 0, goldEarned: 0,
      reviveAvail: (G.meta.up.revive || 0) > 0, shopSeen: false };
    G.meta.stats.runs++;
    G.saveMeta();
    G.makePlayer(charId);
    G.state = 'play';
    G.ui.hideAll();
    G.enterRoom({ type: 'combat', reward: U.pick(['sigil', 'skill']) });
    G.ui.banner('第 1 層', G.FLOORS[0].name);
    G.story.runStart();
  };

  G.endRun = (won) => {
    const r = G.run;
    const floorReached = r.floor;
    G.meta.crystals += r.crystals;
    G.meta.stats.bestFloor = Math.max(G.meta.stats.bestFloor || 0, floorReached);
    if (won) G.meta.stats.wins++;
    G.saveMeta();
  };

  G.onPlayerDeath = () => {
    G.audio.play('lose');
    G.shake(12);
    G.state = 'dying';
    G.dyingT = 1.4;
  };

  // ---------------- 樓層／門的選項 ----------------
  const genDoorOptions = () => {
    const r = G.run, next = r.num + 1;
    if (next === ROOMS_PER_FLOOR) return [{ type: 'boss' }];
    if (next === ROOMS_PER_FLOOR - 1) {
      const opts = [{ type: 'fountain' }, { type: r.shopSeen ? 'event' : 'shop' }];
      if (Math.random() < 0.6) opts.push({ type: 'combat', reward: U.pick(['relic', 'sigil']) });
      return opts;
    }
    const n = Math.random() < 0.45 ? 3 : 2;
    const pool = [
      { type: 'combat', reward: 'sigil', w: 4 }, { type: 'combat', reward: 'skill', w: 3.2 }, { type: 'combat', reward: 'relic', w: 1.8 },
      { type: 'combat', reward: 'gold', w: 1.3 }, { type: 'combat', reward: 'heal', w: 1 + (1 - G.player.hp / G.player.maxHp) * 2 },
      { type: 'elite', w: next >= 3 ? 1.3 : 0 }, { type: 'shop', w: r.shopSeen ? 0.2 : next >= 3 ? 1.6 : 0.6 }, { type: 'event', w: 1.2 },
    ];
    const out = [];
    for (let i = 0; i < n; i++) {
      const pk = U.weighted(pool, (o) => (out.some((x) => x.type === o.type && x.reward === o.reward) ? 0 : o.w));
      out.push({ type: pk.type, reward: pk.reward });
    }
    if (next === 5 && !r.shopSeen && !out.some((o) => o.type === 'shop')) out[0] = { type: 'shop' };
    return out;
  };

  const openDoors = () => {
    const room = G.room;
    if (room.doorsOpen) return;
    room.doorsOpen = true;
    let opts;
    if (room.type === 'boss') opts = [{ type: G.run.floor >= 3 ? 'win' : 'next' }];
    else opts = genDoorOptions();
    const A = G.ARENA, n = opts.length;
    room.doors = opts.map((o, i) => ({ ...o, x: A.x1 + (A.x2 - A.x1) * (i + 1) / (n + 1), y: A.y1, open: 0 }));
    G.audio.play('door');
  };
  G.openDoors = openDoors;

  // ---------------- 房間生成 ----------------
  const genObstacles = (type) => {
    const A = G.ARENA, obs = [];
    if (type === 'boss') {
      if (G.run.floor === 1) { for (const [x, y] of [[230, 200], [690, 200], [230, 380], [690, 380]]) obs.push({ x: x - 18, y: y - 18, w: 36, h: 36 }); }
      return obs;
    }
    if (type === 'shop' || type === 'fountain' || type === 'event') {
      obs.push({ x: A.x1 + 80, y: A.y1 + 120, w: 34, h: 34 }, { x: A.x2 - 114, y: A.y1 + 120, w: 34, h: 34 });
      return obs;
    }
    const n = U.randInt(2, 5);
    for (let tries = 0; obs.length < n && tries < 80; tries++) {
      const w = U.randInt(30, 70), h = U.randInt(30, 70);
      const x = U.rand(A.x1 + 70, A.x2 - 70 - w), y = U.rand(A.y1 + 90, A.y2 - 110 - h);
      if (Math.abs(x + w / 2 - 480) < 90 && y + h > A.y2 - 150) continue;
      if (obs.some((o) => x < o.x + o.w + 60 && x + w + 60 > o.x && y < o.y + o.h + 60 && y + h + 60 > o.y)) continue;
      obs.push({ x, y, w, h });
    }
    return obs;
  };

  const genWaves = (type) => {
    const r = G.run, f = r.floor;
    const pool = G.FLOORS[f - 1].pool;
    const waves = [];
    const nw = type === 'elite' ? 2 : r.num <= 2 && f === 1 ? 2 : 3;
    for (let w = 0; w < nw; w++) {
      let budget = (4 + f * 2.5 + r.num * 0.7) * (w === nw - 1 ? 1.25 : 1) * (type === 'elite' ? 0.8 : 1);
      const list = [];
      if (type === 'elite') {
        const types = Object.keys(pool).filter((t) => t !== 'rat' && t !== 'bomber');
        list.push({ type: U.pick(types), elite: true });
      }
      while (budget > 0.9) {
        const t = U.weighted(Object.keys(pool), (k) => (G.ENEMIES[k].cost <= budget + 0.5 ? pool[k] : 0));
        list.push({ type: t, elite: f >= 2 && Math.random() < 0.04 * f });
        budget -= G.ENEMIES[t].cost;
      }
      waves.push(list);
    }
    return waves;
  };

  G.enterRoom = (opt) => {
    const r = G.run;
    r.num++;
    if (opt.type === 'shop') r.shopSeen = true;
    G.room = { type: opt.type, reward: opt.reward, phase: 'enter', t: 0, doors: [], doorsOpen: false, waves: [], waveIdx: -1, spawnQ: [], obstacles: genObstacles(opt.type) };
    G.enemies = []; G.projs = []; G.areas = []; G.allies = []; G.pickups = []; G.npcs = []; G.parts = []; G.texts = [];
    G.fx.clear();
    G.room.bg = G.render.makeRoomBg(G.FLOORS[r.floor - 1].pal, G.room.obstacles);
    const p = G.player;
    p.x = 480; p.y = G.ARENA.y2 - 34; p.vx = 0; p.vy = 0; p.iframes = 0.8; p.lunge = null;
    G.fade = 1;
    if (opt.type === 'combat' || opt.type === 'elite') {
      G.room.waves = genWaves(opt.type);
    } else if (opt.type === 'boss') {
      G.room.bossId = G.FLOORS[r.floor - 1].boss;
    } else {
      G.room.phase = 'peace';
      const kind = opt.type;
      if (kind === 'shop') G.room.stock = G.genShop();
      if (kind === 'event') G.room.event = U.pick(G.EVENTS);
      G.npcs.push({ kind, x: 480, y: 250, r: 22, used: false, near: false });
      openDoors();
    }
    G.emit('onRoomStart', {});
  };

  G.queueSpawn = (type, x, y, elite, minion) => {
    G.room.spawnQ.push({ type, x, y, elite, minion, t: 0.75 });
  };

  const spawnWave = (list) => {
    const A = G.ARENA, p = G.player;
    for (const it of list) {
      let x, y;
      for (let i = 0; i < 40; i++) {
        x = U.rand(A.x1 + 40, A.x2 - 40); y = U.rand(A.y1 + 40, A.y2 - 60);
        if (Math.hypot(x - p.x, y - p.y) > 220 && !G.pointBlocked(x, y)) break;
      }
      G.queueSpawn(it.type, x, y, it.elite);
    }
  };

  G.updateRoom = (dt) => {
    const room = G.room, p = G.player;
    room.t += dt;
    // 生成佇列
    for (const s of room.spawnQ) {
      s.t -= dt;
      if (s.t <= 0) {
        s.done = true;
        const e = G.makeEnemy(s.type, s.x, s.y, s.elite, s.minion);
        G.enemies.push(e);
        G.burst(s.x, s.y, '#7a4aa0', 10, 140, 0.4, 3);
        G.fx.ring(s.x, s.y + 8, 22, '#a07ad0', 0.3, 2, true);
      }
    }
    room.spawnQ = room.spawnQ.filter((s) => !s.done);

    if (room.phase === 'enter' && room.t > 0.6) {
      if (room.type === 'boss') {
        room.phase = 'combat';
        const b = G.makeBoss(room.bossId, 480, 200);
        G.enemies.push(b); room.boss = b;
        G.audio.play('boss'); G.shake(8);
        G.ui.banner(b.name, G.FLOORS[G.run.floor - 1].name + ' 的守護者');
        G.story.bossStart(G.run.floor);
      } else { room.phase = 'combat'; }
    }
    if (room.phase === 'combat' && room.type !== 'boss') {
      if (G.enemies.length === 0 && room.spawnQ.length === 0) {
        room.waveIdx++;
        if (room.waveIdx < room.waves.length) spawnWave(room.waves[room.waveIdx]);
        else G.roomCleared();
      }
    }
    // 門
    if (room.doorsOpen) {
      for (const d of room.doors) {
        d.open = Math.min(1, d.open + dt * 2);
        if (d.open >= 1 && Math.abs(p.x - d.x) < 30 && p.y < G.ARENA.y1 + p.r + 6) { G.goThroughDoor(d); break; }
      }
    }
    // NPC
    for (const n of G.npcs) {
      const near = Math.hypot(p.x - n.x, p.y - n.y) < n.r + p.r + 8;
      if (near && !n.near) G.touchNpc(n);
      n.near = near;
    }
  };

  G.roomCleared = () => {
    const room = G.room, r = G.run;
    room.phase = 'cleared';
    G.audio.play('clear');
    r.crystals += room.type === 'elite' ? 3 : 1;
    G.emit('onRoomClear', {});
    G.projs = G.projs.filter((pr) => pr.team !== 'enemy');
    G.areas = G.areas.filter((a) => a.team !== 'enemy');
    const rw = room.type === 'elite' ? U.pick(['relic', 'sigil', 'skill']) : room.reward;
    if (rw === 'gold') { G.dropGold(480, 290, Math.round((35 + r.floor * 15) * G.player.stats.goldMul)); openDoors(); }
    else if (rw === 'heal') { G.dropHeal(480, 290, Math.round(G.player.maxHp * 0.3)); G.player.bonusHp += 5; G.recalcStats(); G.addText(480, 270, '最大生命 +5', '#6dff8a', 14); openDoors(); }
    else G.npcs.push({ kind: 'reward', reward: rw, elite: room.type === 'elite', x: 480, y: 290, r: 16, used: false, near: false });
  };

  G.onBossDefeated = (b) => {
    const r = G.run;
    for (const e of G.enemies) if (!e.dead && e !== b) { e.noLoot = true; e.dead = true; G.burst(e.x, e.y, e.color, 8, 150, 0.5, 3); }
    G.room.spawnQ = [];
    G.projs = G.projs.filter((pr) => pr.team !== 'enemy');
    G.areas = G.areas.filter((a) => a.team !== 'enemy');
    G.room.phase = 'cleared';
    r.crystals += [10, 15, 25][r.floor - 1];
    G.hitstop(0.12); G.shake(5);
    G.audio.play('win');
    G.dropGold(b.x, b.y, 50 + r.floor * 25);
    G.dropHeal(b.x, b.y + 30, Math.round(G.player.maxHp * 0.35));
    G.emit('onRoomClear', {});
    if (r.floor >= 3) {
      G.addAlly({ kind: 'timer', life: 2.2, onEnd() { G.endRun(true); G.story.ending(() => { G.state = 'over'; G.ui.showEnd(true); }); } });
    } else {
      G.npcs.push({ kind: 'reward', reward: 'relic', boss: true, x: 480, y: 290, r: 16, used: false, near: false });
    }
  };

  G.goThroughDoor = (d) => {
    if (G.state !== 'play') return;
    G.audio.play('door');
    if (d.type === 'win') return;
    if (d.type === 'next') {
      G.run.floor++; G.run.num = 0; G.run.shopSeen = false;
      G.ui.banner('第 ' + G.run.floor + ' 層', G.FLOORS[G.run.floor - 1].name);
      G.enterRoom({ type: 'combat', reward: U.pick(['sigil', 'skill', 'relic']) });
      G.story.floorStart(G.run.floor);
      return;
    }
    G.enterRoom(d);
  };

  G.touchNpc = (n) => {
    if (n.kind === 'reward' && !n.used) {
      n.used = true;
      n.dead = true;
      G.offerRewards(n.reward, { elite: n.elite, boss: n.boss, after: openDoors });
    } else if (n.kind === 'shop') G.ui.showShop();
    else if (n.kind === 'fountain' && !n.used) {
      n.used = true;
      G.healPlayer(Math.round(G.player.maxHp * 0.45));
      G.burst(n.x, n.y, '#6dd8ff', 24, 200, 0.7, 3, true);
    } else if (n.kind === 'event' && !n.used) {
      n.used = true;
      G.ui.showEvent(G.room.event);
    }
    G.npcs = G.npcs.filter((x) => !x.dead);
  };

  // ---------------- 獎勵 ----------------
  const sigilPool = () => {
    const p = G.player;
    return Object.keys(G.SIGILS).filter((id) => {
      const s = G.SIGILS[id];
      if (s.locked && !G.meta.up.forbidden) return false;
      if (s.chars && !s.chars.includes(p.char)) return false;
      return (p.sigils[id] || 0) < 3;
    });
  };
  const sigilOption = (id) => {
    const s = G.SIGILS[id], cur = G.player.sigils[id] || 0;
    return { kind: 'sigil', id, icon: s.icon, name: s.name, rarity: s.rarity, lvl: cur + 1, tag: cur ? `刻印 升級 Lv${cur + 1}` : '刻印 新獲得',
      desc: s.desc(cur + 1), apply: () => G.grantSigil(id) };
  };
  G.grantSigil = (id) => {
    const p = G.player;
    p.sigils[id] = (p.sigils[id] || 0) + 1;
    G.recalcStats();
    const s = G.SIGILS[id];
    if (s.onPick) s.onPick(p.sigils[id], p);
  };
  G.upgradeRandomSigil = () => {
    const p = G.player;
    const ids = Object.keys(p.sigils).filter((id) => p.sigils[id] < 3);
    if (!ids.length) return;
    const id = U.pick(ids);
    G.grantSigil(id);
    G.ui.toast(`${G.SIGILS[id].name} 升到 Lv${p.sigils[id]}`);
  };
  const relicPool = () => Object.keys(G.RELICS).filter((id) => !G.player.relics.includes(id));
  const relicOption = (id) => {
    const r = G.RELICS[id];
    return { kind: 'relic', id, icon: r.icon, name: r.name, rarity: 'relic', tag: '裝備', desc: r.desc,
      apply: () => { const p = G.player; p.relics.push(id); if (r.onPick) r.onPick(p); G.recalcStats(); } };
  };
  const skillOptions = () => {
    const p = G.player, C = G.CHARS[p.char], out = [];
    const owned = p.slots.filter(Boolean).map((s) => s.id);
    if (!p.slots[1]) {
      for (const id of U.shuffle(C.skills.filter((k) => !owned.includes(k))).slice(0, 2)) {
        const S = G.SKILLS[id];
        out.push({ kind: 'skill', id, icon: S.icon, name: S.name, rarity: 'skill', tag: '新技能（E 鍵）', desc: S.desc + `（消耗 ${S.cost} 發條）`,
          apply: () => { p.slots[1] = { id, ups: {}, cd: 0 }; } });
      }
    }
    const ups = [];
    p.slots.forEach((sl, si) => {
      if (!sl) return;
      const S = G.SKILLS[sl.id];
      for (const u of S.ups) {
        const cur = sl.ups[u.id] || 0;
        if (cur < u.max) ups.push({ kind: 'upgrade', icon: S.icon, name: `${S.name}：${u.name}`, rarity: 'skill', tag: `技能強化${u.max > 1 ? ` ${cur + 1}/${u.max}` : ''}（${si === 0 ? 'Q' : 'E'}）`,
          desc: u.desc, apply: () => { sl.ups[u.id] = cur + 1; } });
      }
    });
    U.shuffle(ups);
    while (out.length < 3 && ups.length) out.push(ups.shift());
    return out;
  };

  G.genRewardOptions = (type, o = {}) => {
    const p = G.player;
    let opts = [];
    if (type === 'skill') {
      opts = skillOptions();
      if (opts.length < 3) type = 'sigil';
    }
    if (type === 'relic') {
      const pool = U.shuffle(relicPool());
      opts = pool.slice(0, 3).map(relicOption);
      if (opts.length < 3) type = 'sigil';
    }
    if (type === 'sigil') {
      const pool = sigilPool();
      const picked = [];
      while (picked.length < 3 && picked.length < pool.length) {
        const id = U.weighted(pool, (k) => (picked.includes(k) ? 0 : G.RARITY_W[G.SIGILS[k].rarity] * (p.sigils[k] ? 1.4 : 1) * (o.elite && G.SIGILS[k].rarity !== 'common' ? 2 : 1)));
        picked.push(id);
      }
      const extra = opts;
      opts = picked.map(sigilOption);
      if (extra.length && opts.length) opts[opts.length - 1] = extra[0];
    }
    return opts.slice(0, 3);
  };

  G.offerRewards = (type, o = {}) => {
    const titles = { skill: '選擇一項技能強化', sigil: '選擇一個刻印', relic: '選擇一件裝備' };
    const gen = () => G.genRewardOptions(type, o);
    G.ui.showChoices(titles[type] || '選擇獎勵', gen(), gen, () => { if (o.after) o.after(); });
  };

  // ---------------- 商店 ----------------
  G.genShop = () => {
    const f = G.run.floor, m = 1 + 0.2 * (f - 1), p = G.player, stock = [];
    const sp = U.shuffle(sigilPool()).slice(0, 2);
    for (const id of sp) { const o = sigilOption(id); o.price = Math.round(({ common: 55, rare: 80, epic: 120 })[G.SIGILS[id].rarity] * m); stock.push(o); }
    const rp = U.shuffle(relicPool())[0];
    if (rp) { const o = relicOption(rp); o.price = Math.round(130 * m); stock.push(o); }
    const so = skillOptions().filter((x) => x.kind === 'upgrade' || x.kind === 'skill')[0];
    if (so) { so.price = Math.round(90 * m); stock.push(so); }
    stock.push({ kind: 'heal', icon: '🍷', name: '療傷藥水', rarity: 'common', tag: '消耗品', desc: '回復 40% 最大生命', price: Math.round(45 * m),
      apply: () => G.healPlayer(Math.round(p.maxHp * 0.4)) });
    return stock;
  };
})();
