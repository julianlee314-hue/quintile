#!/usr/bin/env python3
"""Serve Quintile (live map mirror) with SPA fallback for client routes.

Usage:
  python3 serve.py          # http://127.0.0.1:8000
  python3 serve.py 8080
"""
from __future__ import annotations

import mimetypes
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

SPA_PREFIXES = (
    "/drill",
    "/foundations",
    "/progress",
    "/syllabus",
    "/track/",
    "/strand/",
)

SPA_EXACT = {
    "/foundations",
    "/progress",
    "/syllabus",
    "/drill",
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if path == "/":
            return super().do_GET()

        candidate = (ROOT / path.lstrip("/")).resolve()
        try:
            candidate.relative_to(ROOT)
        except ValueError:
            self.send_error(403)
            return

        if candidate.is_file():
            return super().do_GET()
        if candidate.is_dir() and (candidate / "index.html").is_file():
            return super().do_GET()

        if path in SPA_EXACT or path.startswith(SPA_PREFIXES):
            self.path = "/index.html"
            return super().do_GET()

        return super().do_GET()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    mimetypes.add_type("application/javascript", ".js")
    mimetypes.add_type("application/manifest+json", ".webmanifest")
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Quintile (map) at http://127.0.0.1:{PORT}/  (Ctrl+C to stop)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")
