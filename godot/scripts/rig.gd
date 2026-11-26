class_name Rig
extends Node2D
## 零件骨架：目前用 Polygon2D 當暫代圖，之後把 GPT 畫的零件 PNG 換上（set_part_texture）。
## 只做「面向右」的版本，面向左時整組水平翻轉。

var parts := {}
var facing := 1.0
var run_phase := 0.0
var weapon_kind := ""
var size := 0.72              # 整體縮放（角色太大時調這裡）

const OUT := Color("1b1420")
const PAL := {
	"hair": Color("d0503e"), "hair2": Color("8a2c26"), "skin": Color("f2c9a0"), "armor": Color("c4ccd8"), "armor2": Color("8a94a6"),
	"cape": Color("8a2030"), "cape2": Color("5a1420"), "gold": Color("e8c050"), "pants": Color("4a4e5e"), "boot": Color("4a3426"),
}

func _poly(pts: Array, col: Color, outline: bool = true) -> Polygon2D:
	var p := Polygon2D.new()
	p.polygon = PackedVector2Array(pts)
	p.color = col
	if outline:
		var l := Line2D.new()
		var ol := PackedVector2Array(pts)
		ol.append(pts[0])
		l.points = ol
		l.width = 2.0
		l.default_color = OUT
		l.joint_mode = Line2D.LINE_JOINT_ROUND
		p.add_child(l)
	return p

func _joint(name: String, parent: Node2D, pos: Vector2) -> Node2D:
	var n := Node2D.new()
	n.name = name
	n.position = pos
	parent.add_child(n)
	parts[name] = n
	return n

func _rect(x0: float, y0: float, x1: float, y1: float) -> Array:
	return [Vector2(x0, y0), Vector2(x1, y0), Vector2(x1, y1), Vector2(x0, y1)]

## 艾琳的暫代零件（比例照 ART_PROMPTS 的零件拆法）
func build_erin() -> void:
	var hip := _joint("hip", self, Vector2(0, -44))
	var leg_b := _joint("leg_back", hip, Vector2(-4, 0))
	leg_b.add_child(_poly(_rect(-6, -2, 6, 36), PAL.pants.darkened(0.25)))
	leg_b.add_child(_poly(_rect(-7, 32, 9, 44), PAL.boot.darkened(0.25)))
	var leg_f := _joint("leg_front", hip, Vector2(5, 0))
	leg_f.add_child(_poly(_rect(-6, -2, 6, 36), PAL.pants))
	leg_f.add_child(_poly(_rect(-7, 32, 10, 44), PAL.boot))
	var torso := _joint("torso", hip, Vector2(0, 0))
	var cape := _joint("cape", torso, Vector2(-7, -36))
	cape.add_child(_poly([Vector2(-4, 0), Vector2(6, 0), Vector2(4, 46), Vector2(-16, 50), Vector2(-14, 20)], PAL.cape2))
	var arm_b := _joint("arm_back", torso, Vector2(-8, -33))
	arm_b.add_child(_poly(_rect(-4, -3, 5, 26), PAL.armor2))
	arm_b.add_child(_poly(_rect(-4, 24, 5, 31), PAL.skin.darkened(0.2)))
	torso.add_child(_poly([Vector2(-12, 2), Vector2(12, 2), Vector2(14, -36), Vector2(-13, -38)], PAL.armor))
	torso.add_child(_poly(_rect(-12, -6, 12, 1), PAL.gold))
	torso.add_child(_poly([Vector2(-4, -32), Vector2(8, -32), Vector2(6, -12), Vector2(-2, -12)], Color("e0e6ee"), false))
	var head := _joint("head", torso, Vector2(1, -38))
	head.add_child(_poly([Vector2(-14, -8), Vector2(-26, -2), Vector2(-24, 6), Vector2(-12, 0)], PAL.hair2))   # 馬尾
	head.add_child(_poly([Vector2(-10, 0), Vector2(11, 0), Vector2(13, -18), Vector2(4, -27), Vector2(-9, -25), Vector2(-14, -12)], PAL.skin))
	head.add_child(_poly([Vector2(-14, -10), Vector2(-12, -24), Vector2(0, -31), Vector2(12, -24), Vector2(14, -16), Vector2(4, -20), Vector2(-4, -14)], PAL.hair))
	head.add_child(_poly(_rect(6, -15, 9, -10), OUT, false))
	var arm_f := _joint("arm_front", torso, Vector2(9, -33))
	arm_f.add_child(_poly(_rect(-4, -3, 5, 26), PAL.armor))
	var hand := _joint("hand", arm_f, Vector2(0, 28))
	hand.add_child(_poly(_rect(-5, -4, 5, 5), PAL.skin))
	var weapon := _joint("weapon", hand, Vector2.ZERO)
	weapon.z_index = 0
	set_weapon("sword")
	# 前手要畫在武器上面：手掌節點移到最後
	hand.move_child(hand.get_child(0), -1)

