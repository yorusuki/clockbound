'use strict';
// ===== 主迴圈 =====
(() => {
  const STEP = 1 / 60;
  const defMeta = () => ({ crystals: 0, up: {}, stats: { runs: 0, wins: 0, bestFloor: 0 } });
  G.meta = Object.assign(defMeta(), G.save.load() || {});
  G.meta.up = G.meta.up || {}; G.meta.stats = Object.assign(defMeta().stats, G.meta.stats || {});
  G.saveMeta = () => G.save.write(G.meta);

  const canvas = document.getElementById('game');
  G.input.init(canvas);
  G.render.init(canvas);
  G.SPR.init();
  G.ui.init();
  G.ui.showTitle();

  const step = (dt) => {
    const I = G.input;
    if (G.state === 'play') {
      if (I.hit('Escape', 'Tab')) { G.ui.showPause(); return true; }
      if (G.debug) debugKeys();
      if (G.stopT > 0) { G.stopT -= dt; return false; }
      G.resetProcBudget();
      G.run.time += dt;
      G.updatePlayer(dt);
      G.updateEnemyHoming(dt);
      G.updateEnemies(dt);
      G.updateProjs(dt);
      G.updateAreas(dt);
      G.updateAllies(dt);
      G.updatePickups(dt);
      if (G.state === 'play' && G.room) G.updateRoom(dt);
      G.updateFx(dt);
    } else if (G.state === 'dying') {
      G.dyingT -= dt;
      G.updateFx(dt); G.updateAreas(dt); G.updateProjs(dt);
      if (G.dyingT <= 0) { G.endRun(false); G.state = 'over'; G.ui.showEnd(false); }
    }
    G.shakeAmt *= Math.pow(0.002, dt);
    if (G.shakeAmt < 0.3) G.shakeAmt = 0;
    G.fade = Math.max(0, G.fade - dt * 3);
    return true;
  };

  const debugKeys = () => {
    const I = G.input;
    if (I.hit('Digit9')) for (const e of G.enemies) if (!e.dead) G.hitEnemy(e, 99999, { noProc: true });
    if (I.hit('Digit0')) { G.player.gold += 100; G.run.crystals += 10; }
    if (I.hit('Digit8')) { G.godMode = !G.godMode; G.ui.toast('無敵 ' + (G.godMode ? '開' : '關')); }
    if (G.godMode) G.player.hp = G.player.maxHp;
  };

  // 給自動化測試用：直接推進一步
  G._step = (dt = STEP) => { if (step(dt)) G.input.endFrame(); };

  let last = performance.now(), acc = 0;
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (G.freeze) { G.render.draw(); requestAnimationFrame(frame); return; } // 測試用：凍結畫面
    G.time += dt;
    if (G.state === 'play' || G.state === 'dying') G.fx.update(dt * (G.stopT > 0 ? 0.25 : 1));
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) {
      const consumed = step(STEP);
      if (consumed) G.input.endFrame();
      acc -= STEP; n++;
    }
    if (n >= 5) acc = 0;
    G.render.draw();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
