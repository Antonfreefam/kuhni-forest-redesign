#!/usr/bin/env python3
"""
Полное зеркалирование изображений с kuhni-forest.ru:
- обход всех HTML-страниц домена (лимит страниц задаётся ниже);
- нормализация http → https;
- повтор при ошибке и чередование схемы для битых URL.
"""

from __future__ import annotations

import os
import re
import ssl
import sys
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse, unquote, urlunparse
from urllib.request import Request, urlopen

BASE = "https://kuhni-forest.ru"
HOST = urlparse(BASE).netloc.lower()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "downloaded_site", "kuhni-forest.ru", "_images_mirror")

IMG_EXTENSIONS = (
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".ico",
    ".bmp",
    ".avif",
)

# Обход всех страниц сайта (увеличьте при необходимости)
MAX_PAGES = 50_000
PAGE_PAUSE = 0.05
DOWNLOAD_WORKERS = 20
DOWNLOAD_RETRIES = 2

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
)

CTX = ssl._create_unverified_context()
PRINT_LOCK = Lock()


def to_https(url: str) -> str:
    """Один хост — одна схема (https), чтобы не дублировать очередь."""
    p = urlparse(url)
    if p.netloc.lower() != HOST:
        return url
    if p.scheme == "https":
        return urlunparse(p)
    return urlunparse(p._replace(scheme="https"))


class LinkExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []
        self.images: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        ad = dict((k, v or "") for k, v in attrs)
        if tag == "a" and ad.get("href"):
            self.links.append(ad["href"])
        if tag in ("img", "source", "image") and ad.get("src"):
            self.images.append(ad["src"])
        if ad.get("srcset"):
            for part in ad["srcset"].split(","):
                u = part.strip().split()[0] if part.strip() else ""
                if u:
                    self.images.append(u)
        if tag == "link" and "stylesheet" in ad.get("rel", "").lower() and ad.get("href"):
            self.links.append(ad["href"])


def same_host(url: str) -> bool:
    try:
        return urlparse(url).netloc.lower() == HOST
    except Exception:
        return False


def normalize_page_url(url: str) -> str | None:
    if not url or url.startswith(("#", "mailto:", "tel:", "javascript:")):
        return None
    abs_u = to_https(urljoin(BASE, url))
    p = urlparse(abs_u)
    if p.netloc.lower() != HOST:
        return None
    pl = (p.path or "").lower()
    skip_ext = (
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
        ".ico",
        ".pdf",
        ".zip",
        ".doc",
        ".docx",
        ".mp4",
        ".webm",
        ".woff",
        ".woff2",
        ".ttf",
        ".eot",
    )
    if pl.endswith(skip_ext):
        return None
    return p._replace(fragment="", scheme="https").geturl()


def normalize_image_url(url: str) -> str:
    u = url.split("#")[0]
    return to_https(urljoin(BASE, u)) if same_host(urljoin(BASE, u)) else u


def looks_like_image_url(url: str) -> bool:
    path = urlparse(url).path.lower()
    return any(path.endswith(ext) for ext in IMG_EXTENSIONS)


def extract_urls_from_css(css_text: str, base_url: str) -> list[str]:
    out: list[str] = []
    for m in re.finditer(r"url\s*\(\s*['\"]?([^'\")\s]+)['\"]?\s*\)", css_text, re.I):
        raw = m.group(1).strip()
        if raw.startswith("data:"):
            continue
        out.append(urljoin(base_url, raw))
    return out


def fetch_bytes(url: str) -> tuple[bytes | None, str | None]:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(req, timeout=60, context=CTX) as resp:
            ct = resp.headers.get_content_type() or ""
            return resp.read(), ct.split(";")[0].strip().lower()
    except (HTTPError, URLError, TimeoutError, OSError, ValueError) as e:
        with PRINT_LOCK:
            print(f"  [skip] {url}: {e}", file=sys.stderr)
        return None, None


def save_file(url: str, data: bytes) -> str:
    p = urlparse(url)
    rel = unquote(p.path).lstrip("/") or "root_asset"
    if rel.endswith("/"):
        rel += "asset"
    safe = os.path.join(OUT_DIR, rel)
    parent = os.path.dirname(safe)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(safe, "wb") as f:
        f.write(data)
    return safe


def alternate_scheme_url(url: str) -> str | None:
    p = urlparse(url)
    if p.netloc.lower() != HOST:
        return None
    if p.scheme == "https":
        return urlunparse(p._replace(scheme="http"))
    if p.scheme == "http":
        return urlunparse(p._replace(scheme="https"))
    return None


