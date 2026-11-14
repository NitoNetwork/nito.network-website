import importlib.util
import ast
import json
from pathlib import Path
import tempfile
import unittest
import re

spec = importlib.util.spec_from_file_location("whitepaper", Path(__file__).parents[1] / "scripts/sync-whitepaper.py")
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)
REVISION = "a" * 40
PDF = b"%PDF-1.7\nTest official document\n%%EOF\n"
ARTICLE = '<html lang="en"><script>outside()</script><div class="article-body"><section class="chapter" id="overview" aria-labelledby="overview-title"><h2 id="overview-title">Overview</h2><p>' + "Official text &amp; protocol. " * 80 + '</p><div class="table-hint">Website instructions</div><p><a href="https://example.org/">Source</a><a href="#overview">Overview</a><br/></p></section></div></html>'


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        self.revision = REVISION
        self.html = ARTICLE.encode()
        self.pdf = PDF
        self.calls = []

    def upstream(self, url, limit, etag=None):
        self.calls.append((url, etag))
        if url == sync.API:
            raw = json.dumps({"sha": self.revision, "commit": {"committer": {"date": "2026-01-01T00:00:00Z"}}}).encode()
            return raw, '"etag"', False
        return (self.html if url.endswith("index.html") else self.pdf), None, False

    def publish(self):
        return sync.synchronize(self.root, self.upstream, 1794700000)

    def current(self):
        return json.loads((self.root / "public/current.json").read_text())

    def test_consistent_immutable_pair_and_sanitization(self):
        self.assertEqual(self.publish(), "updated")
        current = self.current()
        document = json.loads((self.root / "public" / REVISION / "document.json").read_text())
        self.assertEqual(current["revision"], document["revision"])
        self.assertEqual((self.root / "public" / REVISION / "Nito_Whitepaper.pdf").read_bytes(), PDF)
        self.assertNotIn("outside()", document["html"])
        self.assertNotIn("Website instructions", document["html"])
        self.assertIn('aria-labelledby="wp-overview-title"', document["html"])
        self.assertIn('rel="noopener noreferrer"', document["html"])
        self.assertIn('href="#wp-overview"', document["html"])
        self.assertEqual(document["chapters"], [{"id": "wp-overview", "title": "Overview"}])
        self.assertEqual(len(self.calls), 3)

    def test_unchanged_revision_skips_document_downloads(self):
        self.publish()
        self.calls.clear()
        self.assertEqual(self.publish(), "unchanged")
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(self.calls[0][1], '"etag"')

    def test_not_modified_only_updates_check_time(self):
        self.publish()
        def conditional(url, limit, etag=None):
            self.assertEqual(url, sync.API)
            self.assertEqual(etag, '"etag"')
            return b"", etag, True
        self.assertEqual(sync.synchronize(self.root, conditional, 1794700100), "unchanged")
        self.assertEqual(self.current()["checkedAt"], 1794700100)

    def test_invalid_pdf_or_markup_preserves_last_good(self):
        self.publish()
        before = self.current()
        self.revision = "b" * 40
        for content in [ARTICLE.replace("<p>", "<script>", 1), ARTICLE.replace('href="https://example.org/"', 'href="javascript:alert(1)"'), ARTICLE.replace("</section>", ""), ARTICLE.replace('id="overview-title"', 'id="overview"')]:
            self.html = content.encode()
            with self.assertRaises(ValueError):
                self.publish()
            self.assertEqual(before, self.current())
        self.html = ARTICLE.encode()
        self.pdf = b"bad pdf"
        with self.assertRaises(ValueError):
            self.publish()
        self.assertEqual(before, self.current())

    def test_network_failure_preserves_last_good(self):
        self.publish()
        before = self.current()
        def fail(*args):
            raise TimeoutError("offline")
        with self.assertRaises(TimeoutError):
            sync.synchronize(self.root, fail)
        self.assertEqual(before, self.current())

    def test_recovery_after_interrupted_manifest_switch(self):
        self.publish()
        (self.root / "public/current.json").unlink()
        self.assertEqual(self.publish(), "updated")
        self.assertEqual(self.current()["revision"], REVISION)

    def test_retention_is_bounded_and_keeps_current(self):
        for character in "abcde":
            self.revision = character * 40
            self.publish()
        versions = [p for p in (self.root / "public").iterdir() if p.is_dir()]
        self.assertEqual(len(versions), 3)
        self.assertTrue((self.root / "public" / ("e" * 40)).is_dir())

    def test_never_accepts_path_traversal_revision(self):
        self.revision = "../private"
        with self.assertRaises(ValueError):
            self.publish()
        self.assertFalse((self.root / "public/current.json").exists())


class VhostTests(unittest.TestCase):
    def setUp(self):
        source = Path(__file__).parents[1] / "deploy/install-whitepaper.py"
        tree = ast.parse(source.read_text())
        nodes = [node for node in tree.body if
                 isinstance(node, ast.FunctionDef) and node.name == "configure_vhost" or
                 isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "LOCATION" for t in node.targets)]
        namespace = {"re": re}
        exec(compile(ast.Module(body=nodes, type_ignores=[]), str(source), "exec"), namespace)
        self.configure = namespace["configure_vhost"]
        self.original = ('server {\n    server_name nito.network www.nito.network;\n    access_log off;\n    error_log /dev/null crit;\n}\n'
                         'server {\n    server_name nito.network www.nito.network;\n    access_log off;\n    error_log /dev/null crit;\n'
                         '    location / {\n        try_files $uri $uri/ =404;\n    }\n}\n')

    def test_vhost_patch_is_scoped_idempotent_and_preserves_privacy(self):
        updated = self.configure(self.original)
        self.assertEqual(self.configure(updated), updated)
        self.assertEqual(updated.count('location = /whitepaper-data/current.json'), 1)
        self.assertEqual(updated.count('error_log /dev/null crit;'), 2)
        self.assertIn('expires 60s;', updated)
        self.assertIn('autoindex off;', updated)

    def test_refuses_another_site_or_missing_privacy(self):
        for source in [self.original.replace('nito.network www.nito.network', 'other.example'), self.original.replace('access_log off;', 'access_log /var/log/access.log;')]:
            with self.assertRaises(RuntimeError):
                self.configure(source)


if __name__ == "__main__":
    unittest.main()
