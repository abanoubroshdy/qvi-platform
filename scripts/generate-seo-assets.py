"""Regenerate cropped wordmarks, icons, and Open Graph images.

Reads the full-bleed logo masters in assets/brand/ and writes the files the
site actually serves. Requires Pillow. Not part of the Next.js build.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / "assets" / "brand"
PUBLIC = ROOT / "public"
BRAND = PUBLIC / "brand"
OG = PUBLIC / "og"

# CSS crop of the 1600px masters: wordmark occupies x 213–1383, y 601–1066.
CROP = (213, 601, 1383, 1066)
WORDMARK_WIDTH = 480

BG = (11, 18, 32, 255)  # #0B1220
INDIGO = (67, 56, 202, 255)  # #4338CA
WHITE = (248, 250, 252, 255)
MUTED = (148, 163, 184, 255)
LILAC = (165, 180, 252, 255)

FONT_BOLD = "/usr/share/fonts/truetype/macos/Inter-Bold.ttf"
FONT_SEMIBOLD = "/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/macos/Inter-Regular.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def crop_wordmark(src: Path, dest_webp: Path) -> Image.Image:
    image = Image.open(src).convert("RGBA")
    cropped = image.crop(CROP)
    width = WORDMARK_WIDTH
    height = round(width * cropped.height / cropped.width)
    resized = cropped.resize((width, height), Image.Resampling.LANCZOS)
    dest_webp.parent.mkdir(parents=True, exist_ok=True)
    resized.save(dest_webp, "WEBP", quality=82, method=6)
    return resized


def paste_wordmark(canvas: Image.Image, wordmark: Image.Image, x: int, y: int, target_h: int) -> None:
    scale = target_h / wordmark.height
    size = (round(wordmark.width * scale), target_h)
    resized = wordmark.resize(size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized, (x, y))


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = word if not current else f"{current} {word}"
        if draw.textlength(trial, font=face) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def og_card(wordmark: Image.Image, eyebrow: str, headline: str, sub: str, dest: Path) -> None:
    image = Image.new("RGBA", (1200, 630), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 18, 630), fill=INDIGO)
    paste_wordmark(image, wordmark, 72, 64, 78)
    draw.text((72, 180), eyebrow, font=font(FONT_SEMIBOLD, 22), fill=LILAC)
    headline_font = font(FONT_BOLD, 68)
    y = 230
    for line in wrap(draw, headline, headline_font, 1000):
        draw.text((72, y), line, font=headline_font, fill=WHITE)
        y += 78
    sub_font = font(FONT_REGULAR, 30)
    y += 12
    for line in wrap(draw, sub, sub_font, 1000):
        draw.text((72, y), line, font=sub_font, fill=MUTED)
        y += 40
    draw.text((72, 560), "getqvi.com", font=font(FONT_SEMIBOLD, 24), fill=LILAC)
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(dest, "PNG", optimize=True)


def icon_master(wordmark: Image.Image) -> Image.Image:
    """Square mark: brand background, real wordmark, indigo bar. Padded for maskable icons."""
    size = 512
    image = Image.new("RGBA", (size, size), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, size - 28, size, size), fill=INDIGO)
    target_w = 360
    scale = target_w / wordmark.width
    resized = wordmark.resize((target_w, round(wordmark.height * scale)), Image.Resampling.LANCZOS)
    x = (size - resized.width) // 2
    y = (size - 28 - resized.height) // 2
    image.alpha_composite(resized, (x, y))
    return image


def save_icon_set(master: Image.Image) -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    master.save(PUBLIC / "icon-512.png", "PNG", optimize=True)
    master.resize((192, 192), Image.Resampling.LANCZOS).save(PUBLIC / "icon-192.png", "PNG", optimize=True)
    master.resize((180, 180), Image.Resampling.LANCZOS).save(PUBLIC / "apple-touch-icon.png", "PNG", optimize=True)
    master.save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )


def main() -> None:
    light = crop_wordmark(MASTERS / "qvi-logo.png", BRAND / "qvi-wordmark.webp")
    dark = crop_wordmark(MASTERS / "qvi-logo-on-dark.png", BRAND / "qvi-wordmark-on-dark.webp")
    print(f"wordmark {light.size} light { (BRAND / 'qvi-wordmark.webp').stat().st_size } bytes")
    print(f"wordmark {dark.size} dark { (BRAND / 'qvi-wordmark-on-dark.webp').stat().st_size } bytes")

    cards = [
        (
            "home.png",
            "ON-DEVICE AI AUDIO",
            "AI stem separation and instrument performance",
            "QV1 vocal remover and Neyora, plus free browser tools. Files stay on your device.",
        ),
        (
            "qv1.png",
            "QV1  ·  COMING SOON",
            "AI stem separation and vocal remover",
            "Split vocals, drums, bass, and accompaniment on your own computer.",
        ),
        (
            "neyora.png",
            "NEYORA  ·  IN DEVELOPMENT",
            "AI instrument performance",
            "Turn text, a hummed melody, or MIDI into a solo instrument with DDSP.",
        ),
        (
            "studio.png",
            "QVI STUDIO",
            "Free online multitrack mixer",
            "Mix tracks, change tempo and pitch, tap BPM, and export. Audio stays on your device.",
        ),
        (
            "tools.png",
            "FREE BROWSER TOOLS",
            "Audio, PDF, and images. No upload.",
            "Convert, trim, compress, and generate files in the browser, on your device.",
        ),
    ]
    for name, eyebrow, headline, sub in cards:
        og_card(dark, eyebrow, headline, sub, OG / name)
        print(f"og {name} {(OG / name).stat().st_size} bytes")

    icons = icon_master(dark)
    save_icon_set(icons)
    print(f"favicon {(PUBLIC / 'favicon.ico').stat().st_size} bytes")
    print(f"icon-512 {(PUBLIC / 'icon-512.png').stat().st_size} bytes")


if __name__ == "__main__":
    main()
