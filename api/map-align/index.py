"""Vercel Python serverless function: align a new map render to the old image.

Invoked server-to-server by the TS align route (never by a browser). Auth is the
Bearer CRON_SECRET (constant-time), mirroring /api/wp-train. Receives presigned
R2 GET URLs for the OLD original image and the NEW (staged) original image,
downloads both, and returns the 2x3 affine P (old px -> new px) plus quality
metrics. Never touches R2 or the database.

Request  (POST, JSON): { "oldUrl": str, "newUrl": str }
Response (200, JSON):  { "transform": [[a,b,tx],[c,d,ty]],
                         "inliers": int, "residual": float }
Response (422, JSON):  { "error": "<reason>" }   # unalignable
"""
import hmac
import json
import os
import traceback
import urllib.request
from http.server import BaseHTTPRequestHandler

from align import align_bounded, AlignError

MAX_IMAGE_BYTES = 150 * 1024 * 1024  # 8K map PNGs run ~100 MB


def _bearer(headers):
    """Extract the bearer token from an Authorization header, or None."""
    raw = headers.get("Authorization") or headers.get("authorization")
    if not raw or not raw.startswith("Bearer "):
        return None
    return raw[len("Bearer ") :]


def _authorized(headers):
    """Constant-time compare against CRON_SECRET. Fails closed if unset."""
    expected = os.environ.get("CRON_SECRET")
    if not expected:
        return False
    provided = _bearer(headers)
    if provided is None:
        return False
    return hmac.compare_digest(provided, expected)


def _download_bytes(url):
    """Fetch a presigned URL as raw bytes, enforcing the size limit."""
    with urllib.request.urlopen(url, timeout=60) as resp:  # noqa: S310 (trusted presigned URL)
        data = resp.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise AlignError("image exceeds size limit")
    return data


class handler(BaseHTTPRequestHandler):  # noqa: N801 — Vercel requires this name
    def _send(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):  # noqa: N802 — BaseHTTPRequestHandler interface
        if not _authorized(self.headers):
            self._send(401, {"error": "unauthorized"})
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length else b"{}"
            body = json.loads(raw)
        except (ValueError, json.JSONDecodeError):
            self._send(400, {"error": "invalid JSON body"})
            return

        old_url = body.get("oldUrl")
        new_url = body.get("newUrl")
        if not old_url or not new_url:
            self._send(400, {"error": "oldUrl and newUrl are required"})
            return

        try:
            old_bytes = _download_bytes(old_url)
            new_bytes = _download_bytes(new_url)
            P, inliers, residual = align_bounded(old_bytes, new_bytes)
            self._send(200, {
                "transform": P,
                "inliers": inliers,
                "residual": residual,
            })
        except AlignError as e:
            self._send(422, {"error": str(e)})
        except Exception:  # noqa: BLE001
            traceback.print_exc()
            self._send(500, {"error": "alignment failed"})
