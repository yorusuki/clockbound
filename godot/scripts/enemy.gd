class_name Enemy
extends Actor
## 敵人 AI 與暫代造型。type：rat / guard / archer / bomber / caster / brute / colossus（首領）

const DEFS := {
	"rat": {"name": "發條鼠", "hp": 16, "r": 12, "spd": 135, "dmg": 7, "h": 26, "col": Color("b0946a"), "cost": 1.0},
	"guard": {"name": "停擺衛兵", "hp": 34, "r": 15, "spd": 78, "dmg": 10, "h": 70, "col": Color("8a90a8"), "cost": 2.0},
	"archer": {"name": "鐘樓弩手", "hp": 22, "r": 14, "spd": 84, "dmg": 8, "h": 66, "col": Color("5a7a46"), "cost": 2.0},
	"bomber": {"name": "火藥甲蟲", "hp": 12, "r": 13, "spd": 150, "dmg": 16, "h": 30, "col": Color("e0702e"), "cost": 1.5},
	"caster": {"name": "齒輪術士", "hp": 28, "r": 14, "spd": 62, "dmg": 12, "h": 72, "col": Color("4a5aa0"), "cost": 3.0},
	"brute": {"name": "重錘傀儡", "hp": 95, "r": 22, "spd": 56, "dmg": 16, "h": 92, "col": Color("7a808c"), "cost": 4.0},
	"colossus": {"name": "鏽鐵門衛", "hp": 0, "r": 40, "spd": 46, "dmg": 14, "h": 150, "col": Color("7a5034"), "cost": 0.0},
}

var type := "rat"
var def: Dictionary
var spd := 100.0
var dmg := 8.0
var state := "move"
var timer := 1.0
var face := 1.0
var lock := Vector2.ZERO
var stun := 0.0
var t := 0.0
var seed_v := 0.0
var tele = null               # 自己身上的直線預警 {dir, len, w}
var fuse := 0.0
var boss := false
var phase := 1
var atk := ""
var at := 0.0
var atk_i := 0
var flags := {}
var strafe := 1.0

func setup(kind: String, pos: Vector2) -> void:
	type = kind
	def = DEFS[kind]
	g = pos
	r = def.r
	height = def.h
	spd = def.spd * randf_range(0.92, 1.08)
	dmg = round(def.dmg * Bal.dmg())
	max_hp = def.hp * Bal.hp()
	if kind == "colossus":
		boss = true
		max_hp = [900.0, 1800.0, 3000.0][Bal.i()]
		state = "idle"
		timer = 1.0
	hp = max_hp
	timer = randf_range(0.6, 1.4)
	seed_v = randf() * TAU
	sync_pos()

func player_g() -> Vector2:
	return main.player.g

func to_p() -> Vector2:
	return (player_g() - g)

func step(dir: Vector2, s: float, dt: float) -> void:
	if dir.length() < 0.001:
		return
	g += dir.normalized() * s * dt
	face = 1.0 if dir.x >= 0 else -1.0

func kite(dt: float, near: float, far: float) -> void:
	var d := to_p()
	var l := d.length()
	if l < near:
		step(-d, spd, dt)
	elif l > far:
		step(d, spd, dt)
	else:
		if randf() < dt * 0.5:
			strafe = -strafe
		step(d.orthogonal() * strafe, spd * 0.6, dt)
	face = 1.0 if d.x >= 0 else -1.0

func tick(dt: float) -> void:
	if dead:
		return
	t += dt
	timer -= dt
	flash = maxf(0.0, flash - dt)
	apply_kb(dt)
	if stun > 0.0:
		stun -= dt
		tele = null
	elif boss:
		_boss(dt)
	else:
		call("_ai_" + type, dt)
	if not dead:
		var hit_wall := collide_world()
		if type == "brute" and state == "charge" and hit_wall:
			state = "dazed"
			timer = 1.2
			main.shake(4.0)
		# 接觸傷害
		var pl = main.player
		if pl and not pl.dead and fuse <= 0.0 and stun <= 0.0 and g.distance_to(pl.g) < r + pl.r - 3:
			main.hurt_player(dmg)
	sync_pos()
	queue_redraw()

