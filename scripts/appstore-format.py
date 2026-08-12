"""Conform finished marketing images to an accepted App Store screenshot size.

App Store Connect only accepts exact pixel dimensions per display class. This
takes ANY folder of finished shots and emits 1284x2778 (the 6.7" portrait slot,
also satisfying the 6.5" requirement ASC quotes alongside it).

- Aspect within 2% of the target: scale to fill and center-crop (invisible).
- Anything else: scale to fit and letterbox onto the brand paper color, so
  mismatched sources still upload rather than silently distorting.

Usage:
    python scripts/appstore-format.py <folder-with-images>

Writes to <folder>/appstore-1284/.
"""

import sys
from pathlib import Path

from PIL import Image

TARGET = (1284, 2778)
PAPER = (243, 237, 228)
ASPECT_TOLERANCE = 0.02


def conform(source: Path, out_dir: Path) -> None:
    image = Image.open(source).convert('RGB')
    target_aspect = TARGET[0] / TARGET[1]
    aspect = image.width / image.height

    if abs(aspect - target_aspect) / target_aspect <= ASPECT_TOLERANCE:
        scale = max(TARGET[0] / image.width, TARGET[1] / image.height)
        resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
        left = (resized.width - TARGET[0]) // 2
        top = (resized.height - TARGET[1]) // 2
        out = resized.crop((left, top, left + TARGET[0], top + TARGET[1]))
        mode = 'fill-crop'
    else:
        scale = min(TARGET[0] / image.width, TARGET[1] / image.height)
        resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
        out = Image.new('RGB', TARGET, PAPER)
        out.paste(resized, ((TARGET[0] - resized.width) // 2, (TARGET[1] - resized.height) // 2))
        mode = 'letterbox'

    upscaled = ' UPSCALED - source smaller than target, expect softness' if image.width < TARGET[0] else ''
    out.save(out_dir / f'{source.stem}-1284x2778.png', 'PNG')
    print(f'  {source.name}  [{mode}]{upscaled}')


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    folder = Path(sys.argv[1])
    out_dir = folder / 'appstore-1284'
    out_dir.mkdir(exist_ok=True)
    images = sorted(
        p for p in folder.iterdir() if p.suffix.lower() in {'.png', '.jpg', '.jpeg'} and p.is_file()
    )
    if not images:
        print(f'No images found in {folder}')
        raise SystemExit(1)
    print(f'Conforming {len(images)} image(s) -> {out_dir}')
    for image_path in images:
        conform(image_path, out_dir)
    print('Done. Upload appstore-1284/ contents to App Store Connect.')


if __name__ == '__main__':
    main()
