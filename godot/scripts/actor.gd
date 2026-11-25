class_name Actor
extends Node2D
## 玩家與敵人的共用基底：位置在地面座標 g，畫面位置由 Iso 換算（腳底）

var main: Node
var g := Vector2.ZERO
var r := 14.0
var hp := 10.0
var max_hp := 10.0
var kb := Vector2.ZERO
var flash := 0.0
var dead := false
var height := 60.0          # 身高（畫面像素），用來決定命中特效的位置

func sync_pos() -> void:
	position = Iso.to_screen(g)

func hit_point() -> Vector2:
	return Iso.to_screen(g, height * 0.55)

func apply_kb(dt: float) -> void:
	if kb.length_squared() > 1.0:
		g += kb * dt
		kb *= pow(0.0015, dt)

## 推出牆與柱子，回傳是否撞到
func collide_world() -> bool:
	var A := Iso.ARENA
	var hit := false
	var p := g
	p.x = clampf(p.x, A.position.x + r, A.end.x - r)
	p.y = clampf(p.y, A.position.y + r, A.end.y - r)
	if p != g:
		hit = true
	g = p
	for rc in main.pillar_rects:
		var c := Vector2(clampf(g.x, rc.position.x, rc.end.x), clampf(g.y, rc.position.y, rc.end.y))
		var d := g - c
		if d.length_squared() < r * r:
			hit = true
			if d.length_squared() > 0.0001:
				g = c + d.normalized() * r
			else:
				g.y = rc.end.y + r
	return hit

func draw_shadow(w: float, alpha: float = 0.35) -> void:
	draw_set_transform(Vector2.ZERO, 0.0, Vector2(1.0, Iso.K * 0.5))
	draw_circle(Vector2.ZERO, w, Color(0, 0, 0, alpha))
	draw_set_transform(Vector2.ZERO)