# ---------------- 一般敵人 ----------------
func _ai_rat(dt: float) -> void:
	step(to_p().rotated(sin(t * 5.0 + seed_v) * 0.45), spd, dt)

func _ai_guard(dt: float) -> void:
	if state == "move":
		step(to_p(), spd, dt)
		if to_p().length() < 95 and timer <= 0.0:
			state = "wind"
			timer = 0.55 * Bal.tele()
			lock = to_p().normalized()
	elif state == "wind":
		tele = {"dir": lock, "len": 100.0, "w": 26.0}
		if timer <= 0.0:
			state = "lunge"
			timer = 0.22
			tele = null
	elif state == "lunge":
		step(lock, 380.0, dt)
		if timer <= 0.0:
			state = "move"
			timer = 0.9

func _ai_archer(dt: float) -> void:
	if state == "aim":
		tele = {"dir": to_p().normalized(), "len": 420.0, "w": 3.0}
		if timer <= 0.0:
			var n: int = [1, 3, 5][Bal.i()]
			var base := to_p().angle()
			for k in n:
				var a := base + (k - (n - 1) / 2.0) * 0.16
				main.spawn_bullet({"g": g, "v": Vector2.from_angle(a) * 250.0 * Bal.bullet(), "dmg": dmg, "col": Color("ffd447"), "kind": "arrow"})
			state = "move"
			timer = randf_range(1.7, 2.3)
			tele = null
			main.audio("shoot")
		return
	kite(dt, 200, 320)
	if timer <= 0.0:
		state = "aim"
		timer = 0.55 * Bal.tele()

func _ai_bomber(dt: float) -> void:
	if state == "fuse":
		fuse = 1.0 - timer / (0.6 * Bal.tele())
		if timer <= 0.0:
			main.add_hazard({"kind": "circle", "g": g, "radius": 70.0 * Bal.aoe(), "delay": 0.0, "dmg": dmg, "col": Color("ff6a2a")})
			main.kill_enemy(self)
		return
	step(to_p(), spd, dt)
	if to_p().length() < 52:
		state = "fuse"
		timer = 0.6 * Bal.tele()

func _ai_caster(dt: float) -> void:
	kite(dt, 230, 340)
	if timer <= 0.0:
		timer = randf_range(2.8, 3.6)
		var pg: Vector2 = player_g() + main.player.vel * 0.3
		var rad := 46.0 * Bal.aoe()
		var tl := 1.0 * Bal.tele()
		match Bal.floor_no:
			1:
				main.add_hazard({"kind": "circle", "g": pg, "radius": rad, "delay": tl, "dmg": dmg, "col": Color("8a6aff")})
			2:
				for k in 3:
					var off := Vector2.ZERO if k == 0 else Vector2.from_angle(randf() * TAU) * randf_range(50, 100)
					main.add_hazard({"kind": "circle", "g": pg + off, "radius": rad, "delay": tl, "dmg": dmg, "col": Color("8a6aff")})
			_:
				# 第 3 層：十字＋中心
				for d in [Vector2.RIGHT, Vector2.DOWN]:
					main.add_hazard({"kind": "line", "g": pg - d * 260, "g2": pg + d * 260, "width": 34.0, "delay": tl, "dmg": dmg, "col": Color("8a6aff")})
				main.add_hazard({"kind": "circle", "g": pg, "radius": rad, "delay": tl + 0.35, "dmg": dmg, "col": Color("8a6aff")})

func _ai_brute(dt: float) -> void:
	if state == "move":
		step(to_p(), spd, dt)
		if to_p().length() < 300 and timer <= 0.0:
			state = "aim"
			timer = 0.75 * Bal.tele()
	elif state == "aim":
		lock = to_p().normalized()
		tele = {"dir": lock, "len": 340.0, "w": r * 2.0}
		if timer <= 0.0:
			state = "charge"
			timer = 0.85
			tele = null
	elif state == "charge":
		step(lock, 430.0, dt)
		if timer <= 0.0:
			state = "move"
			timer = 2.5
	elif state == "dazed":
		if timer <= 0.0:
			state = "move"
			timer = 2.5

