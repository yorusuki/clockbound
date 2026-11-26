class_name PixelFX
extends Node2D
## 像素戰鬥特效（自製）：粒子固定 120Hz 步進、上限 500、固定種子；色彩層一般混色、光層加法混色。
## 所有座標都是畫面座標。

const STEP := 1.0 / 120.0
const MAX_PARTS := 500

var rng := RandomNumberGenerator.new()
var parts: Array = []     # {p, v, life, max, c, s, g, drag, light}
var arcs: Array = []
var streaks: Array = []
var rings: Array = []
var lights: Array = []
var bolts: Array = []
var texts: Array = []
var sectors: Array = []
var _acc := 0.0
var light_layer: Node2D

const ELEM := {
	"phys": Color("f0f0f0"), "fire": Color("ff8a3a"), "frost": Color("8ae0ff"),
	"bolt": Color("ffe84a"), "shadow": Color("c08aff"), "crit": Color("ffd447"),
}

func _ready() -> void:
	rng.seed = 12345
	light_layer = Node2D.new()
	var mat := CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	light_layer.material = mat
	light_layer.z_index = 1
	light_layer.draw.connect(func(): draw_light(light_layer))
	add_child(light_layer)

func clear() -> void:
	sectors.clear(); parts.clear(); arcs.clear(); streaks.clear(); rings.clear(); lights.clear(); bolts.clear(); texts.clear()

func update_fx(dt: float) -> void:
	_acc += minf(dt, 0.25)
	var n := 0
	while _acc >= STEP and n < 12:
		for p in parts:
			var v: Vector2 = p.v
			v.y += p.g * STEP
			v *= maxf(1.0 - p.drag * STEP, 0.0)
			p.v = v
			p.p = p.p + v * STEP
			p.life -= STEP
		_acc -= STEP
		n += 1
	if n >= 12:
		_acc = 0.0
	parts = parts.filter(func(p): return p.life > 0.0)
	for arr in [arcs, streaks, rings, lights, bolts, texts, sectors]:
		for x in arr:
			x.t += dt
	arcs = arcs.filter(func(x): return x.t < x.life)
	streaks = streaks.filter(func(x): return x.t < x.life)
	rings = rings.filter(func(x): return x.t < x.life)
	lights = lights.filter(func(x): return x.t < x.life)
	bolts = bolts.filter(func(x): return x.t < x.life)
	texts = texts.filter(func(x): return x.t < x.life)
	sectors = sectors.filter(func(x): return x.t < x.life)
	queue_redraw()
	light_layer.queue_redraw()

# ---------- 產生 ----------
func _add(p: Vector2, v: Vector2, life: float, c: Color, sz: float = 2.0, g: float = 0.0, drag: float = 0.0, light: bool = false) -> void:
	if parts.size() >= MAX_PARTS:
		parts.pop_front()
	parts.append({"p": p, "v": v, "life": life, "max": life, "c": c, "s": sz, "g": g, "drag": drag, "light": light})

func burst(pos: Vector2, col: Color, n: int, speed: float, life: float, g: float = 0.0, sz: float = 2.0, light: bool = true, dir: float = 0.0, spread: float = TAU) -> void:
	for i in n:
		var a := dir + rng.randf_range(-spread / 2.0, spread / 2.0)
		_add(pos, Vector2(cos(a), sin(a)) * speed * rng.randf_range(0.35, 1.0), life * rng.randf_range(0.6, 1.0),
			col.lightened(rng.randf_range(0.0, 0.35)), sz, g, 3.0, light)

func spark(pos: Vector2, col: Color, crit: bool = false, dir: float = 0.0) -> void:
	burst(pos, col, 14 if crit else 8, 200.0 if crit else 140.0, 0.28, 140.0, 3.0, true, dir, PI * 1.2)
	burst(pos, Color.WHITE, 4 if crit else 2, 70.0, 0.12, 0.0, 4.0, true)
	light(pos, 26.0 if crit else 16.0, col, 0.14)

