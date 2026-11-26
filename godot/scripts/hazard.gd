class_name Hazard
extends Node2D
## 地面範圍：預警 → 生效。畫在地面層（不參與深度排序）。
## kind: "circle" / "line" / "spawn"

var main: Node
var kind := "circle"
var g := Vector2.ZERO
var g2 := Vector2.ZERO
var radius := 50.0
var width := 30.0
var delay := 0.8
var linger := 0.0          # 生效後持續傷害的秒數
var dmg := 10.0
var team := "enemy"
var col := Color("ff3b4a")
var t := 0.0
var fired := false
var on_fire: Callable
var hit_once := false

func tick(dt: float) -> bool:
	t += dt
	if not fired and t >= delay:
		fired = true
		if on_fire.is_valid():
			on_fire.call()
		if kind != "spawn":
			_apply()
			var c := Iso.to_screen(g if kind == "circle" else g.lerp(g2, 0.5))
			main.fx.burst(c, col.lightened(0.3), 16 if kind == "circle" else 10, minf(260.0, radius * 2.2), 0.4, 60.0, 3.0, true)
			main.fx.ring(Iso.to_screen(g), radius if kind == "circle" else width, col.lightened(0.4), 0.3, 3.0, true)
			main.shake(2.5 if radius > 90 else 1.2)
	elif fired and linger > 0.0 and not hit_once:
		_apply()
	queue_redraw()
	if kind == "spawn" and fired:
		return false
	return t < delay + maxf(linger, 0.22)

func contains(p: Vector2, pr: float) -> bool:
	if kind == "line":
		var seg := Geometry2D.get_closest_point_to_segment(p, g, g2)
		return p.distance_to(seg) < width * 0.5 + pr
	return p.distance_to(g) < radius + pr

func _apply() -> void:
	if team == "enemy":
		var pl = main.player
		if pl and not pl.dead and contains(pl.g, Player.HURT_R * 0.7):
			if main.hurt_player(dmg):
				hit_once = true

func _draw() -> void:
	if kind == "spawn":
		var k := clampf(t / delay, 0.0, 1.0)
		var c := Iso.to_screen(g)
		draw_set_transform(c, 0.0, Vector2(1.0, Iso.K))
		for i in 3:
			draw_arc(Vector2.ZERO, 10.0 + 18.0 * k + i * 4.0, t * 5.0 + i * 2.0, t * 5.0 + i * 2.0 + 2.2, 12, Color(0.7, 0.45, 1.0, 0.8), 2.0)
		draw_circle(Vector2.ZERO, 24.0 * k, Color(0.4, 0.15, 0.6, 0.35))
		draw_set_transform(Vector2.ZERO)
		return
	var k := clampf(t / delay, 0.0, 1.0)
	var a_fill := 0.0
	if not fired:
		a_fill = 0.16 + 0.22 * k
	else:
		a_fill = maxf(0.0, 0.55 * (1.0 - (t - delay) / 0.22)) if linger <= 0.0 else 0.3
	if kind == "circle":
		var c := Iso.to_screen(g)
		draw_set_transform(c, 0.0, Vector2(1.0, Iso.K))
		if not fired:
			draw_circle(Vector2.ZERO, radius, Color(col, 0.14))
			draw_circle(Vector2.ZERO, radius * k, Color(col, a_fill))
			draw_arc(Vector2.ZERO, radius, 0.0, TAU, 48, Color(col, 0.85), 2.0)
		else:
			draw_circle(Vector2.ZERO, radius, Color(col.lightened(0.4), a_fill))
		draw_set_transform(Vector2.ZERO)
	else:
		var d := (g2 - g).normalized().orthogonal() * width * 0.5
		var pts := PackedVector2Array([Iso.to_screen(g + d), Iso.to_screen(g2 + d), Iso.to_screen(g2 - d), Iso.to_screen(g - d)])
		if not fired:
			draw_colored_polygon(pts, Color(col, 0.14))
			var mid := g.lerp(g2, k)
			var p2 := PackedVector2Array([Iso.to_screen(g + d), Iso.to_screen(mid + d), Iso.to_screen(mid - d), Iso.to_screen(g - d)])
			draw_colored_polygon(p2, Color(col, a_fill))
			var ol := pts.duplicate()
			ol.append(pts[0])
			draw_polyline(ol, Color(col, 0.85), 2.0)
		else:
			draw_colored_polygon(pts, Color(col.lightened(0.4), a_fill))
