extends Node2D
## 戰鬥切片的遊戲流程：每層 3 間戰鬥房＋首領房，共 3 層。
## 除錯參數（放在 -- 後面）：--bot --god --floor=N --room=N --speed=N
##   --shots=路徑前綴 --shot-every=秒 --quit-after=秒 --burst=路徑前綴（第 3 秒起每 0.05 秒拍一張，共 16 張）

var arena: Arena
var ground: Node2D
var world: Node2D
var fx: PixelFX
var hud: Hud
var cam: Camera2D

var player: Player
var enemies: Array = []
var bullets: Array = []
var hazards: Array = []
var pillar_rects: Array = []
var pillar_nodes: Array = []
var boss_ref = null
var is_boss := false
var waves: Array = []
var wave_idx := -1
var state := "play"
var state_t := 0.0
var msg := ""
var msg_sub := ""
var stop_t := 0.0
var shake_amt := 0.0

# 除錯
var bot := false
var god := false
var args := {}
var run_t := 0.0
var shot_t := 0.0
var shot_n := 0
var burst_n := 0

const FLOOR_NAMES := ["齒輪下城", "月光歌劇院", "大鐘塔"]
const POOLS := [
	{"rat": 4.0, "guard": 3.0, "archer": 2.5, "bomber": 2.0},
	{"rat": 2.0, "guard": 3.0, "archer": 2.5, "bomber": 2.0, "caster": 2.5, "brute": 1.5},
	{"guard": 2.5, "archer": 2.0, "bomber": 2.0, "caster": 2.5, "brute": 2.0},
]

func _ready() -> void:
	_setup_input()
	var font := load("res://fonts/NotoSansCJKtc-Bold-subset.otf") as Font
	if font:
		ThemeDB.fallback_font = font
	for a in OS.get_cmdline_user_args():
		var kv: PackedStringArray = a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	bot = args.has("bot")
	god = args.has("god")
	if args.has("speed"):
		Engine.time_scale = float(args["speed"])
	randomize()
	cam = Camera2D.new()
	cam.anchor_mode = Camera2D.ANCHOR_MODE_FIXED_TOP_LEFT
	add_child(cam)
	arena = Arena.new()
	arena.z_index = -10
	add_child(arena)
	ground = Node2D.new()
	ground.z_index = -5
	add_child(ground)
	world = Node2D.new()
	world.y_sort_enabled = true
	add_child(world)
	fx = PixelFX.new()
	fx.z_index = 20
	add_child(fx)
	var layer := CanvasLayer.new()
	add_child(layer)
	hud = Hud.new()
	hud.main = self
	layer.add_child(hud)
	player = Player.new()
	player.main = self
	world.add_child(player)
	Bal.floor_no = int(args.get("floor", "1"))
	start_room(int(args.get("room", "1")))

func _setup_input() -> void:
	var keys := {
		"move_left": [KEY_A, KEY_LEFT], "move_right": [KEY_D, KEY_RIGHT], "move_up": [KEY_W, KEY_UP], "move_down": [KEY_S, KEY_DOWN],
		"attack": [KEY_J], "skill1": [KEY_Q, KEY_K], "skill2": [KEY_E, KEY_L], "dash": [KEY_SPACE, KEY_SHIFT], "stance": [KEY_R],
	}
	for act in keys:
		if not InputMap.has_action(act):
			InputMap.add_action(act)
		for k in keys[act]:
			var ev := InputEventKey.new()
			ev.physical_keycode = k
			InputMap.action_add_event(act, ev)
	for pair in [["attack", MOUSE_BUTTON_LEFT], ["skill1", MOUSE_BUTTON_RIGHT], ["stance", MOUSE_BUTTON_MIDDLE]]:
		var mb := InputEventMouseButton.new()
		mb.button_index = pair[1]
		InputMap.action_add_event(pair[0], mb)