# ---------------- 首領：鏽鐵門衛（招式隨樓層加強）----------------
func _boss(dt: float) -> void:
	if phase == 1 and hp < max_hp * 0.5:
		phase = 2
		main.fx.text(Iso.to_screen(g, 170), "警報！警報！", Color("ff4a4a"), 26)
		main.shake(8.0)
	if state == "idle":
		var d := to_p()
		if d.length() > 170:
			step(d, spd * (1.25 if phase == 2 else 1.0), dt)
		else:
			face = 1.0 if d.x >= 0 else -1.0
		if timer <= 0.0:
			var list := ["slam", "roots", "rush", "summon", "roots"]
			if Bal.floor_no >= 3:
				list.append("chase")
			atk = list[atk_i % list.size()]
			atk_i += 1 + (1 if randf() < 0.3 else 0)
			state = "attack"
			at = 0.0
			flags.clear()
		return
	var done := false
	var tl := Bal.tele()
	var f := Bal.floor_no
	match atk:
		"slam":
			if at == 0.0:
				main.add_hazard({"kind": "circle", "g": g, "radius": 130.0 * Bal.aoe(), "delay": 0.9 * tl, "dmg": dmg + 6, "col": Color("ff5a3a")})
			if at >= 0.9 * tl and not flags.has("f"):
				flags["f"] = true
				var n: int = [12, 18, 26][f - 1] + (6 if phase == 2 else 0)
				var gap_at := randi() % n
				for k in n:
					# 第 3 層：環形彈幕留一個缺口，要找缺口鑽
					if f >= 3 and absi(k - gap_at) <= 1:
						continue
					main.spawn_bullet({"g": g, "v": Vector2.from_angle(k * TAU / n) * 175.0 * Bal.bullet(), "dmg": 10.0 * Bal.dmg(), "col": Color("ff9a4a"), "r": 7.0})
				main.shake(6.0)
			done = at > 1.5
		"roots":
			var vol := 2 if phase == 1 else 3
			for v in vol:
				if at >= v * 0.7 and not flags.has("v%d" % v):
					flags["v%d" % v] = true
					var base := to_p().angle()
					var n: int = [3, 5, 5][f - 1]
					for k in n:
						var a := base + (k - (n - 1) / 2.0) * 0.28
						main.add_hazard({"kind": "line", "g": g, "g2": g + Vector2.from_angle(a) * 620.0, "width": 30.0 * Bal.aoe(), "delay": 0.8 * tl, "dmg": dmg, "col": Color("c0603a")})
					if f >= 2:
						# 第 2 層起：再加一道橫向的根
						var p := player_g()
						main.add_hazard({"kind": "line", "g": Vector2(Iso.ARENA.position.x, p.y), "g2": Vector2(Iso.ARENA.end.x, p.y), "width": 26.0 * Bal.aoe(), "delay": 1.0 * tl, "dmg": dmg, "col": Color("c0603a")})
			done = at > vol * 0.7 + 1.0
		"rush":
			if at < 0.65 * tl:
				lock = to_p().normalized()
				tele = {"dir": lock, "len": 440.0, "w": r * 2.0}
			else:
				tele = null
				step(lock, 540.0, dt)
				if collide_world() or at > 0.65 * tl + 0.7:
					main.shake(6.0)
					done = true
		"summon":
			if at == 0.0:
				var kinds := ["rat", "rat", "rat"] if f == 1 else ["rat", "bomber", "bomber", "guard"]
				for k in kinds:
					main.spawn_enemy(k, g + Vector2.from_angle(randf() * TAU) * randf_range(80, 140), true)
			done = at > 1.0
		"chase":
			# 第 3 層：連續落點追著玩家
			var k := int(at / 0.25)
			if k < 8 and not flags.has("c%d" % k):
				flags["c%d" % k] = true
				main.add_hazard({"kind": "circle", "g": player_g() + main.player.vel * 0.3, "radius": 56.0 * Bal.aoe(), "delay": 0.75 * tl, "dmg": dmg, "col": Color("ff4a2a")})
			done = at > 8 * 0.25 + 0.8
	at += dt
	if done:
		state = "idle"
		timer = randf_range(0.5, 0.9) if phase == 2 else randf_range(0.9, 1.4)
		tele = null