func slash_arc(c: Vector2, r: float, a0: float, a1: float, col: Color, w: float = 4.0, life: float = 0.18, squash: float = 1.0) -> void:
	arcs.append({"c": c, "r": r, "a0": a0, "a1": a1, "t": 0.0, "life": life, "col": col, "w": w, "sq": squash})

## 地面扇形（實際判定範圍），c 是腳下的畫面座標，角度用地面角度
func sector(c: Vector2, r: float, a0: float, a1: float, col: Color, life: float = 0.12) -> void:
	sectors.append({"c": c, "r": r, "a0": a0, "a1": a1, "col": col, "t": 0.0, "life": life})

func streak(a: Vector2, b: Vector2, col: Color, w: float = 4.0, life: float = 0.12) -> void:
	streaks.append({"a": a, "b": b, "col": col, "w": w, "t": 0.0, "life": life})

func ring(c: Vector2, r: float, col: Color, life: float = 0.3, w: float = 3.0, flat: bool = false) -> void:
	rings.append({"c": c, "r": r, "col": col, "t": 0.0, "life": life, "w": w, "flat": flat})

func light(p: Vector2, r: float, col: Color, life: float = 0.14) -> void:
	lights.append({"p": p, "r": r, "col": col, "t": 0.0, "life": life})

func lightning(pts: Array, col: Color = Color("ffe84a"), life: float = 0.2) -> void:
	var out: PackedVector2Array = [pts[0]]
	for i in range(1, pts.size()):
		var a: Vector2 = pts[i - 1]
		var b: Vector2 = pts[i]
		var nrm := (b - a).orthogonal().normalized()
		for k in range(1, 7):
			out.append(a.lerp(b, k / 7.0) + nrm * rng.randf_range(-8.0, 8.0))
		out.append(b)
	bolts.append({"pts": out, "col": col, "t": 0.0, "life": life})

func dust(pos: Vector2, n: int = 8) -> void:
	for i in n:
		var side := 1.0 if i % 2 else -1.0
		_add(pos + Vector2(rng.randf_range(-6, 6), 0), Vector2(side * rng.randf_range(40, 120), rng.randf_range(-80, -20)),
			rng.randf_range(0.3, 0.55), Color("8a7a6a") if rng.randf() < 0.5 else Color("6a5e52"), 3.0 if rng.randf() < 0.3 else 2.0, 160.0, 2.5, false)

func rise(pos: Vector2, col: Color, n: int = 8, w: float = 14.0) -> void:
	for i in n:
		_add(pos + Vector2(rng.randf_range(-w, w), rng.randf_range(-4, 8)), Vector2(rng.randf_range(-8, 8), rng.randf_range(-70, -30)),
			rng.randf_range(0.5, 0.9), col.lightened(rng.randf_range(0, 0.4)), 3.0, -10.0, 1.0, true)

## 碎裂：給一組 (顏色, 位置) 的取樣點，從中心往外噴
func shatter(points: Array, center: Vector2) -> void:
	for pt in points:
		var off: Vector2 = pt[1] - center
		var a := off.angle() + rng.randf_range(-0.4, 0.4)
		var sp := rng.randf_range(70.0, 210.0)
		_add(pt[1], Vector2(cos(a), sin(a)) * sp + Vector2(0, -70), rng.randf_range(0.35, 0.7), pt[0], 4.0, 300.0, 1.5, false)

func text(pos: Vector2, s: String, col: Color, size: int = 18) -> void:
	if texts.size() > 60:
		texts.pop_front()
	texts.append({"p": pos + Vector2(rng.randf_range(-8, 8), 0), "s": s, "col": col, "size": size, "t": 0.0, "life": 0.7})

