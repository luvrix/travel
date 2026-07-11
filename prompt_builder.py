"""
旅行海报 Prompt 生成器
结构：画布尺寸 → 景点地理位置 → 行程详情 → 视觉风格
"""

# ── 季节推断 ──────────────────────────────
def date_to_season(date_str: str) -> str:
    try:
        month = int(date_str[5:7])
    except Exception:
        return "春日"
    if month in (3, 4, 5):   return "春日"
    if month in (6, 7, 8):   return "夏日"
    if month in (9, 10, 11): return "秋日"
    return "冬日"


# ── 坐标转文字描述 ──────────────────────────
def canvas_pos_to_desc(cx: int, cy: int, W: int, H: int) -> str:
    """把画布像素坐标转成自然语言位置描述"""
    rx = cx / W  # 0~1
    ry = cy / H  # 0~1

    if rx < 0.33:   h = "左侧"
    elif rx < 0.66: h = "中部"
    else:           h = "右侧"

    if ry < 0.25:   v = "顶部"
    elif ry < 0.50: v = "上半部"
    elif ry < 0.75: v = "下半部"
    else:           v = "底部"

    return f"{v}{h}（{int(rx*100)}%,{int(ry*100)}%）"


# ── 地理坐标 → 画布坐标 ──────────────────────
def geo_to_canvas(lat, lng, locs, W, H, margin=0.10):
    lats = [l["lat"] for l in locs]
    lngs = [l["lng"] for l in locs]
    lat_s = max(lats) - min(lats) or 1.0
    lng_s = max(lngs) - min(lngs) or 1.0
    x = int(margin * W + (lng - min(lngs)) / lng_s * (1 - 2 * margin) * W)
    y = int((1 - margin) * H - (lat - min(lats)) / lat_s * (1 - 2 * margin) * H)
    import numpy as np
    return int(np.clip(x, 0, W - 1)), int(np.clip(y, 0, H - 1))


# ── 模板色板 ──────────────────────────────────
TEMPLATE_COLORS = {
    "minimal":   "背景近白色 #FAFAFA，主色调黑色 #1A1A1A，辅色深灰 #4A4A4A",
    "trendy":    "背景纯黑 #0A0A0A，主色调深红 #E03A3A，辅色紫色 #8A2BE2",
    "cartoon":   "背景浅灰白 #F4F4F4，主色调粉色 #FB7299，辅色天蓝 #23ADE5",
    "journal":   "背景浅灰白 #F4F4F4，主色调粉色 #FB7299，辅色天蓝 #23ADE5",
    "bluesky":   "背景天蓝色 #87CEEB，主色调深蓝 #4A90D9，辅色浅蓝 #BDE0F5",
    "magazine":  "背景纯白 #FFFFFF，主色调黑色 #1A1A1A，辅色深灰 #555555",
    "handdrawn": "背景牛皮纸暖色 #F5EDE3，主色调棕色 #5D4037，辅色暖棕 #8D6E63",
    "cinematic": "背景深海军蓝 #0A0E27，主色调青色荧光 #00E5FF，辅色紫色霓虹 #7C4DFF",
}


# ── 聚类：把相近坐标的景点合并为一组 ──────────
def cluster_locations(locs: list[dict], threshold: int = 150) -> list[dict]:
    """
    把画布上距离 < threshold px 的景点合并为一个聚类
    返回聚类列表，每个聚类有：cx/cy（质心）、names（景点列表）
    """
    import math
    assigned = [False] * len(locs)
    clusters = []

    for i, loc in enumerate(locs):
        if assigned[i]:
            continue
        cluster = [i]
        assigned[i] = True
        for j in range(i + 1, len(locs)):
            if assigned[j]:
                continue
            d = math.hypot(locs[i]["cx"] - locs[j]["cx"],
                           locs[i]["cy"] - locs[j]["cy"])
            if d < threshold:
                cluster.append(j)
                assigned[j] = True

        # 质心
        cx = int(sum(locs[k]["cx"] for k in cluster) / len(cluster))
        cy = int(sum(locs[k]["cy"] for k in cluster) / len(cluster))
        clusters.append({
            "cx": cx, "cy": cy,
            "names": [locs[k]["name"] for k in cluster],
        })
    return clusters


