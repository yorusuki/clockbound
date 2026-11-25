# 繪圖提示詞包（給 ChatGPT 用）

等 GPT 額度恢復後照順序貼。提示詞用英文（圖像模型對英文比較穩），每段前面有中文說明。
畫好的圖存成 PNG 丟給我，我負責切圖、去背、設定錨點、組成骨架動畫。

---

## 0. 使用方式

1. **同一個對話**裡依序產生，讓 GPT 記得畫風。先做「1. 角色設定圖」，之後每一段都附上「跟前面那張同一個角色、同一個畫風」。
2. 每張都要求**透明背景**。如果拿到的是白底或格紋底也沒關係，我可以去背，只要背景是單色。
3. 不滿意就請它「保持其他不變，只修改 ＿＿」，不要整張重來，才不會畫風跑掉。
4. 檔名照每段標示的名字存，例如 `erin_ref.png`。

### 共用畫風（每段開頭都貼這段）

```
Art style: hand-painted 2D game art, dark fairytale storybook mood with clockwork / steampunk details.
Thick clean dark outlines (#1b1420), soft cel shading with 2-3 tones per color, subtle rim light.
Chunky, readable silhouette, slightly chibi proportions (head about 1/3.5 of body height).
Camera: 3/4 side view, character facing RIGHT, as seen in a slightly top-down action roguelite.
Transparent background, no ground shadow, no text, no frame, no extra characters.
```

---

## 1. 角色設定圖（先畫這張）`erin_ref.png`

艾琳：前城衛隊長，紅髮馬尾、鋼製胸甲、深紅披風、金色點綴、單手長劍。

```
[共用畫風]
Full-body character reference of "Erin", a former city-guard captain.
Red hair in a high ponytail, determined eyes, steel breastplate with brass clockwork engravings,
deep crimson cape, gold trims, dark grey trousers, brown leather boots, a small pocket watch on her belt.
Holding a straight one-handed longsword in her right (front) hand, relaxed idle stance, facing right.
Main colors: hair #d0503e, armor #c4ccd8, cape #8a2030, gold #e8c050, trousers #4a4e5e.
Single character, centered, about 1024px tall.
```

## 2. 零件拆圖（重點）`erin_parts.png`

請它把角色拆成零件排在同一張圖上，零件之間要有空隙、不能重疊。**關節處要畫圓弧收邊並多畫一點重疊區**，組起來才不會有縫。

```
[共用畫風]
Same character "Erin" as the previous image, same style and colors.
Create a CUTOUT ANIMATION PARTS SHEET for a 2D skeletal rig.
Draw each body part SEPARATELY, laid out in a grid with clear empty space between parts, nothing overlapping:
1. head (with ponytail attached, facing right)
2. torso with breastplate and belt (no arms, no legs)
3. front upper arm + forearm + hand as ONE piece, arm hanging straight down, hand open/gripping pose
4. back upper arm + forearm + hand as ONE piece, arm hanging straight down
5. front leg (thigh to boot) as one piece, straight
6. back leg (thigh to boot) as one piece, straight, slightly darker
7. cape as a separate piece, hanging straight down
8. longsword alone, horizontal, pointing right, handle on the left
Each joint end (shoulder, hip, neck) should be rounded with extra overlap area so parts can rotate without gaps.
All parts at the same scale as each other. Transparent background.
```

如果一次畫不好，可以拆成三張：頭＋軀幹＋披風、四肢、武器。

## 3. 第二姿態武器 `erin_greatsword.png`

```
[共用畫風]
A two-handed greatsword for the same character "Erin", same style.
Heavy steel blade with brass clockwork gear guard, red wrapped grip.
Single object, horizontal, pointing right, handle on the left. Transparent background.
```

## 4. 逐格動畫測試 `erin_slash_frames.png`（比較用）

用來跟零件骨架比較效果。

