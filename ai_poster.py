"""
AI 旅行海报 v10
每个地点生成一张图，按地理位置做全画布高斯权重融合
sigma 足够大保证全图覆盖无空白
透明路线图直接按 alpha 通道叠最上层
"""
import argparse, os, io, time, math, warnings
import numpy as np
from PIL import Image, ImageFilter
warnings.filterwarnings("ignore")

LOCATIONS = [
    {"name": "上海",    "lat": 31.2304, "lng": 121.4737,
     "prompt": "Shanghai Bund waterfront at golden hour, Oriental Pearl Tower glowing, "
               "Lujiazui glass skyscrapers, Huangpu River golden reflections"},
    {"name": "长城",    "lat": 40.3588, "lng": 116.0204,
     "prompt": "Great Wall of China Badaling, ancient stone battlements "
               "snaking dramatically over mountain ridges, misty autumn forest"},
    {"name": "故宫",    "lat": 39.9163, "lng": 116.3972,
     "prompt": "Forbidden City Beijing, aerial view, vermilion walls "
               "golden glazed rooftops, vast symmetric imperial courtyards"},
    {"name": "颐和园",  "lat": 39.9999, "lng": 116.2755,
     "prompt": "Summer Palace Kunming Lake, marble boat pavilion, "
               "willow trees perfect reflection, ornate wooden corridors"},
    {"name": "天坛",    "lat": 39.8822, "lng": 116.4066,
     "prompt": "Temple of Heaven, circular blue glazed roof triple-tiered, "
               "ancient cypress forest, marble terrace, perfect symmetry"},
    {"name": "南锣鼓巷","lat": 39.9371, "lng": 116.4029,
     "prompt": "Beijing hutong alley, grey brick courtyard walls, "
               "red lanterns hanging overhead, warm amber evening light"},
    {"name": "圆明园",  "lat": 40.0092, "lng": 116.2982,
     "prompt": "Yuanmingyuan ruins, crumbling stone archways overgrown "
               "with vines, serene moonlit lake, romantic melancholy"},
    {"name": "景山",    "lat": 39.9242, "lng": 116.3966,
     "prompt": "Jingshan hilltop pavilion Beijing, panoramic view over "
               "Forbidden City rooftops, lush green spring trees"},
    {"name": "前门",    "lat": 39.8993, "lng": 116.3977,
     "prompt": "Qianmen Gate Beijing, historic pedestrian street, "
               "traditional storefronts, red lanterns, old Beijing atmosphere"},
]

def _pick_key_landmarks(locs):
    """
    从行程地点里挑出最具辨识度的3个地标（地理上最分散的）
    按纬度排序：最北（画布顶）→ 中间 → 最南（画布底）
    """
    # 按纬度降序（北→南 = 画布上→下）
    by_lat = sorted(locs, key=lambda l: l["lat"], reverse=True)
    top    = by_lat[0]                   # 最北 → 上
    bottom = by_lat[-1]                  # 最南 → 下
    # 中间取纬度最中间的
    mid_lat = (top["lat"] + bottom["lat"]) / 2
    mid = min(locs, key=lambda l: abs(l["lat"] - mid_lat) if l not in (top, bottom) else 1e9)
    # 取每个地点 prompt 的核心描述（第一句）
    def _core(loc):
        return loc["prompt"].split(",")[0].strip()
    return [_core(top), _core(mid), _core(bottom)]


TEMPLATE_STYLES = {
    "minimal":   "clean minimalist photography, neutral tones, elegant composition, high contrast",
    "cartoon":   "vibrant anime illustration, pink and blue palette, Studio Ghibli inspired, warm cheerful",
    "journal":   "vibrant illustration, pink and blue tones, youthful energetic, detailed",
    "bluesky":   "bright blue sky photography, azure tones, fresh open landscape, sunny",
    "magazine":  "editorial photography, bold composition, high contrast, professional",
    "handdrawn": "hand-drawn watercolor illustration, travel journal sketchbook, loose expressive",
    "trendy":    "dark cinematic photography, deep red and purple tones, moody dramatic, noir",
    "cinematic": "cinematic photography, dark blue tones, atmospheric, dramatic lighting",
}
DEFAULT_STYLE = "photorealistic, ultra HD, dramatic natural lighting, vivid saturated colors, award-winning"

