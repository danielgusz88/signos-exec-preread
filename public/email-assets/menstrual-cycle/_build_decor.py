"""Composite the decorative hex-cut band PNGs + phase-intro rail PNGs that
were missing from the first pass of the Menstrual Cycle email.

Outputs (all 2× retina, for 600-px CSS):
  band-light-to-alt.png      1200 ×  120   pebble-light top → pebble-alt bottom
  band-alt-to-light.png      1200 ×  120   pebble-alt top  → pebble-light bottom
  rail-follicular.png        1200 ×  298   pebble-alt top + follicular badge + wave + pebble-light
  rail-ovulatory.png         1200 ×  298   pebble-alt top + ovulatory  badge + wave + pebble-light
  rail-luteal.png            1200 ×  298   pebble-alt top + luteal     badge + wave + pebble-light

Reuses:
  - nutrition/hexcut-pebble-to-pebble2.png (1200×120)  — the wave shape mask

Colors (per Figma spec + FIGMA_TO_HTML_PROCESS.md §11):
  #F5F6F7  SIG Pebble Light
  #E3E4E7  SIG Pebble (alt)
  #B5C3D6  SIG Stone Light        — follicular icon bg
  #3B88FF  SIG Sky                — ovulatory icon bg
  #F4CC89  SIG Utility Gold Amber — luteal icon bg
  #21263A  SIG Stone              — icon foreground
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
NUTRITION = HERE.parent / "nutrition"
OUT = HERE

PEBBLE_LIGHT = (245, 246, 247, 255)  # #F5F6F7 (reverted 2026-04-20 per user: "where it is all white should be pebble light — a light grey")
PEBBLE_ALT   = (227, 228, 231, 255)  # #E3E4E7
STONE        = (33, 38, 58, 255)     # #21263A

FOLLICULAR = (181, 195, 214, 255)    # #B5C3D6
OVULATORY  = (59, 136, 255, 255)     # #3B88FF
LUTEAL     = (244, 204, 137, 255)    # #F4CC89

W = 1200          # 2× retina for 600 CSS px width
H_BAND = 120      # 2× retina for 60 CSS px band
H_RAIL = 298      # 2× retina for 149 CSS px phase-intro rail


def colorize_wave(wave_src: Path, top: tuple, bottom: tuple) -> Image.Image:
    """Load the reusable hex-cut wave shape and re-color it.
    The source is an RGBA PNG where the wave has alpha=255 pixels in the
    'top' zone and alpha=255 pixels in the 'bottom' zone distinguished by
    their RGB values (lighter vs darker). We threshold on luminance to split
    and recolor each region."""
    w = Image.open(wave_src).convert("RGBA")
    w = w.resize((W, H_BAND), Image.LANCZOS)
    out = Image.new("RGBA", (W, H_BAND), (0, 0, 0, 0))
    px_w = w.load()
    px_o = out.load()
    for y in range(H_BAND):
        for x in range(W):
            r, g, b, a = px_w[x, y]
            if a < 10:
                # transparent pixel → fill with "top" color (background above the wave)
                px_o[x, y] = top
            else:
                # opaque pixel in the wave → this is the wave area; assume it's
                # the "bottom" color splashing up onto the top
                lum = 0.299*r + 0.587*g + 0.114*b
                if lum > 250:  # near-white
                    px_o[x, y] = top
                else:
                    px_o[x, y] = bottom
    return out


def make_bands() -> None:
    wave_src = NUTRITION / "hexcut-pebble-to-pebble2.png"
    assert wave_src.exists(), f"missing wave source: {wave_src}"

    light_to_alt = colorize_wave(wave_src, top=PEBBLE_LIGHT, bottom=PEBBLE_ALT)
    light_to_alt.save(OUT / "band-light-to-alt.png", optimize=True)
    print(f"  band-light-to-alt.png  {light_to_alt.size}")

    alt_to_light = light_to_alt.transpose(Image.FLIP_TOP_BOTTOM)
    # swap: now top is alt, bottom is light (but the wave direction is flipped — still reads)
    alt_to_light.save(OUT / "band-alt-to-light.png", optimize=True)
    print(f"  band-alt-to-light.png  {alt_to_light.size}")


def make_rail(icon_src: Path, circle_color: tuple, out_name: str) -> None:
    """Build a 1200×298 phase-intro rail:
      - Top ~180 rows (90 CSS px): pebble-alt
      - Hex-cut wave band at y=180-298 transitioning alt → pebble-light
      - Circle badge on the left straddling the boundary, filled with circle_color
      - Monochrome-stone phase icon centered in the badge
    """
    wave_src = NUTRITION / "hexcut-pebble-to-pebble2.png"
    base = Image.new("RGBA", (W, H_RAIL), PEBBLE_ALT)

    # Paste the wave band at y=H_RAIL - H_BAND   (y=178 → y=298 for alt→light)
    band = colorize_wave(wave_src, top=PEBBLE_ALT, bottom=PEBBLE_LIGHT)
    base.alpha_composite(band, (0, H_RAIL - H_BAND))

    # Badge circle on the left.  Figma: x=21, y=41.25, size 98.5×98.5 (CSS).
    #                            2×:    x=42, y=82.5,  size 197×197
    badge_x, badge_y = 42, 82
    badge_size = 197
    draw = ImageDraw.Draw(base)
    draw.ellipse(
        (badge_x, badge_y, badge_x + badge_size, badge_y + badge_size),
        fill=circle_color,
    )

    # Icon centered inside the badge. Figma: 41.042×41.042 → 2×: ~82×82.
    # Source PNGs have the glyph pre-rendered over a tinted circle. We need
    # ONLY the glyph, not the circle. Strategy: compute the average RGB of
    # the source (which is dominated by the circle since the circle has far
    # more pixels), then keep pixels whose color differs significantly from
    # that average (i.e. the glyph — regardless of whether glyph is dark on
    # light or light on dark).
    icon_raw = Image.open(icon_src).convert("RGBA")
    ip = icon_raw.load()
    # compute average of opaque pixels
    r_sum = g_sum = b_sum = n = 0
    for y in range(icon_raw.height):
        for x in range(icon_raw.width):
            r, g, b, a = ip[x, y]
            if a > 30:
                r_sum += r; g_sum += g; b_sum += b; n += 1
    if n == 0:
        print(f"    WARNING: empty icon {icon_src.name}")
        return
    r_avg, g_avg, b_avg = r_sum / n, g_sum / n, b_sum / n

    mask = Image.new("L", icon_raw.size, 0)
    mp = mask.load()
    for y in range(icon_raw.height):
        for x in range(icon_raw.width):
            r, g, b, a = ip[x, y]
            if a < 30:
                continue
            dist = ((r - r_avg) ** 2 + (g - g_avg) ** 2 + (b - b_avg) ** 2) ** 0.5
            if dist > 50:  # pixel color differs significantly from circle avg → glyph
                mp[x, y] = a

    bbox = mask.getbbox()
    if bbox is None:
        print(f"    WARNING: no dark-glyph pixels found in {icon_src.name}")
        return
    glyph = Image.new("RGBA", (bbox[2] - bbox[0], bbox[3] - bbox[1]), (0, 0, 0, 0))
    gp = glyph.load()
    for y in range(bbox[1], bbox[3]):
        for x in range(bbox[0], bbox[2]):
            a = mp[x, y]
            if a > 0:
                gp[x - bbox[0], y - bbox[1]] = (STONE[0], STONE[1], STONE[2], a)

    icon_size = 82
    ratio = icon_size / max(glyph.width, glyph.height)
    glyph = glyph.resize(
        (int(glyph.width * ratio), int(glyph.height * ratio)),
        Image.LANCZOS,
    )
    ix = badge_x + (badge_size - glyph.width) // 2
    iy = badge_y + (badge_size - glyph.height) // 2
    base.alpha_composite(glyph, (ix, iy))

    base.save(OUT / out_name, optimize=True)
    print(f"  {out_name}  {base.size}  (badge #{'%02x%02x%02x' % circle_color[:3]})")


if __name__ == "__main__":
    print("→ Building transition bands")
    make_bands()

    print("→ Building phase-intro rails")
    # Use the existing raw SVG icons that live next to the baked circle PNGs.
    # If we only have the circle PNGs, those will still work because the
    # rail script strips the colored circle bg (alpha bbox) and re-tints to stone.
    make_rail(HERE / "icon-phase-follicular.png", FOLLICULAR, "rail-follicular.png")
    make_rail(HERE / "icon-phase-ovulatory.png",  OVULATORY,  "rail-ovulatory.png")
    make_rail(HERE / "icon-phase-luteal.png",     LUTEAL,     "rail-luteal.png")
    print("done.")
