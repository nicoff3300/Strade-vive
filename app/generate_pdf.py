#!/usr/bin/env python3
"""BP LAB 2026 — PDF Generator v2. Reads admin-save.json (or drinks.json) and renders grid-based pages matching the admin panel."""

import json
import os
import sys
import xml.etree.ElementTree as ET
from urllib.parse import quote as url_quote

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
DATA_JSON = os.path.join(BASE_DIR, "data", "drinks.json")
STATE_JSON = os.path.join(BASE_DIR, "admin-save.json")

# --- Fallback defaults ---
DF_PAGE_W = 148
DF_PAGE_H = 185
DF_BLEED = 3
DF_PALETTE = {"bgDeep": "#0b0d17", "bgDark": "#121420", "gold": "#F2CD77", "teal": "#7BBEBC", "text": "#e0e0e0", "muted": "#a0a0a0", "extra": []}
DF_TYPO = {"h1": 28, "h2": 18, "h3": 14, "body": 10, "caption": 8}
DF_LAYOUT = {"padTop": 20, "padRight": 20, "padBottom": 20, "padLeft": 20, "blockGap": 4, "lineHeight": 1.6}

# --- Load Data ---

def load_data():
    if not os.path.exists(DATA_JSON):
        print(f"ERROR: drinks.json not found at {DATA_JSON}", file=sys.stderr)
        sys.exit(1)
    with open(DATA_JSON, "r", encoding="utf-8") as f:
        return json.load(f)

def load_state():
    if not os.path.exists(STATE_JSON):
        return {}
    with open(STATE_JSON, "r", encoding="utf-8") as f:
        return json.load(f)

# --- Helpers ---

def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

def font_face_css():
    return """@font-face{font-family:'Tuaf';src:url('fonts/TuafTrial-Bold.otf') format('opentype');font-weight:700;font-style:normal;}
@font-face{font-family:'Tuaf';src:url('fonts/TuafTrial-BoldIt.otf') format('opentype');font-weight:700;font-style:italic;}
@font-face{font-family:'ABC Camera';src:url('fonts/ABCCameraPlain-Regular-Trial.otf') format('opentype');font-weight:400;font-style:normal;}
@font-face{font-family:'ABC Camera';src:url('fonts/ABCCameraPlain-Bold-Trial.otf') format('opentype');font-weight:700;font-style:normal;}"""

def get_palette_colors(st):
    p = st.get("palette", DF_PALETTE)
    colors = [p.get("bgDeep", "#0b0d17"), p.get("bgDark", "#121420"), p.get("gold", "#F2CD77"), p.get("teal", "#7BBEBC"), p.get("text", "#e0e0e0"), p.get("muted", "#a0a0a0")]
    for c in p.get("extra", []):
        colors.append(c)
    return colors

# --- Radar Chart SVG ---