# ---------------- 房間 ----------------
func start_room(n: int) -> void:
	Bal.room_no = n
	is_boss = n >= 4
	if bot:
		print("ROOM f=%d r=%d t=%.0f hp=%d" % [Bal.floor_no, n, run_t, player.hp])
	for e in enemies:
		e.queue_free()
	for b in bullets:
		b.queue_free()
	for h in hazards:
		h.queue_free()
	for p in pillar_nodes:
		p.queue_free()
	enemies.clear(); bullets.clear(); hazards.clear(); pillar_rects.clear(); pillar_nodes.clear()
	fx.clear()
	boss_ref = null
	arena.setup(Bal.floor_no, randi())
	_make_pillars()
	player.g = Vector2(640, 600)
	player.vel = Vector2.ZERO
	player.iframes = 1.0
	player.sync_pos()
	waves = [] if is_boss else _gen_waves()
	wave_idx = -1
	state = "enter"
	state_t = 0.0
	if n == 1:
		show_msg("第 %d 層" % Bal.floor_no, FLOOR_NAMES[Bal.floor_no - 1])
	elif is_boss:
		show_msg("鏽鐵門衛", "%s 的守護者" % FLOOR_NAMES[Bal.floor_no - 1])
	else:
		show_msg("", "")

func show_msg(a: String, b: String) -> void:
	msg = a
	msg_sub = b

func _make_pillars() -> void:
	var A := Iso.ARENA
	var rects: Array = []
	if is_boss:
		if Bal.floor_no == 1:
			for c in [Vector2(300, 220), Vector2(980, 220), Vector2(300, 480), Vector2(980, 480)]:
				rects.append(Rect2(c - Vector2(24, 18), Vector2(48, 36)))
	else:
		var want := randi_range(2, 4)
		var tries := 0
		while rects.size() < want and tries < 60:
			tries += 1
			var w := randf_range(44, 90)
			var h := randf_range(30, 60)
			var rc := Rect2(randf_range(A.position.x + 90, A.end.x - 90 - w), randf_range(A.position.y + 90, A.end.y - 170 - h), w, h)
			var ok := true
			for o in rects:
				if (o as Rect2).grow(70).intersects(rc):
					ok = false
			if ok:
				rects.append(rc)
	for rc in rects:
		pillar_rects.append(rc)
		var pn := Arena.Pillar.new(rc, arena.pal)
		world.add_child(pn)
		pillar_nodes.append(pn)

func _gen_waves() -> Array:
	var f := Bal.floor_no
	var pool: Dictionary = POOLS[f - 1]
	var nw := 2 if (f == 1 and Bal.room_no <= 2) else 3
	var out := []
	for w in nw:
		var budget := (4.0 + f * 2.5 + Bal.room_no * 0.8) * Bal.count() * (1.25 if w == nw - 1 else 1.0)
		var list := []
		while budget > 0.9:
			var choices: Array = pool.keys().filter(func(k): return Enemy.DEFS[k].cost <= budget + 0.5)
			if choices.is_empty():
				break
			var tot := 0.0
			for k in choices:
				tot += pool[k]
			var rr := randf() * tot
			var pick: String = choices[0]
			for k in choices:
				rr -= pool[k]
				if rr <= 0.0:
					pick = k
					break
			list.append(pick)
			budget -= Enemy.DEFS[pick].cost
		out.append(list)
	return out

func spawn_enemy(kind: String, at: Vector2, instant: bool = false) -> void:
	var A := Iso.ARENA
	var pos := Vector2(clampf(at.x, A.position.x + 40, A.end.x - 40), clampf(at.y, A.position.y + 40, A.end.y - 40))
	var make := func():
		var e := Enemy.new()
		e.main = self
		e.setup(kind, pos)
		world.add_child(e)
		enemies.append(e)
		if e.boss:
			boss_ref = e
		fx.burst(Iso.to_screen(pos, 20), Color("a07ad0"), 10, 140.0, 0.4, 0.0, 3.0, true)
	if instant and kind == "colossus":
		make.call()
		return
	add_hazard({"kind": "spawn", "g": pos, "delay": 0.75, "dmg": 0.0, "on_fire": make})

