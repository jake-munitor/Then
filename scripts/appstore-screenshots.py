"""Normalize iPhone screenshots into App Store Connect-ready 6.9-inch PNGs.

Usage:
    python scripts/appstore-screenshots.py <input-dir> [output-dir]

Drop raw screenshots (PNG/JPG, any modern iPhone size, portrait) into
<input-dir>; this writes 1320x2868 PNGs to <output-dir> (default:
<input-dir>/appstore), which is the 6.9" size App Store Connect requires -
it auto-scales that single set for every smaller display.

Screenshots whose aspect ratio is within 1.5% of the target are resized
directly (Lanczos). Anything else is scaled to fit and letterboxed onto the
app's paper background (#F3EDE4) so nothing gets cropped or distorted.
"""

import sys
from pathlib import Path

from PIL import Image

TARGET = (1320, 2868)  # 6.9" portrait (iPhone 16 Pro Max)
BACKGROUND = (243, 237, 228)  # colors.background #F3EDE4
ASPECT_TOLERANCE = 0.015


def convert(src: Path, dest: Path) -> str:
    image = Image.open(src).convert('RGB')
    width, height = image.size
    if width > height:
        return f'SKIP {src.name}: landscape input; App Store set is portrait'

    target_aspect = TARGET[0] / TARGET[1]
    aspect = width / height

    if abs(aspect - target_aspect) / target_aspect <= ASPECT_TOLERANCE:
        result = image.resize(TARGET, Image.LANCZOS)
        note = 'resized'
    else:
        scale = min(TARGET[0] / width, TARGET[1] / height)
        fitted = image.resize((round(width * scale), round(height * scale)), Image.LANCZOS)
        result = Image.new('RGB', TARGET, BACKGROUND)
        result.paste(fitted, ((TARGET[0] - fitted.width) // 2, (TARGET[1] - fitted.height) // 2))
        note = f'letterboxed (source aspect {aspect:.3f})'

    result.save(dest, 'PNG')
    return f'OK   {src.name} -> {dest.name} ({note})'


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    input_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else input_dir / 'appstore'
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
        print(convert(src, output_dir / f'then-{index:02d}.png'))

    print(f'\nDone - upload the files in {output_dir} to App Store Connect (6.9" display slot).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
