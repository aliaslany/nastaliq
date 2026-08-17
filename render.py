#!/usr/bin/env python3
"""
Nastaliq text-to-image renderer.

Uses Pango (via PyGObject) + Cairo for proper Nastaliq contextual shaping.
Plain PIL text drawing will NOT work for Nastaliq -- Pango's HarfBuzz-backed
shaping engine is required to get correct letter joining/ligatures.

Fonts are loaded straight from local .ttf files via a private Pango
FontMap (fontconfig), so no system font installation is needed -- this is
important for a GitHub Actions runner where we don't want to touch
system font dirs on every run.
"""

import argparse
import os
import sys

import gi

gi.require_version("Pango", "1.0")
gi.require_version("PangoCairo", "1.0")
from gi.repository import Pango, PangoCairo, GLib  # noqa: E402
import cairo  # noqa: E402


FONTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")

# Registry of available fonts: key -> (filename, Pango family name, display name)
# The Pango family name must match the font's internal name table entry;
# run `fc-scan <file> | grep family` after adding a new font to confirm it.
FONT_REGISTRY = {
    "iran-nastaliq": {
        "file": "IranNastaliq.ttf",
        "family": "IranNastaliq",
        "display_name": "Iran Nastaliq",
    },
    "noto-nastaliq": {
        "file": "NotoNastaliqUrdu.ttf",
        "family": "Noto Nastaliq Urdu",
        "display_name": "Noto Nastaliq Urdu",
    },
}

# Preset color themes: (text_rgb, bg_rgb), values 0-1 floats for Cairo
THEMES = {
    "classic": ((0.05, 0.05, 0.05), (0.96, 0.93, 0.85)),   # black ink / cream paper
    "gold": ((0.83, 0.68, 0.21), (0.08, 0.08, 0.1)),        # gold on near-black
    "night": ((0.92, 0.92, 0.92), (0.1, 0.1, 0.14)),        # light gray on dark navy
    "rose": ((0.4, 0.05, 0.1), (0.98, 0.94, 0.9)),          # deep red on ivory
}


def _register_fonts(font_paths):
    """Register local font files with fontconfig for this process only."""
    import ctypes

    fc = ctypes.CDLL("libfontconfig.so.1")
    fc.FcConfigGetCurrent.restype = ctypes.c_void_p
    config = fc.FcConfigGetCurrent()
    for path in font_paths:
        fc.FcConfigAppFontAddFile(ctypes.c_void_p(config), path.encode("utf-8"))


