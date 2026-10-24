#!/usr/bin/env python3
"""Pull portfolio media referenced in the Jayanth S Notion page and emit scripts/data.js.

Usage: python3 tools/fetch_media.py   (run from the website root)
"""

import html
import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NOTION_HOST = "https://catnip-lobe-1e8.notion.site"
PAGE_ID = "35424224-e70b-8051-899c-f4d1752977c6"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"
MAX_BITRATE = 2_200_000

POSTERS = {
    "winter-sale": ("Winter Clearance", "Treevenii · Indian fashion"),
    "clearance-sale": ("Sunday Clearance, Upto 70%", "Treevenii · Indian fashion"),
    "frame-31": ("The Sale Edit", "Stylfort · Apparel campaign"),
    "frame-116": ("Vacation Mood", "Stylfort · Editorial collage"),
    "frame-144": ("Dear World, a Postcard", "Stylfort · Editorial layout"),
    "linked-post-1": ("Battery Low?", "EVORA · Social creative"),
    "linked-post-3": ("EVORA vs Others", "EVORA · Comparison post"),
    "linked-post-5": ("Fuel Your EV", "EVORA · Pricing launch"),
    "linked-post-6": ("412% Growth", "EVORA · Impact metric"),
    "linked-post": ("Call EVORA", "EVORA · Brand awareness"),
    "motheerday": ("Happy Mother's Day", "Stylfort · Festive offer"),
    "new-year": ("Happy 2026", "EVORA · Festive greeting"),
    "qr-code": ("Scan & Follow", "Treevenii · Growth creative"),
    "red-co-odset": ("Rosé Radiance Co-ord", "Stylfort · Product creative"),
    "sunday-offer": ("Sunday Sale", "Treevenii · Weekend offer"),
}


# Curated display titles; keyed by tweet id or reel shortcode.
TITLES = {
    "2097001967734366288": "Airbnb for AI Energy",
    "2028870988386214191": "The Standard for EV Charging",
    "2048665954318536792": "Demand Drives Capital",
    "2039737847545209042": "Unreliable Grids Are the Past",
    "2041073620399669543": "Touchdown Malaysia",
    "2040473345574256774": "The First Mobile DePIN Layer",
    "2034238449268699136": "Charge the Evora Way",
    "2047337199171973293": "Chargers That Ghost You",
    "2044436235918479717": "Frontier Hackathon Lock-in",
    "2041387996784783537": "Charge Charge Charge",
    "2090514450139009270": "Rise With It. Just Float.",
    "DXohvUUxB9z": "Discover the New Ways",
    "DXWoYpXCg2B": "The Struggle Is Real",
    "DXPECPLk7lR": "Founder Rapid Fire",
    "DWk8z4FCp3x": "Call. Charge. Go.",
    "DWbslnSkn5g": "Don't Panic, Call Evora",
    "DVnQqw2E8EY": "Comment \u201cEvora\u201d",
    "DVEddyIkhQh": "Book in Seconds",
    "DUFPYXAkt81": "Evora \u00d7 Optimotion",
    "DT5Mmw0EnBE": "Hey Hyderabad",
    "DZPqCv0qTkA": "One Charge at a Time",
    "DXO3shUDH28": "Paradise Wellness",
    "DVsZ6OREZn3": "Super Bikes. Super Vibe.",
    "DU4zjtVkaaF": "Luxury in Every Detail",
    "DUqGJfXkd_n": "Wrapped in Intention",
    "DUglWi_E_kG": "A Night of Gratitude",
    "DS731LpgeRs": "Welcoming 2026",
    "DRwxJjiEXyM": "Friday Pizza Day",
    "DQ4GXl2kbWC": "Flavours of India",
    "DP3lblTkS00": "Diwali, the Cara Way",
    "DPWWhrtkaQY": "A Pop of Elegance",
    "DNgGfRyB16X": "Desi Girl Fantasy",
    "DXrb_nsDA-B": "HYROX Days",
    "DZKcnMjMk3_": "Vision to Value",
    "DYzT0c_uhQH": "Crispy. Spicy. Tangy.",
    "DWlErzTERb_": "The PS5 Price Hike",
    "DXE3-oRkZ0P": "Gamers Pick Favourites",
    "DPTEAKeEYCK": "Day 1/69: Fantastic Games",
    "DPeILJFEZH1": "GTA 6 Is Coming",
    "DSsWHyugbjo": "A Christmas Surprise",
    "DY-A-1kqRPy": "Xbox's Right Moves",
    "DYKFnTvR_9J": "NVIDIA GFN Launch Night",
}

# Animated / motion-graphics pieces; also listed under "Video Editing".
MOTION = {
    "2097001967734366288", "2028870988386214191", "2048665954318536792",
    "2039737847545209042", "2040473345574256774", "2090514450139009270",
    "DXohvUUxB9z", "DWk8z4FCp3x", "DUFPYXAkt81", "DZPqCv0qTkA",
}

