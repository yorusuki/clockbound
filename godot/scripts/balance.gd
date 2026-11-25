extends Node
## 難度曲線與攻擊參數（對應 docs/DESIGN.md 第 3、4 節）

var floor_no := 1
var room_no := 1

const HP := [0.85, 1.8, 2.9]
const DMG := [0.8, 1.3, 1.7]
const BULLET := [0.8, 1.0, 1.2]
const TELE := [1.3, 1.0, 0.85]
const AOE := [0.85, 1.25, 1.6]
const EARLY_ROOM := [0.7, 0.85, 1.0]   # 每層前兩間的怪物數量倍率

func i() -> int: return clampi(floor_no, 1, 3) - 1
func hp() -> float: return HP[i()] * (1.0 + 0.06 * (room_no - 1))
func dmg() -> float: return DMG[i()]
func bullet() -> float: return BULLET[i()]
func tele() -> float: return TELE[i()]
func aoe() -> float: return AOE[i()]
func count() -> float: return (EARLY_ROOM[i()] if room_no <= 2 else 1.0) * (1.0 + 0.06 * (room_no - 1))

# ---- 普攻參數 ----
const ATTACK := {
	"quick": {"dur": [0.42, 0.42, 0.62], "dmg": [11, 11, 20], "range": 74.0, "half": 1.0, "kb": [110, 110, 320], "heat": 1.0, "move": 0.3},
	"heavy": {"dur": [0.75, 0.95], "dmg": [26, 42], "range": 92.0, "half": 1.25, "kb": [260, 440], "heat": 0.7, "move": 0.2},
}
const STRIKE_AT := 0.32      # 動作進行到 32% 才判定命中
const MISS_EXTRA := 0.18     # 揮空多出的收招時間
const HEAT_MAX := 4.0        # 熱度達到就過熱
const HEAT_COOL := 1.3       # 每秒降溫
const OVERHEAT_SLOW := 0.6   # 過熱時攻速倍率
