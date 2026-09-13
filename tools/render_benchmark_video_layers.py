#!/usr/bin/env python3
"""Render the replacement benchmark graphics used in the project film."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH = 1920
HEIGHT = 1080
BACKGROUND = (8, 8, 8, 255)
REGULAR = (116, 116, 116, 255)
HEADER = (134, 134, 134, 255)
HIGHLIGHT = (238, 238, 238, 255)
RULE = (112, 112, 112, 255)
FOCUS_FILL = (26, 26, 26, 255)

FONT_DIR = Path("/usr/share/fonts/truetype/lato")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONT_DIR / name
    if not path.is_file():
        raise FileNotFoundError(f"Required font is missing: {path}")
    return ImageFont.truetype(path, size)


HEADER_FONT = font("Lato-Light.ttf", 24)
HEADER_LABEL_FONT = font("Lato-Bold.ttf", 21)
UNIT_FONT = font("Lato-Light.ttf", 18)
ROW_FONT = font("Lato-Light.ttf", 31)
ROW_BOLD_FONT = font("Lato-Bold.ttf", 31)
FOOTNOTE_FONT = font("Lato-Light.ttf", 18)
SUMMARY_FONT = font("Lato-Bold.ttf", 52)


def empty_layer() -> Image.Image:
    return Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))


def draw_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    x: int,
    y: int,
    selected_font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int],
) -> None:
    draw.text((x, y), text, font=selected_font, fill=fill, anchor="mm")


def draw_hand_content() -> Image.Image:
    image = empty_layer()
    draw = ImageDraw.Draw(image)

    draw.text(
        (150, 218),
        "CAMERA-FRAME HANDS",
        font=HEADER_LABEL_FONT,
        fill=HEADER,
        anchor="lm",
    )

    columns = [590, 748, 895, 1042, 1200, 1342, 1482, 1626, 1774]
    headings = [
        ("FAcc \u2191", ""),
        ("Recall \u2191", ""),
        ("F1 \u2191", ""),
        ("MPJPE-p \u2193", "mm"),
        ("PA-MPJPE-p \u2193", "mm"),
        ("EPE-p \u2193", "px"),
        ("GO-p \u2193", "deg"),
        ("CT-p \u2193", "m"),
        ("Jitter \u2193", "mm/frame\u00b2"),
    ]
    for x, (label, unit) in zip(columns, headings):
        draw_centered(draw, label, x, 209, HEADER_FONT, HEADER)
        if unit:
            draw_centered(draw, unit, x, 240, UNIT_FONT, HEADER)

    draw.line((125, 270, 1835, 270), fill=RULE, width=2)

    rows = [
        ("InterWild", ["0.669", "0.881", "0.868", "77.168", "24.811", "71.482", "58.501", "0.213", "101.164"]),
        ("HaMeR", ["0.692", "0.904", "0.883", "68.314", "21.455", "59.077", "49.636", "0.102", "23.632"]),
        ("Hamba", ["0.632", "0.828", "0.853", "71.732", "29.620", "107.625", "56.525", "0.128", "18.507"]),
        ("WildHands", ["0.655", "0.863", "0.844", "52.791", "28.946", "111.438", "53.933", "0.157", "22.885"]),
        ("OmniHands", ["0.649", "0.895", "0.868", "63.281", "22.682", "68.437", "49.120", "0.133", "69.510"]),
        ("WiLoR", ["0.827", "0.897", "0.937", "30.966", "19.980", "72.978", "25.746", "0.098", "17.976"]),
        ("Dyn-HaMR", ["0.614", "0.811", "0.802", "74.214", "38.201", "171.617", "43.851", "0.571", "44.942"]),
        ("HaWoR", ["0.348", "0.499", "0.654", "71.396", "66.031", "327.294", "79.350", "0.262", "23.872"]),
        ("MINT", ["0.945", "0.983", "0.953", "29.926", "13.656", "55.117", "21.099", "0.196", "12.057"]),
        ("MINT + UKF", ["0.945", "0.983", "0.953", "29.918", "13.646", "55.058", "21.091", "0.196", "2.373"]),
    ]
    highlights = {
        "WiLoR": {7},
        "MINT": {0, 1, 2, 3, 4, 5, 6, 8},
        "MINT + UKF": {0, 1, 2, 3, 4, 5, 6, 8},
    }
    row_centers = [334 + 56 * index for index in range(len(rows))]

    draw.line((125, 752, 1835, 752), fill=(76, 76, 76, 255), width=1)
    draw.rectangle((125, 810, 1835, 868), fill=FOCUS_FILL, outline=HIGHLIGHT, width=2)

    for (method, values), y in zip(rows, row_centers):
        method_color = HIGHLIGHT if method.startswith("MINT") else REGULAR
        draw.text((150, y), method, font=ROW_FONT, fill=method_color, anchor="lm")
        selected = highlights.get(method, set())
        for index, (x, value) in enumerate(zip(columns, values)):
            is_highlighted = index in selected
            draw_centered(
                draw,
                value,
                x,
                y,
                ROW_BOLD_FONT if is_highlighted else ROW_FONT,
                HIGHLIGHT if is_highlighted else REGULAR,
            )

    draw.text(
        (110, 1012),
        "MINT is evaluated zero-shot. Best values are bold; MINT is also bold "
        "when it beats every non-MINT method.",
        font=FOOTNOTE_FONT,
        fill=(102, 102, 102, 255),
        anchor="lm",
    )
    return image


def draw_camera_content() -> Image.Image:
    image = empty_layer()
    draw = ImageDraw.Draw(image)

    draw.text(
        (150, 218),
        "WORLD-FRAME CAMERA TRAJECTORY",
        font=HEADER_LABEL_FONT,
        fill=HEADER,
        anchor="lm",
    )
    columns = [700, 930, 1160, 1400, 1660]
    headings = [
        ("RPE-T \u2193", "mean \u00b7 mm"),
        ("RPE-T \u2193", "med. \u00b7 mm"),
        ("RPE-R \u2193", "mean \u00b7 deg"),
        ("RPE-R \u2193", "med. \u00b7 deg"),
        ("Arc length", "ratio -> 1"),
    ]
    for x, (label, unit) in zip(columns, headings):
        draw_centered(draw, label, x, 205, HEADER_FONT, HEADER)
        draw_centered(draw, unit, x, 239, UNIT_FONT, HEADER)
    draw.line((125, 270, 1835, 270), fill=RULE, width=2)

    rows = [
        ("DROID-SLAM", ["5.362", "3.524", "0.227", "0.146", "0.778"]),
        ("InfiniteVGGT", ["13.524", "9.673", "1.492", "0.392", "0.556"]),
        ("LingBot-Map", ["7.566", "6.185", "0.684", "0.253", "0.712"]),
        ("MegaSaM", ["3.187", "2.134", "0.082", "0.063", "0.716"]),
        ("MINT w/o stage 2", ["8.752", "8.371", "0.234", "0.229", "0.466"]),
        ("MINT", ["3.120", "2.840", "0.200", "0.191", "0.878"]),
    ]
    highlights = {
        "MegaSaM": {1, 2, 3},
        "MINT": {0, 4},
    }
    row_centers = [345, 407, 470, 532, 593, 655]

    draw.line((125, 498, 1835, 498), fill=(76, 76, 76, 255), width=1)
    draw.rectangle((125, 624, 1835, 688), fill=FOCUS_FILL, outline=HIGHLIGHT, width=2)

    for (method, values), y in zip(rows, row_centers):
        method_color = HIGHLIGHT if method == "MINT" else REGULAR
        draw.text((150, y), method, font=ROW_FONT, fill=method_color, anchor="lm")
        selected = highlights.get(method, set())
        for index, (x, value) in enumerate(zip(columns, values)):
            is_highlighted = index in selected
            draw_centered(
                draw,
                value,
                x,
                y,
                ROW_BOLD_FONT if is_highlighted else ROW_FONT,
                HIGHLIGHT if is_highlighted else REGULAR,
            )

    draw.text(
        (110, 760),
        "RPE-T / RPE-R report mean and median. Arc length ratio is closer to 1.",
        font=FOOTNOTE_FONT,
        fill=(102, 102, 102, 255),
        anchor="lm",
    )
    return image


def draw_detail_mask() -> Image.Image:
    image = empty_layer()
    draw = ImageDraw.Draw(image)
    draw.rectangle((90, 180, 1840, 1046), fill=BACKGROUND)
    return image


def draw_summary_layers() -> tuple[Image.Image, Image.Image, Image.Image]:
    mask = empty_layer()
    hot3d_content = empty_layer()
    arctic_content = empty_layer()
    mask_draw = ImageDraw.Draw(mask)
    hot3d_draw = ImageDraw.Draw(hot3d_content)
    arctic_draw = ImageDraw.Draw(arctic_content)

    updates = [
        (382, "0.945"),
        (456, "0.983"),
        (530, "0.953"),
        (732, "0.918"),
    ]
    for y, value in updates:
        mask_draw.rectangle((1348, y - 8, 1520, y + 56), fill=BACKGROUND)
        selected_draw = hot3d_draw if y < 700 else arctic_draw
        selected_draw.text((1368, y), value, font=SUMMARY_FONT, fill=HIGHLIGHT)
    return mask, hot3d_content, arctic_content


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("/tmp/mint_video_update"),
        help="Directory for the rendered RGBA layers.",
    )
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    summary_mask, summary_hot3d, summary_arctic = draw_summary_layers()
    outputs = {
        "benchmark-detail-mask-v20.png": draw_detail_mask(),
        "benchmark-hand-content-v20.png": draw_hand_content(),
        "benchmark-camera-content-v20.png": draw_camera_content(),
        "benchmark-summary-mask-v20.png": summary_mask,
        "benchmark-summary-hot3d-content-v20.png": summary_hot3d,
        "benchmark-summary-arctic-content-v20.png": summary_arctic,
    }
    for name, image in outputs.items():
        image.save(args.output_dir / name, optimize=True)
        print(args.output_dir / name)


if __name__ == "__main__":
    main()
