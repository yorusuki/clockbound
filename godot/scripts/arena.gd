class_name Arena
extends Node2D
## 房間：地板、後牆正面、側牆、前緣（暫代美術，之後換成 GPT 畫的 f1_floor / f1_wall）

const PALS := [
	{"floor": Color("2e2620"), "floor2": Color("362c24"), "line": Color("1e1814"), "wall": Color("2a1f18"), "wall2": Color("3a2a1e"), "accent": Color("b87333"), "glow": Color("ffb050")},
	{"floor": Color("222838"), "floor2": Color("2a3044"), "line": Color("161a26"), "wall": Color("1c2030"), "wall2": Color("2a3046"), "accent": Color("7a9ab8"), "glow": Color("a0c8ff")},
	{"floor": Color("261e30"), "floor2": Color("2e2438"), "line": Color("18121e"), "wall": Color("201828"), "wall2": Color("33263e"), "accent": Color("d4a84a"), "glow": Color("ffd88a")},
]

var pal: Dictionary = PALS[0]
var rng := RandomNumberGenerator.new()
var decals: Array = []
var lamps: Array = []

func setup(floor_no: int, seed_v: int) -> void:
	pal = PALS[clampi(floor_no, 1, 3) - 1]
	rng.seed = seed_v
	decals.clear()
	lamps.clear()
	var A := Iso.ARENA
	for i in 7:
		decals.append({"g": Vector2(rng.randf_range(A.position.x + 60, A.end.x - 60), rng.randf_range(A.position.y + 60, A.end.y - 60)), "r": rng.randf_range(28, 80), "rot": rng.randf() * TAU, "kind": "gear" if i < 4 else "stain"})
	for x in [220.0, 520.0, 760.0, 1060.0]:
		lamps.append(x + rng.randf_range(-40, 40))
	queue_redraw()

func _draw() -> void:
	var A := Iso.ARENA
	var top := Iso.to_screen(A.position)
	var bot := Iso.to_screen(A.end)
	# 地板
	draw_rect(Rect2(top, bot - top), pal.floor)
	var ts := 60.0
	var gy := A.position.y
	var row := 0
	while gy < A.end.y:
		var gx := A.position.x + (ts * 0.5 if row % 2 else 0.0)
		while gx < A.end.x:
			var a := Iso.to_screen(Vector2(gx, gy))
			var b := Iso.to_screen(Vector2(minf(gx + ts, A.end.x), minf(gy + ts, A.end.y)))
			var h := hash(Vector2i(int(gx), int(gy))) % 7
			if h < 3:
				draw_rect(Rect2(a + Vector2(1, 1), b - a - Vector2(2, 2)), pal.floor2)
			draw_rect(Rect2(a, b - a), pal.line, false, 1.0)
			gx += ts
		gy += ts
		row += 1
	# 地面裝飾：齒輪浮雕、油漬
	for d in decals:
		var c := Iso.to_screen(d.g)
		draw_set_transform(c, 0.0, Vector2(1.0, Iso.K))
		if d.kind == "gear":
			_gear(Vector2.ZERO, d.r, d.rot, Color(pal.accent, 0.12))
		else:
			draw_circle(Vector2.ZERO, d.r * 0.6, Color(0, 0, 0, 0.12))
		draw_set_transform(Vector2.ZERO)
	# 後牆正面
	var wtop := top.y - Iso.WALL_H
	draw_rect(Rect2(Vector2(top.x - 30, wtop), Vector2(bot.x - top.x + 60, Iso.WALL_H)), pal.wall)
	var by := wtop + 8.0
	var r := 0
	while by < top.y - 6:
		var bx := top.x - 30 + (18.0 if r % 2 else 0.0)
		while bx < bot.x + 30:
			draw_rect(Rect2(bx + 1, by + 1, minf(34.0, bot.x + 29.0 - bx), 14), pal.wall2)
			bx += 36.0
		by += 16.0
		r += 1
	# 管線與壁燈
	draw_rect(Rect2(top.x - 30, wtop + 26, bot.x - top.x + 60, 6), Color(pal.accent, 0.55))
	draw_rect(Rect2(top.x - 30, wtop + 27, bot.x - top.x + 60, 1), Color(1, 1, 1, 0.15))
	for lx in lamps:
		draw_rect(Rect2(lx - 3, wtop + 44, 6, 22), Color("1b1420"))
		draw_circle(Vector2(lx, wtop + 44), 7, pal.glow)
		draw_circle(Vector2(lx, wtop + 44), 26, Color(pal.glow, 0.08))
	_gear(Vector2(640, wtop + 62), 44, 0.3, Color(pal.accent, 0.35))
	# 後牆頂與牆腳陰影
	draw_rect(Rect2(top.x - 30, wtop - 10, bot.x - top.x + 60, 12), Color("120c10"))
	for i in 6:
		draw_rect(Rect2(top.x, top.y + i * 3, bot.x - top.x, 3), Color(0, 0, 0, 0.35 - i * 0.05))
	# 側牆
	draw_rect(Rect2(top.x - 30, wtop, 30, bot.y - wtop + 26), Color("150f12"))
	draw_rect(Rect2(bot.x, wtop, 30, bot.y - wtop + 26), Color("150f12"))
	# 前緣（前牆頂）
	draw_rect(Rect2(top.x - 30, bot.y, bot.x - top.x + 60, 26), Color("120c10"))
	draw_rect(Rect2(top.x - 30, bot.y, bot.x - top.x + 60, 3), Color(pal.accent, 0.35))

func _gear(c: Vector2, r: float, rot: float, col: Color) -> void:
	var pts := PackedVector2Array()
	var teeth := 12
	for i in teeth * 2:
		var a := rot + i * PI / teeth
		var rr := r if i % 2 else r * 0.84
		pts.append(c + Vector2(cos(a - 0.09), sin(a - 0.09)) * rr)
		pts.append(c + Vector2(cos(a + 0.09), sin(a + 0.09)) * rr)
	draw_colored_polygon(pts, col)
	draw_circle(c, r * 0.34, Color(0, 0, 0, col.a * 1.5))


## 柱子：放在 y-sort 的世界層，角色走到後面會被擋住
class Pillar extends Node2D:
	var rect: Rect2           # 地面座標的碰撞範圍
	var pal: Dictionary
	var height := 78.0

	func _init(r: Rect2, p: Dictionary) -> void:
		rect = r
		pal = p
		position = Iso.to_screen(Vector2(r.get_center().x, r.end.y))

	func _draw() -> void:
		var tl := Iso.to_screen(rect.position) - position
		var br := Iso.to_screen(rect.end) - position
		var w := br.x - tl.x
		# 影子
		draw_rect(Rect2(tl.x + 6, br.y - 4, w, 10), Color(0, 0, 0, 0.3))
		# 正面
		draw_rect(Rect2(tl.x, br.y - height, w, height), pal.wall)
		draw_rect(Rect2(tl.x + 4, br.y - height + 10, 5, height - 14), Color(pal.accent, 0.5))
		draw_rect(Rect2(tl.x, br.y - height * 0.55, w, 5), Color(pal.accent, 0.45))
		# 頂面
		draw_rect(Rect2(tl.x, tl.y - height, w, br.y - tl.y), pal.wall2)
		draw_rect(Rect2(tl.x, tl.y - height, w, br.y - tl.y), Color("1b1420"), false, 2.0)
		draw_rect(Rect2(tl.x, br.y - height, w, height), Color("1b1420"), false, 2.0)