def radar_svg(drink, palette):
    taste = drink.get("taste", {})
    labels = {"sweet": "S", "acid": "A", "bitter": "B", "labFactor": "F"}
    keys = ["sweet", "acid", "bitter", "labFactor"]
    values = [taste.get(k, 0) or 0 for k in keys]
    size = 200
    cx = cy = size // 2
    r = size // 2 - 30
    rings = 5
    r_step = r / rings
    gold = palette.get("gold", "#F2CD77")
    teal = palette.get("teal", "#7BBEBC")
    muted = palette.get("muted", "#a0a0a0")

    svg = ET.Element("svg", {"xmlns": "http://www.w3.org/2000/svg", "viewBox": f"0 0 {size} {size}", "width": str(size), "height": str(size)})

    def pt(angle_deg, radius):
        import math
        rad = math.radians(angle_deg - 90)
        return (cx + radius * math.cos(rad), cy + radius * math.sin(rad))

    for ring in range(1, rings + 1):
        rn = r_step * ring
        points = [f"{pt(i*90, rn)[0]:.1f},{pt(i*90, rn)[1]:.1f}" for i in range(4)]
        ET.SubElement(svg, "polygon", {"points": " ".join(points), "fill": "none", "stroke": muted, "stroke-opacity": str(0.2 + ring * 0.05), "stroke-width": "1"})

    for i in range(4):
        x2, y2 = pt(i * 90, r)
        ET.SubElement(svg, "line", {"x1": str(cx), "y1": str(cy), "x2": f"{x2:.1f}", "y2": f"{y2:.1f}", "stroke": muted, "stroke-opacity": "0.4", "stroke-width": "1"})
        lx, ly = pt(i * 90, r + 14)
        anchor = "middle"
        if i == 1: anchor = "start"
        if i == 3: anchor = "end"
        txt = ET.SubElement(svg, "text", {"x": f"{lx:.1f}", "y": f"{ly:.1f}", "fill": gold, "font-size": "13", "font-family": "Tuaf, sans-serif", "font-weight": "bold", "text-anchor": anchor, "dominant-baseline": "middle"})
        txt.text = labels[keys[i]]

    if any(v is not None for v in values):
        data_points = [f"{pt(i*90, (v/rings)*r)[0]:.1f},{pt(i*90, (v/rings)*r)[1]:.1f}" for i, v in enumerate(values)]
        ET.SubElement(svg, "polygon", {"points": " ".join(data_points), "fill": teal, "fill-opacity": "0.3", "stroke": teal, "stroke-width": "2", "stroke-linejoin": "round"})
        for dp in data_points:
            x, y = dp.split(",")
            ET.SubElement(svg, "circle", {"cx": x, "cy": y, "r": "3", "fill": teal, "stroke": "#fff", "stroke-width": "1.5"})

    return ET.tostring(svg, encoding="unicode")

# --- Block Rendering (Grid System) ---

def resolve_typo(block, t):
    level = block.get("level")
    s = block.get("style", {})
    if level and t:
        presets = {
            "h1": {"font": "Tuaf", "size": t.get("h1", 28), "weight": "bold", "transform": "uppercase", "ls": 2, "lh": 1.2},
            "h2": {"font": "Tuaf", "size": t.get("h2", 18), "weight": "bold", "transform": "uppercase", "ls": 2, "lh": 1.2},
            "h3": {"font": "ABC Camera", "size": t.get("h3", 14), "weight": "normal", "transform": "uppercase", "ls": 1, "lh": 1.4},
            "body": {"font": "ABC Camera", "size": t.get("body", 10), "weight": "normal", "transform": "none", "ls": 0, "lh": 1.6},
            "caption": {"font": "ABC Camera", "size": t.get("caption", 8), "weight": "normal", "transform": "none", "ls": 0, "lh": 1.4},
        }
        pre = presets.get(level, presets["body"])
        ff = "Tuaf, sans-serif" if pre["font"] == "Tuaf" else "'ABC Camera', sans-serif"
        return ff, pre["size"], pre["weight"], pre["transform"], pre["ls"], pre["lh"]
    ff = "Tuaf, sans-serif" if "Tuaf" in s.get("font", "") else "'ABC Camera', sans-serif"
    return ff, s.get("size", 12), s.get("weight", "normal"), s.get("transform", "none"), s.get("letterSpacing", 0), s.get("lineH", 1.4)

def render_block(block, t, p):
    """Renders a single grid block as inline HTML <div>."""
    btype = block.get("type", "text")
    s = block.get("style", {})
    valign = s.get("valign", "center")
    halign = s.get("align", "left")
    va_map = {"top": "flex-start", "center": "center", "bottom": "flex-end", "stretch": "stretch"}
    ha_map = {"left": "flex-start", "center": "center", "right": "flex-end"}
    av = va_map.get(valign, "center")
    hv = ha_map.get(halign, "flex-start")

    ff, sz, wt, tr, ls, lh = resolve_typo(block, t)
    color = s.get("color", p.get("text", "#e0e0e0"))

    style = f"display:flex;align-items:{av};justify-content:{hv};flex:1;overflow:visible;font-family:{ff};font-size:{sz}pt;font-weight:{wt};color:{color};text-align:{halign};line-height:{lh};"
    if tr and tr != "none": style += f"text-transform:{tr};"
    if ls: style += f"letter-spacing:{ls}px;"

    content = ""
    if btype == "chart":
        from io import StringIO
        data = block.get("chartData", {})
        if data:
            import math as _m
            content = radar_svg({"taste": data, "hasChart": True}, p).replace('"', "&quot;")
    elif btype == "image":
        url = block.get("imageUrl", "")
        if url:
            content = f'<img src="{esc(url)}" style="width:100%;height:100%;object-fit:contain;" alt="">'
        else:
            content = '<div style="color:#a0a0a0;border:1px dashed #333;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:9px;">Immagine</div>'
    else:
        content = esc(block.get("content", "")).replace("\n", "<br>")

    inner = f'<span style="display:block;width:100%;white-space:pre-wrap;word-break:break-word;">{content}</span>'
    return f'<div style="{style}">{inner}</div>'

