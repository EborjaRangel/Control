from __future__ import annotations

from pathlib import Path

from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SRC = PUBLIC / "coyote-alcaldia.png"
PNG_OUT = PUBLIC / "coyote-emblem-blue.png"
SVG_OUT = PUBLIC / "coyote-emblem-blue.svg"
ICON_OUT = ROOT / "src" / "app" / "icon.png"

BLUE_LAYERS = [
    ("main", (21, 101, 192), "#1565C0"),
    ("dark", (13, 71, 161), "#0D47A1"),
    ("light", (100, 181, 246), "#64B5F6"),
]
WHITE = ((255, 255, 255), "#FFFFFF")


def build_blue_emblem() -> Image.Image:
    img = Image.open(SRC).convert("RGBA")
    emblem_h = int(img.height * 0.58)
    emblem = img.crop((0, 0, img.width, emblem_h))
    arr = np.array(emblem, dtype=np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]

    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    delta = maxc - minc
    sat = delta / (maxc + 1e-6)
    val = maxc / 255.0

    skip = (a < 20) | ((sat < 0.14) & (val > 0.72))
    colored = ~skip

    out = arr.copy()
    dark = colored & (val < 0.42)
    mid = colored & (val >= 0.42) & (val < 0.72)
    light = colored & (val >= 0.72)

    out[dark, 0], out[dark, 1], out[dark, 2] = BLUE_LAYERS[1][1]
    out[mid, 0], out[mid, 1], out[mid, 2] = BLUE_LAYERS[0][1]
    out[light, 0], out[light, 1], out[light, 2] = BLUE_LAYERS[2][1]
    out[skip, 3] = 0

    emblem_blue = Image.fromarray(out.astype(np.uint8), "RGBA")
    side = emblem_blue.width
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(emblem_blue, (0, 0))
    return canvas


def mask_to_path(mask: np.ndarray) -> str:
    parts: list[str] = []
    h, w = mask.shape
    for y in range(h):
        x = 0
        while x < w:
            if not mask[y, x]:
                x += 1
                continue
            x0 = x
            while x < w and mask[y, x]:
                x += 1
            parts.append(f"M{x0},{y}H{x}V{y+1}H{x0}Z")
    return " ".join(parts)


def emblem_white_mask(arr: np.ndarray) -> np.ndarray:
    rgb, hex_color = WHITE
    tol = 6
    mask = np.ones(arr.shape[:2], dtype=bool)
    for i, c in enumerate(rgb):
        mask &= np.abs(arr[..., i].astype(int) - c) <= tol
    mask &= arr[..., 3] > 128

    # Solo blanco del coyote (barbilla), no el fondo exterior.
    colored = np.zeros_like(mask)
    for _name, rgb, _hex in BLUE_LAYERS:
        layer = np.ones(arr.shape[:2], dtype=bool)
        for i, c in enumerate(rgb):
            layer &= np.abs(arr[..., i].astype(int) - c) <= 12
        layer &= arr[..., 3] > 128
        colored |= layer

    from collections import deque

    h, w = mask.shape
    exterior = np.zeros((h, w), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(w):
        if mask[0, x] and not colored[0, x]:
            queue.append((x, 0))
        if mask[h - 1, x] and not colored[h - 1, x]:
            queue.append((x, h - 1))
    for y in range(h):
        if mask[y, 0] and not colored[y, 0]:
            queue.append((0, y))
        if mask[y, w - 1] and not colored[y, w - 1]:
            queue.append((w - 1, y))

    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or exterior[y, x]:
            continue
        if not mask[y, x] or colored[y, x]:
            continue
        exterior[y, x] = True
        queue.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    return mask & ~exterior


def write_vector_svg(img: Image.Image) -> None:
    arr = np.array(img)
    w, h = img.size
    paths: list[str] = []

    for _name, rgb, hex_color in BLUE_LAYERS:
        mask = np.ones(arr.shape[:2], dtype=bool)
        for i, c in enumerate(rgb):
            mask &= np.abs(arr[..., i].astype(int) - c) <= 12
        mask &= arr[..., 3] > 128
        if mask.any():
            paths.append(f'  <path fill="{hex_color}" d="{mask_to_path(mask)}"/>')

    white_mask = emblem_white_mask(arr)
    if white_mask.any():
        paths.append(f'  <path fill="{WHITE[1]}" d="{mask_to_path(white_mask)}"/>')

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" '
        f'aria-label="Coyote de Coyoacán">\n'
        + "\n".join(paths)
        + "\n</svg>\n"
    )
    SVG_OUT.write_text(svg, encoding="utf-8")


def main() -> None:
    emblem = build_blue_emblem()
    emblem.save(PNG_OUT)
    emblem.resize((512, 512), Image.Resampling.LANCZOS).save(ICON_OUT)
    write_vector_svg(emblem)
    print(f"Wrote {PNG_OUT.name}, {SVG_OUT.name}, icon.png")


if __name__ == "__main__":
    main()
