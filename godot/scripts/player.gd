class_name Player
extends Actor
## 艾琳：有代價的普攻（慢、出招中移動變慢、揮空硬直、過熱）、閃避、兩種姿態、兩個技能

var rig: Rig
var energy := 40.0
var max_energy := 100.0
var heat := 0.0
var overheated := false
var stance := 0                 # 0 快劍、1 重劍
var combo := 0
var attack = null               # 進行中的普攻 / 技能動作
var queued := false
var dash_t := 0.0
var dash_dir := Vector2.RIGHT
var dash_charges := 1
var dash_re := 0.0
var iframes := 0.0
var hurt_t := 0.0
var aim := 0.0                  # 地面角度
var vel := Vector2.ZERO
var speed := 230.0
var skill_cd := [0.0, 0.0]
var switch_cd := 0.0
var whirl_t := 0.0
var whirl_tick := 0.0
var steam_t := 0.0
var t := 0.0
var bot_dash_t := 0.0
var magnet = null              # 普攻吸附的目標

const SKILLS := [
	{"name": "迴旋斬", "key": "Q", "cost": 30.0, "cd": 1.0},
	{"name": "劍氣", "key": "E", "cost": 25.0, "cd": 0.6},
]

func _ready() -> void:
	r = 14.0
	max_hp = 110.0
	hp = max_hp
	height = 66.0
	rig = Rig.new()
	add_child(rig)
	rig.build_erin()

# ---------- 輸入（玩家或測試機器人）----------
func read_input() -> Dictionary:
	if main.bot:
		return _bot_input()
	var mv := Vector2(Input.get_axis("move_left", "move_right"), Input.get_axis("move_up", "move_down"))
	return {
		"move": mv.limit_length(1.0),
		"aim_g": Iso.to_ground(get_global_mouse_position()),
		"atk": Input.is_action_pressed("attack"),
		"q": Input.is_action_pressed("skill1"),
		"e": Input.is_action_pressed("skill2"),
		"dash": Input.is_action_just_pressed("dash"),
		"stance": Input.is_action_just_pressed("stance"),
	}

func _bot_input() -> Dictionary:
	var res := {"move": Vector2.ZERO, "aim_g": g + Vector2.RIGHT, "atk": false, "q": false, "e": false, "dash": false, "stance": false}
	var best = null
	var bd := 1e9
	for e in main.enemies:
		if e.dead:
			continue
		var d: float = e.g.distance_to(g)
		if d < bd:
			bd = d
			best = e
	# 躲地面預警
	for hz in main.hazards:
		if hz.kind != "spawn" and not hz.fired and hz.contains(g, r + 10):
			var away: Vector2 = (g - (hz.g if hz.kind == "circle" else Geometry2D.get_closest_point_to_segment(g, hz.g, hz.g2)))
			res.move = away.normalized() if away.length() > 1 else Vector2.RIGHT
			bot_dash_t -= 1.0 / 60.0
			if bot_dash_t <= 0.0:
				res.dash = true
				bot_dash_t = 1.2
			return res
	if best == null:
		return res
	res.aim_g = best.g
	var want: float = 58.0 + best.r
	var to: Vector2 = best.g - g
	if bd > want + 10:
		res.move = to.normalized()
	elif bd < want - 20:
		res.move = -to.normalized()
	res.atk = bd < want + 30
	res.q = energy > 70 and bd < 110
	res.e = energy > 55 and bd > 140
	res.stance = randf() < 0.003
	return res