# Posted by partner accounts, but the work was done for these clients.
CLIENTS = {
    "Priya": "Priya \u00b7 Creator",
    "Cara": "Priya \u00b7 Creator",
    "R3spawn Here": "R3spawn \u00b7 Gaming",
    "Evora": "EVORA",
    "Superteam Malaysia": "EVORA",
}


def tags(key, base):
    return [base, "editing"] if key in MOTION and base != "editing" else [base]


def get(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers={"user-agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def download(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return True
    try:
        dest.write_bytes(get(url))
        return True
    except Exception as exc:  # noqa: BLE001 - best effort per asset
        print(f"  ! {dest.name}: {exc}", file=sys.stderr)
        return False


def aspect(path):
    out = subprocess.run(["identify", "-format", "%w %h", f"{path}[0]"], capture_output=True, text=True, check=False)
    w, h = out.stdout.split()
    return f"{w} / {h}"


def optimise(path, size):
    subprocess.run(
        ["convert", str(path), "-strip", "-resize", f"{size}x{size}>", "-quality", "80", str(path)],
        check=False,
    )


def load_notion_blocks():
    body = json.dumps({
        "page": {"id": PAGE_ID}, "limit": 200, "cursor": {"stack": []},
        "chunkNumber": 0, "verticalColumns": False,
    }).encode()
    raw = get(f"{NOTION_HOST}/api/v3/loadCachedPageChunk", body, {"content-type": "application/json"})
    blocks = json.loads(raw)["recordMap"]["block"]
    page = blocks[PAGE_ID]["value"]
    page = page.get("value", page)
    ordered = []
    for bid in page.get("content", []):
        ordered.append(bid)
    # Notion returns nested blocks too; keep page order for top-level, append the rest.
    ordered += [k for k in blocks if k not in ordered]
    for bid in ordered:
        v = blocks.get(bid, {}).get("value", {})
        yield v.get("value", v)


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", Path(name).stem.lower()).strip("-")


def fetch_notion_images():
    """Logos -> images/brand, references -> images/references, everything else -> posters (+ thumbs)."""
    for b in load_notion_blocks():
        if b.get("type") != "image":
            continue
        props = b["properties"]
        title = props["title"][0][0]
        src = props["source"][0][0]
        url = (f"{NOTION_HOST}/image/{urllib.parse.quote(src, safe='')}"
               f"?table=block&id={b['id']}&spaceId={b.get('space_id', '')}&width=2000&cache=v2")
        name, low = slug(title), title.lower()
        if "logo" in low or "brand" in low:
            download(url, ROOT / "assets/images/brand" / f"{name}.png")
            continue
        folder = "references" if "reference" in low else "posters"
        full = ROOT / "assets/images" / folder / f"{name}.jpg"
        if full.exists():
            continue
        raw = full.with_suffix(".src")
        if not download(url, raw):
            continue
        flatten = ["-background", "#000", "-flatten"]
        subprocess.run(["convert", str(raw), "-strip", "-resize", "1800x1800>", "-quality", "84", *flatten, str(full)], check=False)
        if folder == "posters":
            thumb = ROOT / "assets/images/posters/thumbs" / f"{name}.jpg"
            thumb.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["convert", str(raw), "-strip", "-resize", "700x700>", "-quality", "78", *flatten, str(thumb)], check=False)
        raw.unlink()


def collect_links():
    x_links, ig_links, owner = [], [], None
    for b in load_notion_blocks():
        props = b.get("properties", {})
        title = props.get("title")
        if b.get("type") == "text" and title:
            text = "".join(seg[0] for seg in title).strip().rstrip(":")
            if text and len(text) < 20:
                owner = text
        blob = json.dumps(props)
        for m in re.finditer(r"https://x\.com/(\w+)/status/(\d+)", blob):
            if m.group(2) not in [x["id"] for x in x_links]:
                x_links.append({"user": m.group(1), "id": m.group(2)})
        for seg in title or []:
            for fmt in seg[1] if len(seg) > 1 else []:
                if fmt[0] == "lm" and "instagram.com/reel/" in fmt[1].get("href", ""):
                    code = re.search(r"/reel/([\w-]+)", fmt[1]["href"]).group(1)
                    ig_links.append({"code": code, "title": fmt[1].get("title", ""), "owner": owner})
    return x_links, ig_links


def fetch_x(item):
    url = f"https://cdn.syndication.twimg.com/tweet-result?id={item['id']}&token=4c2mmul6mnh&lang=en"
    try:
        d = json.loads(get(url))
    except Exception as exc:  # noqa: BLE001
        print(f"  ! tweet {item['id']}: {exc}", file=sys.stderr)
        return None
    media = (d.get("mediaDetails") or d.get("quoted_tweet", {}).get("mediaDetails") or [{}])[0]
    variants = [v for v in media.get("video_info", {}).get("variants", []) if v.get("content_type") == "video/mp4"]
    if not variants:
        return None
    best = max((v for v in variants if v.get("bitrate", 0) <= MAX_BITRATE), key=lambda v: v["bitrate"], default=variants[0])
    w, h = map(int, re.search(r"/(\d+)x(\d+)/", best["url"]).groups())
    stem = f"x-{item['id']}"
    video = ROOT / "assets/videos" / f"{stem}.mp4"
    thumb = ROOT / "assets/images/thumbs" / f"{stem}.jpg"
    if not (download(best["url"], video) and download(media["media_url_https"] + "?name=medium", thumb)):
        return None
    optimise(thumb, 900)
    text = re.sub(r"https://t\.co/\S+", "", html.unescape(d.get("text", ""))).strip()
    user = d.get("user", {})
    return {
        "id": stem,
        "kind": "video",
        "tags": tags(item["id"], "editing"),
        "title": TITLES.get(item["id"]) or text.split("\n")[0][:60] or "Untitled cut",
        "client": CLIENTS.get(user.get("name"), user.get("name", item["user"])),
        "orientation": "portrait" if h > w else "landscape",
        "ar": f"{w} / {h}",
        "thumb": f"assets/images/thumbs/{stem}.jpg",
        "src": f"assets/videos/{stem}.mp4",
        "link": f"https://x.com/{item['user']}/status/{item['id']}",
    }


def fetch_ig(item):
    stem = f"ig-{item['code']}"
    thumb = ROOT / "assets/images/thumbs" / f"{stem}.jpg"
    if not thumb.exists():
        # Instagram only serves Open Graph tags to link-preview crawlers.
        req = urllib.request.Request(
            f"https://www.instagram.com/reel/{item['code']}/",
            headers={"user-agent": "facebookexternalhit/1.1"},
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            page = r.read().decode("utf-8", "ignore")
        cover = re.search(r'<meta property="og:image" content="([^"]+)"', page)
        if not cover:
            print(f"  ! reel {item['code']}: no cover", file=sys.stderr)
            return None
        if not download(html.unescape(cover.group(1)), thumb):
            return None
        # Instagram covers are letterboxed; trim the black bars.
        subprocess.run(["convert", str(thumb), "-fuzz", "6%", "-trim", "+repage", str(thumb)], check=False)
        optimise(thumb, 720)
    raw = re.sub(r"^.*? on Instagram:\s*", "", item["title"]).strip(' "“”')
    title = re.split(r"[.!?\n#@{]|\s{2,}", raw)[0].strip() or "Reel"
    client = re.match(r"^(.*?) on Instagram", item["title"])
    client = client.group(1).split("|")[0].strip() if client else (item["owner"] or "Instagram")
    return {
        "id": stem,
        "kind": "reel",
        "tags": tags(item["code"], "shorts"),
        "title": TITLES.get(item["code"]) or title[:60],
        "client": CLIENTS.get(client, client),
        "orientation": "portrait",
        "ar": aspect(thumb),
        "thumb": f"assets/images/thumbs/{stem}.jpg",
        "embed": f"https://www.instagram.com/reel/{item['code']}/embed/",
        "link": f"https://www.instagram.com/reel/{item['code']}/",
    }


def posters():
    out = []
    for stem, (title, client) in POSTERS.items():
        if (ROOT / f"assets/images/posters/{stem}.jpg").exists():
            out.append({
                "id": f"poster-{stem}",
                "kind": "poster",
                "tags": ["posters"],
                "title": title,
                "client": client,
                "ar": aspect(ROOT / f"assets/images/posters/thumbs/{stem}.jpg"),
                "thumb": f"assets/images/posters/thumbs/{stem}.jpg",
                "src": f"assets/images/posters/{stem}.jpg",
            })
    return out


def main():
    fetch_notion_images()
    x_links, ig_links = collect_links()
    print(f"Found {len(x_links)} X posts and {len(ig_links)} Instagram reels")
    works = []
    for item in x_links:
        print("x", item["id"])
        if (w := fetch_x(item)):
            works.append(w)
    for item in ig_links:
        print("ig", item["code"])
        try:
            if (w := fetch_ig(item)):
                works.append(w)
        except Exception as exc:  # noqa: BLE001
            print(f"  ! reel {item['code']}: {exc}", file=sys.stderr)
    works += posters()
    out = ROOT / "scripts/data.js"
    out.write_text("/* Generated by tools/fetch_media.py */\nwindow.TL_WORKS = " + json.dumps(works, indent=2, ensure_ascii=False) + ";\n")
    print(f"Wrote {len(works)} works to {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