```
[共用畫風]
Same character "Erin", same style and colors.
A SPRITE SHEET of a sword slash attack animation, 6 frames in ONE horizontal row, evenly spaced,
each frame the same size and the character in the same position and scale:
frame 1 idle ready, frame 2 wind-up (sword raised back), frame 3 swing mid, frame 4 slash follow-through (sword down-forward with motion arc),
frame 5 recover, frame 6 back to ready. Facing right. Transparent background.
```

---

## 5. 技能與刻印圖示 `icons_sheet_1.png`

```
Game UI icon sheet, 4 x 4 grid, each icon in its own square cell with equal spacing, transparent background.
Style: hand-painted fantasy RPG icons, thick dark outline, clockwork / brass / dark fairytale theme,
rich color, readable at 48x48 pixels, no text, no borders.
Icons in order:
1 spinning sword slash, 2 crescent sword wave, 3 shadow step dash, 4 ground-splitting cleave,
5 fireball, 6 orbiting star sparks, 7 falling star meteor, 8 frost nova ring,
9 small cannon turret, 10 clockwork mine, 11 tesla coil, 12 flying saw blade drone,
13 cavalry charge with spear, 14 thrown javelin, 15 ring of spikes, 16 leaping strike.
```

第二張 `icons_sheet_2.png`（刻印）：

```
[同上的開頭兩行]
Icons in order:
1 blood drop with gear, 2 burning cog, 3 ghostly afterimage of a figure, 4 sparks trail footprints,
5 charged spring, 6 exploding gear, 7 ricochet arrows, 8 splitting bullet,
9 battery with lightning, 10 ice crystal, 11 chain lightning, 12 coffin with clock,
13 angry red mask, 14 recoiling spring shield, 15 full wound-up key, 16 hourglass turned upside down.
```

---

## 6. 場景素材（第 1 層：齒輪下城）

`f1_floor.png` 地板（可無縫拼接）

```
Seamless tileable floor texture for a 2D action game, viewed from a slightly top-down 3/4 angle.
Underground clockwork city: dark worn stone bricks mixed with rusted copper plates and embedded brass gears,
scattered bolts and oil stains. Muted warm browns with copper accents (#2a231e, #b87333).
Hand-painted style, soft lighting, no strong shadows, 512x512, must tile seamlessly on all edges.
```

`f1_wall.png` 後牆正面

```
Hand-painted 2D game environment piece: the FRONT FACE of a back wall in an underground clockwork city,
seen from a slightly top-down 3/4 angle. Stone brick wall with copper pipes, a large rusted gear half embedded,
small pressure gauges and dim amber lamps. Wide horizontal strip, 1280x220, the bottom edge is where the floor meets the wall.
Dark fairytale mood, warm amber light. Transparent above the top edge.
```

`f1_props.png` 道具（柱子、箱子、齒輪堆）

```
[共用畫風的第 1、2 行]
Prop sheet for an underground clockwork city, 3/4 top-down view, each prop separate with spacing:
a stone pillar with copper bands, a wooden crate, a pile of broken gears, a steam pipe valve, a lantern post, a barrel.
Transparent background.
```

第 2 層（月光歌劇院：深藍、紫、天鵝絨、月光）與第 3 層（大鐘塔：深紫、黃銅、巨大鐘面、星空）照同樣格式，換掉描述與色碼即可，我之後會補上。

---

## 7. 交件格式

| 檔名 | 用途 |
|---|---|
| `erin_ref.png` | 畫風基準，之後每個角色都拿它當參考 |
| `erin_parts.png` | 骨架零件 |
| `erin_greatsword.png` | 第二姿態武器 |
| `erin_slash_frames.png` | 逐格動畫比較 |
| `icons_sheet_1.png` / `icons_sheet_2.png` | 技能、刻印圖示 |
| `f1_floor.png` / `f1_wall.png` / `f1_props.png` | 第 1 層場景 |

先做前 4 張就能開始比較兩種動畫方式；圖示和場景可以之後再補。
