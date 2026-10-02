import os
from PIL import Image, ImageDraw

res_root = os.path.join("android", "app", "src", "main", "res")
src_img_path = os.path.join("public", "pwa-512.png")
src = Image.open(src_img_path).convert("RGBA")

BRAND_RED = (212, 0, 0, 255)
WHITE = (255, 255, 255, 255)

# 1. Update ic_launcher_background.xml
bg_xml_path = os.path.join(res_root, "values", "ic_launcher_background.xml")
with open(bg_xml_path, "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#D40000</color>\n</resources>\n')
print(f"Updated {bg_xml_path}")

# 2. Densities for mipmap
densities = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432),
}

for folder, (legacy_size, fg_size) in densities.items():
    dest_dir = os.path.join(res_root, folder)
    os.makedirs(dest_dir, exist_ok=True)

    # 2a. Adaptive foreground: fg_size x fg_size
    fg_canvas = Image.new("RGBA", (fg_size, fg_size), BRAND_RED)
    logo_fg_size = int(fg_size * 0.60)
    logo_fg = src.resize((logo_fg_size, logo_fg_size), Image.Resampling.LANCZOS)
    fg_canvas.paste(logo_fg, ((fg_size - logo_fg_size) // 2, (fg_size - logo_fg_size) // 2), logo_fg)
    fg_path = os.path.join(dest_dir, "ic_launcher_foreground.png")
    fg_canvas.save(fg_path, "PNG")

    # 2b. Legacy round icon: legacy_size x legacy_size circular mask
    round_canvas = Image.new("RGBA", (legacy_size, legacy_size), (0, 0, 0, 0))
    round_mask = Image.new("L", (legacy_size * 4, legacy_size * 4), 0)
    round_draw = ImageDraw.Draw(round_mask)
    round_draw.ellipse((0, 0, legacy_size * 4 - 1, legacy_size * 4 - 1), fill=255)
    round_mask = round_mask.resize((legacy_size, legacy_size), Image.Resampling.LANCZOS)

    round_bg = Image.new("RGBA", (legacy_size, legacy_size), BRAND_RED)
    logo_round_size = int(legacy_size * 0.72)
    logo_round = src.resize((logo_round_size, logo_round_size), Image.Resampling.LANCZOS)
    round_bg.paste(logo_round, ((legacy_size - logo_round_size) // 2, (legacy_size - logo_round_size) // 2), logo_round)
    round_canvas.paste(round_bg, (0, 0), round_mask)
    round_path = os.path.join(dest_dir, "ic_launcher_round.png")
    round_canvas.save(round_path, "PNG")

    # 2c. Legacy square icon: squircle / rounded rect
    square_canvas = Image.new("RGBA", (legacy_size, legacy_size), (0, 0, 0, 0))
    square_mask = Image.new("L", (legacy_size * 4, legacy_size * 4), 0)
    square_draw = ImageDraw.Draw(square_mask)
    radius = int(legacy_size * 4 * 0.20)
    square_draw.rounded_rectangle((0, 0, legacy_size * 4 - 1, legacy_size * 4 - 1), radius=radius, fill=255)
    square_mask = square_mask.resize((legacy_size, legacy_size), Image.Resampling.LANCZOS)

    square_bg = Image.new("RGBA", (legacy_size, legacy_size), BRAND_RED)
    logo_square_size = int(legacy_size * 0.76)
    logo_square = src.resize((logo_square_size, logo_square_size), Image.Resampling.LANCZOS)
    square_bg.paste(logo_square, ((legacy_size - logo_square_size) // 2, (legacy_size - logo_square_size) // 2), logo_square)
    square_canvas.paste(square_bg, (0, 0), square_mask)
    square_path = os.path.join(dest_dir, "ic_launcher.png")
    square_canvas.save(square_path, "PNG")

    print(f"Generated icons in {folder}: fg({fg_size}px), round({legacy_size}px), square({legacy_size}px)")

# 3. Splash screens
splashes = {
    os.path.join("drawable", "splash.png"): (480, 320),
    os.path.join("drawable-land-mdpi", "splash.png"): (480, 320),
    os.path.join("drawable-land-hdpi", "splash.png"): (800, 480),
    os.path.join("drawable-land-xhdpi", "splash.png"): (1280, 720),
    os.path.join("drawable-land-xxhdpi", "splash.png"): (1600, 960),
    os.path.join("drawable-land-xxxhdpi", "splash.png"): (1920, 1280),
    os.path.join("drawable-port-mdpi", "splash.png"): (320, 480),
    os.path.join("drawable-port-hdpi", "splash.png"): (480, 800),
    os.path.join("drawable-port-xhdpi", "splash.png"): (720, 1280),
    os.path.join("drawable-port-xxhdpi", "splash.png"): (960, 1600),
    os.path.join("drawable-port-xxxhdpi", "splash.png"): (1280, 1920),
}

for rel_path, (w, h) in splashes.items():
    dest_path = os.path.join(res_root, rel_path)
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    splash_canvas = Image.new("RGBA", (w, h), WHITE)
    
    # Scale logo nicely: ~35% of the shorter side
    min_dim = min(w, h)
    logo_size = int(min_dim * 0.38)
    splash_logo = src.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    splash_canvas.paste(splash_logo, ((w - logo_size) // 2, (h - logo_size) // 2), splash_logo)
    # Save as RGB to match original format
    splash_canvas.convert("RGB").save(dest_path, "PNG")
    print(f"Generated splash: {rel_path} ({w}x{h})")

print("All Android icons and splashes generated successfully!")
