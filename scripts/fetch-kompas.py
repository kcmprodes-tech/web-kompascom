#!/usr/bin/env python3
"""Snapshot real content from www.kompas.com for the prototype.

    python3 scripts/fetch-kompas.py

Writes
  src/data/kompas-home.json         home sections → article ids + article summaries
  public/data/articles/<id>.json    full article (meta, photo, paragraphs, tags)
  public/assets/kompas/<id>.jpg     article photo (720px wide)
  public/assets/kompas/a-<n>.jpg    kolumnis photos

Needs Pillow. Re-run any time to refresh the snapshot.
"""
import html
import io
import json
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src/data"
ARTICLES = ROOT / "public/data/articles"
IMAGES = ROOT / "public/assets/kompas"
UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
)
WIB = timezone(timedelta(hours=7))
READ_RE = r"https://[a-z0-9.]*kompas\.com/read/\d{4}/\d{2}/\d{2}/(\d+)/[^\"?#]+"

KANAL = {
    "nasional": "News", "regional": "Regional", "megapolitan": "Megapolitan",
    "internasional": "Global", "money": "Money", "tekno": "Tekno", "otomotif": "Otomotif",
    "bola": "Bola", "lifestyle": "Lifestyle", "health": "Health", "edukasi": "Edukasi",
    "travel": "Travel", "properti": "Properti", "sains": "Sains", "biz": "Biz",
    "entertainment": "Hype", "tren": "Tren", "food": "Food", "parapuan": "Parapuan",
}


def get(url):
    out = subprocess.run(["curl", "-fsSL", "-A", UA, url], capture_output=True)
    if out.returncode:
        raise RuntimeError(f"fetch failed: {url}")
    return out.stdout


def text(fragment):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", fragment))).strip()


def kanal_of(url):
    sub = re.match(r"https://([a-z0-9]+)\.kompas\.com", url).group(1)
    return KANAL.get(sub, "Regional" if sub not in ("www", "kolom") else "News")


def published_of(url):
    y, mo, d, ident = re.search(r"/read/(\d{4})/(\d{2})/(\d{2})/(\d+)/", url).groups()
    hh, mm = int(ident[:2]), int(ident[2:4])
    return datetime(int(y), int(mo), int(d), hh, mm, tzinfo=WIB).isoformat()


def original_photo(src):
    """crops/<sig>/<box>/<size>/data/photo/... → full-size data/photo/... URL"""
    m = re.search(r"(data/photo/[^\"'\s)]+?\.(?:jpe?g|png|webp))", src)
    return f"https://asset.kompas.com/{m.group(1)}" if m else src


def save_image(url, dest, width=720):
    if dest.exists():
        return
    im = Image.open(io.BytesIO(get(url))).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(dest, quality=80, optimize=True, progressive=True)