# ── 核心函数 ──────────────────────────────────
def build_prompt(
    locations: list[dict],   # [{"name": str, "lat": float, "lng": float}]
    template_id: str,
    trip_title:  str = "",
    start_date:  str = "",
    canvas_w:    int = 1080,
    canvas_h:    int = 1920,
    extra:       str = "",
) -> str:
    season = date_to_season(start_date)
    colors = TEMPLATE_COLORS.get(template_id, TEMPLATE_COLORS["minimal"])

    # 去重保留顺序
    seen, unique_locs = set(), []
    for loc in locations:
        if loc["name"] and loc["name"] not in seen:
            seen.add(loc["name"])
            unique_locs.append(dict(loc))  # 复制避免修改原始数据

    # 计算画布坐标
    for loc in unique_locs:
        loc["cx"], loc["cy"] = geo_to_canvas(
            loc["lat"], loc["lng"], unique_locs, canvas_w, canvas_h
        )

    # 聚类合并相近景点
    clusters = cluster_locations(unique_locs, threshold=int(canvas_w * 0.15))

    # 构建位置+明细描述
    cluster_descs = []
    for c in clusters:
        pos = canvas_pos_to_desc(c["cx"], c["cy"], canvas_w, canvas_h)
        if len(c["names"]) == 1:
            cluster_descs.append(f"{c['names'][0]}位于{pos}")
        else:
            detail = "、".join(c["names"])
            cluster_descs.append(
                f"{pos}区域有 {len(c['names'])} 个景点（{detail}）"
            )

    stops_str  = "→".join(loc["name"] for loc in unique_locs)
    pos_str    = "；".join(cluster_descs)
    title_part = f"《{trip_title}》" if trip_title else ""

    prompt = (
        # 1. 整体定义：旅行日记版面，底色干净空白
        f"这是一张{canvas_w}×{canvas_h}竖版旅行日记背景图，"
        f"整体底色是干净的{colors.split('，')[0].replace('背景','')}，"
        f"大部分区域保持空白，"
        # 2. 明确每个位置放什么内容
        f"只在以下位置绘制小型风景速写插画（每个插画直径约100px，圆形剪裁）：{pos_str}；"
        f"插画内容是对应景点的标志性风景场景，不是人像不是图标；"
        f"插画以外的所有区域完全留白，不填充任何内容；"
        # 3. 行程上下文
        f"这是{season}{title_part}行程，路线：{stops_str}；"
        # 4. 视觉风格
        f"色彩方案：{colors}；"
        f"无文字、无水印、无装饰边框。"
    )
    if extra:
        prompt = prompt.rstrip("。") + f"；{extra}。"
    return prompt


# ── 演示 ──────────────────────────────────────
if __name__ == "__main__":
    LOCATIONS = [
        {"name": "上海",    "lat": 31.2304, "lng": 121.4737},
        {"name": "八达岭长城","lat": 40.3588, "lng": 116.0204},
        {"name": "故宫博物院","lat": 39.9163, "lng": 116.3972},
        {"name": "颐和园",  "lat": 39.9999, "lng": 116.2755},
        {"name": "天坛公园", "lat": 39.8822, "lng": 116.4066},
        {"name": "前门大街", "lat": 39.8993, "lng": 116.3977},
    ]

    for tmpl in ["cartoon", "trendy", "minimal"]:
        print(f"\n【{tmpl}】")
        print(build_prompt(LOCATIONS, tmpl, trip_title="北京3日游",
                           start_date="2026-05-01"))
    print()
