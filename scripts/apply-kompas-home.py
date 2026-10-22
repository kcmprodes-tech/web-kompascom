#!/usr/bin/env python3
"""Fill the home page's article cards with the kompas.com snapshot.

    python3 scripts/fetch-kompas.py        # refresh the snapshot (optional)
    python3 scripts/apply-kompas-home.py   # rewrite index.html cards

Rebuilds every article card in index.html (headline, grids, Terpopuler, News
Update, Kolom, Topik pilihan, the long lists, Banyak dikomentari, Berita
Foto) from src/data/kompas-home.json. Safe to re-run. Sponsored items,
ads, video/stories widgets and Komentar Terbaru are left as they are.
"""
import html
import json
import re
from datetime import datetime
from itertools import cycle
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
data = json.loads((ROOT / "src/data/kompas-home.json").read_text())
A = data["articles"]
fetched = datetime.fromisoformat(data["fetchedAt"])


def esc(s):
    return html.escape(s, quote=True)


def href(a):
    return f"./article-detail.html?id={a['id']}"


def ago(a):
    mins = max(1, int((fetched - datetime.fromisoformat(a["published"])).total_seconds() // 60))
    if mins < 60:
        return f"{mins} menit lalu"
    if mins < 60 * 24:
        return f"{mins // 60} jam lalu"
    return f"{mins // 1440} hari lalu"


def time_span(a):
    return f'<span data-time="{a["published"]}">{ago(a)}</span>'


# ---- article order: dedicated sections first, then a shared pool for feeds
used = set()


def take(ids):
    out = [A[i] for i in ids if i in A]
    used.update(a["id"] for a in out)
    return out


headline = take(data["headline"])
terpopuler = take(data["terpopuler"])
sorotan = take(data["sorotan"])
kolom = [(k, A[k["id"]]) for k in data["kolom"]]
used.update(k["id"] for k in data["kolom"])
topik = [(t["name"], A[t["ids"][0]]) for t in data["topik"] if t["ids"]]
used.update(a["id"] for _, a in topik)
pool_ids = list(dict.fromkeys(data["terkini"] + data["indeks"]))
pool = cycle([A[i] for i in pool_ids if i not in used] or list(A.values()))


def nxt(n):
    return [next(pool) for _ in range(n)]


s = INDEX.read_text()


def replace_each(pattern, builder, region=None, flags=re.S):
    """Replace successive matches of `pattern` (optionally only inside the
    first match of `region`) with builder(index, match, indent)."""
    global s
    lo, hi = 0, len(s)
    if region:
        m = re.search(region, s, re.S)
        lo, hi = m.start(), m.end()
    chunk = s[lo:hi]
    count = 0

    def sub(m):
        nonlocal count
        line_start = chunk.rfind("\n", 0, m.start()) + 1
        indent = chunk[line_start : m.start()]
        out = builder(count, m, indent)
        count += 1
        return m.group(0) if out is None else out

    s = s[:lo] + re.sub(pattern, sub, chunk, flags=flags) + s[hi:]
    return count


def block(indent, lines):
    return ("\n" + indent).join(lines)


# ---- Trending
def trend(i, m, ind):
    if i >= len(data["trending"]):
        return ""
    return f'<a class="tr__item" href="#">{esc(data["trending"][i])}</a>'


replace_each(r'<a class="tr__item" href="#">[^<]*</a>', trend)
s = re.sub(r'\n\s*(?=\n\s*</div>\s*<button class="tr__more")', "", s)  # drop blank lines left behind
extra = data["trending"][s.count('class="tr__item"'):]
if extra:
    last = s.rfind('<a class="tr__item"', 0, s.index('class="tr__more"'))
    end = s.index("</a>", last) + 4
    ind = s[s.rfind("\n", 0, last) + 1 : last]
    s = s[:end] + "".join(f'\n{ind}<a class="tr__item" href="#">{esc(t)}</a>' for t in extra) + s[end:]


# ---- Headline carousel: headline, sponsored headline, headline
sp = data.get("sponsoredHeadline")
slides = [("Headline", "", headline[0])]
if sp:
    slides.append(("Sponsored Headline", " hl-badge--sponsored", {"title": sp["title"], "img": sp["photo"], "id": None}))
slides.append(("Headline", "", headline[1]))


def hl(i, m, ind):
    if i >= len(slides):
        return None
    label, mod, a = slides[i]
    dots = re.search(r'<span class="hl-dots">.*?</span>', m.group(0), re.S).group(0)
    link = f'<a class="hl-card__link" href="{href(a)}" aria-label="{esc(a["title"])}"></a>' if a["id"] else ""
    return block(ind, [
        '<article class="hl-card">',
        '  <div class="hl-card__media">',
        f'    <img src="{a["img"]}" alt="" />',
        f'    <span class="hl-badge{mod}">{label}</span>',
        f"    {dots}",
        "  </div>",
        '  <div class="hl-card__body">',
        f"    <h3>{esc(a['title'])}</h3>",
        "  </div>",
        *([f"  {link}"] if link else []),
        "</article>",
    ])


replace_each(r'<article class="hl-card">.*?</article>', hl)


# ---- 2-column grids (first one under the headline, then Sorotan)
def ng_builder(items):
    def build(i, m, ind):
        a = items[i]
        return block(ind, [
            f'<a class="ng-card" href="{href(a)}">',
            f'  <span class="ng-card__thumb"><img src="{a["img"]}" alt="" loading="lazy" /></span>',
            f'  <h3 class="ng-card__title">{esc(a["title"])}</h3>',
            f'  <span class="ng-card__kanal">{a["kanal"]}</span>',
            "</a>",
        ])
    return build


replace_each(r'<a class="ng-card".*?</a>', ng_builder(headline[2:] + nxt(6)), region=r'<section class="ng">.*?</section>')
replace_each(r'<a class="ng-card".*?</a>', ng_builder(sorotan + nxt(6)), region=r'<section class="sorotan">.*?</section>')


# ---- Terpopuler (sponsored slot stays)
tp_items = terpopuler + nxt(5)


def tp(i, m, ind):
    if "tp-rank--spon" in m.group(0):
        return None
    rank = int(re.search(r'<span class="tp-rank">(\d+)</span>', m.group(0)).group(1))
    a = tp_items[rank - 1]
    return block(ind, [
        f'<a class="tp-item" href="{href(a)}">',
        '  <span class="tp-item__thumb">',
        f'    <img src="{a["img"]}" alt="" loading="lazy" />',
        f'    <span class="tp-rank">{rank}</span>',
        "  </span>",
        '  <span class="tp-item__text">',
        f'    <span class="tp-item__title">{esc(a["title"])}</span>',
        f'    <span class="tp-item__kanal">{a["kanal"]}</span>',
        "  </span>",
        "</a>",
    ])


replace_each(r'<a class="tp-item".*?</a>', tp)


# ---- News Update rail
nu_items = nxt(6)


def nu(i, m, ind):
    a = nu_items[i]
    return block(ind, [
        f'<a class="nu-card" href="{href(a)}">',
        f'  <img class="nu-card__img" src="{a["img"]}" alt="" loading="lazy" />',
        f'  <span class="nu-card__title">{esc(a["title"])}</span>',
        f'  <span class="meta"><span>{a["kanal"]}</span>{time_span(a)}</span>',
        "</a>",
    ])


replace_each(r'<a class="nu-card".*?</a>', nu, region=r'<section class="nu">.*?</section>')


# ---- Kolom
def kol(i, m, ind):
    if i >= len(kolom):
        return ""
    k, a = kolom[i]
    return block(ind, [
        f'<a class="kol-card" href="{href(a)}">',
        f'  <img class="kol-card__img" src="{a["img"]}" alt="" loading="lazy" />',
        f'  <span class="kol-card__title">{esc(a["title"])}</span>',
        '  <span class="kol-card__author">',
        f'    <img src="{k["photo"]}" alt="" />',
        f'    <span><b>{esc(k["author"])}</b><i>{esc(k["role"])}</i></span>',
        "  </span>",
        "</a>",
    ])


replace_each(r'<a class="kol-card".*?</a>', kol)


# ---- Topik pilihan sections
def topik_sec(i, m, ind):
    if i >= len(topik):
        return None
    name, a = topik[i]
    sec = m.group(0)
    sec = re.sub(r'(<h2 class="topik__title">).*?(</h2>)', rf"\g<1>{esc(name)}\g<2>", sec)
    card = block(ind + "  ", [
        f'<a class="topik__card" href="{href(a)}">',
        f'  <img class="topik__img" src="{a["img"]}" alt="" loading="lazy" />',
        f'  <span class="topik__art">{esc(a["title"])}</span>',
        f'  <span class="topik__meta"><span>{a["kanal"]}</span>{time_span(a)}</span>',
        "</a>",
    ])
    return re.sub(r'<a class="topik__card".*?</a>', lambda _: card, sec, flags=re.S)


replace_each(r'<section class="topik[^"]*">.*?</section>', topik_sec)


# ---- List cards (Rekomendasi + every following news list), Selesaikan, Banyak dikomentari, Berita Foto
def lcard(i, m, ind):
    a = next(pool)
    meta = [f"<span>{ago(a)}</span>".replace("<span>", f'<span data-time="{a["published"]}">', 1)]
    if a.get("readTime"):
        meta.append(f"<span>{esc(a['readTime'])}</span>")
    return block(ind, [
        f'<a class="lcard" href="{href(a)}">',
        f'  <img class="lcard__img" src="{a["img"]}" alt="" loading="lazy" />',
        '  <span class="lcard__body">',
        f'    <span class="lcard__kanal">{a["kanal"]}</span>',
        f'    <strong class="lcard__title">{esc(a["title"])}</strong>',
        f'    <span class="lcard__meta">{"".join(meta)}</span>',
        "  </span>",
        "</a>",
    ])


replace_each(r'<a class="lcard".*?</a>', lcard)


def sb(i, m, ind):
    a = next(pool)
    return block(ind, [
        f'<a class="nu-card" href="{href(a)}">',
        f'  <img class="nu-card__img" src="{a["img"]}" alt="" loading="lazy" />',
        f'  <span class="nu-card__title">{esc(a["title"])}</span>',
        f'  <span class="sb__kanal">{a["kanal"]}</span>',
        "</a>",
    ])


replace_each(r'<a class="nu-card".*?</a>', sb, region=r'<section class="sb">.*?</section>')


def kom(i, m, ind):
    a = next(pool)
    count = re.search(r'<span class="kom-card__count">.*?</span></span>', m.group(0), re.S).group(0)
    return block(ind, [
        f'<a class="kom-card" href="{href(a)}">',
        f'  <img class="kom-card__img" src="{a["img"]}" alt="" loading="lazy" />',
        f'  <span class="kom-card__title">{esc(a["title"])}</span>',
        f'  <span class="kom-card__kanal">{a["kanal"]}</span>',
        f"  {count}",
        "</a>",
    ])


replace_each(r'<a class="kom-card".*?</a>', kom)


def foto(i, m, ind):
    a = next(pool)
    count = re.search(r'<span class="foto-card__count">.*?</span>', m.group(0), re.S).group(0)
    return block(ind, [
        f'<a class="foto-card" href="{href(a)}">',
        '  <span class="foto-card__media">',
        f'    <img class="foto-card__img" src="{a["img"]}" alt="" loading="lazy" />',
        f"    {count}",
        "  </span>",
        f'  <span class="foto-card__title">{esc(a["title"])}</span>',
        f'  <span class="foto-card__kanal">{a["kanal"]}</span>',
        "</a>",
    ])


replace_each(r'<a class="foto-card".*?</a>', foto)

INDEX.write_text(s)
print("index.html updated from snapshot", data["fetchedAt"])
