extends Node
## 2.5D 斜俯視座標換算：邏輯都在地面平面，畫面上把 y 壓扁並扣掉高度。

const K := 0.8                  # 地面縱向壓縮比（越接近 1，畫面距離越接近實際距離）
const ORIGIN_Y := 168.0         # 地面 y=0 在畫面上的位置（上面是後牆正面）
const ARENA := Rect2(70, 22, 1140, 600)   # 可活動的地面範圍（地面座標）
const WALL_H := 120.0           # 後牆正面高度（畫面像素）

func to_screen(g: Vector2, z: float = 0.0) -> Vector2:
	return Vector2(g.x, ORIGIN_Y + g.y * K - z)

func to_ground(s: Vector2) -> Vector2:
	return Vector2(s.x, (s.y - ORIGIN_Y) / K)

## 地面方向 → 畫面方向（用來轉手臂、畫刀光）
func dir_to_screen(d: Vector2) -> Vector2:
	return Vector2(d.x, d.y * K)