# ---------- 每個邏輯步 ----------
func tick(dt: float) -> void:
	if dead:
		return
	t += dt
	var inp := read_input()
	var aim_v: Vector2 = inp.aim_g - g
	if aim_v.length() > 2.0:
		aim = aim_v.angle()
	iframes = maxf(0.0, iframes - dt)
	hurt_t = maxf(0.0, hurt_t - dt)
	flash = maxf(0.0, flash - dt)
	switch_cd = maxf(0.0, switch_cd - dt)
	energy = minf(max_energy, energy + 3.0 * dt)
	for i in 2:
		skill_cd[i] = maxf(0.0, skill_cd[i] - dt)
	# 熱度
	heat = maxf(0.0, heat - Bal.HEAT_COOL * dt)
	if heat >= Bal.HEAT_MAX:
		overheated = true
	elif heat < 2.0:
		overheated = false
	if overheated:
		steam_t -= dt
		if steam_t <= 0.0:
			steam_t = 0.08
			main.fx.rise(Iso.to_screen(g, 70), Color("c8c0b4"), 2, 10.0)

	# 姿態切換（動作中不能切）
	if inp.stance and attack == null and switch_cd <= 0.0:
		stance = 1 - stance
		switch_cd = 0.6
		combo = 0
		rig.set_weapon("sword" if stance == 0 else "greatsword")
		main.fx.text(Iso.to_screen(g, 110), "快劍" if stance == 0 else "重劍", Color("ffd9a0"), 18)
		main.fx.ring(Iso.to_screen(g), 40, Color("ffd9a0"), 0.25, 2.0, true)

	# 閃避：沒在出招，或已經過了命中判定才能取消
	dash_re += dt
	if dash_charges < 1 and dash_re >= 0.85:
		dash_charges = 1
	var can_cancel: bool = attack == null or attack.fired
	if inp.dash and dash_charges > 0 and dash_t <= 0.0 and can_cancel and whirl_t <= 0.0:
		dash_charges -= 1
		dash_re = 0.0
		dash_t = 0.17
		dash_dir = (inp.move as Vector2).normalized() if (inp.move as Vector2).length() > 0.1 else Vector2.from_angle(aim)
		iframes = maxf(iframes, 0.24)
		attack = null
		queued = false
		main.fx.dust(Iso.to_screen(g), 10)

	# 移動
	if dash_t > 0.0:
		dash_t -= dt
		vel = dash_dir * 640.0
		if int(t * 60) % 2 == 0:
			main.ghost(self)
	else:
		var mult := 1.0
		if attack != null:
			mult = attack.move
		if whirl_t > 0.0:
			mult = 0.6
		vel = vel.lerp((inp.move as Vector2) * speed * mult, 0.3)
	g += vel * dt
	apply_kb(dt)
	collide_world()

	# 普攻
	if attack == null and inp.atk and whirl_t <= 0.0 and dash_t <= 0.0:
		_start_attack()
	elif attack != null:
		attack.t += dt
		if attack.kind == "basic" and inp.atk and attack.t > attack.dur * 0.6:
			queued = true
		if attack.kind == "basic" and not attack.fired and magnet != null and not magnet.dead:
			var to: Vector2 = magnet.g - g
			var reach: float = float(Bal.ATTACK["quick" if stance == 0 else "heavy"].range) * 0.75 + magnet.r
			if to.length() > reach:
				g += to.normalized() * minf(to.length() - reach, 420.0 * dt)
				aim = to.angle()
		if not attack.fired and attack.t >= attack.dur * Bal.STRIKE_AT:
			attack.fired = true
			if attack.strike.is_valid():
				attack.strike.call()
		if attack.t >= attack.dur:
			attack = null
			if queued and inp.atk:
				queued = false
				_start_attack()
			queued = false

	# 技能
	if (attack == null or attack.fired) and dash_t <= 0.0 and whirl_t <= 0.0:
		if inp.q:
			_try_skill(0)
		elif inp.e:
			_try_skill(1)
	if whirl_t > 0.0:
		_whirl_tick(dt)

	_update_pose(dt)
	sync_pos()

# ---------- 普攻 ----------
func _start_attack() -> void:
	var key := "quick" if stance == 0 else "heavy"
	var P: Dictionary = Bal.ATTACK[key]
	var n: int = (P.dur as Array).size()
	var c := combo % n
	var dur: float = P.dur[c]
	if overheated:
		dur /= Bal.OVERHEAT_SLOW
	heat += P.heat
	var fin := c == n - 1
	attack = {
		"kind": "basic", "t": 0.0, "dur": dur, "fired": false, "side": -1.0 if c % 2 else 1.0,
		"type": "heavy" if (stance == 1 or fin) else "slash", "move": P.move,
	}
	attack.strike = func(): _strike(P, c, fin)
	# 吸附：瞄準方向附近、稍微超出攻擊距離的敵人，蓄力時會自動踏步靠近
	magnet = null
	var best := 1e9
	for e in main.enemies:
		if e.dead:
			continue
		var to: Vector2 = e.g - g
		var d: float = to.length() - e.r
		if d < float(P.range) + 50.0 and absf(angle_difference(aim, to.angle())) < float(P.half) + 0.35 and d < best:
			best = d
			magnet = e
	if magnet != null:
		aim = (magnet.g - g).angle()
	combo = (combo + 1) % n