def crawl_collect_image_urls() -> tuple[set[str], set[str]]:
    queue: deque[str] = deque([BASE])
    queued: set[str] = {BASE}
    visited_pages: set[str] = set()
    images: set[str] = set()
    css_urls: set[str] = set()

    while queue and len(visited_pages) < MAX_PAGES:
        url = queue.popleft()
        url = to_https(url)
        if url in visited_pages:
            continue
        time.sleep(PAGE_PAUSE)
        data, ctype = fetch_bytes(url)
        if data is None:
            continue
        visited_pages.add(url)

        if (ctype and ctype.startswith("image/")) or looks_like_image_url(url):
            images.add(normalize_image_url(url))
            continue

        text = data.decode("utf-8", errors="replace")

        if ctype == "text/css" or url.lower().split("?")[0].endswith(".css"):
            for u in extract_urls_from_css(text, url):
                u = to_https(u)
                if same_host(u) and looks_like_image_url(u):
                    images.add(normalize_image_url(u))
            continue

        if url.endswith("sitemap.xml") or (ctype and "xml" in ctype):
            for m in re.finditer(r"<loc>\s*([^<\s]+)\s*</loc>", text, re.I):
                loc = to_https(m.group(1).strip())
                if same_host(loc):
                    if looks_like_image_url(loc):
                        images.add(normalize_image_url(loc))
                    elif loc not in queued and loc not in visited_pages:
                        queued.add(loc)
                        queue.append(loc)
            continue

        is_html = (ctype and "html" in ctype) or url.lower().split("?")[0].endswith(
            (".html", ".htm", ".php")
        )
        if not is_html:
            low = text[:1200].lower()
            if "<html" in low or "<!doctype html" in low:
                is_html = True

        if not is_html:
            continue

        parser = LinkExtractor()
        try:
            parser.feed(text)
        except Exception:
            pass

        for href in parser.links:
            nu = to_https(urljoin(url, href))
            if same_host(nu) and looks_like_image_url(nu):
                images.add(normalize_image_url(nu))
                continue
            low = href.lower().split("?")[0]
            if same_host(nu) and low.endswith(".css"):
                css_urls.add(nu.split("#")[0])
                continue
            pu = normalize_page_url(href)
            if pu:
                pu = to_https(pu)
                if pu not in queued and pu not in visited_pages:
                    queued.add(pu)
                    queue.append(pu)

        for src in parser.images:
            nu = to_https(urljoin(url, src))
            if same_host(nu):
                images.add(normalize_image_url(nu))

        # Ленивая загрузка и типичные атрибуты
        for m in re.finditer(
            r'(?:src|data-src|data-srcset|data-lazy-src|data-original|data-image|href)\s*=\s*["\']([^"\']+)["\']',
            text,
            re.I,
        ):
            cand = m.group(1).strip()
            if cand.startswith("data:"):
                continue
            nu = to_https(urljoin(url, cand))
            if same_host(nu):
                if looks_like_image_url(nu):
                    images.add(normalize_image_url(nu))
                elif " " in cand or "," in cand:
                    for piece in re.split(r"[,\s]+", cand):
                        if piece.startswith("http") or piece.startswith("/") or piece.startswith("."):
                            nu2 = to_https(urljoin(url, piece.strip()))
                            if same_host(nu2) and looks_like_image_url(nu2):
                                images.add(normalize_image_url(nu2))

        for m in re.finditer(r"url\s*\(\s*['\"]?([^'\")\s]+)['\"]?\s*\)", text, re.I):
            raw = m.group(1).strip()
            if raw.startswith("data:"):
                continue
            nu = to_https(urljoin(url, raw))
            if same_host(nu) and looks_like_image_url(nu):
                images.add(normalize_image_url(nu))

    return images, css_urls


def enrich_images_from_css(css_urls: set[str], images: set[str]) -> None:
    for css_u in css_urls:
        css_u = to_https(css_u)
        time.sleep(PAGE_PAUSE)
        data, _ctype = fetch_bytes(css_u)
        if not data:
            continue
        text = data.decode("utf-8", errors="replace")
        for u in extract_urls_from_css(text, css_u):
            u = to_https(u)
            if same_host(u) and looks_like_image_url(u):
                images.add(normalize_image_url(u))


def download_one(url: str) -> tuple[str, bool, str]:
    last_err = ""
    for attempt in range(DOWNLOAD_RETRIES + 1):
        cur = url
        if attempt > 0:
            alt = alternate_scheme_url(url)
            if alt:
                cur = alt
        data, ctype = fetch_bytes(cur)
        if data:
            try:
                path = save_file(cur, data)
                return cur, True, path
            except OSError as e:
                last_err = str(e)
                break
        time.sleep(0.3 * attempt)
    return url, False, last_err


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    print(
        f"Фаза 1: обход до {MAX_PAGES} страниц, сбор URL изображений…",
        file=sys.stderr,
    )
    images, css_urls = crawl_collect_image_urls()
    print(
        f"  собрано URL картинок: {len(images)}, CSS: {len(css_urls)}",
        file=sys.stderr,
    )

    enrich_images_from_css(css_urls, images)
    print(f"  после разбора CSS: {len(images)} уникальных изображений", file=sys.stderr)

    print(f"Фаза 2: загрузка ({DOWNLOAD_WORKERS} потоков, повторы по http/https)…", file=sys.stderr)
    ok = 0
    fail = 0
    failed_urls: list[str] = []

    with ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS) as ex:
        futs = {ex.submit(download_one, u): u for u in sorted(images)}
        for fut in as_completed(futs):
            url, success, _info = fut.result()
            if success:
                ok += 1
                if ok % 50 == 0:
                    print(f"  … загружено {ok}", file=sys.stderr)
            else:
                fail += 1
                failed_urls.append(url)

    if failed_urls:
        fail_path = os.path.join(OUT_DIR, "_failed_urls.txt")
        with open(fail_path, "w", encoding="utf-8") as f:
            f.write("\n".join(sorted(failed_urls)))
        print(f"  список недоступных URL: {fail_path}", file=sys.stderr)

    print(f"\nГотово: успешно {ok}, не удалось {fail}", file=sys.stderr)
    print(f"Каталог: {OUT_DIR}", file=sys.stderr)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
