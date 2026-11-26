class_name Bullet
extends Node2D
## 子彈：飛在離地 z 高度，地面上有影子（在 y-sort 世界層）

var main: Node
var g := Vector2.ZERO
var v := Vector2.ZERO
var r := 6.0
var z := 16.0
var dmg := 8.0
var team := "enemy"
var life := 4.0
var pierce := 0
var kind := "orb"
var col := Color("ff5a6a")
var kb := 60.0
var hit := {}
var t := 0.0
var homing := 0.0
var trail_t := 0.0

func tick(dt: float) -> bool:
	t += dt
	life -= dt
	if homing > 0.0 and main.player and not main.player.dead:
		var want: float = (main.player.g - g).angle()
		var cur := v.angle()
		var na := cur + clampf(angle_difference(cur, want), -homing * dt, homing * dt)
		v = Vector2.from_angle(na) * v.length()
	g += v * dt
	position = Iso.to_screen(g)
	trail_t += dt
	if trail_t > 0.03:
		trail_t = 0.0
		main.fx._add(Iso.to_screen(g, z), -Iso.dir_to_screen(v) * 0.05, 0.16, col, 3.0 if r > 7 else 2.0, 0.0, 4.0, true)
	if life <= 0.0:
		return false
	if kind != "wave" and _blocked():
		main.fx.burst(Iso.to_screen(g, z), col, 4, 80.0, 0.2, 0.0, 2.0, true)
		return false
	if team == "player":
		for e in main.enemies:
			if e.dead or hit.has(e):
				continue
			if e.g.distance_to(g) < e.r + r:
				hit[e] = true
				main.damage_enemy(e, dmg, {"dir": v.normalized(), "kb": kb, "tags": ["projectile"]})
				if pierce <= 0:
					return false
				pierce -= 1
	else:
		var pl = main.player
		if pl and not pl.dead and pl.g.distance_to(g) < Player.HURT_R + r:
			if main.hurt_player(dmg):
				return false
	queue_redraw()
	return true

func _blocked() -> bool:
	var A := Iso.ARENA
	if not A.has_point(g):
		return true
	for rc in main.pillar_rects:
		if rc.has_point(g):
			return true
	return false

func _draw() -> void:
	# 影子
	# 影子＝判定位置：影子碰到玩家腳下那圈才算命中
	draw_set_transform(Vector2.ZERO, 0.0, Vector2(1.0, Iso.K))
	draw_circle(Vector2.ZERO, r, Color(0, 0, 0, 0.45))
	if team == "enemy":
		draw_arc(Vector2.ZERO, r, 0.0, TAU, 16, Color(col, 0.7), 1.5)
	draw_set_transform(Vector2.ZERO)
	draw_line(Vector2.ZERO, Vector2(0, -z + r), Color(col, 0.18), 2.0)
	var c := Vector2(0, -z)
	var sd := Iso.dir_to_screen(v).normalized()
	if kind == "wave":
		var a := sd.angle()
		draw_arc(c, r + 6.0, a - 1.2, a + 1.2, 16, Color("ffe0b0"), 6.0)
		draw_arc(c, r + 2.0, a - 1.0, a + 1.0, 16, Color(1, 1, 1, 0.8), 2.0)
	elif kind == "feather":
		var p := PackedVector2Array([c + sd * 12, c - sd * 8 + sd.orthogonal() * 5, c - sd * 4, c - sd * 8 - sd.orthogonal() * 5])
		draw_colored_polygon(p, col)
	else:
		draw_circle(c, r * 2.2, Color(col, 0.25))
		draw_circle(c, r, col)
		draw_circle(c, r * 0.45, Color(1, 0.97, 0.95))
