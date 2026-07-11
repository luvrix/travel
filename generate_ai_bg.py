"""
用 Pollinations.ai (完全免费，无需 API Key) 生成北京旅行风景背景图
然后与路线图合成
"""
import requests
import urllib.parse
from PIL import Image, ImageEnhance, ImageFilter
import io
import os

# 路线图路径
ROUTE_MAP = os.path.expanduser("~/Downloads/北京3日游 (8).png")
OUTPUT = os.path.expanduser("~/Downloads/北京3日游_AI版.png")

# Prompt: 北京山川人文风景，水彩插画风格
PROMPT = (
    "Beijing China travel illustration, Great Wall on mountains, "
    "Forbidden City skyline, cherry blossoms, misty mountains, "
    "traditional architecture, watercolor style, soft pastel colors, "
    "cinematic, artistic, high quality, 4k"
)

W, H = 1080, 1920

print("正在生成 AI 背景图（Pollinations.ai，免费无需 Key）...")
encoded = urllib.parse.quote(PROMPT)
url = f"https://image.pollinations.ai/prompt/{encoded}?width={W}&height={H}&nologo=true&enhance=true"
print(f"请求: {url[:80]}...")

resp = requests.get(url, timeout=120)
resp.raise_for_status()

bg = Image.open(io.BytesIO(resp.content)).convert("RGBA").resize((W, H))
print(f"背景图生成完成: {bg.size}")

# 读取路线图
route = Image.open(ROUTE_MAP).convert("RGBA").resize((W, H))
print(f"路线图加载完成: {route.size}")

# 合成：背景图半透明叠加在路线图下方
# 把背景图做成柔化的底层
bg_soft = bg.copy()
bg_enhancer = ImageEnhance.Brightness(bg_soft)
bg_soft = bg_enhancer.enhance(0.6)  # 压暗背景

# 路线图提取纯白底色区域变透明（简单方法：白色区域变半透明）
r, g, b, a = route.split()
# 将路线图中接近白色的区域变为半透明，露出AI背景
from PIL import ImageChops
import numpy as np

route_arr = np.array(route)
bg_arr = np.array(bg_soft)

# 路线图白色区域（R,G,B > 240）设为半透明
white_mask = (route_arr[:,:,0] > 240) & (route_arr[:,:,1] > 240) & (route_arr[:,:,2] > 240)
route_arr[white_mask, 3] = 120  # 半透明

route_blend = Image.fromarray(route_arr)

# 最终合成
result = Image.alpha_composite(bg_soft.convert("RGBA"), route_blend)
result = result.convert("RGB")

result.save(OUTPUT, "PNG")
print(f"\n✅ 合成完成！保存到: {OUTPUT}")
print("打开查看...")
os.system(f'open "{OUTPUT}"')
