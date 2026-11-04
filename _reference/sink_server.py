#!/usr/bin/env python3
"""Tiny local collector: browser page POSTs reference assets here and they land on disk."""
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "downloaded")


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        name = self.headers.get("X-Filename", "payload.bin")
        name = re.sub(r"[^A-Za-z0-9._-]", "_", name)
        os.makedirs(OUT, exist_ok=True)
        path = os.path.join(OUT, name)
        with open(path, "wb") as f:
            f.write(body)
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(f"wrote {path} {len(body)}".encode())

    def log_message(self, fmt, *args):
        print(fmt % args, flush=True)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    ThreadingHTTPServer(("127.0.0.1", 8787), Handler).serve_forever()
