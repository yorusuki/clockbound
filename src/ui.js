'use strict';
// ===== 介面（DOM 疊層）=====
(() => {
  const U = G.U;
  const ui = G.ui = {};
  let root, layer, bannerEl, toastEl;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const rarityName = { common: '普通', rare: '稀有', epic: '史詩', relic: '裝備', skill: '技能' };

  ui.init = () => {
    root = document.getElementById('ui');
    layer = document.createElement('div'); layer.className = 'layer'; root.appendChild(layer);
    bannerEl = document.createElement('div'); bannerEl.className = 'banner'; root.appendChild(bannerEl);
    toastEl = document.createElement('div'); toastEl.className = 'toast'; root.appendChild(toastEl);
    window.addEventListener('keydown', (e) => {
      if (ui.keyHandler) ui.keyHandler(e);
    });
  };
  ui.hideAll = () => { layer.innerHTML = ''; layer.className = 'layer'; ui.keyHandler = null; G.input.pressed = {}; G.input.mpressed = [false, false, false]; };
  const show = (html, cls = '') => { layer.className = 'layer show ' + cls; layer.innerHTML = html; return layer; };
  const btn = (sel, fn) => { layer.querySelectorAll(sel).forEach((b) => b.addEventListener('click', (ev) => { G.audio.init(); G.audio.play('select'); fn(b, ev); })); };

  ui.banner = (title, sub) => {
    bannerEl.innerHTML = `<div class="b-title">${esc(title)}</div>${sub ? `<div class="b-sub">${esc(sub)}</div>` : ''}`;
    bannerEl.classList.remove('on'); void bannerEl.offsetWidth; bannerEl.classList.add('on');
  };
  ui.toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.remove('on'); void toastEl.offsetWidth; toastEl.classList.add('on');
  };

  // ---------------- 標題 ----------------
  ui.showTitle = () => {
    G.state = 'title';
    show(`
      <div class="title-wrap">
        <div class="logo">逆鐘之城</div>
        <div class="logo-en">CLOCKBOUND</div>
        <div class="tagline">午夜前一分鐘，整座城的時間停止了。<br>你是少數還能移動的人。</div>
        <div class="col">
          <button class="big" data-go="camp">開始冒險</button>
          <button data-go="story">序章</button>
          <button data-go="help">操作說明</button>
        </div>
        <div class="foot">Roguelite 動作原型 · 進度會存在這個瀏覽器</div>
      </div>`, 'title');
    btn('[data-go=camp]', () => ui.showCamp());
    btn('[data-go=story]', () => ui.showStory(() => ui.showTitle()));
    btn('[data-go=help]', () => ui.showHelp(() => ui.showTitle()));
  };

  ui.showStory = (back) => {
    show(`<div class="panel story"><h2>序章・停在 11:59 的城</h2>${G.STORY.prologue.map((t) => `<p>${esc(t)}</p>`).join('')}<div class="row"><button class="big" data-back>返回</button></div></div>`);
    btn('[data-back]', back);
    ui.keyHandler = (e) => { if (e.code === 'Escape') back(); };
  };

  ui.showHelp = (back) => {
    show(`
      <div class="panel help">
        <h2>操作說明</h2>
        <table>
          <tr><td>WASD / 方向鍵</td><td>移動</td></tr>
          <tr><td>滑鼠</td><td>瞄準</td></tr>
          <tr><td>左鍵（按住）/ J</td><td>普通攻擊，命中會轉緊「發條」</td></tr>
          <tr><td>右鍵 / Q</td><td>技能 1（消耗發條）</td></tr>
          <tr><td>E</td><td>技能 2（拿到第二個技能後）</td></tr>
          <tr><td>R / 滑鼠中鍵</td><td>切換姿態（每個角色兩種）</td></tr>
          <tr><td>空白鍵 / Shift</td><td>閃避（無敵）</td></tr>
          <tr><td>Esc / Tab</td><td>暫停、查看目前的構築</td></tr>
          <tr><td>空白鍵 / 點擊</td><td>對話下一句（Esc 跳過）</td></tr>
        </table>
        <h3>玩法</h3>
        <p>每層 7 個房間，最後一間是首領。清完房間後走進上方的門，門上的圖示代表下個房間的獎勵。</p>
        <p>每個角色有<b>兩種姿態</b>，普攻和能力都不同，隨時可以切換。有些刻印會在切換時觸發。</p>
        <p><b>刻印</b>是被動效果，很多會互相觸發（例如「過去的殘影」的追擊也能觸發「連鎖閃電」）。找出能形成循環的組合，就是這個遊戲的樂趣。</p>
        <p>死亡後保留 ⏳ 時之砂，可以在工坊購買永久強化、解鎖新角色。每個角色破關都有自己的結局。</p>
        <button data-back>返回</button>
      </div>`);
    btn('[data-back]', back);
    ui.keyHandler = (e) => { if (e.code === 'Escape') back(); };
  };

  // ---------------- 營地（鐘匠工坊）----------------
  let selChar = 'erin';
  const isLocked = (c) => c.lockedBy && !G.meta.up[c.lockedBy];
  ui.showCamp = () => {
    G.state = 'camp';
    const m = G.meta, ends = m.endings || {};
    if (!G.CHARS[selChar]) selChar = 'erin';
    const roster = Object.values(G.CHARS).map((c) => `
      <div class="tile ${selChar === c.id ? 'sel' : ''} ${isLocked(c) ? 'locked' : ''}" data-char="${c.id}">
        <div class="t-icon" style="background:${c.cloak};border-color:${c.color}">${isLocked(c) ? '🔒' : c.icon}</div>
        <div class="t-name">${c.name}${ends[c.id] ? '<span class="star">✦</span>' : ''}</div>
        <div class="t-sub">${c.weapon}</div>
      </div>`).join('');
    const c = G.CHARS[selChar], S = G.SKILLS[c.start], locked = isLocked(c);
    const detail = `
      <div class="detail">
        <div class="d-head"><b>${c.name}</b><span>${c.title}・${c.weapon}・生命 ${c.hp}</span></div>
        <div class="d-desc">${esc(c.desc)}</div>
        <div class="stances">${c.stances.map((st, i) => `<div class="st"><b>${st.icon} ${i === 0 ? '姿態一' : '姿態二'}：${st.name}</b><small>${esc(st.desc)}</small></div>`).join('')}</div>
        <div class="d-foot">起始技能 ${S.icon} ${S.name}：${esc(S.desc)}</div>
        <div class="d-foot">${locked ? '🔒 在右側用時之砂解鎖' : ends[c.id] ? `✦ 已見結局：${esc(G.STORY.chars[c.id].ending.title)}` : '結局：尚未見證'}</div>
      </div>`;
    const ups = G.META.map((u) => {
      const lv = m.up[u.id] || 0, maxed = lv >= u.max, cost = u.cost[lv];
      return `<div class="meta ${maxed ? 'maxed' : ''}">
        <div class="m-icon">${u.icon}</div>
        <div class="m-body"><div class="m-name">${u.name} <span>${lv}/${u.max}</span></div><div class="m-desc">${esc(u.desc(Math.max(1, maxed ? lv : lv + 1)))}</div></div>
        <button data-buy="${u.id}" ${maxed || m.crystals < cost ? 'disabled' : ''}>${maxed ? '已滿' : '⏳ ' + cost}</button>
      </div>`;
    }).join('');
    const st = m.stats;
    show(`
      <div class="camp">
        <div class="camp-head"><h2>🛠️ 鐘匠工坊</h2><div class="crys">⏳ 時之砂 ${m.crystals}</div></div>
        <div class="camp-body">
          <div class="camp-left"><h3>選擇角色</h3><div class="roster">${roster}</div>${detail}
            <div class="stats">冒險次數 ${st.runs}・通關 ${st.wins}・最深到達第 ${st.bestFloor || 0} 層・結局 ${Object.keys(ends).length}/${Object.keys(G.CHARS).length}</div></div>
          <div class="camp-right"><h3>永久強化</h3><div class="metas">${ups}</div></div>
        </div>
        <div class="camp-foot">
          <button data-back>返回標題</button>
          <button class="big" data-start ${locked ? 'disabled' : ''}>出發 ▶</button>
        </div>
      </div>`, 'camp-layer');
    btn('[data-char]', (b) => { selChar = b.dataset.char; ui.showCamp(); });
    btn('[data-buy]', (b) => {
      const u = G.META.find((x) => x.id === b.dataset.buy), lv = m.up[u.id] || 0;
      if (lv >= u.max || m.crystals < u.cost[lv]) return;
      m.crystals -= u.cost[lv]; m.up[u.id] = lv + 1; G.saveMeta();
      G.audio.play('pick');
      if (G.CHARS[u.id]) selChar = u.id;
      ui.showCamp();
    });
    btn('[data-back]', () => ui.showTitle());
    btn('[data-start]', () => { if (!isLocked(G.CHARS[selChar])) G.startRun(selChar); });
    ui.keyHandler = (e) => { if (e.code === 'Enter' && !isLocked(G.CHARS[selChar])) G.startRun(selChar); };
  };

  // ---------------- 對話 ----------------
  ui.showDialog = (lines, done) => {
    G.state = 'menu';
    let i = 0, shown = 0, timer = null;
    let ended = false;
    const finish = () => { if (ended) return; ended = true; i = lines.length; clearInterval(timer); ui.hideAll(); G.state = 'play'; if (done) done(); };
    const draw = () => {
      const L = lines[i];
      const full = L.text;
      layer.className = 'layer show dialog-layer';
      layer.innerHTML = `
        <div class="dialog ${L.who ? '' : 'narr'}" data-next>
          ${L.who ? `<div class="dl-face" style="border-color:${L.color || '#c9a04a'}">${L.icon || '❔'}</div>` : ''}
          <div class="dl-body">
            ${L.who ? `<div class="dl-name" style="color:${L.color || '#ffd9b0'}">${esc(L.who)}</div>` : ''}
            <div class="dl-text"></div>
            <div class="dl-hint">${i + 1}/${lines.length}　點擊或空白鍵繼續・Esc 跳過</div>
          </div>
        </div>`;
      const tx = layer.querySelector('.dl-text');
      shown = 0; clearInterval(timer);
      timer = setInterval(() => { shown = Math.min(full.length, shown + 1); tx.textContent = full.slice(0, shown); if (shown >= full.length) clearInterval(timer); }, 28);
      layer.querySelector('[data-next]').addEventListener('click', next);
    };
    const next = () => {
      if (i >= lines.length) return;
      const full = lines[i].text;
      if (shown < full.length) { shown = full.length; clearInterval(timer); layer.querySelector('.dl-text').textContent = full; return; }
      i++;
      if (i >= lines.length) finish(); else { G.audio.play('select'); draw(); }
    };
    draw();
    ui.keyHandler = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); next(); }
      else if (e.code === 'Escape') finish();
    };
  };

  // ---------------- 三選一 ----------------
  const cardHtml = (o, i, extra = '') => `
    <div class="card r-${o.rarity}" data-i="${i}">
      <div class="k-key">${i + 1}</div>
      <div class="k-icon">${o.icon}</div>
      <div class="k-name">${esc(o.name)}</div>
      <div class="k-tag">${esc(o.tag)}${o.rarity && rarityName[o.rarity] && o.kind === 'sigil' ? '・' + rarityName[o.rarity] : ''}</div>
      <div class="k-desc">${esc(o.desc)}</div>
      ${extra}
    </div>`;
  ui.showChoices = (title, opts, regen, done) => {
    G.state = 'menu';
    const render = () => {
      const r = G.run;
      show(`
        <div class="choose">
          <h2>${esc(title)}</h2>
          <div class="cards">${opts.map((o, i) => cardHtml(o, i)).join('')}</div>
          <div class="row">
            ${regen ? `<button data-reroll ${r.rerolls > 0 ? '' : 'disabled'}>🎲 重抽（剩 ${r.rerolls} 次）</button>` : ''}
            <button data-build>查看構築</button>
          </div>
        </div>`);
      btn('.card', (b) => pick(+b.dataset.i));
      btn('[data-reroll]', () => { if (r.rerolls <= 0) return; r.rerolls--; opts = regen(); render(); });
      btn('[data-build]', () => ui.showBuild(render));
      ui.keyHandler = (e) => {
        const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
        if (n != null && opts[n]) pick(n);
      };
    };
    const pick = (i) => {
      const o = opts[i];
      if (!o) return;
      o.apply();
      G.audio.play('pick');
      ui.hideAll();
      G.state = 'play';
      if (done) done();
    };
    if (!opts.length) { ui.toast('已經沒有可以獲得的東西了'); if (done) done(); G.state = 'play'; return; }
    render();
  };

  // ---------------- 商店 ----------------
  ui.showShop = () => {
    G.state = 'menu';
    const p = G.player, stock = G.room.stock;
    const render = () => {
      show(`
        <div class="choose shop">
          <h2>🛒 流浪商人</h2>
          <div class="sub">「停擺的城裡撿來的好東西，便宜賣你。」　你有 🪙 ${p.gold}</div>
          <div class="cards wrap">${stock.map((o, i) => cardHtml(o, i, `<button class="buy" data-buy="${i}" ${o.sold || p.gold < o.price ? 'disabled' : ''}>${o.sold ? '已售出' : '🪙 ' + o.price}</button>`)).join('')}</div>
          <div class="row"><button data-build>查看構築</button><button data-close class="big">離開（Esc）</button></div>
        </div>`);
      btn('[data-buy]', (b) => {
        const o = stock[+b.dataset.buy];
        if (o.sold || p.gold < o.price) return;
        p.gold -= o.price; o.sold = true; o.apply(); G.audio.play('coin'); G.audio.play('pick');
        // 技能類商品買完後，其他技能商品的內容可能已過時 → 重新產生描述以外的項目不處理
        render();
      });
      btn('[data-build]', () => ui.showBuild(render));
      btn('[data-close]', close);
      ui.keyHandler = (e) => { if (e.code === 'Escape') close(); };
    };
    const close = () => { ui.hideAll(); G.state = 'play'; };
    render();
  };

  // ---------------- 事件 ----------------
  ui.showEvent = (ev) => {
    G.state = 'menu';
    const p = G.player;
    show(`
      <div class="panel event">
        <div class="ev-icon">${ev.icon}</div>
        <h2>${esc(ev.name)}</h2>
        <p>${esc(ev.text)}</p>
        <div class="col">${ev.opts.map((o, i) => `<button data-o="${i}" ${o.ok && !o.ok(p) ? 'disabled' : ''}>${esc(o.label)}</button>`).join('')}</div>
      </div>`);
    btn('[data-o]', (b) => {
      const o = ev.opts[+b.dataset.o];
      ui.hideAll(); G.state = 'play';
      o.run(p);
    });
  };

  // ---------------- 構築 / 暫停 ----------------
  const buildHtml = () => {
    const p = G.player, s = p.stats, C = G.CHARS[p.char];
    const skills = p.slots.map((sl, i) => {
      if (!sl) return `<div class="b-skill empty">${i === 0 ? 'Q' : 'E'}：（空，技能房可獲得）</div>`;
      const S = G.SKILLS[sl.id];
      const ups = S.ups.filter((u) => sl.ups[u.id]).map((u) => `${u.name}${u.max > 1 ? ' ' + sl.ups[u.id] : ''}`).join('、');
      return `<div class="b-skill"><b>${i === 0 ? 'Q' : 'E'}：${S.icon} ${S.name}</b>（${G.skillCost(sl)} 發條）<br><small>${esc(S.desc)}${ups ? '<br>強化：' + esc(ups) : ''}</small></div>`;
    }).join('');
    const sig = Object.keys(p.sigils).map((id) => { const g = G.SIGILS[id]; return `<div class="b-item r-${g.rarity}"><span>${g.icon}</span><div><b>${g.name} Lv${p.sigils[id]}</b><small>${esc(g.desc(p.sigils[id]))}</small></div></div>`; }).join('') || '<div class="none">還沒有刻印</div>';
    const rel = p.relics.map((id) => { const r = G.RELICS[id]; return `<div class="b-item r-relic"><span>${r.icon}</span><div><b>${r.name}</b><small>${esc(r.desc)}</small></div></div>`; }).join('') || '<div class="none">還沒有裝備</div>';
    const pct = (v) => Math.round(v * 100) + '%';
    return `
      <div class="build">
        <div class="b-col">
          <h3>${C.icon} ${C.name}・${C.title}</h3><div class="b-skill"><b>目前姿態：${C.stances[p.stance].icon} ${C.stances[p.stance].name}</b>（R 切換）<br><small>${esc(C.stances[p.stance].desc)}</small></div>
          ${skills}
          <div class="b-stats">
            <div>生命 ${Math.ceil(p.hp)}/${p.maxHp}</div><div>傷害 ${pct(s.dmgMul)}</div>
            <div>攻速 ${pct(s.atkSpd)}</div><div>暴擊 ${pct(s.crit)} / ${pct(s.critDmg)}</div>
            <div>移速 ${pct(s.move)}</div><div>減傷 ${pct(s.armor)}</div>
            <div>冷卻縮減 ${pct(s.cdr)}</div><div>發條上限 ${s.maxEnergy}</div>
          </div>
        </div>
        <div class="b-col"><h3>刻印</h3><div class="b-list">${sig}</div></div>
        <div class="b-col"><h3>裝備</h3><div class="b-list">${rel}</div></div>
      </div>`;
  };
  ui.showBuild = (back) => {
    show(`<div class="panel wide">${buildHtml()}<div class="row"><button data-back class="big">返回</button></div></div>`);
    btn('[data-back]', back);
    ui.keyHandler = (e) => { if (e.code === 'Escape' || e.code === 'Tab') { e.preventDefault(); back(); } };
  };
  ui.showPause = () => {
    G.state = 'pause';
    show(`<div class="panel wide"><h2>暫停</h2>${buildHtml()}
      <div class="row">
        <button data-sound>${G.audio.muted ? '🔇 音效：關' : '🔊 音效：開'}</button>
        <button data-help>操作說明</button>
        <button data-quit>放棄這次冒險</button>
        <button data-resume class="big">繼續（Esc）</button>
      </div></div>`);
    btn('[data-resume]', ui.resume);
    btn('[data-sound]', () => { G.audio.muted = !G.audio.muted; ui.showPause(); });
    btn('[data-help]', () => ui.showHelp(ui.showPause));
    btn('[data-quit]', () => { G.endRun(false); G.state = 'over'; ui.showEnd(false, true); });
    ui.keyHandler = (e) => { if (e.code === 'Escape' || e.code === 'Tab') { e.preventDefault(); ui.resume(); } };
  };
  ui.resume = () => { ui.hideAll(); G.state = 'play'; };

  // ---------------- 結算 ----------------
  ui.showEnd = (won, quit) => {
    const r = G.run;
    bannerEl.classList.remove('on');
    const t = Math.floor(r.time), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    show(`
      <div class="panel end ${won ? 'won' : ''}">
        <h1>${won ? '🌅 十二點的鐘聲' : quit ? '你暫時離開了鐘城' : '你的懷錶停了……'}</h1>
        <p>${won ? `結局「${esc(G.STORY.chars[G.player.char].ending.title)}」已收錄。` : `「${esc(G.story.deathLine())}」<br>時之砂會留下來，讓下一次的你更強。`}</p>
        <div class="end-stats">
          <div><b>${r.floor}</b><span>到達樓層</span></div>
          <div><b>${r.kills}</b><span>擊敗敵人</span></div>
          <div><b>${mm}:${ss}</b><span>冒險時間</span></div>
          <div><b>⏳ ${r.crystals}</b><span>獲得時之砂</span></div>
        </div>
        <button class="big" data-camp>回到工坊</button>
      </div>`);
    btn('[data-camp]', () => { G.room = null; ui.showCamp(); });
    ui.keyHandler = null;
  };
})();
