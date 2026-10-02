import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH = 1024
HEIGHT = 500

out_dir = "play-store-assets"
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "feature-graphic.png")

# 1. Create Base Background with Rich Broadcast Gradient
base = Image.new("RGBA", (WIDTH, HEIGHT), (12, 4, 6, 255))
draw = ImageDraw.Draw(base)

# Draw horizontal gradient from rich red/crimson to deep dark
for x in range(WIDTH):
    # Transition factor
    ratio = x / WIDTH
    # Left is brighter red studio, right is deep dark newsroom
    r = int(140 * (1 - ratio * 0.75) + 20)
    g = int(8 * (1 - ratio * 0.9))
    b = int(15 * (1 - ratio * 0.9) + 8)
    draw.line([(x, 0), (x, HEIGHT)], fill=(r, g, b, 255))

# Add radial light burst behind the logo position (x=240, y=250)
glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
center_x, center_y = 230, 250
max_radius = 280
for r in range(max_radius, 0, -6):
    alpha = int(90 * (1 - r / max_radius) ** 1.5)
    glow_draw.ellipse(
        (center_x - r, center_y - r, center_x + r, center_y + r),
        fill=(235, 20, 20, alpha)
    )
glow = glow.filter(ImageFilter.GaussianBlur(12))
base = Image.alpha_composite(base, glow)

# Add subtle grid / broadcast wave pattern on right half
grid = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
grid_draw = ImageDraw.Draw(grid)
for y in range(40, HEIGHT - 40, 28):
    grid_draw.line([(440, y), (WIDTH - 30, y)], fill=(255, 255, 255, 10), width=1)
for x in range(460, WIDTH - 20, 48):
    grid_draw.line([(x, 40), (x, HEIGHT - 40)], fill=(255, 255, 255, 8), width=1)
base = Image.alpha_composite(base, grid)

# 2. Paste Official Logo
src_logo = Image.open(os.path.join("public", "pwa-512.png")).convert("RGBA")
logo_size = 360
logo_resized = src_logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

# Create drop shadow for logo
shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
shadow_x, shadow_y = (230 - logo_size // 2) + 8, (250 - logo_size // 2) + 12
shadow_mask = logo_resized.split()[3] if logo_resized.mode == "RGBA" else None
shadow.paste((0, 0, 0, 180), (shadow_x, shadow_y), shadow_mask)
shadow = shadow.filter(ImageFilter.GaussianBlur(16))
base = Image.alpha_composite(base, shadow)

# Paste logo
logo_x = 230 - logo_size // 2
logo_y = 250 - logo_size // 2
base.paste(logo_resized, (logo_x, logo_y), logo_resized)

# 3. Typography & Badges
draw = ImageDraw.Draw(base)

font_title_hi = ImageFont.truetype(r"C:\Windows\Fonts\NirmalaB.ttf", 46)
font_title_en = ImageFont.truetype(r"C:\Windows\Fonts\NirmalaB.ttf", 26)
font_sub = ImageFont.truetype(r"C:\Windows\Fonts\NirmalaB.ttf", 20)
font_badge = ImageFont.truetype(r"C:\Windows\Fonts\NirmalaB.ttf", 15)
font_towns = ImageFont.truetype(r"C:\Windows\Fonts\Nirmala.ttf", 14)

# Heading Text on Right
text_left = 460
y_cursor = 50

# Title Hindi + English
draw.text((text_left, y_cursor), "अभी तक न्यूज़", font=font_title_hi, fill=(255, 255, 255, 255))
y_cursor += 54
draw.text((text_left, y_cursor), "ABHI TAK NEWS • DISTRICT BIJNOR", font=font_title_en, fill=(255, 204, 51, 255))
y_cursor += 36

# Tagline with red underline
draw.text((text_left, y_cursor), "जनपद बिजनौर का डिजिटल समाचार नेटवर्क", font=font_sub, fill=(230, 230, 230, 255))
y_cursor += 34
draw.line([(text_left, y_cursor), (text_left + 480, y_cursor)], fill=(212, 0, 0, 220), width=3)
y_cursor += 20

# Feature Pills (2x2 grid)
badges = [
    ("🔴 लाइव टीवी व वीडियो", "24x7 Live News & TV"),
    ("📢 जन की आवाज़ (JKA)", "Citizen Grievance Voice"),
    ("📰 दैनिक ई-पेपर व रील्स", "Daily E-Paper & Reels"),
    ("⚡ ताज़ा ब्रेकिंग न्यूज़", "Instant Breaking Alerts"),
]

pill_w = 245
pill_h = 54
spacing_x = 18
spacing_y = 12

for i, (title_hi, title_en) in enumerate(badges):
    row = i // 2
    col = i % 2
    px = text_left + col * (pill_w + spacing_x)
    py = y_cursor + row * (pill_h + spacing_y)
    
    # Pill background
    pill = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(pill)
    pdraw.rounded_rectangle((px, py, px + pill_w, py + pill_h), radius=10, fill=(35, 12, 16, 200), outline=(212, 0, 0, 160), width=1)
    base = Image.alpha_composite(base, pill)
    
    draw = ImageDraw.Draw(base)
    draw.text((px + 14, py + 8), title_hi, font=font_badge, fill=(255, 255, 255, 255))
    draw.text((px + 14, py + 29), title_en, font=font_towns, fill=(200, 200, 200, 220))

y_cursor += (pill_h + spacing_y) * 2 + 12

# Town Coverage Footer Strip
towns_text = "📍 बिजनौर • नगीना • धामपुर • नजीबाबाद • चांदपुर • कीरतपुर • नूरपुर • स्योहारा"
draw.text((text_left, y_cursor), towns_text, font=font_towns, fill=(255, 200, 100, 240))

# 4. Top and Bottom Gold/Red Decorative Broadcast Accent Lines
draw.rectangle([(0, 0), (WIDTH, 5)], fill=(212, 0, 0, 255))
draw.rectangle([(0, 5), (WIDTH, 7)], fill=(255, 204, 51, 255))
draw.rectangle([(0, HEIGHT - 7), (WIDTH, HEIGHT - 5)], fill=(255, 204, 51, 255))
draw.rectangle([(0, HEIGHT - 5), (WIDTH, HEIGHT)], fill=(212, 0, 0, 255))

# Save as 24-bit PNG (RGB, no alpha channel, as strictly required by Google Play)
final_rgb = base.convert("RGB")
final_rgb.save(out_path, "PNG", optimize=True)
print(f"Feature graphic generated: {out_path} ({final_rgb.size[0]}x{final_rgb.size[1]} px)")