func _spawn_wave(list: Array) -> void:
	var A := Iso.ARENA
	for kind in list:
		var pos := Vector2.ZERO
		for i in 40:
			pos = Vector2(randf_range(A.position.x + 50, A.end.x - 50), randf_range(A.position.y + 50, A.end.y - 120))
			var blocked := false
			for rc in pillar_rects:
				if (rc as Rect2).grow(20).has_point(pos):
					blocked = true
			if pos.distance_to(player.g) > 240 and not blocked:
				break
		spawn_enemy(kind, pos)

# ---------------- 生成 ----------------
func add_hazard(o: Dictionary) -> Hazard:
	var h := Hazard.new()
	h.main = self
	for k in o:
		h.set(k, o[k])
	ground.add_child(h)
	hazards.append(h)
	return h

func spawn_bullet(o: Dictionary) -> Bullet:
	var b := Bullet.new()
	b.main = self
	for k in o:
		b.set(k, o[k])
	b.position = Iso.to_screen(b.g)
	world.add_child(b)
	bullets.append(b)
	return b

func ghost(p: Player) -> void:
	fx._add(p.hit_point() + Vector2(randf_range(-6, 6), randf_range(-20, 20)), Vector2.ZERO, 0.22, Color("6e2630"), 6.0, 0.0, 0.0, false)

# ---------------- 傷害 ----------------
func damage_enemy(e: Enemy, dmg: float, o: Dictionary = {}) -> void:
	if e.dead:
		return
	var crit := randf() < 0.08
	var d := dmg * (1.6 if crit else 1.0)
	e.hp -= d
	e.flash = 0.08
	var dir: Vector2 = o.get("dir", (e.g - player.g).normalized())
	e.kb += dir * float(o.get("kb", 60.0)) * (0.05 if e.boss else 1.0)
	if o.has("stun"):
		e.stun = maxf(e.stun, float(o["stun"]) * (0.25 if e.boss else 1.0))
	var hp_pt := e.hit_point()
	fx.spark(hp_pt, PixelFX.ELEM.crit if crit else PixelFX.ELEM.phys, crit, Iso.dir_to_screen(dir).angle())
	fx.text(hp_pt + Vector2(0, -e.height * 0.5), str(roundi(d)), Color("ffd447") if crit else Color("f4f0ea"), 22 if crit else 17)
	audio("crit" if crit else "hit")
	if crit:
		hitstop(0.06)
		shake(2.0)
	if e.hp <= 0.0:
		kill_enemy(e)

func kill_enemy(e: Enemy) -> void:
	if e.dead:
		return
	e.dead = true
	fx.shatter(e.shatter_points(), e.hit_point())
	if e.boss:
		var c := e.hit_point()
		fx.burst(c, Color("ffe9a0"), 40, 280.0, 0.8, 0.0, 4.0, true)
		fx.ring(Iso.to_screen(e.g), 160, Color("ffe9a0"), 0.6, 4.0, true)
		fx.light(c, 90, Color("ffe9a0"), 0.4)
		hitstop(0.12)
		shake(5.0)
		for o in enemies:
			if not o.dead and o != e:
				o.dead = true
				fx.shatter(o.shatter_points(), o.hit_point())
		for b in bullets:
			if b.team == "enemy":
				b.life = 0.0
		for h in hazards:
			if h.team == "enemy" and not h.fired:
				h.t = 99.0
				h.fired = true
	else:
		shake(1.5)
	e.visible = false

func hurt_player(d: float) -> bool:
	var p := player
	if p.dead or p.iframes > 0.0 or p.dash_t > 0.0 or state != "play":
		return false
	p.hp -= d
	p.iframes = 0.7
	p.flash = 0.1
	p.hurt_t = 0.25
	fx.text(p.hit_point() + Vector2(0, -40), "-%d" % roundi(d), Color("ff4a4a"), 22)
	fx.spark(p.hit_point(), Color("ff3b3b"), false, 0.0)
	shake(6.0)
	hitstop(0.06)
	audio("hurt")
	if god and p.hp < 1.0:
		p.hp = p.max_hp
	if p.hp <= 0.0:
		p.hp = 0.0
		p.dead = true
		p.visible = false
		fx.burst(p.hit_point(), Color("d0565a"), 30, 220.0, 0.8, 200.0, 4.0, false)
		state = "dead"
		state_t = 0.0
		show_msg("你的懷錶停了……", "3 秒後從第 1 層重新開始")
	return true

