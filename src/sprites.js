'use strict';
// ===== 像素精靈圖：全部用字元陣列手繪，執行時轉成小畫布 =====
// 符號調色盤：o 外框、S/s 膚色、H/h 頭髮、A/a 主布料、C/c 副布料、L/l 褲子、B 靴子、
//             M/m/n 金屬三階、G/g 金色、W 白、K 黑、X 特色色（眼睛發光、寶石等）
(() => {
  const BASE = {
    o: '#1b1420', S: '#f2c9a0', s: '#c9946c', W: '#f6efe2', w: '#c8c0b4', M: '#c4ccd8', m: '#7a8496', n: '#4a5262',
    G: '#e8c050', g: '#a8802a', B: '#4a3426', b: '#2e2018', K: '#2a2430',
  };

  // ---------- 角色（16×22，面向右）----------
  const LEGS = {
    idle: ['......oLLooLLo..', '......olLoolLo..', '......oBBooBBo..', '......oooooooo..'],
    w1: ['.....oLLo.oLLo..', '.....olLo..olLo.', '.....oBBo..oBBo.', '.....oooo..oooo.'],
    w2: ['......oLLoLLo...', '......olLolLo...', '......oBBoBBo...', '......oooooo....'],
  };
  const ROBE = {
    idle: ['...oaAAAAAAAAo..', '...oaaAAAAAaAo..', '....oaaaaaaaao..', '.....oBBooBBo...'],
    w1: ['...oaAAAAAAAAAo.', '...oaaAAAAAAaAo.', '....oaaaaaaaaao.', '....oBBo...oBBo.'],
    w2: ['..oaAAAAAAAAo...', '..oaaAAAAAaAo...', '...oaaaaaaaao...', '.....oBBoBBo....'],
  };
  const CHARS = {
    erin: {
      pal: { H: '#d0503e', h: '#8a2c26', A: '#a83040', a: '#6e1e2c', C: '#8a2030', c: '#5a1420', L: '#4a4e5e', l: '#2e3240' },
      body: [
        '................',
        '................',
        '......oooooo....',
        '.....oHHHHHHo...',
        '....oHHHHHHHHo..',
        '...oHHHHSSSSSo..',
        '..ohHHHSSSoSSo..',
        '..ohoHHSSSSSso..',
        '..oho.osSSSso...',
        '..oho..ooSSo....',
        '...o..oMMMMMoo..',
        '....ocMMWMMMMMo.',
        '...occMMWMMmMSo.',
        '...occmMMMMmMSo.',
        '...occGGGGGGGo..',
        '...occAAAAAAAo..',
        '...occaAAAAAao..',
        '....oooaAoAAao..',
      ],
    },
    mira: {
      robe: true,
      pal: { H: '#f0d070', h: '#b89838', A: '#5a3a8a', a: '#3a2460', C: '#3a2460', c: '#241640', L: '#3a2460', l: '#241640' },
      body: [
        '..........oo....',
        '.........oAo....',
        '........oAAo....',
        '.......oAAAo....',
        '......oAAGAAo...',
        '....ooAAAAAAAoo.',
        '...oaaaaaaaaaaao',
        '....oHHSSSSSHo..',
        '...ohHSSSoSSSo..',
        '...ohHSSSSSSso..',
        '...ohho.osSso...',
        '....oo.oAAAAoo..',
        '....ocAAGAAAAAo.',
        '...occAAGAAaASo.',
        '...ocaAAGAAaASo.',
        '...ocaAAGAAAAo..',
        '...ocaGGGGGGGo..',
        '...oaaAAAAAAAo..',
      ],
    },
    toby: {
      pal: { H: '#8a5a32', h: '#5a3a20', A: '#9a6a3a', a: '#6a4626', C: '#3a6a9a', c: '#244a6e', L: '#4a3a2e', l: '#30261e', X: '#9fe0ff' },
      body: [
        '................',
        '................',
        '.....ooooooo....',
        '....ohHhHHHHo...',
        '...ohHHHHHHHHo..',
        '...oMXMooMXMHo..',
        '...ohHSSSSSSSo..',
        '...ohSSSSSoSSo..',
        '...ohSSSSSSSso..',
        '....oosSSSsoo...',
        '.....oooSSoo....',
        '....oCCAAAACCo..',
        '...oCCAAAAAACSo.',
        '...oCcAAGAAAcSo.',
        '...oCcAAAAAAco..',
        '...ogGgGgGgGgo..',
        '...oCcAAAAAAco..',
        '....ooAAAAAAoo..',
      ],
    },
    grey: {
      pal: { H: '#5a6a4a', h: '#3a4630', A: '#4e7a3a', a: '#2e4a22', C: '#c8463c', c: '#8a2c26', L: '#5a5e6a', l: '#3a3e48' },
      body: [
        '..........CC....',
        '.........CCc....',
        '......ooooCo....',
        '.....oMMMMMMo...',
        '....oMMMMMMMMo..',
        '....oMmMMMMMMo..',
        '....oMmnnnnnno..',
        '....oMmMMMMMMo..',
        '....omMMMMMMmo..',
        '.....oommmmoo...',
        '....ooMMMMMMoo..',
        '...omMAAAAAAMMo.',
        '...omMAAGAAAMSo.',
        '...omMAGGGAAmSo.',
        '...omMAAGAAAmo..',
        '...ommAAAAAAmo..',
        '....omAAAAAAmo..',
        '....oooaAaaoo...',
      ],
    },
    lise: {
      pal: { H: '#e8e4f0', h: '#a8a0b8', A: '#7a3a8a', a: '#4e2058', C: '#7a3a8a', c: '#4e2058', L: '#2a2430', l: '#1a1620', X: '#e05ad0' },
      body: [
        '................',
        '......oooooo....',
        '......oKKKKo....',
        '......oKKKKo....',
        '......oXXXXo....',
        '....ooKKKKKKoo..',
        '....oooooooooo..',
        '....oHHSSSSSHo..',
        '...ohHAAAAoAAo..',
        '...ohHSSSSSSso..',
        '...ohho.osSso...',
        '....oo.oWWWWoo..',
        '....oAAAWWWAAAo.',
        '...oaAAAWGWAASo.',
        '...oaAAAWGWAASo.',
        '...oaAAAAAAAAo..',
        '...oaaAAAAAAAao.',
        '...oaao.oAAo.aao',
      ],
    },
  };

  // ---------- 武器（面向右，grip 是握把位置）----------
  const WEAPONS = {
    sword: { grip: [2, 2], pal: {}, rows: [
      '..o................',
      '.oGo.oooooooooooo..',
      'oBGGoMWWWWWWWWWWWo.',
      '.oGo.ommmmmmmmmmmmo',
      '..o..oooooooooooo..',
    ] },
    greatsword: { grip: [3, 3], pal: {}, rows: [
      '...oo...................',
      '..oGGo.ooooooooooooooo..',
      '.oGgGGoMWWWWWWWWWWWWWWo.',
      'oBBGGGoMMMMMMMMMMMMMMMMo',
      '.oGgGGommmmmmmmmmmmmmmo.',
      '..oGGo.ooooooooooooooo..',
      '...oo...................',
    ] },
    staff_fire: { grip: [4, 2], pal: { X: '#ffb347', x: '#ff6a2a' }, rows: [
      '...................ooo..',
      '..................oXXXo.',
      'ooooooooooooooooooXWXXxo',
      'oBBBBBBBBBBBBBBBGoXXXxo.',
      'ooooooooooooooooo.oxxo..',
    ] },
    staff_frost: { grip: [4, 2], pal: { X: '#9fdcff', x: '#4aa0e0' }, rows: [
      '...................ooo..',
      '..................oXXXo.',
      'ooooooooooooooooooXWXXxo',
      'oBBBBBBBBBBBBBBBGoXXXxo.',
      'ooooooooooooooooo.oxxo..',
    ] },
    crossbow: { grip: [3, 4], pal: {}, rows: [
      '.......oo......',
      '........oMo....',
      '.........oMo...',
      'ooooooooooMooo.',
      'oBBBBBBBBBBWMo.',
      'ooooooooooMooo.',
      '.........oMo...',
      '........oMo....',
      '.......oo......',
    ] },
    heavybow: { grip: [3, 5], pal: {}, rows: [
      '........ooo.......',
      '.........oMMo.....',
      '..........oMMo....',
      '...........oMMo...',
      'ooooooooooooMMooo.',
      'oBBBBBBBBBBBBBWWMo',
      'ooooooooooooMMooo.',
      '...........oMMo...',
      '..........oMMo....',
      '.........oMMo.....',
      '........ooo.......',
    ] },
    spear: { grip: [8, 2], pal: { C: '#c8463c' }, rows: [
      '.........................ooo....',
      'ooooooooooooooooooooooooMMWoo...',
      'oBBBBBBBBBBBBBBBBBBBBCCoMWWWWMoo',
      'ooooooooooooooooooooooooMMWoo...',
      '.........................ooo....',
    ] },
    halberd: { grip: [8, 4], pal: { C: '#c8463c' }, rows: [
      '.....................ooooo.......',
      '.....................oMMMMo......',
      '.....................oMWWMoooo...',
      'oooooooooooooooooooooomMMWWWWoo..',
      'oBBBBBBBBBBBBBBBBBBCCooMWWWWWWMo',
      'oooooooooooooooooooooomMMWWWWoo..',
      '.....................oMWWMoooo...',
      '.....................oMMMMo......',
      '.....................ooooo.......',
    ] },
    pistol: { grip: [1, 3], pal: { X: '#e05ad0' }, rows: [
      '.oooooooo..',
      'oKKKKKKKKo.',
      'oKXooKKKKMo',
      'oKKo.oooo..',
      'oKKo.......',
      '.oo........',
    ] },
    shotgun: { grip: [5, 2], pal: { X: '#e05ad0' }, rows: [
      '.....ooooooooooo.',
      'oooooKKKKKKKKKKKo',
      'oBBBBXKKKKKKKKKMo',
      'oBBBoKKoooooooo..',
      '.ooo.oo..........',
    ] },
  };

  // ---------- 敵人（面向右，兩個影格）----------
  const ENEMIES = {
    rat: { pal: { M: '#b0946a', m: '#7a6444', X: '#ff4a3a', G: '#e8c050' }, rows: [
      '..............',
      '......oooo....',
      '....ooMMMMoo..',
      '...oMMMMMMMMo.',
      'o..oMmMMMMXMoo',
      'oo.oMMMMMMMMMo',
      '.oooMmmmmmMMo.',
      '....oGo..oGo..',
      '....ooo..ooo..',
    ], alt: { 7: '...oGo....oGo.', 8: '...ooo....ooo.' } },
    skeleton: { pal: { A: '#5a6278', a: '#3a4052', X: '#ff4a3a', L: '#3a4052' }, rows: [
      '....oooo....',
      '...oMMMMo...',
      '..oMMMMMMo..',
      '..oMnnnXno..',
      '..oMMMMMMo..',
      '...oooooo...',
      '..oAAAAAAo..',
      '.oAAAGAAAAo.',
      '.oAaAGAAaAo.',
      '.oSaAGAAaSo.',
      '..oAAAAAAo..',
      '..ogggggggo.',
      '..oAAooAAo..',
      '..oLLooLLo..',
      '..oBBooBBo..',
      '..oooooooo..',
    ], alt: { 13: '.oLLo..oLLo.', 14: '.oBBo..oBBo.', 15: '.oooo..oooo.' } },
    archer: { pal: { A: '#5a7a46', a: '#3a5430', X: '#ffd447', L: '#3a3028' }, rows: [
      '....oooo....',
      '...oAAAAo...',
      '..oAAAAAAo..',
      '..oAKKKXKo..',
      '..oAKKKKKo..',
      '...oAAAAo...',
      '..oAAAAAAo..',
      '.oAAaAAAAAo.',
      '.oAaAGGAaAo.',
      '.oAaAAAAaSo.',
      '..oAAAAAAo..',
      '..oaAAAAao..',
      '..oLLooLLo..',
      '..oLLooLLo..',
      '..oBBooBBo..',
      '..oooooooo..',
    ], alt: { 13: '.oLLo..oLLo.', 14: '.oBBo..oBBo.', 15: '.oooo..oooo.' } },
    bomber: { pal: { G: '#e0702e', g: '#9a4418', X: '#ffe36a' }, rows: [
      '....oooo....',
      '..ooGGGGoo..',
      '.oGGgGGgGGo.',
      '.oGgGXXGgGo.',
      'oGGGXXXXGGGo',
      'oGgGGXXGGgGo',
      '.oGGgGGgGGo.',
      '..ooGGGGoo..',
      '.o.o.oo.o.o.',
      'o.o..oo..o.o',
    ], alt: { 8: 'o.o..oo..o.o', 9: '.o.o.oo.o.o.' } },
    caster: { pal: { A: '#4a5aa0', a: '#2e3a70', X: '#9fe0ff' }, rows: [
      '....oooo....',
      '...oAAAAo...',
      '..oAAAAAAo..',
      '..oASSSSAo..',
      '..oASXSXAo..',
      '...oSSSSo...',
      '..oAAGGAAo..',
      '.oAAAGGAAAo.',
      '.oAAAGGAAAo.',
      'oSAAAAAAAASo',
      '.oAAAAAAAAo.',
      '.oAaAAAAaAo.',
      '.oAaAAAAaAo.',
      'oaAaAAAAaAao',
      'oaaaaaaaaaao',
      '.oooooooooo.',
    ], alt: { 13: '.oaAaAAAaAao', 14: '.oaaaaaaaaao', 15: '..ooooooooo.' } },
    brute: { pal: { M: '#8a909c', m: '#5e6470', n: '#3a3e48', G: '#c9a04a', g: '#8a6a2a', X: '#ff4a3a' }, rows: [
      '......oooooo......',
      '.....oMMMMMMo.....',
      '....oMMMMMMMMo....',
      '....oMnXnnXnMo....',
      '....oMMMMMMMMo....',
      '..ooommmmmmmmooo..',
      '.oMMMMMMMMMMMMMMo.',
      'oMMmMMMGGGGMMMmMMo',
      'oMMmMMGggggGMMmMMo',
      'oMMmMMGgXXgGMMmMMo',
      'oMMmMMGggggGMMmMMo',
      'oMMooMMGGGGMMooMMo',
      'onno.oMMMMMMo.onno',
      'onno.oMMooMMo.onno',
      '.oo..oMMooMMo..oo.',
      '.....onnoonno.....',
      '.....onnoonno.....',
      '.....oooooooo.....',
    ], alt: { 15: '....onno..onno....', 16: '....onno..onno....', 17: '....oooo..oooo....' } },
    wisp: { pal: { X: '#5ad1c9', W: '#e0fffb', G: '#e8c050' }, rows: [
      '....oooo....',
      '...oXXXXo...',
      '..oXWWXXXo..',
      '..oXWXXXXo..',
      '.oXXXXXXXXo.',
      '.oXXoXXoXXo.',
      '.oXXXXXXXXo.',
      'oXXXXXXXXXXo',
      'oooooooooooo',
      '.....oGo....',
      '.....oGo....',
      '......o.....',
    ], alt: { 9: '....oGo.....', 10: '....oGo.....', 11: '.....o......' } },
    priest: { pal: { A: '#8a7a3a', a: '#5a4e22', X: '#ffe36a' }, rows: [
      '....oooo..oo',
      '...oKKKKo.oG',
      '..oKKKKKKooG',
      '..oKSSSSKoGo',
      '..oKSXSXKoGo',
      '...oSSSSo.Go',
      '..oWWAAWWoGo',
      '.oWWWAAWWSGo',
      '.oAWWAAWWAo.',
      '.oAAWAAWAAo.',
      '.oAAAAAAAAo.',
      '.oAaAAAAaAo.',
      '.oAaAAAAaAo.',
      'oaAaAAAAaAao',
      'oaaaaaaaaaao',
      '.oooooooooo.',
    ], alt: { 13: '.oaAaAAAaAao', 14: '.oaaaaaaaaao', 15: '..ooooooooo.' } },
  };

  // ---------- 轉成畫布 ----------
  const build = (rows, pal, white) => {
    const h = rows.length, w = Math.max(...rows.map((r) => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (!ch || ch === '.') continue;
      const col = white ? (ch === 'o' ? '#7a7080' : '#ffffff') : (pal[ch] || BASE[ch]);
      if (!col) continue;
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    return c;
  };
  const fix = (rows, w) => rows.map((r) => (r.length < w ? r + '.'.repeat(w - r.length) : r.slice(0, w)));

  const S = G.SPR = { chars: {}, weapons: {}, enemies: {} };
  S.init = () => {
    for (const id in CHARS) {
      const c = CHARS[id], legs = c.robe ? ROBE : LEGS, pal = Object.assign({}, c.pal);
      const fr = {};
      for (const k of ['idle', 'w1', 'w2']) {
        const rows = fix(c.body.concat(legs[k]), 16);
        fr[k] = build(rows, pal); fr[k + '_w'] = build(rows, pal, true);
      }
      S.chars[id] = fr;
    }
    for (const id in WEAPONS) { const w = WEAPONS[id]; S.weapons[id] = { img: build(w.rows, w.pal), grip: w.grip }; }
    for (const id in ENEMIES) {
      const e = ENEMIES[id], w = Math.max(...e.rows.map((r) => r.length));
      const r0 = fix(e.rows, w), r1 = r0.map((r, i) => (e.alt && e.alt[i] ? fix([e.alt[i]], w)[0] : r));
      S.enemies[id] = [build(r0, e.pal), build(r1, e.pal), build(r0, e.pal, true)];
    }
  };
  // 手的位置（精靈圖像素座標，面向右）
  S.HAND = [13, 13];
  S.SCALE = 2;
})();
