"""Compose App Store marketing screenshots for Then.

Takes raw device captures and mounts each one as a polaroid on the app's
paper background, with a serif headline and a handwritten sub-caption -
the store listing speaks the product's own visual language instead of
showing bare screen grabs.

Usage:
    python scripts/appstore-marketing.py C:\\Users\\jakef\\Downloads\\then-shots

Outputs 1320x2868 PNGs (the 6.9" App Store slot) to <input>/marketing/.
Edit SHOTS below to change captions, ordering, or source files.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

CANVAS = (1320, 2868)

# Brand tokens, mirrored from src/theme/colors.ts and the web style.css.
PAPER = (243, 237, 228)        # background
POLAROID = (252, 250, 246)     # card mat
TEXT_PRIMARY = (47, 42, 38)
TEXT_SECONDARY = (90, 81, 75)
PRIMARY = (184, 116, 90)       # terracotta
SHADOW = (120, 90, 70)         # warm shadow, low alpha

FONTS = Path(__file__).resolve().parent.parent / 'assets' / 'fonts'
SERIF = str(FONTS / 'Newsreader_500Medium.ttf')
SERIF_ITALIC = str(FONTS / 'Newsreader_400Regular_Italic.ttf')
SCRIPT = str(FONTS / 'Caveat_700Bold.ttf')

# Order matters: search results surface the first shots. Lead with the feed
# (the product), then the approval model (the differentiator).
SHOTS = [
    {
        'source': 'IMG_4254.PNG',
        'out': 'then-01-feed.png',
        'headline': 'One photo.\nOne moment.',
        'script': 'no algorithm, ever',
        'tilt': -2.0,
    },
    {
        'source': 'IMG_4256.PNG',
        'out': 'then-02-friends.png',
        'headline': 'Only the friends\nyou approve.',
        'script': 'every follow needs a yes',
        'tilt': 1.6,
    },
    {
        'source': 'IMG_4257.PNG',
        'out': 'then-03-roll.png',
        'headline': 'Everything you keep,\nin one place.',
        'script': 'your roll, your year',
        'tilt': -1.6,
    },
    {
        'source': 'IMG_4255.PNG',
        'out': 'then-04-wander.png',
        'headline': 'Wander,\nif you want.',
        'script': 'opt-in and chronological',
        'tilt': 2.0,
    },
    {
        'source': 'IMG_4258.PNG',
        'out': 'then-05-quiet.png',
        'headline': 'Quiet\nby design.',
        'script': 'every notification can be turned off',
        'tilt': -1.4,
    },
]


def rounded(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new('L', image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, *image.size], radius=radius, fill=255)
    out = image.convert('RGBA')
    out.putalpha(mask)
    return out


def build_polaroid(screenshot: Image.Image, max_height: int) -> Image.Image:
    """The capture mounted on a white mat: even borders, thick polaroid chin.

    Scaled so the finished card never overflows the canvas - the first render
    ran the tab bar off the bottom edge and buried the footer wordmark.
    """
    border, chin = 34, 130
    shot_width = 960
    card_height = round(screenshot.height * (shot_width / screenshot.width)) + border + chin
    if card_height > max_height:
        shot_width = round(shot_width * (max_height - border - chin) / (card_height - border - chin))

    ratio = shot_width / screenshot.width
    shot = screenshot.resize((shot_width, round(screenshot.height * ratio)), Image.LANCZOS)
    shot = rounded(shot, 28)

    card = Image.new('RGBA', (shot.width + border * 2, shot.height + border + chin), (*POLAROID, 255))
    card = rounded(card, 20)
    card.alpha_composite(shot, (border, border))
    return card


def compose(shot_config: dict, source_dir: Path, out_dir: Path) -> None:
    canvas = Image.new('RGBA', CANVAS, (*PAPER, 255))
    draw = ImageDraw.Draw(canvas)

    headline_font = ImageFont.truetype(SERIF, 128)
    script_font = ImageFont.truetype(SCRIPT, 84)
    wordmark_font = ImageFont.truetype(SERIF_ITALIC, 56)

    # Headline block, centered.
    y = 200
    for line in shot_config['headline'].split('\n'):
        width = draw.textlength(line, font=headline_font)
        draw.text(((CANVAS[0] - width) / 2, y), line, font=headline_font, fill=TEXT_PRIMARY)
        y += 150

    # Handwritten sub-caption in terracotta.
    script_text = shot_config['script']
    width = draw.textlength(script_text, font=script_font)
    draw.text(((CANVAS[0] - width) / 2, y + 22), script_text, font=script_font, fill=PRIMARY)

    # The polaroid, tilted, with a soft warm shadow. Reserve room below for
    # the footer wordmark plus breathing space.
    card_y = y + 170
    screenshot = Image.open(source_dir / shot_config['source'])
    card = build_polaroid(screenshot, max_height=CANVAS[1] - card_y - 230)
    tilt = shot_config['tilt']
    rotated = card.rotate(tilt, expand=True, resample=Image.BICUBIC)

    shadow_source = Image.new('RGBA', card.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow_source).rounded_rectangle([0, 0, *card.size], radius=20, fill=(*SHADOW, 70))
    shadow = shadow_source.rotate(tilt, expand=True, resample=Image.BICUBIC).filter(ImageFilter.GaussianBlur(30))

    card_x = (CANVAS[0] - rotated.width) // 2
    canvas.alpha_composite(shadow, (card_x, card_y + 26))
    canvas.alpha_composite(rotated, (card_x, card_y))

    # Small wordmark footer.
    footer = 'Then'
    width = draw.textlength(footer, font=wordmark_font)
    draw.text(((CANVAS[0] - width) / 2, CANVAS[1] - 150), footer, font=wordmark_font, fill=TEXT_SECONDARY)

    out = canvas.convert('RGB')
    out.save(out_dir / shot_config['out'], 'PNG')
    print(f"  {shot_config['out']}  <- {shot_config['source']}")


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    source_dir = Path(sys.argv[1])
    out_dir = source_dir / 'marketing'
    out_dir.mkdir(exist_ok=True)
    print(f'Composing {len(SHOTS)} marketing shots -> {out_dir}')
    for shot_config in SHOTS:
        compose(shot_config, source_dir, out_dir)
    print('Done. Upload the contents of marketing/ to the 6.9" slot in App Store Connect.')


if __name__ == '__main__':
    main()