def render_page(page, state_data, drinks_data):
    """Renders a single page using grid+blocks or fallback legacy renderer."""
    p = state_data.get("palette", DF_PALETTE)
    t = state_data.get("typography", DF_TYPO)
    lay = state_data.get("layout", DF_LAYOUT)
    prt = state_data.get("print", {"pageW": DF_PAGE_W, "pageH": DF_PAGE_H, "bleed": DF_BLEED})
    pw = prt.get("pageW", DF_PAGE_W)
    ph = prt.get("pageH", DF_PAGE_H)
    bleed = prt.get("bleed", DF_BLEED)
    pad_t = lay.get("padTop", 20)
    pad_r = lay.get("padRight", 20)
    pad_b = lay.get("padBottom", 20)
    pad_l = lay.get("padLeft", 20)
    lh = lay.get("lineHeight", 1.6)
    bg_color = page.get("bgColorOverride") or p.get("bgDark", "#121420")
    bg_id = page.get("backgroundId")
    bgs = state_data.get("backgrounds", {})

    # Bleed layer
    bleed_px = f"{bleed}mm"
    bleed_bg = f'<div style="position:absolute;top:-{bleed_px};left:-{bleed_px};width:calc(100% + {2*bleed}mm);height:calc(100% + {2*bleed}mm);background-color:{bg_color};z-index:-1;"></div>'
    if bg_id and bgs.get(bg_id):
        bleed_bg += f'<div style="position:absolute;top:-{bleed_px};left:-{bleed_px};width:calc(100% + {2*bleed}mm);height:calc(100% + {2*bleed}mm);z-index:0;pointer-events:none;overflow:hidden;">{bgs[bg_id].get("svg","")}</div>'

    grid = page.get("grid")
    blocks = page.get("blocks", [])

    base_style = (
        f"width:{pw}mm;height:{ph}mm;position:relative;overflow:hidden;"
        f"color:{p.get('text','#e0e0e0')};"
        f"padding:{pad_t}mm {pad_r}mm {pad_b}mm {pad_l}mm;"
        f"display:flex;flex-direction:column;"
        f"font-family:'ABC Camera',sans-serif;line-height:{lh};"
    )

    if grid and blocks:
        rows_html = ""
        for ri, row in enumerate(grid.get("rows", [])):
            cols = row.get("cols", 1)
            gap = row.get("gap", 4)
            row_flex = "flex:1;" if ri == len(grid["rows"]) - 1 else "flex:0 0 auto;"
            row_style = f"display:flex;gap:{gap}mm;{row_flex}"

            # Fill column slots
            slots = [None] * cols
            for blk in blocks:
                if blk.get("gridRow") == ri + 1:
                    ci = blk.get("colIndex", 1) - 1
                    if 0 <= ci < cols:
                        slots[ci] = blk

            cols_html = ""
            for si in range(cols):
                blk = slots[si]
                slot_style = "flex:1;min-width:0;display:flex;flex-direction:column;"
                if blk is None:
                    cols_html += f'<div style="{slot_style}min-height:1px;"></div>'
                else:
                    cols_html += f'<div style="{slot_style}">{render_block(blk, t, p)}</div>'

            rows_html += f'<div style="{row_style}">{cols_html}</div>'

        grid_style = f"display:flex;flex-direction:column;gap:{grid.get('rowGap',4)}mm;width:100%;flex:1;position:relative;z-index:1;"
        content = f'<div style="{grid_style}">{rows_html}</div>'
    else:
        # Legacy fallback — use page type
        content = render_legacy_page(page.get("type", "blank"), state_data, drinks_data)

    return (
        f'<div class="preview-page" style="{base_style}">'
        f'{bleed_bg}'
        f'{content}'
        f'</div>'
    )