# ---------------------------------------------------------------- home page
def parse_home(page):
    sections = {}
    for m in re.finditer(rf'href="({READ_RE})\?source=([a-z_0-9]+)"', page):
        url, ident, src = m.group(1), m.group(2), m.group(3)
        bucket = sections.setdefault(src, [])
        if all(u != url for u, _ in bucket):
            bucket.append((url, ident))

    trend_block = page[page.index('class="trendWrap'):page.index("articleScrollWrap headline_wp")]
    trending = [text(t) for t in re.findall(r"<a[^>]*>(.*?)</a>", trend_block, re.S)]
    trending = [t for t in trending if t and t.lower() != "trending:"]

    # kolumnis per kolom article
    kolom = []
    for url, ident in sections.get("kolom", []):
        i = page.index(url + "?source=kolom")
        block = page[i : i + 3000]
        name = re.search(r'articlePost-author-box.*?class="text-c2-semibold">(.*?)</div>', block, re.S)
        role = re.search(r'articlePost-author-box.*?class="text-c2-reg[^"]*">(.*?)</div>', block, re.S)
        photo = re.search(r'author-img.*?(?:data-src|src)="([^"]+)"', block, re.S)
        kolom.append({
            "id": ident,
            "author": text(name.group(1)) if name else "",
            "role": text(role.group(1)) if role else "",
            "photo": photo.group(1) if photo else "",
        })

    # topik pilihan: names (wp_topil<n>_index) and the article(s) tracked as "topik pilihan <n>"
    topik = []
    for m in re.finditer(r'href="https://www\.kompas\.com/topik-pilihan/[^"]+source=wp_topil(\d+)_index"[^>]*>(.*?)</a>', page, re.S):
        name, n = text(m.group(2)), m.group(1)
        if name.lower().startswith("lihat topik") or any(t["n"] == n for t in topik):
            continue
        arts = re.findall(rf'href="{READ_RE}\?source=wp_topikpilihan"[^>]*data-event-action="click topik pilihan {n}"', page)
        topik.append({"name": name, "n": n, "ids": list(dict.fromkeys(arts))})

    # read times / relative times shown on the home list (terkini)
    times = {}
    for m in re.finditer(rf'href="{READ_RE}\?source=wp_terkini".*?articlePost-view">(.*?)</div>', page, re.S):
        times[m.group(1)] = text(m.group(2))

    sponsored = None
    m = re.search(r'-sponsor">SPONSORED HEADLINE</div><img src="([^"]+)" alt="([^"]+)"', page)
    if m:
        sponsored = {"title": html.unescape(m.group(2)), "photo": m.group(1)}
    return sections, trending, kolom, topik, times, sponsored


# ---------------------------------------------------------------- article page
def estimate_read_time(blocks):
    """kompas.com only lists "Waktu baca" for some articles: ~200 words a minute"""
    words = sum(len(re.sub(r"<[^>]+>", " ", b.get("html", "")).split()) for b in blocks if b.get("type") == "p")
    return f"Waktu baca {max(1, round(words / 200))} menit"


def parse_article(url):
    page = get(url + "?page=all").decode("utf-8", "ignore")
    title = text(re.search(r"<h1[^>]*>(.*?)</h1>", page, re.S).group(1))
    date = re.search(r'class="read__date">.*?</a>,\s*(.*?)\s*</div>', page, re.S)
    editors = [text(x).rstrip(",") for x in re.findall(r'class="credit-title-nameEditor">(.*?)</div>', page, re.S)]
    photo_re = r'<div[^>]*class="photo"[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)".*?<span class="pb_10 author">(.*?)</span>(.*?)</div>'
    photos = list(re.finditer(photo_re, page, re.S))
    photo = photos[0] if photos else None
    tags = [text(t) for t in re.findall(r'href="https://www\.kompas\.com/tag/[^"]+">(.*?)</a>', page)]

    start = page.index('class="read__content"')
    end = page.find('class="tagsCloud', start)
    body = page[start : end if end > 0 else start + 60000]
    body = re.sub(r"<script.*?</script>", "", body, flags=re.S)
    blocks = []
    for p in re.findall(r"<p>(.*?)</p>", body, re.S):
        plain = text(p)
        if not plain:
            continue
        baca = re.match(r"Baca juga\s*:?\s*(.*)", plain)
        if baca:
            link = re.search(rf'href="({READ_RE})', p)
            blocks.append({"type": "baca", "title": baca.group(1), "url": link.group(1) if link else "",
                           "id": link.group(2) if link else ""})
            continue
        if plain.startswith(("Dapatkan update", "Simak breaking news", "Gabung Kompas.com+")):
            continue
        # keep only bold/italic markup
        clean = re.sub(r"<(?!/?(?:strong|b|em|i)\b)[^>]+>", "", p)
        clean = re.sub(r"\s+", " ", clean).strip()
        blocks.append({"type": "p", "html": clean})

    return {
        "title": title,
        "date": text(date.group(1)) if date else "",
        "editors": editors,
        "photo": {
            "src": photo.group(1) if photo else "",
            "alt": html.unescape(photo.group(2)) if photo else "",
            "credit": text(photo.group(3)) if photo else "",
            "caption": text(photo.group(4)) if photo else "",
        },
        "gallery": [
            {"src": m.group(1), "alt": html.unescape(m.group(2)), "credit": text(m.group(3)), "caption": text(m.group(4))}
            for m in photos[1:4]
        ],
        "blocks": blocks,
        "tags": tags,
    }


