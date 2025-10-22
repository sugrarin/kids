#!/usr/bin/env python3
# svg_force_fill_white.py
import argparse
import sys
from pathlib import Path
import xml.etree.ElementTree as ET
import re

STYLE_FILL_RE = re.compile(r"(fill\s*:\s*)([^;}]*)", flags=re.IGNORECASE)

def recolor_svg(path: Path, overwrite: bool) -> bool:
    try:
        ET.register_namespace("", "http://www.w3.org/2000/svg")
        tree = ET.parse(path)
        root = tree.getroot()
        changed = False

        # 1) Проставляем fill="#ffffff" на всех фигурах без fill или с любым fill != none
        for el in root.iter():
            if el.tag.endswith("path") or el.tag.endswith("rect") or el.tag.endswith("circle") \
               or el.tag.endswith("polygon") or el.tag.endswith("ellipse") or el.tag.endswith("g"):
                fill = el.get("fill")
                if fill is None or fill.strip().lower() != "none":
                    el.set("fill", "#ffffff")
                    changed = True

        # 2) Обновляем style="" у элементов
        for el in root.iter():
            style = el.get("style")
            if style:
                new_style = STYLE_FILL_RE.sub(r"\1#ffffff", style)
                if new_style != style:
                    el.set("style", new_style)
                    changed = True

        # 3) Обновляем <style> блоки
        for style_el in root.findall(".//{http://www.w3.org/2000/svg}style"):
            if style_el.text:
                new_text = STYLE_FILL_RE.sub(r"\1#ffffff", style_el.text)
                if new_text != style_el.text:
                    style_el.text = new_text
                    changed = True

        if not changed:
            return False

        out_path = path if overwrite else path.with_name(f"{path.stem}_white{path.suffix}")
        tree.write(out_path, encoding="utf-8", xml_declaration=True)
        return True

    except ET.ParseError:
        print(f"[WARN] Пропущен (невалидный SVG?): {path}", file=sys.stderr)
        return False

def main():
    ap = argparse.ArgumentParser(description="Проставить fill='#ffffff' во все SVG элементы.")
    ap.add_argument("input", help="Файл SVG или каталог с SVG")
    ap.add_argument("--inplace", action="store_true",
                    help="Перезаписывать файлы на месте (по умолчанию создаёт *_white.svg)")
    ap.add_argument("--recursive", "-r", action="store_true",
                    help="Рекурсивный обход подкаталогов (для каталога)")
    args = ap.parse_args()

    p = Path(args.input)
    if not p.exists():
        print("Путь не найден", file=sys.stderr)
        sys.exit(1)

    if p.is_dir():
        pattern = "**/*.svg" if args.recursive else "*.svg"
        files = list(p.glob(pattern))
    else:
        files = [p]

    if not files:
        print("SVG-файлы не найдены")
        sys.exit(0)

    total, changed = 0, 0
    for f in files:
        total += 1
        if recolor_svg(f, overwrite=args.inplace):
            changed += 1

    print(f"Готово: изменено {changed} из {total} файлов.")

if __name__ == "__main__":
    main()