func _strike(P: Dictionary, c: int, fin: bool) -> void:
	var ang := aim
	var rng_v: float = P.range
	var half: float = P.half
	var n := 0
	for e in main.enemies:
		if e.dead:
			continue
		var to: Vector2 = e.g - g
		var d := to.length()
		if d > rng_v + e.r:
			continue
		if absf(angle_difference(ang, to.angle())) > half and d > e.r + 18:
			continue
		var opts := {"dir": Vector2.from_angle(ang), "kb": float(P.kb[c]), "tags": ["melee"]}
		if stance == 1 and fin:
			opts["stun"] = 0.55
		main.damage_enemy(e, float(P.dmg[c]), opts)
		n += 1
	# 刀光（畫面座標、壓扁成地面角度）
	var side: float = attack.side if attack else 1.0
	var w := 5.0 if (stance == 1 or fin) else 4.0
	var col := Color("ffcf8a") if (stance == 1 or fin) else Color("e8eef8")
	# 刀光畫在腳下的地面上，大小就是實際打得到的範圍
	main.fx.sector(Iso.to_screen(g), rng_v, ang - half, ang + half, col, 0.12)
	main.fx.slash_arc(Iso.to_screen(g), rng_v, ang - half * side, ang + half * side, col, w, 0.22 if fin else 0.18, Iso.K)
	main.audio("swing")
	if n > 0:
		energy = minf(max_energy, energy + 7.0 + 2.0 * (n - 1))
		if stance == 1 or fin:
			main.hitstop(0.05 if stance == 0 else 0.08)
			main.shake(3.0 if stance == 0 else 5.0)
		vel += Vector2.from_angle(ang) * (220.0 if fin else 140.0)
	else:
		# 揮空：收招變長
		attack.dur += Bal.MISS_EXTRA
		main.fx.text(Iso.to_screen(g, 100), "揮空", Color("9a9090"), 14)
	if stance == 1 and fin:
		var p := Iso.to_screen(g + Vector2.from_angle(ang) * 50)
		main.fx.dust(p, 12)
		main.fx.ring(p, 56, Color("ffcf8a"), 0.3, 3.0, true)

# ---------- 技能 ----------
func _try_skill(i: int) -> void:
	var S: Dictionary = SKILLS[i]
	if skill_cd[i] > 0.0:
		return
	if energy < S.cost:
		return
	energy -= S.cost
	skill_cd[i] = S.cd
	if i == 0:
		whirl_t = 0.45
		whirl_tick = 0.0
		attack = {"kind": "skill", "t": 0.0, "dur": 0.45, "fired": true, "side": 1.0, "type": "spin", "move": 0.6, "strike": Callable()}
	else:
		attack = {"kind": "skill", "t": 0.0, "dur": 0.3, "fired": false, "side": 1.0, "type": "slash", "move": 0.4}
		attack.strike = func(): _wave()

func _whirl_tick(dt: float) -> void:
	whirl_t -= dt
	whirl_tick -= dt
	if whirl_tick <= 0.0:
		whirl_tick = 0.12
		for e in main.enemies:
			if not e.dead and e.g.distance_to(g) < 100.0 + e.r:
				main.damage_enemy(e, 11.0, {"dir": (e.g - g).normalized(), "kb": 80.0, "tags": ["melee", "skill"]})
		var c := Iso.to_screen(g)
		var a0 := t * 18.0
		main.fx.slash_arc(c, 100.0, a0, a0 + 2.4, Color("ffe9d0"), 5.0, 0.16, Iso.K)
		main.fx.sector(c, 100.0, 0.0, TAU, Color("ffe9d0"), 0.1)
		main.audio("swing")