# ---------- 繪製：色彩層 ----------
func _draw() -> void:
	for sc in sectors:
		var k: float = sc.t / sc.life
		var pts := PackedVector2Array([Vector2.ZERO])
		var n := 20
		for i in n + 1:
			var a: float = lerpf(sc.a0, sc.a1, float(i) / n)
			pts.append(Vector2(cos(a), sin(a)) * sc.r)
		draw_set_transform(sc.c, 0.0, Vector2(1.0, Iso.K))
		draw_colored_polygon(pts, Color(sc.col, 0.22 * (1.0 - k)))
		draw_set_transform(Vector2.ZERO)
	for a in arcs:
		var k: float = a.t / a.life
		var head: float = lerpf(a.a0, a.a1, minf(k * 2.5, 1.0))
		var tail: float = lerpf(a.a0, a.a1, maxf((k - 0.3) / 0.7, 0.0))
		if absf(head - tail) < 0.01:
			continue
		var col: Color = a.col
		col.a = 1.0 - k * 0.7
		draw_set_transform(a.c, 0.0, Vector2(1.0, a.sq))
		draw_arc(Vector2.ZERO, a.r, minf(tail, head), maxf(tail, head), 18, col, a.w)
		draw_arc(Vector2.ZERO, a.r - a.w * 0.6, minf(tail, head), maxf(tail, head), 18, Color(1, 1, 1, maxf(0.0, 0.9 - k)), 1.5)
		draw_set_transform(Vector2.ZERO)
	for s in streaks:
		var k: float = s.t / s.life
		var col: Color = s.col
		col.a = 1.0 - k
		draw_line(s.a.lerp(s.b, k * 0.6), s.b, col, s.w * (1.0 - k * 0.5))
		draw_line(s.a.lerp(s.b, 0.3 + k * 0.5), s.b, Color(1, 1, 1, 1.0 - k), 1.5)
	for r in rings:
		var k: float = r.t / r.life
		var rr: float = r.r * (0.3 + 0.7 * (1.0 - (1.0 - k) * (1.0 - k)))
		var col: Color = r.col
		col.a = 1.0 - k
		draw_set_transform(r.c, 0.0, Vector2(1.0, Iso.K if r.flat else 1.0))
		draw_arc(Vector2.ZERO, rr, 0.0, TAU, 40, col, r.w)
		draw_set_transform(Vector2.ZERO)
	for b in bolts:
		var k: float = b.t / b.life
		var col: Color = b.col
		col.a = 1.0 - k
		draw_polyline(b.pts, col, 3.0)
		draw_polyline(b.pts, Color(1, 1, 1, 1.0 - k), 1.0)
	for p in parts:
		var c: Color = p.c
		c.a = clampf(p.life / p.max * 1.6, 0.0, 1.0)
		draw_rect(Rect2(p.p.round(), Vector2(p.s, p.s)), c)
	var font := ThemeDB.fallback_font
	for t in texts:
		var k: float = t.t / t.life
		var pos: Vector2 = t.p + Vector2(0, -34.0 * k)
		var col: Color = t.col
		col.a = 1.0 - k * k
		draw_string_outline(font, pos, t.s, HORIZONTAL_ALIGNMENT_CENTER, -1, t.size, 4, Color(0, 0, 0, col.a))
		draw_string(font, pos, t.s, HORIZONTAL_ALIGNMENT_CENTER, -1, t.size, col)

# ---------- 繪製：光層 ----------
func draw_light(ci: CanvasItem) -> void:
	for l in lights:
		var k: float = 1.0 - l.t / l.life
		var c: Color = l.col
		for i in 3:
			c.a = k * (0.12 + i * 0.1)
			ci.draw_circle(l.p.round(), maxf(l.r * (1.0 - i * 0.33), 1.0), c)
	var idx := 0
	for p in parts:
		if not p.light:
			continue
		idx += 1
		if idx % 2:
			continue
		var c: Color = p.c
		c.a = maxf(0.0, p.life / p.max) * 0.35
		ci.draw_rect(Rect2(p.p.round() - Vector2(p.s, p.s), Vector2(p.s * 3, p.s * 3)), c)