func hitstop(s: float) -> void:
	stop_t = maxf(stop_t, s)

func shake(a: float) -> void:
	shake_amt = minf(14.0, maxf(shake_amt, a))

func audio(_name: String) -> void:
	pass  # 音效之後補（暫時無聲）

# ---------------- 主迴圈 ----------------
func _physics_process(dt: float) -> void:
	run_t += dt
	if stop_t > 0.0:
		stop_t -= dt
		return
	state_t += dt
	player.tick(dt)
	for e in enemies:
		e.tick(dt)
	var keep_b: Array = []
	for b in bullets:
		if b.tick(dt):
			keep_b.append(b)
		else:
			b.queue_free()
	bullets = keep_b
	var keep_h: Array = []
	for h in hazards:
		if h.tick(dt):
			keep_h.append(h)
		else:
			h.queue_free()
	hazards = keep_h
	var gone := enemies.filter(func(e): return e.dead)
	for e in gone:
		e.queue_free()
	enemies = enemies.filter(func(e): return not e.dead)
	_flow()

func _flow() -> void:
	match state:
		"enter":
			if state_t > 1.0:
				state = "play"
				state_t = 0.0
				if is_boss:
					spawn_enemy("colossus", Vector2(640, 220), true)
		"play":
			if state_t > 1.8 and msg != "" and not is_boss:
				show_msg("", "")
			if state_t > 2.2 and is_boss and msg != "":
				show_msg("", "")
			var pending := hazards.any(func(h): return h.kind == "spawn")
			if enemies.is_empty() and not pending:
				if is_boss:
					if boss_ref != null:
						_room_cleared()
				else:
					wave_idx += 1
					if wave_idx < waves.size():
						_spawn_wave(waves[wave_idx])
					else:
						_room_cleared()
		"clear":
			if state_t > 1.6:
				if is_boss:
					if Bal.floor_no >= 3:
						state = "win"
						state_t = 0.0
						show_msg("十二點的鐘聲響起", "戰鬥切片通關！5 秒後重新開始")
					else:
						Bal.floor_no += 1
						player.hp = minf(player.max_hp, player.hp + player.max_hp * 0.4)
						start_room(1)
				else:
					start_room(Bal.room_no + 1)
		"dead", "win":
			if state_t > (3.0 if state == "dead" else 5.0):
				Bal.floor_no = 1
				player.dead = false
				player.visible = true
				player.hp = player.max_hp
				player.energy = 40.0
				player.heat = 0.0
				start_room(1)

func _room_cleared() -> void:
	state = "clear"
	state_t = 0.0
	show_msg("清除！", "")
	player.hp = minf(player.max_hp, player.hp + 6.0)

func _process(delta: float) -> void:
	fx.update_fx(delta * (0.25 if stop_t > 0.0 else 1.0))
	shake_amt *= pow(0.002, delta)
	if shake_amt < 0.3:
		shake_amt = 0.0
	cam.offset = Vector2(randf_range(-1, 1), randf_range(-1, 1)).round() * shake_amt * 0.5
	hud.queue_redraw()
	_debug_capture(delta)

func _debug_capture(delta: float) -> void:
	if args.has("shots"):
		shot_t += delta
		if shot_t >= float(args.get("shot-every", "3")):
			shot_t = 0.0
			shot_n += 1
			_save(args["shots"] + "%02d.png" % shot_n)
	if args.has("burst") and run_t > float(args.get("burst-at", "3")) and burst_n < 16:
		shot_t += delta
		if burst_n == 0 or shot_t >= 0.05:
			shot_t = 0.0
			_save(args["burst"] + "%02d.png" % burst_n)
			burst_n += 1
	if args.has("quit-after") and run_t > float(args["quit-after"]):
		get_tree().quit()

func _save(path: String) -> void:
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(path)