# ─────────────────────────────────────────
# 地理坐标 → 画布坐标
# ─────────────────────────────────────────
def geo_to_canvas(lat, lng, locs, W, H, margin=0.10):
    lats = [l["lat"] for l in locs]; lngs = [l["lng"] for l in locs]
    lat_s = max(lats) - min(lats) or 1.0
    lng_s = max(lngs) - min(lngs) or 1.0
    x = int(margin * W + (lng - min(lngs)) / lng_s * (1 - 2 * margin) * W)
    y = int((1 - margin) * H - (lat - min(lats)) / lat_s * (1 - 2 * margin) * H)
    return np.clip(x, 0, W - 1), np.clip(y, 0, H - 1)

# ─────────────────────────────────────────
# SDXL 推理
# ─────────────────────────────────────────
_pipe = None

def get_pipe():
    global _pipe
    if _pipe: return _pipe
    import torch
    from diffusers import AutoPipelineForText2Image
    dev = "mps" if torch.backends.mps.is_available() else \
          "cuda" if torch.cuda.is_available() else "cpu"
    dt = torch.float16 if dev in ("mps", "cuda") else torch.float32
    print(f"  🖥️  {dev} | 加载 SDXL-Turbo...")
    _pipe = AutoPipelineForText2Image.from_pretrained(
        "stabilityai/sdxl-turbo",
        torch_dtype=dt, variant="fp16" if dev != "cpu" else None,
        use_safetensors=True,
    ).to(dev)
    # enable_attention_slicing() 在 MPS 上会导致输出全黑，M3 Pro 18GB 无需此优化
    return _pipe

