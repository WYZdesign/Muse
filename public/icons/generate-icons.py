"""Generate WYZ Design PWA icons at all required sizes.
Run: python generate-icons.py
Requires: pip install Pillow
"""
from PIL import Image, ImageDraw, ImageFont

SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512]
COLOR = "#DF3131"
OUT_DIR = "."

def make_icon(size):
    img = Image.new("RGBA", (size, size), COLOR)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", size=int(size * 0.45))
    except:
        font = ImageFont.load_default()
    text = "WYZ"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]
    draw.text((x, y), text, fill="white", font=font)
    path = f"{OUT_DIR}/icon-{size}x{size}.png"
    img.save(path, "PNG")
    print(f"Created {path}")

for s in SIZES:
    make_icon(s)

print("Done! All icons generated.")