def render_nastaliq(
    text: str,
    output_path: str,
    font_key: str = "iran-nastaliq",
    font_size: int = 72,
    theme: str = "classic",
    text_color: tuple | None = None,
    bg_color: tuple | None = None,
    transparent_bg: bool = False,
    padding: int = 60,
    max_width: int = 1600,
    align: str = "center",
):
    if font_key not in FONT_REGISTRY:
        raise ValueError(f"Unknown font '{font_key}'. Options: {list(FONT_REGISTRY)}")

    entry = FONT_REGISTRY[font_key]
    font_path = os.path.join(FONTS_DIR, entry["file"])
    if not os.path.exists(font_path):
        raise FileNotFoundError(f"Font file missing: {font_path}")

    _register_fonts([font_path])

    if theme not in THEMES and (text_color is None or bg_color is None):
        raise ValueError(f"Unknown theme '{theme}'. Options: {list(THEMES)}")
    default_text_color, default_bg_color = THEMES.get(theme, ((0, 0, 0), (1, 1, 1)))
    text_color = text_color or default_text_color
    bg_color = bg_color or default_bg_color

    # --- Layout pass 1: measure text to get real extents ---
    # We only constrain wrap width if the natural (unwrapped) width would
    # exceed max_width; otherwise we let Pango size the paragraph naturally.
    # This matters because Pango positions RTL text relative to the wrap
    # width, so an oversized wrap width shifts glyphs far to the right of
    # x=0 -- we must always account for logical_rect.x/y when drawing,
    # regardless of which path we take.
    probe_surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, 10, 10)
    probe_ctx = cairo.Context(probe_surface)
    layout = PangoCairo.create_layout(probe_ctx)

    font_desc = Pango.FontDescription()
    font_desc.set_family(entry["family"])
    font_desc.set_size(font_size * Pango.SCALE)
    layout.set_font_description(font_desc)

    align_map = {
        "center": Pango.Alignment.CENTER,
        "right": Pango.Alignment.RIGHT,
        "left": Pango.Alignment.LEFT,
    }
    layout.set_alignment(align_map.get(align, Pango.Alignment.CENTER))

    # Pango auto-detects RTL for Arabic-script text via its Unicode bidi
    # algorithm, but we set base direction explicitly to be safe.
    layout.get_context().set_base_dir(Pango.Direction.RTL)
    layout.set_auto_dir(True)
    layout.set_width(-1)  # natural width first, to see if wrapping is even needed
    layout.set_wrap(Pango.WrapMode.WORD_CHAR)
    layout.set_text(text, -1)

    _, natural_logical = layout.get_pixel_extents()
    available_width = max_width - 2 * padding

    if natural_logical.width > available_width:
        layout.set_width(available_width * Pango.SCALE)

    ink_rect, logical_rect = layout.get_pixel_extents()
    text_w = logical_rect.width
    text_h = logical_rect.height

    canvas_w = text_w + 2 * padding
    canvas_h = text_h + 2 * padding

    # --- Layout pass 2: real surface at correct size ---
    surface_format = cairo.FORMAT_ARGB32 if transparent_bg else cairo.FORMAT_RGB24
    surface = cairo.ImageSurface(surface_format, canvas_w, canvas_h)
    ctx = cairo.Context(surface)

    if not transparent_bg:
        ctx.set_source_rgb(*bg_color)
        ctx.paint()
    else:
        ctx.set_operator(cairo.OPERATOR_CLEAR)
        ctx.paint()
        ctx.set_operator(cairo.OPERATOR_OVER)

    ctx.set_source_rgb(*text_color)
    # Offset by padding, then subtract the logical rect's own origin so the
    # glyph ink lands exactly at (padding, padding) regardless of any
    # internal RTL wrap-width offset Pango applied.
    ctx.translate(padding - logical_rect.x, padding - logical_rect.y)

    layout2 = PangoCairo.create_layout(ctx)
    layout2.set_font_description(font_desc)
    layout2.set_alignment(align_map.get(align, Pango.Alignment.CENTER))
    layout2.get_context().set_base_dir(Pango.Direction.RTL)
    layout2.set_auto_dir(True)
    if natural_logical.width > available_width:
        layout2.set_width(available_width * Pango.SCALE)
    layout2.set_wrap(Pango.WrapMode.WORD_CHAR)
    layout2.set_text(text, -1)

    PangoCairo.show_layout(ctx, layout2)

    surface.write_to_png(output_path)
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Render Persian text in Nastaliq script to a PNG image.")
    # Text is optional on the CLI: when omitted, it's read from the
    # NASTALIQ_TEXT env var. This lets the GitHub Action pass untrusted
    # user text via `env:` instead of interpolating it into the run: shell
    # script, which is the standard script-injection risk with
    # repository_dispatch payloads.
    parser.add_argument("text", nargs="?", default=None, help="Text to render (Persian/Arabic script)")
    parser.add_argument("-o", "--output", default=os.environ.get("NASTALIQ_OUTPUT", "out/output.png"))
    parser.add_argument(
        "-f", "--font",
        default=os.environ.get("NASTALIQ_FONT", "iran-nastaliq"),
        choices=list(FONT_REGISTRY),
    )
    parser.add_argument("-s", "--size", type=int, default=int(os.environ.get("NASTALIQ_SIZE", 72)))
    parser.add_argument(
        "-t", "--theme",
        default=os.environ.get("NASTALIQ_THEME", "classic"),
        choices=list(THEMES),
    )
    parser.add_argument("--transparent", action="store_true")
    parser.add_argument("--align", default=os.environ.get("NASTALIQ_ALIGN", "center"), choices=["center", "right", "left"])
    parser.add_argument("--padding", type=int, default=60)
    parser.add_argument("--max-width", type=int, default=1600)
    args = parser.parse_args()

    text = args.text if args.text is not None else os.environ.get("NASTALIQ_TEXT")
    if not text or not text.strip():
        print("No text provided (pass as argument or set NASTALIQ_TEXT env var).", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    path = render_nastaliq(
        text=text,
        output_path=args.output,
        font_key=args.font,
        font_size=args.size,
        theme=args.theme,
        transparent_bg=args.transparent,
        align=args.align,
        padding=args.padding,
        max_width=args.max_width,
    )
    print(f"Wrote {path}")


if __name__ == "__main__":
    main()
