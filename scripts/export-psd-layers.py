#!/usr/bin/env python3
"""Export the objects of a layered PSD as separate transparent images for the
K+ landing page's per-object scroll animation.

    pip3 install --user psd-tools
    python3 scripts/export-psd-layers.py ~/Documents/KGMedia_New/kompascom+/signature_rev3.psd

Each object (a set of PSD layers/groups) is composited on its own, cropped to
its bounds, scaled for a 324px-wide art box at 3x and written to
public/assets/kplus/one/<object>.webp. The printed left/top/width percentages
go into the matching <img> in kompasplus.html.
"""
import sys
import warnings
from pathlib import Path

from psd_tools import PSDImage
from PIL import Image

warnings.filterwarnings("ignore")

OUT = Path(__file__).resolve().parent.parent / "public/assets/kplus/one"
ART_WIDTH_3X = 972  # 324px art box × 3

# object → PSD layer/group names that make it up (signature_rev3.psd)
OBJECTS = {
    "paper-left": ["Screenshot 2025-08-04 at 10.55.09", "Layer 10"],
    "paper-right": ["Screenshot 2025-08-04 at 10.53.50", "Layer 11"],
    "phone": ["SMARTPHONE-BACK", "Shadow", "Reflections"],
    "ring": ["Ellipse ", "Layer 2"],
    "dots-right": ["Vector Smart Object (Double Click To Edit)"],
    "dots-left": ["Vector Smart Object (Double Click To Edit) copy"],
    "chip-kontan": ["Layer 12 copy 2", "Logo_Berita_Kontan"],
    "chip-kompasid": ["Layer 12 copy", "LOGO-KOMPAS-BARU-e1710480183922"],
    "chip-kompascom": ["Layer 12", "logo-kompascom_light"],
}


def main(path):
    psd = PSDImage.open(path)
    width, height = psd.size
    scale = ART_WIDTH_3X / width
    by_name = {}
    for layer in psd.descendants():
        by_name.setdefault(layer.name, []).append(layer)

    OUT.mkdir(parents=True, exist_ok=True)
    for obj, names in OBJECTS.items():
        ids = set()
        for name in names:
            for layer in by_name[name]:
                ids.add(id(layer))
                if layer.is_group():
                    ids.update(id(d) for d in layer.descendants())

        def keep(layer, ids=ids):
            inside = id(layer) in ids or (layer.is_group() and any(id(d) in ids for d in layer.descendants()))
            return inside and layer.is_visible()

        img = psd.composite(layer_filter=keep, ignore_preview=True).convert("RGBA")
        x0, y0, x1, y1 = img.getchannel("A").getbbox()
        crop = img.crop((x0, y0, x1, y1))
        crop = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.LANCZOS)
        crop.save(OUT / f"{obj}.webp", quality=84, method=6)
        print(f"{obj}: left:{x0 / width * 100:.3f}%;top:{y0 / height * 100:.3f}%;width:{(x1 - x0) / width * 100:.3f}%")


if __name__ == "__main__":
    main(sys.argv[1])