def render_legacy_page(ptype, state_data, drinks_data):
    """Fallback legacy renderer for pages without grid/blocks."""
    p = state_data.get("palette", DF_PALETTE)
    t = state_data.get("typography", DF_TYPO)
    data = drinks_data or {}

    gold = p.get("gold", "#F2CD77")
    teal = p.get("teal", "#7BBEBC")
    text_c = p.get("text", "#e0e0e0")
    muted = p.get("muted", "#a0a0a0")
    h1 = t.get("h1", 28)
    h2 = t.get("h2", 18)
    h3 = t.get("h3", 14)
    body = t.get("body", 10)
    cap = t.get("caption", 8)

    if ptype == "cover":
        return (
            f'<div style="font-family:Tuaf,sans-serif;text-transform:uppercase;letter-spacing:4px;font-size:{h1}pt;color:{gold};margin-bottom:10px;">{esc(data.get("title",""))}</div>'
            f'<div style="font-family:ABC Camera,sans-serif;font-size:{h2}pt;letter-spacing:5px;color:{muted}">{esc(data.get("subtitle",""))}</div>'
        )
    if ptype == "prefazione":
        paras = data.get("prefazione", [])
        out = []
        for i, para in enumerate(paras):
            p2 = esc(para)
            if i == 0:
                out.append(f'<div style="font-family:Tuaf,sans-serif;text-transform:uppercase;letter-spacing:2px;font-size:{h2}pt;color:{gold}">{p2}</div>')
            elif para.startswith('"'):
                out.append(f'<div style="font-style:italic;color:{text_c};margin:1.5em 0;font-size:{h3}pt;line-height:1.8;text-align:center;max-width:80%;margin-left:auto;margin-right:auto;">{p2}</div>')
            elif para.startswith("\u2014"):
                out.append(f'<div style="text-align:right;font-size:{body}pt;color:{muted};margin-top:5px;">{p2}</div>')
            else:
                out.append(f'<p style="margin:0.5em 0;">{p2}</p>')
        return f'<div style="width:100%">{"".join(out)}</div>'
    if ptype == "list":
        return f'<div style="font-size:{body}pt;color:{text_c}">Lista — usa la griglia per modificare</div>'
    if ptype == "vermouth":
        return f'<div style="font-size:{body}pt;color:{text_c}">Vermouth — usa la griglia per modificare</div>'
    if ptype in ("colophon", "back-cover", "drink-right"):
        return f'<div style="font-size:{body}pt;color:{muted}">{ptype}</div>'
    return f'<div style="font-size:{body}pt;color:{text_c}">Pagina vuota</div>'

# --- Legacy Full Build (no admin-save.json) ---

