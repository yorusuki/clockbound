# 逆鐘之城：Godot 版（戰鬥切片）

用 Godot 4.3 開啟這個資料夾（`project.godot`）即可執行。設計規劃見 `../docs/DESIGN.md`，繪圖提示詞見 `../docs/ART_PROMPTS.md`。

## 目前內容（階段 B1）

- 2.5D 斜俯視：後牆正面、柱子有正面與頂面、角色依前後位置互相遮擋、地面範圍畫成橢圓、子彈有高度與影子
- 艾琳的零件骨架（暫代圖，之後換成 GPT 畫的零件）：跑步擺腿、披風擺動、受擊後仰、攻擊三段動作
- 有代價的普攻：攻速較慢、出招中移速大減、32% 才判定命中、揮空硬直、只能在命中後用閃避取消、連打會過熱
- 兩種姿態（R 切換快劍／重劍）、技能：迴旋斬（右鍵／Q）、劍氣（E）
- 5 種敵人＋首領「鏽鐵門衛」，3 層難度曲線（範圍、預警時間、彈速、新招式逐層增加）
- 像素戰鬥特效、HUD（生命、發條、熱度、姿態、技能、首領血條）

## 操作

WASD 移動、滑鼠瞄準、左鍵／J 普攻、右鍵／Q 迴旋斬、E 劍氣、空白鍵閃避、R／中鍵切換姿態。

## 除錯參數

在執行指令的 `--` 後面加：

| 參數 | 作用 |
|---|---|
| `--bot` | 自動遊玩 |
| `--god` | 生命歸零時補滿 |
| `--floor=N --room=N` | 從指定樓層、房間開始（房間 4 是首領） |
| `--speed=N` | 遊戲速度倍率 |
| `--shots=路徑前綴 --shot-every=秒` | 定時截圖 |
| `--burst=路徑前綴 --burst-at=秒` | 從指定秒數起每 0.05 秒拍一張，共 16 張 |
| `--quit-after=秒` | 指定秒數後結束 |

## 匯出網頁版

```sh
godot --headless --path godot --export-release "Web" ../play/index.html
```
需要先安裝 Godot 4.3 的匯出模板（只用到 `web_nothreads_release.zip`）。輸出在 repo 根目錄的 `play/`，GitHub Pages 開好後網址是 `/clockbound/play/`。

## 字型

`fonts/NotoSansCJKtc-Bold-subset.otf` 是 Noto Sans CJK TC Bold 只保留遊戲用到的字（SIL OFL 1.1，授權見 `fonts/OFL.txt`）。新增中文字之後要重新裁切，否則網頁版會缺字。
