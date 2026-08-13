"""Conform finished marketing images to an accepted App Store screenshot size.

App Store Connect only accepts exact pixel dimensions per display class. This
takes ANY folder of finished shots and emits 1284x2778 (the 6.7" portrait slot,
also satisfying the 6.5" requirement ASC quotes alongside it).

- Aspect within 2% of the target: scale to fill and center-crop (invisible).
- Anything else: scale to fit and letterbox onto the brand paper color, so
  mismatched sources still upload rather than silently distorting.

Usage:
    python scripts/appstore-format.py <folder-with-images>
    python scripts/appstore-format.py <folder> --size=2048x2732   # iPad 12.9"/13"

Writes to <folder>/appstore-<width>x<height>/.
"""

import sys
from pathlib import Path

from PIL import Image

TARGET = (1284, 2778)
PAPER = (243, 237, 228)
ASPECT_TOLERANCE = 0.02


def conform(source: Path, out_dir: Path, target: tuple) -> None:
    image = Image.open(source).convert('RGB')
    target_aspect = target[0] / target[1]
    aspect = image.width / image.height

    if abs(aspect - target_aspect) / target_aspect <= ASPECT_TOLERANCE:
        scale = max(target[0] / image.width, target[1] / image.height)
        resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
        left = (resized.width - target[0]) // 2
        top = (resized.height - target[1]) // 2
        out = resized.crop((left, top, left + target[0], top + target[1]))
        mode = 'fill-crop'
    else:
        # Scale to fit and center on the brand paper. For a 9:16 source on a
        # 3:4 iPad canvas the side margins are wide, but the source's own
        # background is this same paper colour, so the seam is invisible.
        scale = min(target[0] / image.width, target[1] / image.height)
        resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
        out = Image.new('RGB', target, PAPER)
        out.paste(resized, ((target[0] - resized.width) // 2, (target[1] - resized.height) // 2))
        mode = 'letterbox'

    factor = min(target[0] / image.width, target[1] / image.height)
    upscaled = f' UPSCALED {factor:.1f}x - expect softness' if factor > 1.05 else ''
    out.save(out_dir / f'{source.stem}-{target[0]}x{target[1]}.png', 'PNG')
    print(f'  {source.name}  [{mode}]{upscaled}')


def main() -> None:
    positional = [a for a in sys.argv[1:] if not a.startswith('--')]
    target = TARGET
    for arg in sys.argv[1:]:
        if arg.startswith('--size=') :
            width, height = arg.split('=', 1)[1].lower().split('x')
            target = (int(width), int(height))
    if not positional:
        print(__doc__)
        raise SystemExit(1)
    folder = Path(positional[0])
    out_dir = folder / f'appstore-{target[0]}x{target[1]}'
    out_dir.mkdir(exist_ok=True)
    images = sorted(
        p for p in folder.iterdir() if p.suffix.lower() in {'.png', '.jpg', '.jpeg'} and p.is_file()
    )
    if not images:
        print(f'No images found in {folder}')
        raise SystemExit(1)
    print(f'Conforming {len(images)} image(s) to {target[0]}x{target[1]} -> {out_dir}')
    for image_path in images:
        conform(image_path, out_dir, target)
    print(f'Done. Upload {out_dir.name}/ contents to App Store Connect.')


if __name__ == '__main__':
    main()
