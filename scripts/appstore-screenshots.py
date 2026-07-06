"""Normalize iPhone screenshots into App Store Connect-ready PNGs.

Usage:
    python scripts/appstore-screenshots.py <input-dir> [output-dir] [--size 6.9|6.5]

Drop raw screenshots (PNG/JPG, any modern iPhone size, portrait) into
<input-dir>; this writes correctly-sized PNGs to <output-dir> (default:
<input-dir>/appstore-<size>). Which size App Store Connect demands depends on
the app record - if the upload is rejected with a dimensions error naming
1284x2778, rerun with --size 6.5.

  6.9     ->  1320x2868 (iPhone 16 Pro Max class)
  6.5     ->  1284x2778 (iPhone Plus / older Pro Max class)
  ipad13  ->  2064x2752 (required 13" iPad slot even for iPhone-only apps
              that declare iPad support; source is letterboxed onto the
              app's paper background since the aspect ratios don't match -
              this is the standard, Apple-accepted approach when an app has
              no dedicated iPad layout)

Sources whose aspect ratio is within 2% of the target are scaled to fill and
center-cropped (sub-pixel-visible trim). Anything further off is scaled to fit
and letterboxed onto the app's paper background (#F3EDE4) so nothing important
gets cropped or distorted.
"""

import sys
from pathlib import Path

from PIL import Image

SIZES = {
    '6.9': (1320, 2868),
    '6.5': (1284, 2778),
    'ipad13': (2064, 2752),
}
BACKGROUND = (243, 237, 228)  # colors.background #F3EDE4
ASPECT_TOLERANCE = 0.02


def convert(src: Path, dest: Path, target: tuple[int, int]) -> str:
    image = Image.open(src).convert('RGB')
    width, height = image.size
    if width > height:
        return f'SKIP {src.name}: landscape input; App Store set is portrait'

    target_aspect = target[0] / target[1]
    aspect = width / height

    if abs(aspect - target_aspect) / target_aspect <= ASPECT_TOLERANCE:
        # Scale to fill, center-crop the sliver of overflow.
        scale = max(target[0] / width, target[1] / height)
        filled = image.resize((round(width * scale), round(height * scale)), Image.LANCZOS)
        left = (filled.width - target[0]) // 2
        top = (filled.height - target[1]) // 2
        result = filled.crop((left, top, left + target[0], top + target[1]))
        note = 'filled'
    else:
        scale = min(target[0] / width, target[1] / height)
        fitted = image.resize((round(width * scale), round(height * scale)), Image.LANCZOS)
        result = Image.new('RGB', target, BACKGROUND)
        result.paste(fitted, ((target[0] - fitted.width) // 2, (target[1] - fitted.height) // 2))
        note = f'letterboxed (source aspect {aspect:.3f})'

    result.save(dest, 'PNG')
    return f'OK   {src.name} -> {dest.name} ({note})'


def main() -> int:
    args = [a for a in sys.argv[1:]]
    size = '6.9'
    if '--size' in args:
        index = args.index('--size')
        size = args[index + 1] if index + 1 < len(args) else ''
        del args[index : index + 2]
    if size not in SIZES:
        print(f'Unknown --size {size!r}; choose one of: {", ".join(SIZES)}')
        return 1
    if not args:
        print(__doc__)
        return 1

    target = SIZES[size]
    input_dir = Path(args[0])
    output_dir = Path(args[1]) if len(args) > 1 else input_dir / f'appstore-{size}'
    if not input_dir.is_dir():
        print(f'Input directory not found: {input_dir}')
        return 1
    output_dir.mkdir(parents=True, exist_ok=True)

    sources = sorted(
        p for p in input_dir.iterdir()
        if p.suffix.lower() in {'.png', '.jpg', '.jpeg'} and p.parent != output_dir
    )
    if not sources:
        print(f'No PNG/JPG screenshots found in {input_dir}')
        return 1

    for index, src in enumerate(sources, start=1):
        print(convert(src, output_dir / f'then-{index:02d}.png', target))

    print(f'\nDone - upload the files in {output_dir} ({target[0]}x{target[1]}, {size}" slot).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
