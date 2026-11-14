"""Synchronize an immutable official HTML/PDF pair, independent of visits."""

import argparse
from datetime import datetime
import hashlib
from html import escape
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import time
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

REPOSITORY = "NitoNetwork/Nito-Whitepaper"
API = f"https://api.github.com/repos/{REPOSITORY}/commits/main"
RAW = f"https://raw.githubusercontent.com/{REPOSITORY}"
TAGS = {"section", "h2", "h3", "h4", "p", "div", "span", "strong", "em", "b", "i",
        "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td", "code", "pre",
        "a", "ul", "ol", "li", "sup", "sub", "br", "hr", "blockquote", "dl", "dt", "dd"}
VOID = {"br", "hr"}
CLASSES = {"chapter", "table-wrap", "sr-only", "formula"}
IDENTIFIER = re.compile(r"[a-zA-Z][a-zA-Z0-9_-]{0,120}\Z")


class PaperParser(HTMLParser):
    """Extract only the official article using a strict semantic allowlist."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.output = []
        self.found = False
        self.done = False
        self.lang = "en"
        self.ids = set()
        self.chapters = []
        self.heading = None
        self.skip_hint = 0
        self.nodes = 0

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "html":
            lang = attrs.get("lang", "en")
            if not re.fullmatch(r"[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{2,8})*", lang):
                raise ValueError("Invalid document language")
            self.lang = lang
        if not self.stack:
            if tag == "div" and "article-body" in attrs.get("class", "").split():
                if self.found:
                    raise ValueError("Multiple source articles")
                self.found = True
                self.stack.append("div")
            return
        self.nodes += 1
        if self.nodes > 20000 or len(self.stack) > 30 or tag not in TAGS:
            raise ValueError("Unsupported or excessive source markup")
        if "table-hint" in attrs.get("class", "").split():
            self.skip_hint = len(self.stack) + 1
        safe = {}
        identity = attrs.get("id")
        if identity:
            if not IDENTIFIER.fullmatch(identity) or identity in self.ids:
                raise ValueError("Invalid or duplicate document id")
            self.ids.add(identity)
            safe["id"] = "wp-" + identity
        classes = [c for c in attrs.get("class", "").split() if c in CLASSES]
        if classes:
            safe["class"] = " ".join(classes)
        if tag == "section" and "chapter" in classes:
            if not identity:
                raise ValueError("Chapter without id")
            self.chapters.append({"id": "wp-" + identity, "title": ""})
        if tag == "h2":
            if not self.chapters or self.heading is not None:
                raise ValueError("Invalid chapter heading")
            self.heading = []
            safe["tabindex"] = "-1"
        if tag == "a":
            href = attrs.get("href", "")
            if href.startswith("#") and IDENTIFIER.fullmatch(href[1:]):
                safe["href"] = "#wp-" + href[1:]
            else:
                parsed = urlsplit(href)
                if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
                    raise ValueError("Unsupported source link")
                safe.update(href=href, target="_blank", rel="noopener noreferrer")
        if attrs.get("role") == "region" and tag == "div":
            safe["role"] = "region"
            safe["tabindex"] = "0"
        if "aria-label" in attrs:
            safe["aria-label"] = attrs["aria-label"][:500]
        if attrs.get("aria-labelledby"):
            refs = attrs["aria-labelledby"].split()
            if not all(IDENTIFIER.fullmatch(ref) for ref in refs):
                raise ValueError("Invalid accessible label")
            safe["aria-labelledby"] = " ".join("wp-" + ref for ref in refs)
        if tag == "th" and attrs.get("scope") in {"col", "row", "colgroup", "rowgroup"}:
            safe["scope"] = attrs["scope"]
        for key in ("colspan", "rowspan"):
            if key in attrs and tag in {"th", "td"}:
                if not attrs[key].isdigit() or not 1 <= int(attrs[key]) <= 30:
                    raise ValueError("Invalid table span")
                safe[key] = attrs[key]
        if not self.skip_hint:
            rendered = "".join(f' {key}="{escape(value, quote=True)}"' for key, value in safe.items())
            self.output.append(f"<{tag}{rendered}>")
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if not self.stack:
            return
        if self.stack[-1] != tag:
            raise ValueError("Malformed article structure")
        if tag == "h2":
            title = " ".join("".join(self.heading or []).split())
            if not title or self.chapters[-1]["title"]:
                raise ValueError("Missing or repeated chapter heading")
            self.chapters[-1]["title"] = title
            self.heading = None
        skipped = bool(self.skip_hint)
        if len(self.stack) == self.skip_hint:
            self.skip_hint = 0
        self.stack.pop()
        if not self.stack:
            self.done = True
        elif not skipped:
            self.output.append(f"</{tag}>")

    def handle_startendtag(self, tag, attributes):
        self.handle_starttag(tag, attributes)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_data(self, data):
        if self.stack and not self.skip_hint:
            self.output.append(escape(data, quote=False))
            if self.heading is not None:
                self.heading.append(data)

    def document(self):
        if not self.done or self.stack or not 1 <= len(self.chapters) <= 200:
            raise ValueError("Missing or incomplete official article")
        if any(not c["title"] for c in self.chapters):
            raise ValueError("Incomplete chapter index")
        html = "".join(self.output)
        if len(html) < 1000:
            raise ValueError("Unexpectedly short whitepaper")
        return {"schema": 1, "language": self.lang, "chapters": self.chapters, "html": html}


def request(url, limit, etag=None):
    headers = {"User-Agent": "NitoSiteWhitepaper/1.0", "Accept": "application/vnd.github+json"}
    if etag:
        headers["If-None-Match"] = etag
    try:
        with urlopen(Request(url, headers=headers), timeout=15) as response:
            raw = response.read(limit + 1)
            if len(raw) > limit:
                raise ValueError("Oversized official response")
            return raw, response.headers.get("ETag"), False
    except HTTPError as error:
        if error.code != 304:
            raise
        error.close()
        return b"", etag, True


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as f:
            temporary = f.name
            json.dump(value, f, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.chmod(temporary, 0o644)
        os.replace(temporary, path)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


def synchronize(root, get=request, now=None):
    now = int(time.time()) if now is None else now
    root = Path(root).resolve()
    public = root / "public"
    public.mkdir(parents=True, exist_ok=True)
    current_file = public / "current.json"
    current = json.loads(current_file.read_text()) if current_file.exists() else None
    if current:
        revision = current.get("revision", "")
        if not re.fullmatch(r"[0-9a-f]{40}", revision):
            raise ValueError("Invalid cached revision")
        if not all((public / revision / name).is_file() for name in ("document.json", "Nito_Whitepaper.pdf")):
            current = None
    private_file = root / "upstream.json"
    private = json.loads(private_file.read_text()) if private_file.exists() else {}
    raw, etag, unchanged = get(API, 2_000_000, private.get("etag") if current else None)
    if unchanged:
        if not current:
            raise ValueError("No cached document for a conditional response")
        current["checkedAt"] = now
        atomic_json(current_file, current)
        return "unchanged"
    commit = json.loads(raw)
    revision = commit.get("sha", "")
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("Invalid official revision")
    published = commit["commit"]["committer"]["date"]
    published_at = int(datetime.fromisoformat(published.replace("Z", "+00:00")).timestamp())
    if published_at > now + 300:
        raise ValueError("Invalid official publication date")
    if current and current["revision"] == revision:
        current["checkedAt"] = now
        atomic_json(current_file, current)
        atomic_json(private_file, {"etag": etag})
        return "unchanged"
    html, _, _ = get(f"{RAW}/{revision}/index.html", 3_000_000)
    pdf, _, _ = get(f"{RAW}/{revision}/Nito_Whitepaper.pdf", 20_000_000)
    if not pdf.startswith(b"%PDF-") or b"%%EOF" not in pdf[-2048:]:
        raise ValueError("Invalid official PDF")
    parser = PaperParser()
    parser.feed(html.decode("utf-8-sig"))
    parser.close()
    document = parser.document()
    document["revision"] = revision
    staging = Path(tempfile.mkdtemp(prefix=".incoming-", dir=root))
    try:
        atomic_json(staging / "document.json", document)
        (staging / "Nito_Whitepaper.pdf").write_bytes(pdf)
        (staging / "Nito_Whitepaper.pdf").chmod(0o644)
        staging.chmod(0o755)
        destination = public / revision
        if destination.exists():
            # Recover a completed pair left before an interrupted manifest switch.
            if destination.is_symlink() or not all(
                (destination / name).is_file() and (destination / name).read_bytes() == (staging / name).read_bytes()
                for name in ("document.json", "Nito_Whitepaper.pdf")
            ):
                raise ValueError("Conflicting immutable revision")
        else:
            staging.rename(destination)
        metadata = {
            "schema": 1, "revision": revision, "publishedAt": published_at,
            "checkedAt": now, "language": parser.lang, "chapterCount": len(parser.chapters),
            "pdfBytes": len(pdf), "pdfSha256": hashlib.sha256(pdf).hexdigest(),
            "htmlSha256": hashlib.sha256(html).hexdigest(),
        }
        atomic_json(current_file, metadata)
        atomic_json(private_file, {"etag": etag})
    finally:
        if staging.exists():
            if staging.resolve().parent != root or not staging.name.startswith(".incoming-"):
                raise ValueError("Unsafe staging cleanup")
            shutil.rmtree(staging)
    # Keep recent immutable copies for existing readers, with a bounded footprint.
    revisions = sorted([p for p in public.iterdir() if re.fullmatch(r"[0-9a-f]{40}", p.name)
                        and p.is_dir() and not p.is_symlink()], key=lambda p: p.stat().st_mtime, reverse=True)
    for old in revisions[3:]:
        if old.name != revision and old.resolve().parent == public.resolve():
            shutil.rmtree(old)
    return "updated"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--state-dir", required=True)
    args = parser.parse_args()
    print(synchronize(args.state_dir))