def build_legacy_html(drinks_data, prt):
    """Generates full 24-page menu HTML from drinks.json only (no admin state)."""
    data = drinks_data
    pw = prt.get("pageW", DF_PAGE_W)
    ph = prt.get("pageH", DF_PAGE_H)
    bleed = prt.get("bleed", DF_BLEED)
    p = DF_PALETTE
    t = DF_TYPO
    lay = DF_LAYOUT
    bleed_px = f"{bleed}mm"
    pad_t = lay.get("padTop", 20)
    pad_r = lay.get("padRight", 20)
    pad_b = lay.get("padBottom", 20)
    pad_l = lay.get("padLeft", 20)
    lh = lay.get("lineHeight", 1.6)
    bg_color = p.get("bgDark", "#121420")
    gold = p.get("gold", "#F2CD77")
    teal = p.get("teal", "#7BBEBC")
    text_c = p.get("text", "#e0e0e0")
    muted = p.get("muted", "#a0a0a0")
    h1 = t.get("h1", 28)
    h2 = t.get("h2", 18)
    h3 = t.get("h3", 14)
    body = t.get("body", 10)
    cap = t.get("caption", 8)

    bleed_bg = f'<div style="position:absolute;top:-{bleed_px};left:-{bleed_px};width:calc(100% + {2*bleed}mm);height:calc(100% + {2*bleed}mm);background-color:{bg_color};z-index:-1;"></div>'

    def wrap(content, align="center", extra=""):
        return (
            f'<div class="preview-page" style="width:{pw}mm;height:{ph}mm;position:relative;overflow:hidden;color:{text_c};padding:{pad_t}mm {pad_r}mm {pad_b}mm {pad_l}mm;display:flex;flex-direction:column;justify-content:{align};align-items:{align};text-align:{"center" if align=="center" else "left"};font-family:ABC Camera,sans-serif;line-height:{lh};{extra}">'
            f'{bleed_bg}'
            f'{content}'
            f'</div>'
        )

    pages = []

    # 1. Cover
    pages.append(wrap(
        f'<div style="font-family:Tuaf,sans-serif;text-transform:uppercase;letter-spacing:4px;font-size:{h1}pt;color:{gold};margin-bottom:10px;">{esc(data.get("title",""))}</div>'
        f'<div style="font-size:{h2}pt;letter-spacing:5px;color:{muted}">{esc(data.get("subtitle",""))}</div>'
    ))

    # 2. Prefazione
    prefa = data.get("prefazione", [])
    prefa_html = []
    for i, para in enumerate(prefa):
        ptxt = esc(para)
        if i == 0:
            prefa_html.append(f'<div style="font-family:Tuaf,sans-serif;text-transform:uppercase;letter-spacing:2px;font-size:{h2}pt;color:{gold}">{ptxt}</div>')
        elif para.startswith('"'):
            prefa_html.append(f'<div style="font-style:italic;color:{text_c};margin:1.5em 0;font-size:{h3}pt;line-height:1.8;text-align:center;max-width:80%;margin-left:auto;margin-right:auto;">{ptxt}</div>')
        elif para.startswith("\u2014"):
            prefa_html.append(f'<div style="text-align:right;font-size:{body}pt;color:{muted};margin-top:5px;">{ptxt}</div>')
        else:
            prefa_html.append(f'<p style="margin:0.5em 0;">{ptxt}</p>')
    pages.append(wrap(f'<div style="width:100%">{"".join(prefa_html)}</div>', "flex-start"))

    # 3-18: Signature drinks (8 pairs)
    sigs = [d for d in data.get("drinks", []) if d.get("category") == "Signature"]
    for drink in sigs[:8]:
        chart = radar_svg(drink, DF_PALETTE)
        ing = "".join(f'<li style="margin-bottom:4px;padding-left:15px;position:relative;font-size:{body}pt;text-transform:uppercase;"><span style="position:absolute;left:0;color:{gold};">&#8226;</span>{esc(ingr)}</li>' for ingr in drink.get("ingredients", []))
        pages.append(wrap(
            f'<div style="font-family:Tuaf,sans-serif;text-transform:uppercase;letter-spacing:2px;font-size:{h1}pt;line-height:1.2;color:{gold};">{esc(drink.get("name",""))}</div>'
            f'<div style="font-size:{h3}pt;text-transform:uppercase;color:{teal};letter-spacing:1px;font-style:italic;margin-top:8px;">{esc(drink.get("profile",""))}</div>'
            f'<ul style="list-style:none;padding:0;margin:20px 0;">{ing}</ul>'
            f'<div style="margin-top:10px;">{chart}</div>',
            "flex-start"
        ))
        pages.append(wrap(
            f'<div style="font-size:{h2}pt;color:{gold}">[Immagine: {esc(drink.get("name",""))}]</div>',
            extra="background-color:" + p.get("bgDeep", "#0b0d17") + ";"
        ))

    # 19-21: List pages
    def make_list(title, items):
        items_html = "".join(
            f'<div style="border-bottom:1px solid {gold}33;padding-bottom:10px;margin-bottom:10px;">'
            f'<div style="display:flex;justify-content:space-between;align-items:baseline;">'
            f'<span style="font-family:Tuaf,sans-serif;font-size:{h3}pt;color:{gold};">{esc(d.get("name",""))}</span>'
            f'<span style="font-size:{body}pt;color:{teal};text-transform:uppercase;">{esc(d.get("profile",""))}</span>'
            f'</div>'
            f'<div style="font-size:{cap}pt;color:{muted};margin-top:5px;">{esc(", ".join(d.get("ingredients",[])))}</div>'
            f'</div>'
            for d in items
        )
        return wrap(
            f'<div style="font-family:Tuaf,sans-serif;text-transform:uppercase;letter-spacing:2px;font-size:{h2}pt;color:{gold};margin-bottom:20px;">{esc(title)}</div>'
            f'<div style="width:100%">{items_html}</div>',
            "flex-start"
        )

    intramontabili = [d for d in data.get("drinks", []) if "INTRAMONTABILI" in d.get("category", "").upper()]
    after_dinner = [d for d in data.get("drinks", []) if "AFTER" in d.get("category", "").upper()]
    alc_free = [d for d in data.get("drinks", []) if d.get("category") == "Alcohol Free"]

    pages.append(make_list("Le Nostre Proposte Intramontabili", intramontabili))
    pages.append(make_list("After Dinner", after_dinner))
    pages.append(make_list("Analcolici", alc_free))

    # 22. Vermouth
    ve = data.get("vermouth_experience", {"vermouth": [], "bitter": [], "spezie": []})
    vermouth_html = (
        f'<div style="font-family:Tuaf,sans-serif;text-transform:uppercase;letter-spacing:2px;font-size:{h2}pt;color:{gold};text-align:center;margin-bottom:20px;">The Spiritual Machine</div>'
        f'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:100%;">'
        f'<div style="text-align:center;"><div style="font-family:Tuaf,sans-serif;font-size:{body}pt;color:{gold};border-bottom:1px solid {gold}33;padding-bottom:5px;margin-bottom:8px;text-transform:uppercase;letter-spacing:2px;">Vermouth</div><ul style="list-style:none;padding:0;font-size:{cap}pt;color:{text_c};">{"".join(f"<li>{esc(v)}</li>" for v in ve["vermouth"])}</ul></div>'
        f'<div style="text-align:center;"><div style="font-family:Tuaf,sans-serif;font-size:{body}pt;color:{gold};border-bottom:1px solid {gold}33;padding-bottom:5px;margin-bottom:8px;text-transform:uppercase;letter-spacing:2px;">Bitter</div><ul style="list-style:none;padding:0;font-size:{cap}pt;color:{text_c};">{"".join(f"<li>{esc(b)}</li>" for b in ve["bitter"])}</ul></div>'
        f'<div style="text-align:center;"><div style="font-family:Tuaf,sans-serif;font-size:{body}pt;color:{gold};border-bottom:1px solid {gold}33;padding-bottom:5px;margin-bottom:8px;text-transform:uppercase;letter-spacing:2px;">Spezie</div><ul style="list-style:none;padding:0;font-size:{cap}pt;color:{text_c};">{"".join(f"<li>{esc(s)}</li>" for s in ve["spezie"])}</ul></div>'
        f'</div>'
    )
    pages.append(wrap(vermouth_html, "flex-start"))

    # 23. Colophon
    pages.append(wrap(
        f'<div style="font-family:Tuaf,sans-serif;text-transform:uppercase;letter-spacing:2px;font-size:{h2}pt;color:{gold};text-align:center;">BP LAB 2026</div>'
        f'<div style="font-size:9pt;color:{muted};margin-top:20px;text-align:center;">&copy; 2026 BP LAB. All rights reserved.<br>Design: Visual Studio / Sisyphus</div>'
    ))

    # 24. Back cover
    pages.append(wrap(
        f'<div style="font-size:{h2}pt;color:{gold}">[Back Cover]</div>',
        extra="background-color:" + p.get("bgDeep", "#0b0d17") + ";"
    ))

    return (
        "<!DOCTYPE html>\n"
        '<html lang="it">\n'
        "<head>\n"
        '<meta charset="UTF-8">\n'
        f"<title>BP LAB 2026</title>\n"
        "<style>\n"
        f"{font_face_css()}\n"
        f"*{{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;}}\n"
        f"@page{{size:{pw}mm {ph}mm;margin:0;}}\n"
        "@media print{{\n"
        "  body{{background:none;padding:0;display:block;}}\n"
        "}}\n"
        "body{{display:flex;flex-direction:column;align-items:center;padding:12px 0;background:#0b0d17;}}\n"
        ".preview-page{{box-shadow:0 0 20px rgba(0,0,0,0.3);margin-bottom:8px;}}\n"
        "</style>\n"
        "</head>\n"
        "<body>\n"
        + "".join(pages) +
        "\n</body>\n"
        "</html>"
    )