# ---------------- 暫代造型（直立，2.5D）----------------
func _c(col: Color) -> Color:
	return Color(1, 1, 1) if flash > 0.0 else col

func _draw() -> void:
	draw_shadow(r * 1.1)
	if fuse > 0.0:
		draw_set_transform(Vector2.ZERO, 0.0, Vector2(1.0, Iso.K))
		draw_circle(Vector2.ZERO, 70.0 * Bal.aoe(), Color(1, 0.3, 0.2, 0.12 + fuse * 0.25))
		draw_set_transform(Vector2.ZERO)
	var col: Color = def.col
	var O := Color("1b1420")
	var bob := sin(t * 8.0 + seed_v) * 1.5 if state != "wind" else sin(t * 60.0) * 1.5
	var h: float = def.h
	var s := face
	match type:
		"rat":
			draw_set_transform(Vector2(0, -12 + bob * 0.5), 0.0, Vector2(s, 1))
			draw_circle(Vector2(0, 0), 13, O)
			draw_circle(Vector2(0, 0), 11, _c(col))
			draw_circle(Vector2(12, -4), 8, O)
			draw_circle(Vector2(12, -4), 6.5, _c(col.lightened(0.1)))
			draw_circle(Vector2(15, -6), 2, Color("ff4a3a"))
			draw_line(Vector2(-12, 2), Vector2(-24, -6 + sin(t * 12) * 4), O, 2)
		"guard", "archer", "caster":
			draw_set_transform(Vector2(0, bob * 0.3), 0.0, Vector2(s, 1))
			var body := PackedVector2Array([Vector2(-14, 0), Vector2(14, 0), Vector2(11, -h * 0.62), Vector2(-11, -h * 0.62)])
			draw_colored_polygon(body, _c(col))
			draw_polyline(body + PackedVector2Array([body[0]]), O, 2.0)
			var hc := Vector2(0, -h * 0.62 - 10)
			if type == "guard":
				draw_circle(hc, 13, O)
				draw_circle(hc, 11, _c(Color("c4ccd8")))
				draw_rect(Rect2(hc + Vector2(-2, -3), Vector2(13, 5)), O)
				draw_circle(hc + Vector2(8, -1), 2, Color("ff4a3a"))
				draw_line(Vector2(14, -h * 0.4), Vector2(30, -h * 0.9), _c(Color("9a9488")), 3)
			else:
				var hood := PackedVector2Array([hc + Vector2(-13, 12), hc + Vector2(13, 12), hc + Vector2(4, -16), hc + Vector2(-10, -8)])
				draw_colored_polygon(hood, _c(col.darkened(0.2)))
				draw_circle(hc + Vector2(2, 2), 7, O)
				draw_circle(hc + Vector2(5, 1), 2, Color("ffd447") if type == "archer" else Color("9fe0ff"))
				if type == "archer":
					draw_line(Vector2(10, -h * 0.4), Vector2(28, -h * 0.4), _c(Color("6a4a2a")), 3)
					draw_arc(Vector2(28, -h * 0.4), 10, -1.3, 1.3, 8, _c(Color("c9c0a8")), 2)
				else:
					draw_circle(Vector2(18, -h * 0.5), 7, _c(Color("e8c050")))
		"bomber":
			draw_set_transform(Vector2(0, -14), 0.0, Vector2(s, 1))
			draw_circle(Vector2.ZERO, 15, O)
			draw_circle(Vector2.ZERO, 13, _c(col))
			draw_circle(Vector2(4, -4), 5, Color(1, 0.9, 0.4, 0.6 + fuse * 0.4))
			for k in 3:
				draw_line(Vector2(-8 + k * 8, 10), Vector2(-10 + k * 8, 16 + sin(t * 20 + k) * 2), O, 2)
		"brute":
			draw_set_transform(Vector2(0, bob * 0.3), 0.0, Vector2(s, 1))
			draw_rect(Rect2(-24, -h * 0.75, 48, h * 0.75), O)
			draw_rect(Rect2(-22, -h * 0.75 + 2, 44, h * 0.75 - 4), _c(col))
			draw_rect(Rect2(-14, -h, 28, 26), O)
			draw_rect(Rect2(-12, -h + 2, 24, 22), _c(col.lightened(0.15)))
			draw_circle(Vector2(6, -h + 12), 3, Color("ffd447") if state == "charge" else Color("ff4a3a"))
			draw_rect(Rect2(20, -h * 0.55, 26, 10), _c(Color("5e6470")))
		"colossus":
			draw_set_transform(Vector2(0, -h * 0.45 + bob), 0.0, Vector2(s, 1))
			var pts := PackedVector2Array()
			for k in 24:
				var a := k * TAU / 24 + t * (0.9 if phase == 2 else 0.4)
				var rr := 62.0 if k % 2 else 52.0
				pts.append(Vector2(cos(a), sin(a)) * rr)
			draw_colored_polygon(pts, _c(col))
			draw_circle(Vector2.ZERO, 40, O)
			draw_circle(Vector2.ZERO, 37, _c(Color("4a3422")))
			draw_rect(Rect2(-26, -8, 52, 14), O)
			var ec := Color("ff3a2a") if phase == 2 else Color("ffb030")
			draw_circle(Vector2(-12, -1), 5, ec)
			draw_circle(Vector2(12, -1), 5, ec)
			draw_line(Vector2(-30, 40), Vector2(-48, 78), O, 7)
			draw_line(Vector2(30, 40), Vector2(48, 78), O, 7)
	draw_set_transform(Vector2.ZERO)
	# 自己身上的直線預警（畫在腳下的地面）
	if tele != null:
		var d: Vector2 = tele.dir
		var nrm: Vector2 = d.orthogonal() * tele.w * 0.5
		var p0 := Vector2.ZERO
		var p1 := Iso.dir_to_screen(d * tele.len)
		var ns := Iso.dir_to_screen(nrm)
		var poly := PackedVector2Array([p0 + ns, p1 + ns, p1 - ns, p0 - ns])
		draw_colored_polygon(poly, Color(1, 0.23, 0.29, 0.22 + sin(t * 20) * 0.06))
		draw_polyline(poly + PackedVector2Array([poly[0]]), Color(1, 0.4, 0.4, 0.7), 1.5)
	# 血條
	if not boss and hp < max_hp:
		var w := maxf(26.0, r * 2.2)
		draw_rect(Rect2(-w / 2, -h - 14, w, 5), Color(0, 0, 0, 0.6))
		draw_rect(Rect2(-w / 2, -h - 14, w * clampf(hp / max_hp, 0, 1), 5), Color("e04a4a"))
	if stun > 0.0 and not boss:
		for k in 3:
			var a := t * 6.0 + k * 2.1
			draw_rect(Rect2(Vector2(cos(a) * r, -h - 22 + sin(a) * 3), Vector2(3, 3)), Color("ffe36a"))

## 死亡碎裂用的取樣點（顏色、畫面位置）
func shatter_points() -> Array:
	var pts := []
	var h: float = def.h
	var n := 40 if not boss else 120
	for k in n:
		var p := position + Vector2(randf_range(-r, r) * 1.1, -randf() * h)
		pts.append([def.col.lightened(randf_range(-0.2, 0.25)), p])
	return pts