func set_weapon(kind: String) -> void:
	if kind == weapon_kind:
		return
	weapon_kind = kind
	var w: Node2D = parts["weapon"]
	for c in w.get_children():
		c.queue_free()
	if kind == "sword":
		w.add_child(_poly(_rect(-2, -8, 2, 2), PAL.boot))
		w.add_child(_poly(_rect(-8, 2, 8, 6), PAL.gold))
		w.add_child(_poly([Vector2(-4, 6), Vector2(4, 6), Vector2(4, 54), Vector2(0, 62), Vector2(-4, 54)], Color("dfe5ee")))
		w.add_child(_poly(_rect(-1, 8, 1, 52), Color("ffffff"), false))
	else:
		w.add_child(_poly(_rect(-3, -14, 3, 2), Color("8a2c26")))
		w.add_child(_poly([Vector2(-13, 2), Vector2(13, 2), Vector2(10, 9), Vector2(-10, 9)], PAL.gold))
		w.add_child(_poly([Vector2(-7, 9), Vector2(7, 9), Vector2(7, 74), Vector2(0, 86), Vector2(-7, 74)], Color("c8d0dc")))
		w.add_child(_poly(_rect(-1, 12, 2, 72), Color("ffffff"), false))

## 每幀更新姿勢
## aim_local：面向右的座標系中，武器要指的角度（0 = 正右、PI/2 = 正下）
## off：攻擊動作的角度偏移；ext：武器往前伸；body：身體前後位移；hurt：受擊後仰
func pose(dt: float, move_ratio: float, aim_local: float, off: float, ext: float, body: float, hurt: float, lean: float, t: float) -> void:
	scale = Vector2(facing, 1.0) * size
	run_phase += dt * 14.0 * move_ratio
	var s := sin(run_phase)
	var hip: Node2D = parts["hip"]
	hip.position = Vector2(body, -44 - absf(s) * 3.0 * move_ratio + sin(t * 2.2) * 0.8 * (1.0 - move_ratio))
	(parts["leg_back"] as Node2D).rotation = -s * 0.6 * move_ratio
	(parts["leg_front"] as Node2D).rotation = s * 0.6 * move_ratio
	var torso: Node2D = parts["torso"]
	torso.rotation = 0.1 * move_ratio + lean - hurt * 0.3
	(parts["head"] as Node2D).rotation = -torso.rotation * 0.4 + sin(t * 2.2) * 0.03
	(parts["cape"] as Node2D).rotation = -0.15 * move_ratio - lean * 0.8 + sin(t * 3.0) * 0.05 + hurt * 0.2
	(parts["arm_back"] as Node2D).rotation = -s * 0.5 * move_ratio + 0.15
	var arm: Node2D = parts["arm_front"]
	arm.rotation = aim_local - PI / 2.0 + off - torso.rotation
	(parts["weapon"] as Node2D).position = Vector2(0, ext)

## 武器尖端的畫面座標
func weapon_tip() -> Vector2:
	var w: Node2D = parts["weapon"]
	return w.to_global(Vector2(0, 60 if weapon_kind == "sword" else 84))