# --- Main Build ---

def build_html(state_data, drinks_data):
    if not state_data:
        # No saved state — generate full 24-page layout from drinks.json only
        return build_legacy_html(drinks_data, {"pageW": DF_PAGE_W, "pageH": DF_PAGE_H, "bleed": DF_BLEED})

    page_order = state_data.get("pageOrder") or [str(i) for i in range(1, 25)]
    pages_dict = state_data.get("pages", {})
    prt = state_data.get("print", {"pageW": DF_PAGE_W, "pageH": DF_PAGE_H, "bleed": DF_BLEED})
    pw = prt.get("pageW", DF_PAGE_W)
    ph = prt.get("pageH", DF_PAGE_H)
    bleed = prt.get("bleed", DF_BLEED)

    html_pages = []
    for pid in page_order:
        page = pages_dict.get(str(pid)) or pages_dict.get(pid)
        if page is None:
            continue
        html_pages.append(render_page(page, state_data, drinks_data))

    return (
        "<!DOCTYPE html>\n"
        '<html lang="it">\n'
        "<head>\n"
        '<meta charset="UTF-8">\n'
        f"<title>BP LAB 2026</title>\n"
        "<style>\n"
        f"{font_face_css()}\n"
        f"*{{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;}}\n"
        f"@page{{size:{pw}mm {ph}mm;margin:0;}}\n"
        "@media print{{\n"
        "  body{{background:none;padding:0;display:block;}}\n"
        "}}\n"
        "body{{display:flex;flex-direction:column;align-items:center;padding:12px 0;background:#0b0d17;}}\n"
        ".preview-page{{box-shadow:0 0 20px rgba(0,0,0,0.3);margin-bottom:8px;}}\n"
        "</style>\n"
        "</head>\n"
        "<body>\n"
        + "".join(html_pages) +
        "\n</body>\n"
        "</html>"
    )

def main():
    data = load_data()
    state_data = load_state()
    if not state_data:
        print("WARNING: admin-save.json not found. Generating legacy layout from drinks.json only.", file=sys.stderr)

    html = build_html(state_data, data)
    html_path = os.path.join(BASE_DIR, "menu-print.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"HTML written: {html_path}")

    try:
        from weasyprint import HTML
        pw = state_data.get("print", {}).get("pageW", DF_PAGE_W) if state_data else DF_PAGE_W
        ph = state_data.get("print", {}).get("pageH", DF_PAGE_H) if state_data else DF_PAGE_H
        pdf_name = f"BP_LAB_2026_{pw}x{ph}.pdf"
        pdf_path = os.path.join(ROOT_DIR, pdf_name)
        HTML(filename=html_path).write_pdf(pdf_path)
        print(f"PDF generated: {pdf_path}")
    except ImportError:
        print("WARNING: WeasyPrint not installed. Install with: pip install weasyprint")
        print("Then re-run to generate PDF.")

if __name__ == "__main__":
    main()
