class_name Hud
extends Control
## 介面：血條、發條、熱度、姿態、技能、首領血條、樓層資訊、中央訊息

var main: Node
var font: Font

func _ready() -> void:
	font = ThemeDB.fallback_font
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_preset(Control.PRESET_FULL_RECT)

func _txt(p: Vector2, s: String, size: int, col: Color, align := HORIZONTAL_ALIGNMENT_LEFT, w := -1.0) -> void:
	draw_string_outline(font, p, s, align, w, size, 4, Color(0, 0, 0, 0.85))
	draw_string(font, p, s, align, w, size, col)

func _bar(r: Rect2, k: float, col: Color) -> void:
	draw_rect(r, Color(0, 0, 0, 0.65))
	draw_rect(Rect2(r.position, Vector2(r.size.x * clampf(k, 0, 1), r.size.y)), col)
	draw_rect(r, Color(1, 1, 1, 0.25), false, 1.0)

func _draw() -> void:
	var p: Player = main.player
	if p == null:
		return
	# 左上
	_bar(Rect2(16, 14, 300, 20), p.hp / p.max_hp, Color("d8404a") if p.hp > p.max_hp * 0.3 else Color("ff3b3b"))
	_txt(Vector2(24, 30), "生命 %d / %d" % [ceili(p.hp), p.max_hp], 15, Color.WHITE)
	_bar(Rect2(16, 40, 220, 12), p.energy / p.max_energy, Color("ffa53a"))
	_txt(Vector2(244, 52), "發條 %d" % p.energy, 13, Color("ffd9a0"))
	var hk := p.heat / Bal.HEAT_MAX
	_bar(Rect2(16, 58, 160, 8), hk, Color("ff4a2a") if p.overheated else Color("c87a4a"))
	_txt(Vector2(184, 67), "過熱！攻速變慢" if p.overheated else "熱度", 13, Color("ff6a4a") if p.overheated else Color("b09a8a"))
	# 中上
	var names := ["齒輪下城", "月光歌劇院", "大鐘塔"]
	_txt(Vector2(0, 26), "第 %d 層・%s" % [Bal.floor_no, names[Bal.floor_no - 1]], 18, Color("f4e2b0"), HORIZONTAL_ALIGNMENT_CENTER, 1280)
	var info := "首領房" if main.is_boss else "房間 %d / 3・波次 %d / %d" % [Bal.room_no, maxi(1, main.wave_idx + 1), main.waves.size()]
	_txt(Vector2(0, 46), info, 14, Color("b8a898"), HORIZONTAL_ALIGNMENT_CENTER, 1280)
	# 首領血條
	var b = main.boss_ref
	if b != null and not b.dead:
		_bar(Rect2(340, 58, 600, 14), b.hp / b.max_hp, Color("ff3b3b") if b.phase == 2 else Color("b83a3a"))
		_txt(Vector2(0, 71), b.def.name, 14, Color("ffd9c0"), HORIZONTAL_ALIGNMENT_CENTER, 1280)
	# 下方：姿態與技能
	var y := 640.0
	var sx := 480.0
	draw_rect(Rect2(sx, y, 76, 56), Color(0.05, 0.03, 0.05, 0.85))
	draw_rect(Rect2(sx, y, 76, 56), Color("d0565a"), false, 2.0)
	_txt(Vector2(sx, y + 34), "快劍" if p.stance == 0 else "重劍", 18, Color("ffe9d0"), HORIZONTAL_ALIGNMENT_CENTER, 76)
	_txt(Vector2(sx, y - 6), "R 切換", 13, Color("e8d8c8"), HORIZONTAL_ALIGNMENT_CENTER, 76)
	for i in 2:
		var S: Dictionary = Player.SKILLS[i]
		var x := 572.0 + i * 88.0
		var ready: bool = p.skill_cd[i] <= 0.0 and p.energy >= S.cost
		draw_rect(Rect2(x, y, 76, 56), Color(0.05, 0.03, 0.05, 0.85))
		draw_rect(Rect2(x, y, 76, 56), Color("a8885a") if ready else Color("4a3a30"), false, 2.0)
		_txt(Vector2(x, y + 28), S.name, 16, Color.WHITE if ready else Color(1, 1, 1, 0.4), HORIZONTAL_ALIGNMENT_CENTER, 76)
		_txt(Vector2(x, y + 48), "%d" % S.cost, 13, Color("ffa53a") if p.energy >= S.cost else Color("ff5a5a"), HORIZONTAL_ALIGNMENT_CENTER, 76)
		if p.skill_cd[i] > 0.0:
			var k: float = p.skill_cd[i] / S.cd
			draw_rect(Rect2(x, y + 56 * (1.0 - k), 76, 56 * k), Color(0, 0, 0, 0.55))
		_txt(Vector2(x, y - 6), "右鍵/Q" if i == 0 else "E", 13, Color("e8d8c8"), HORIZONTAL_ALIGNMENT_CENTER, 76)
	draw_circle(Vector2(770, y + 28), 7, Color("9fd8ff") if p.dash_charges > 0 else Color(1, 1, 1, 0.15))
	_txt(Vector2(784, y + 33), "空白鍵閃避", 13, Color("b8a898"))
	# 中央訊息
	if main.msg != "":
		_txt(Vector2(0, 300), main.msg, 44, Color("f4e2b0"), HORIZONTAL_ALIGNMENT_CENTER, 1280)
		if main.msg_sub != "":
			_txt(Vector2(0, 340), main.msg_sub, 18, Color("d8c0a8"), HORIZONTAL_ALIGNMENT_CENTER, 1280)
	# 準心
	var m := get_global_mouse_position()
	draw_arc(m, 8, 0, TAU, 16, Color(1, 0.86, 0.7, 0.8), 1.5)
