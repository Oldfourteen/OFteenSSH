from PIL import Image, ImageDraw, ImageFont
import os

size = 1024
img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# 圆角矩形背景
bg_color = (26, 27, 38, 255)  # #1a1b26
accent = (122, 162, 247, 255)  # #7aa2f7
radius = 200

# 画圆角矩形
draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=bg_color)

# 画一个均匀的内部细边框
inner_radius = radius - 40
thin_color = (122, 162, 247, 120)
draw.rounded_rectangle([40, 40, size-40, size-40], radius=inner_radius, outline=thin_color, width=8)

# 尝试找字体，找不到用默认字体
def get_font(size):
    candidates = [
        'C:\\Windows\\Fonts\\segoeui.ttf',
        'C:\\Windows\\Fonts\\consola.ttf',
        'C:\\Windows\\Fonts\\cour.ttf',
        'C:\\Windows\\Fonts\\arial.ttf'
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

# 画 >
font_symbol = get_font(520)
draw.text((180, 140), '>', font=font_symbol, fill=accent)

# 获取 > 的边界框，让下划线严格对齐 > 的 baseline
bbox = draw.textbbox((180, 140), '>', font=font_symbol)
underscore_height = 26
underscore_width = 240
# 下划线紧接在 > 右侧，与 > 底部同一基线
underscore_x = bbox[2] + 30
underscore_y = bbox[3] - underscore_height + 6
draw.rectangle(
    [underscore_x, underscore_y, underscore_x + underscore_width, underscore_y + underscore_height],
    fill=(192, 202, 245, 255)
)

output_path = 'c:\\Users\\14101\\Desktop\\OFteenSSH\\build\\icon.png'
img.save(output_path, 'PNG')
print('Saved icon to', output_path)
