import os
import re
import ssl
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser

ROOT_URL = 'https://kuhni-forest.ru'
OUTPUT_DIR = 'downloaded_site/kuhni-forest.ru'

class LinkImageParser(HTMLParser):
    def __init__(self, base_url):
        super().__init__()
        self.base_url = base_url
        self.links = set()
        self.images = set()

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if tag == 'a' and 'href' in attr_dict:
            self._handle_url(attr_dict['href'], self.links)
        elif tag == 'img' and 'src' in attr_dict:
            self._handle_url(attr_dict['src'], self.images)
        elif tag == 'source' and 'src' in attr_dict:
            self._handle_url(attr_dict['src'], self.images)
        elif tag == 'source' and 'srcset' in attr_dict:
            for part in attr_dict['srcset'].split(','):
                self._handle_url(part.strip().split(' ')[0], self.images)

    def _handle_url(self, url, target_set):
        url = url.strip()
        if not url or url.startswith('#'):
            return
        parsed = urllib.parse.urlparse(urllib.parse.urljoin(self.base_url, url))
        if parsed.scheme not in ('http', 'https'):
            return
        normalized = urllib.parse.urlunparse(parsed._replace(fragment=''))
        target_set.add(normalized)


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def local_path_for_url(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.netloc != urllib.parse.urlparse(ROOT_URL).netloc:
        raise ValueError('External URL not supported: %s' % url)
    path = parsed.path
    if path.endswith('/') or path == '':
        path = path + 'index.html'
    if os.path.splitext(path)[1] == '':
        path = path.rstrip('/') + '/index.html'
    path = urllib.parse.unquote(path.lstrip('/'))
    path = re.sub(r'[^A-Za-z0-9._\-/]', '_', path)
    return os.path.join(OUTPUT_DIR, path)


def download_url(url, ssl_context):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(request, context=ssl_context, timeout=30) as response:
        return response.read(), response.getheader('Content-Type', '')


def save_file(path, data, binary=True):
    ensure_dir(os.path.dirname(path))
    mode = 'wb' if binary else 'w'
    with open(path, mode) as f:
        f.write(data)


def is_same_domain(url):
    parsed = urllib.parse.urlparse(url)
    return parsed.netloc == urllib.parse.urlparse(ROOT_URL).netloc


def main():
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    queue = [ROOT_URL]
    visited = set()
    downloaded_images = set()
    page_count = 0

    ensure_dir(OUTPUT_DIR)

    while queue:
        url = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)
        try:
            raw, content_type = download_url(url, ssl_context)
        except Exception as exc:
            print(f'Failed to download {url}: {exc}')
            continue

        if 'text/html' not in content_type and 'application/xhtml+xml' not in content_type:
            print(f'Skipping non-HTML content: {url} ({content_type})')
            continue

        page_path = local_path_for_url(url)
        save_file(page_path, raw, binary=True)
        page_count += 1
        print(f'Saved page: {url} -> {page_path}')

        html = raw.decode('utf-8', errors='ignore')
        parser = LinkImageParser(url)
        parser.feed(html)

        for link in parser.links:
            if is_same_domain(link) and link not in visited and link not in queue:
                queue.append(link)

        for img_url in parser.images:
            if not is_same_domain(img_url):
                continue
            if img_url in downloaded_images:
                continue
            try:
                img_data, img_type = download_url(img_url, ssl_context)
            except Exception as exc:
                print(f'Failed to download image {img_url}: {exc}')
                continue
            img_path = local_path_for_url(img_url)
            save_file(img_path, img_data, binary=True)
            print(f'  Saved image: {img_url} -> {img_path}')
            downloaded_images.add(img_url)

    print('\nDownload complete.')
    print(f'Total pages: {page_count}')
    print(f'Total images: {len(downloaded_images)}')
    print(f'Files saved in: {OUTPUT_DIR}')


if __name__ == '__main__':
    main()