def main():
    for d in (DATA, ARTICLES, IMAGES):
        d.mkdir(parents=True, exist_ok=True)

    page = get("https://www.kompas.com/").decode("utf-8", "ignore")
    sections, trending, kolom, topik, times, sponsored = parse_home(page)

    # extra recent articles from the index page so long lists don't repeat much
    indeks = get("https://indeks.kompas.com/?site=all").decode("utf-8", "ignore")
    extra = []
    for m in re.finditer(rf'href="({READ_RE})"', indeks):
        if all(u != m.group(1) for u, _ in extra):
            extra.append((m.group(1), m.group(2)))
    sections["indeks"] = extra

    articles = {}
    for src, items in sections.items():
        for url, ident in items:
            if ident in articles:
                continue
            if datetime.fromisoformat(published_of(url)) < datetime.now(WIB) - timedelta(days=7):
                continue  # evergreen links (awards, about pages) aren't news
            try:
                full = parse_article(url)
            except Exception as err:  # noqa: BLE001 — skip odd pages (video, live, etc.)
                print("skip", url, err, file=sys.stderr)
                continue
            photo_src = full["photo"]["src"] or ""
            if not photo_src:
                continue
            save_image(original_photo(photo_src), IMAGES / f"{ident}.jpg")
            full["photo"]["src"] = f"/assets/kompas/{ident}.jpg"
            for n, g in enumerate(full["gallery"], 1):
                save_image(original_photo(g["src"]), IMAGES / f"{ident}-{n}.jpg", 720)
                g["src"] = f"/assets/kompas/{ident}-{n}.jpg"
            full.update(id=ident, url=url, kanal=kanal_of(url), published=published_of(url),
                        readTime=times.get(ident, "") or estimate_read_time(full["blocks"]))
            (ARTICLES / f"{ident}.json").write_text(json.dumps(full, ensure_ascii=False, indent=1))
            articles[ident] = {k: full[k] for k in ("id", "url", "title", "kanal", "published", "readTime")}
            articles[ident]["img"] = full["photo"]["src"]
            print("ok", ident, full["title"][:60])

    for n, k in enumerate(kolom, 1):
        if k["photo"]:
            save_image(original_photo(k["photo"]) if "data/photo" in k["photo"] else k["photo"], IMAGES / f"a-{n}.jpg", 160)
            k["photo"] = f"/assets/kompas/a-{n}.jpg"

    if sponsored:
        save_image(original_photo(sponsored["photo"]), IMAGES / "sponsored.jpg")
        sponsored["photo"] = "/assets/kompas/sponsored.jpg"

    def ids(src):
        return [i for _, i in sections.get(src, []) if i in articles]

    home = {
        "fetchedAt": datetime.now(WIB).isoformat(timespec="minutes"),
        "trending": trending,
        "sponsoredHeadline": sponsored,
        "headline": ids("headline"),
        "terpopuler": ids("terpopuler"),
        "sorotan": ids("sorotan"),
        "kolom": [k for k in kolom if k["id"] in articles],
        "topik": [{"name": t["name"], "ids": [i for i in t["ids"] if i in articles]} for t in topik],
        "terkini": ids("wp_terkini"),
        "indeks": ids("indeks"),
        "articles": articles,
    }
    (DATA / "kompas-home.json").write_text(json.dumps(home, ensure_ascii=False, indent=1))
    print(f"{len(articles)} articles")


if __name__ == "__main__":
    main()