def infer(prompt, w, h, seed, steps=4):
    import torch
    pipe = get_pipe()
    dev = str(next(pipe.unet.parameters()).device)
    w = (w // 64) * 64; h = (h // 64) * 64
    # steps<=4: SDXL-Turbo 蒸馏模式 guidance=0; steps>4: 提升质量需要 guidance>0
    guidance = 0.0 if steps <= 4 else 1.5
    neg = "blurry, ugly, low quality, distorted, text, watermark, people, crowd"
    gen = torch.Generator(device=dev).manual_seed(seed)
    t0 = time.time()
    out = pipe(
        prompt=prompt[:400], negative_prompt=neg,
        width=w, height=h,
        num_inference_steps=steps, guidance_scale=guidance,
        generator=gen,
    ).images[0]
    img = Image.fromarray(np.array(out)).convert('RGB')
    print(f"    ✅ {img.size}  steps={steps}  {time.time()-t0:.1f}s")
    return img

# ─────────────────────────────────────────
# 全画布高斯权重融合
# sigma 足够大保证全图无空白
# ─────────────────────────────────────────
def _vstack_blend(strips, CW, CH, blend_px=250):
    """
    垂直拼接，每张图向相邻图延伸 blend_px/2 像素并做交叉淡出
    两张图在重叠区域各自 alpha 互补，确保无黑边、无跳变
    """
    n = len(strips)
    total_h = sum(s.height for s in strips)
    # 基准分割线（不含重叠）
    base_h = [int(s.height * CH / total_h) for s in strips]
    base_h[-1] = CH - sum(base_h[:-1])
    boundaries = []
    y = 0
    for h in base_h[:-1]:
        y += h
        boundaries.append(y)
    # ys[i] = 第 i 段起始 y，ys[i+1] = 结束 y
    ys = [0] + boundaries + [CH]

    canvas   = np.zeros((CH, CW, 3), dtype=np.float64)
    alpha_sum = np.zeros((CH, 1, 1), dtype=np.float64)

    for i, strip in enumerate(strips):
        ext = blend_px // 2
        draw_y0 = max(0, ys[i]   - (ext if i > 0     else 0))
        draw_y1 = min(CH, ys[i+1] + (ext if i < n-1  else 0))
        draw_h  = draw_y1 - draw_y0

        img = strip.resize((CW, draw_h), Image.LANCZOS)
        arr = np.array(img, dtype=np.float64)

        # alpha: 两端渐变，中间全 1
        alpha = np.ones(draw_h, dtype=np.float64)
        top_fade = ys[i]   - draw_y0   # 顶部延伸量
        bot_fade = draw_y1 - ys[i+1]   # 底部延伸量
        if top_fade > 0:
            alpha[:top_fade] = np.linspace(0, 1, top_fade)
        if bot_fade > 0:
            alpha[draw_h-bot_fade:] = np.linspace(1, 0, bot_fade)

        canvas   [draw_y0:draw_y1] += arr * alpha.reshape(-1, 1, 1)
        alpha_sum[draw_y0:draw_y1] += alpha.reshape(-1, 1, 1)

    result = canvas / np.maximum(alpha_sum, 1e-9)
    return Image.fromarray(result.clip(0, 255).astype(np.uint8))


def build_full_mosaic(patches, CW, CH):
    """
    patches: [{"cx","cy","img": PIL.Image}]
    每张图缩放到画布全尺寸，按高斯权重叠加
    sigma = 画布对角线 / 3，保证全图覆盖
    """
    diag  = math.hypot(CW, CH)
    sigma = diag / 3.0  # 足够大，保证无空白区域
    print(f"  📐 融合 {len(patches)} 张图  sigma={sigma:.0f}px")

    xs = np.arange(CW, dtype=np.float32)
    ys = np.arange(CH, dtype=np.float32)
    gx, gy = np.meshgrid(xs, ys)  # (H, W)

    canvas     = np.zeros((CH, CW, 3), dtype=np.float64)
    weight_sum = np.zeros((CH, CW),    dtype=np.float64)

    for p in patches:
        cx, cy = p["cx"], p["cy"]
        # 缩放到画布全尺寸
        arr = np.array(p["img"].resize((CW, CH), Image.LANCZOS), dtype=np.float64)

        dist_sq = (gx - cx) ** 2 + (gy - cy) ** 2
        weight  = np.exp(-dist_sq / (2.0 * sigma ** 2))  # (H, W)

        canvas     += arr * weight[:, :, None]
        weight_sum += weight

    result = canvas / np.maximum(weight_sum[:, :, None], 1e-9)
    return Image.fromarray(result.clip(0, 255).astype(np.uint8))

# ─────────────────────────────────────────
# 路线图叠加
# ─────────────────────────────────────────
def overlay_route(bg, route_path, fade_radius=80, fade_strength=0.5):
    """
    智能合成：
    - 路线内容周边 fade_radius px 范围内，AI 背景渐渐淡出
    - 空白区域 AI 背景完整保留
    - fade_strength：淡出强度（0=不淡 1=完全消失）
    """
    route = Image.open(route_path).convert("RGBA")
    W, H  = route.size
    arr   = np.array(route, dtype=np.uint8)

    # 获取路线内容 alpha 掩膜
    if arr[:, :, 3].min() < 255:
        print("  ✅ 透明背景路线图，智能合成")
        content_mask = arr[:, :, 3].astype(np.float32) / 255.0
    else:
        corners  = np.array([arr[0,0,:3],arr[0,-1,:3],arr[-1,0,:3],arr[-1,-1,:3]], dtype=np.float32)
        bg_color = corners.mean(axis=0)
        diff  = arr[:,:,:3].astype(np.float32) - bg_color
        dist  = np.sqrt((diff**2).sum(axis=2))
        content_mask = np.clip(dist / 25.0, 0, 1)
        arr[:,:,3] = np.array(
            Image.fromarray((content_mask*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)),
            dtype=np.uint8
        )

    # 扩散遮罩：路线内容向外扩散 fade_radius px，形成保护区
    protected = np.array(
        Image.fromarray((content_mask * 255).astype(np.uint8))
             .filter(ImageFilter.GaussianBlur(fade_radius)),
        dtype=np.float32
    ) / 255.0  # 0=AI背景全显  1=路线内容区（AI背景淡出）

    # AI 背景：在路线保护区内淡出
    bg_arr = np.array(bg.resize((W, H), Image.LANCZOS).convert("RGBA"), dtype=np.float32)
    bg_arr[:,:,3] *= (1.0 - protected * fade_strength)

    # 三层叠加：模板底色 → AI背景（路线区淡出）→ 路线图
    base   = Image.new("RGBA", (W, H), (249, 249, 249, 255))
    result = Image.alpha_composite(base, Image.fromarray(bg_arr.clip(0,255).astype(np.uint8)))
    result = Image.alpha_composite(result, Image.fromarray(arr))
    return result

# ─────────────────────────────────────────
# 主函数
# ─────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--route",    default=os.path.expanduser("~/Downloads/北京3日游_路线.png"))
    ap.add_argument("--template", default="minimal", choices=list(TEMPLATE_STYLES)+["custom"])
    ap.add_argument("--style",    default=None,  help="自定义风格 prompt（覆盖模板风格）")
    ap.add_argument("--extra",    default="",    help="额外追加描述")
    ap.add_argument("--seed",     type=int, default=42)
    ap.add_argument("--gen-size", type=int, default=768,
                    help="每张地点图的生成尺寸（768 或 1024）")
    ap.add_argument("--output",   default=None)
    a = ap.parse_args()

    if not os.path.exists(a.route):
        print(f"❌ 找不到路线图: {a.route}")
        print("   请在 App 中点 导出路线 ▾ → AI 渲染 导出透明背景路线图")
        return

    route_img = Image.open(a.route)
    CW, CH = route_img.size
    print(f"📐 路线图: {CW}×{CH}")

    style_suffix = a.style or TEMPLATE_STYLES.get(a.template, DEFAULT_STYLE)
    if a.extra: style_suffix += f", {a.extra}"
    print(f"🎨 模板: {a.template}  风格: {style_suffix[:70]}...")

    # 计算各地点画布坐标
    for loc in LOCATIONS:
        loc["cx"], loc["cy"] = geo_to_canvas(loc["lat"], loc["lng"], LOCATIONS, CW, CH)

    print("\n📍 地点坐标：")
    for loc in LOCATIONS:
        print(f"   {loc['name']:6s}  canvas({loc['cx']:4d}, {loc['cy']:4d})")

    # 生成尺寸：保持画布宽高比，短边 = gen_size
    ratio = CW / CH
    if ratio >= 1:
        gw, gh = a.gen_size, int(a.gen_size / ratio)
    else:
        gw, gh = int(a.gen_size * ratio), a.gen_size
    gw = max(256, (gw // 64) * 64)
    gh = max(256, (gh // 64) * 64)
    print(f"\n🖼️  生成分辨率: {gw}×{gh}  (画布比例 {CW/CH:.2f})\n")

    # 3 张图分别生成，垂直拼接 + 接缝渐变融合
    # 不依赖模型理解空间布局，每张图单独聚焦一个场景
    landmarks = _pick_key_landmarks(LOCATIONS)
    regions = [
        # (占画布比例, 地标描述, 额外修饰)
        (0.35, landmarks[0], "wide panoramic landscape, dramatic sky"),  # 顶部
        (0.30, landmarks[1], "architectural beauty, perfect symmetry"),  # 中部
        (0.35, landmarks[2], "golden hour reflections, vibrant colors"), # 底部
    ]

    print(f"\n📍 3 段分别生成：")
    for frac, scene, mod in regions:
        print(f"   {int(frac*100)}% → {scene[:50]}")

    t0 = time.time()
    strips = []
    for i, (frac, scene, mod) in enumerate(regions):
        strip_h = int(CH * frac)
        strip_h = max(256, (strip_h // 64) * 64)
        strip_w = max(256, (gw // 64) * 64)
        prompt = f"{scene}, {mod}, {style_suffix}, no people, no text, no watermarks"
        print(f"\n[{i+1}/3] {scene[:40]}...")
        img = infer(prompt, strip_w, strip_h, seed=a.seed + i * 100, steps=8)
        # 缩放到完整画布宽度，保持生成高度（后面再拼成完整高度）
        strips.append(img.resize((CW, strip_h), Image.LANCZOS))

    print(f"\n✅ 生成完成  {time.time()-t0:.0f}s")

    # 垂直拼接，接缝处用 200px 渐变混合
    bg = _vstack_blend(strips, CW, CH, blend_px=200)

    # 叠加路线图
    print("🗺️  叠加路线图...")
    result = overlay_route(bg, a.route)

    # 保存
    if not a.output:
        a.output = os.path.expanduser(f"~/Downloads/AI海报_{a.template}_seed{a.seed}.jpg")
    result.convert("RGB").save(a.output, "JPEG", quality=96, subsampling=0)
    mb = os.path.getsize(a.output) / 1024 / 1024
    print(f"\n✅ {a.output}  ({mb:.1f} MB)")
    os.system(f'open "{a.output}"')

if __name__ == "__main__":
    main()
