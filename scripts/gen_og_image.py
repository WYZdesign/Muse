from PIL import Image, ImageDraw, ImageFilter
import math, os

W, H = 1200, 630
OUT = "public/og-image.png"

# Site-color gradient (diagonal) — gold -> coral -> lavender -> pink -> sunset
colors = [(255, 215, 0), (255, 138, 128), (212, 165, 255), (255, 181, 194), (255, 140, 105)]
seg = (len(colors) - 1)

img = Image.new("RGB", (W, H))
px = img.load()
for y in range(H):
    for x in range(W):
        t = (x / W + y / H) / 2
        f = t * seg
        i = min(int(f), seg - 1)
        frac = f - i
        c0, c1 = colors[i], colors[i + 1]
        px[x, y] = tuple(int(c0[k] * (1 - frac) + c1[k] * frac) for k in range(3))

# Dark vignette so the logo pops
ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
for i in range(90):
    a = int(140 * (1 - i / 90))
    d.ellipse([-i * 3, -i * 3, W + i * 3, H + i * 3], outline=(10, 6, 18, a), width=6)
img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")

# Load the Muse app icon (rounded square) and center it, slightly large
icon = Image.open("public/muse-app-icon.png").convert("RGBA")
icon_size = 320
icon = icon.resize((icon_size, icon_size), Image.LANCZOS)
ix = (W - icon_size) // 2
iy = (H - icon_size) // 2
img.paste(icon, (ix, iy), icon)

# Soft shadow under icon
sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(sh)
sd.rounded_rectangle([ix - 4, iy - 4, ix + icon_size + 4, iy + icon_size + 4], radius=48, fill=(0, 0, 0, 90))
sh = sh.filter(ImageFilter.GaussianBlur(18))
img = Image.alpha_composite(img.convert("RGBA"), sh).convert("RGB")

# "Muse" wordmark below
try:
    from PIL import ImageFont
    font = None
    for p in ["C:/Windows/Fonts/georgia.ttf", "C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arialbd.ttf"]:
        if os.path.exists(p):
            font = ImageFont.truetype(p, 84)
            break
    d = ImageDraw.Draw(img)
    txt = "Muse"
    if font:
        bbox = d.textbbox((0, 0), txt, font=font)
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) / 2, iy + icon_size + 30), txt, font=font, fill=(10, 6, 18, 255))
except Exception as e:
    print("font skip", e)

img.save(OUT, "PNG", optimize=True)
print("saved", OUT, os.path.getsize(OUT), "bytes")
