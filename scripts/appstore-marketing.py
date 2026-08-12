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

# Default is the 6.9" slot; pass e.g. --size 1284x2778 for the 6.5"/6.7" slot
# (what App Store Connect asks for on this app's version page). All layout
# constants scale off the width, so any portrait size renders correctly.
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
        # Deliberately the DEMO account's Friends view ("Then Review") - the
        # original capture put real family names and wedding photos in the
        # public listing. Capture: sign into the demo account, Friends tab,
        # screenshot, drop it in the input folder under this name.
        'source': 'demo-friends.PNG',
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


def build_polaroid(screenshot: Image.Image, max_height: int, scale: float = 1.0) -> Image.Image:
    """The capture mounted on a white mat: even borders, thick polaroid chin.

    Scaled so the finished card never overflows the canvas - the first render
    ran the tab bar off the bottom edge and buried the footer wordmark.
    """
    border, chin = round(34 * scale), round(130 * scale)
    shot_width = round(960 * scale)
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


def compose(shot_config: dict, source_dir: Path, out_dir: Path, canvas_size: tuple) -> None:
    s = canvas_size[0] / 1320  # scale factor relative to the design size
    canvas = Image.new('RGBA', canvas_size, (*PAPER, 255))
    draw = ImageDraw.Draw(canvas)

    headline_font = ImageFont.truetype(SERIF, round(128 * s))
    script_font = ImageFont.truetype(SCRIPT, round(84 * s))
    wordmark_font = ImageFont.truetype(SERIF_ITALIC, round(56 * s))

    # Headline block, centered.
    y = round(200 * s)
    for line in shot_config['headline'].split('\n'):
        width = draw.textlength(line, font=headline_font)
        draw.text(((canvas_size[0] - width) / 2, y), line, font=headline_font, fill=TEXT_PRIMARY)
        y += round(150 * s)

    # Handwritten sub-caption in terracotta.
    script_text = shot_config['script']
    width = draw.textlength(script_text, font=script_font)
    draw.text(((canvas_size[0] - width) / 2, y + round(22 * s)), script_text, font=script_font, fill=PRIMARY)

    # The polaroid, tilted, with a soft warm shadow. Reserve room below for
    # the footer wordmark plus breathing space.
    card_y = y + round(170 * s)
    screenshot = Image.open(source_dir / shot_config['source'])
    card = build_polaroid(screenshot, max_height=canvas_size[1] - card_y - round(230 * s), scale=s)
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
    draw.text(((canvas_size[0] - width) / 2, canvas_size[1] - round(150 * s)), footer, font=wordmark_font, fill=TEXT_SECONDARY)

    out = canvas.convert('RGB')
    out.save(out_dir / shot_config['out'], 'PNG')
    print(f"  {shot_config['out']}  {canvas_size[0]}x{canvas_size[1]}  <- {shot_config['source']}")


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    canvas_size = CANVAS
    for arg in sys.argv[1:]:
        if arg.startswith('--size'):
            w, h = arg.split('=', 1)[1].lower().split('x') if '=' in arg else ('', '')
            canvas_size = (int(w), int(h))
    if not args:
        print(__doc__)
        raise SystemExit(1)
    source_dir = Path(args[0])
    out_dir = source_dir / f'marketing-{canvas_size[0]}x{canvas_size[1]}' if canvas_size != CANVAS else source_dir / 'marketing'
    out_dir.mkdir(exist_ok=True)
    print(f'Composing {len(SHOTS)} marketing shots -> {out_dir}')
    skipped = []
    for shot_config in SHOTS:
        if not (source_dir / shot_config['source']).exists():
            skipped.append(shot_config)
            continue
        compose(shot_config, source_dir, out_dir, canvas_size)
    for shot_config in skipped:
        print(f"  SKIPPED {shot_config['out']} - missing {shot_config['source']}")
    print('Done. Upload the contents of marketing/ to the 6.9" slot in App Store Connect.')


if __name__ == '__main__':
    main()