func _wave() -> void:
	for k in [-1, 0, 1]:
		if k != 0 and stance == 0:
			continue
		var a: float = aim + k * 0.22
		main.spawn_bullet({"g": g + Vector2.from_angle(a) * 20, "v": Vector2.from_angle(a) * 640.0, "r": 26.0, "dmg": 22.0, "team": "player",
			"life": 0.55, "pierce": 99, "kind": "wave", "col": Color("ffe0b0"), "kb": 140.0, "z": 36.0})
	var sa := Iso.dir_to_screen(Vector2.from_angle(aim)).angle()
	main.fx.slash_arc(Iso.to_screen(g, 28), 40, sa - 1.2, sa + 1.2, Color("ffe0b0"), 5.0, 0.2)
	main.audio("swing")

# ---------- 動作姿勢（蓄力 → 揮擊 → 收招）----------
const ANIM := {
	"slash": {"charge": -1.6, "strike": 1.3, "back": 3.0, "fwd": 8.0},
	"heavy": {"charge": -2.3, "strike": 1.6, "back": 5.0, "fwd": 11.0},
}

func _ease(x: float) -> float:
	return 1.0 - (1.0 - x) * (1.0 - x)

func _update_pose(dt: float) -> void:
	var sd := Iso.dir_to_screen(Vector2.from_angle(aim))
	if absf(sd.x) > 0.15:
		rig.facing = 1.0 if sd.x > 0 else -1.0
	var aim_local := atan2(sd.y, sd.x * rig.facing)
	var idle := 0.35 + sin(t * 2.0) * 0.04
	var off := idle
	var body := 0.0
	var ext := 0.0
	if attack != null:
		var k: float = clampf(attack.t / attack.dur, 0.0, 1.0)
		if attack.type == "spin":
			off = k * TAU * 2.0
		else:
			var D: Dictionary = ANIM[attack.type]
			var side: float = attack.side
			# 揮空會把收招拉長，動作照「原本長度」比例走，多出來的時間停在收招姿勢
			if k < 0.3:
				var e := _ease(k / 0.3)
				off = lerpf(idle, D.charge * side, e)
				body = -D.back * e
			elif k < 0.45:
				var e2 := (k - 0.3) / 0.15
				off = lerpf(D.charge * side, D.strike * side, e2)
				body = lerpf(-D.back, D.fwd, e2)
			else:
				var e3 := _ease((k - 0.45) / 0.55)
				off = lerpf(D.strike * side, idle, e3)
				body = lerpf(D.fwd, 0.0, e3)
	var mr := clampf(vel.length() / speed, 0.0, 1.0) if dash_t <= 0.0 else 0.0
	var lean := 0.35 if dash_t > 0.0 else 0.0
	rig.pose(dt, mr, aim_local, off, ext, body, hurt_t * 3.0, lean, t)
	rig.modulate = Color(2.4, 2.4, 2.4) if flash > 0.0 else (Color(1, 1, 1, 0.5) if iframes > 0.0 and dash_t <= 0.0 and int(t * 20) % 2 == 0 else Color(1, 1, 1, 1))
	queue_redraw()

const HURT_R := 11.0   # 受傷判定半徑（腳下那圈）

func _draw() -> void:
	draw_shadow(r)
	# 受傷判定圈：子彈的影子、地面預警碰到這圈才會受傷
	draw_set_transform(Vector2.ZERO, 0.0, Vector2(1.0, Iso.K))
	draw_arc(Vector2.ZERO, HURT_R, 0.0, TAU, 24, Color(1, 0.95, 0.8, 0.55), 1.5)
	draw_circle(Vector2.ZERO, 2.0, Color(1, 0.95, 0.8, 0.8))
	draw_set_transform(Vector2.ZERO)
	if overheated:
		draw_set_transform(Vector2.ZERO, 0.0, Vector2(1.0, Iso.K * 0.5))
		draw_arc(Vector2.ZERO, 24.0, 0.0, TAU, 24, Color(1, 0.35, 0.2, 0.6), 2.0)
		draw_set_transform(Vector2.ZERO)
