"""Vercel Python serverless function: the weekly WP GBM trainer.

Invoked programmatically by /api/cron/wp-retrain (never by cron directly). The
TS retrain route exports each mode's feature matrix to Vercel Blob and POSTs
{ runId, urls } here. This function:

  1. Authenticates the Bearer CRON_SECRET (constant-time).
  2. Downloads each mode's CSV from its public blob URL to a temp file.
  3. Trains a per-mode GBM via train_family(path, incumbent) — champion/
     challenger against the live incumbent (loaded from WP_LATEST_MODEL_URL if
     set, else None per mode).
  4. Assembles the ModelArtifact and POSTs it to PUBLISH_URL
     (/api/cron/wp-publish), which single-sources the R2 publish in TS.

This function NEVER writes R2 directly — the publish callback owns that.

Modes: control, escort_hybrid, flashpoint are trained; push is data-blocked and
always null (matches the shipped per-mode model).
"""
# Required Vercel env vars:
#   CRON_SECRET         - bearer token; must match the cron/publish routes
#   WP_FEATURE_HASH     - must equal the TS featureHash() (currently 27b4a8ec1f49)
#   PUBLISH_URL         - <deployment origin>/api/cron/wp-publish
#   WP_LATEST_MODEL_URL - (optional) public URL of the live model JSON for champion/challenger;
#                         omit for the no-incumbent fallback (ships GBM where gated)
import hmac
import json
import os
import tempfile
import traceback
import urllib.request
from http.server import BaseHTTPRequestHandler

from train_gbm import train_family

# push is data-blocked upstream; it is always null in the artifact.
TRAINABLE_MODES = ("control", "escort_hybrid", "flashpoint")


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


def _download_csv(url):
    """Fetch a public blob URL into a temp .csv file; return its path."""
    fd, path = tempfile.mkstemp(suffix=".csv")
    os.close(fd)
    with urllib.request.urlopen(url, timeout=120) as resp:  # noqa: S310 (trusted blob URL)
        data = resp.read()
    with open(path, "wb") as f:
        f.write(data)
    return path


def _load_incumbents():
    """Load the live artifact's per-mode families as incumbents, keyed by mode.

    If WP_LATEST_MODEL_URL is set and publicly readable, champion/challenger
    runs against the live model. If unset or unreadable, every mode gets a None
    incumbent — a documented fallback: train_family then ships the GBM wherever
    it passes the gate (model-v3 already shipped GBM, so a None-incumbent
    retrain re-ships GBM where gated, which is correct).
    """
    url = os.environ.get("WP_LATEST_MODEL_URL")
    if not url:
        return {}
    try:
        with urllib.request.urlopen(url, timeout=60) as resp:  # noqa: S310
            artifact = json.loads(resp.read().decode("utf-8"))
        families = artifact.get("modeFamilies", {})
        return {m: families.get(m) for m in TRAINABLE_MODES}
    except Exception as exc:  # noqa: BLE001 — fall back to None incumbents
        print(f"[wp-train] incumbent load failed ({exc!r}); using None incumbents")
        return {}


def _publish(artifact):
    """POST the assembled artifact to the TS publish callback. Returns
    (status_code, body_text)."""
    publish_url = os.environ["PUBLISH_URL"]
    secret = os.environ["CRON_SECRET"]
    body = json.dumps(artifact).encode("utf-8")
    request = urllib.request.Request(
        publish_url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as resp:  # noqa: S310
        return resp.status, resp.read().decode("utf-8")


def _run(payload):
    """Train every supplied mode, assemble the artifact, publish it. Returns a
    JSON-serializable result dict."""
    urls = payload.get("urls") or {}
    run_id = payload.get("runId")
    incumbents = _load_incumbents()

    mode_families = {
        "control": None,
        "escort_hybrid": None,
        "push": None,
        "flashpoint": None,
    }
    trained = []
    errors = {}

    for mode, url in urls.items():
        if mode not in mode_families:
            print(f"[wp-train] unknown mode {mode!r}; skipping")
            continue
        if mode == "push":
            # push is data-blocked; never trained even if a URL slips through.
            continue
        try:
            path = _download_csv(url)
            try:
                family = train_family(path, incumbents.get(mode))
            finally:
                try:
                    os.remove(path)
                except OSError:
                    pass
            mode_families[mode] = family
            trained.append(mode)
        except Exception as exc:  # noqa: BLE001 — isolate per-mode failures
            errors[mode] = repr(exc)
            print(f"[wp-train] mode {mode!r} failed: {exc!r}")
            print(traceback.format_exc())

    if not trained:
        # Zero modes trained — nothing safe to publish.
        return {
            "published": False,
            "runId": run_id,
            "trained": trained,
            "errors": errors,
            "reason": "no_modes_trained",
        }

    artifact = {
        "schemaVersion": 1,
        "modelVersion": 0,  # the publish route reassigns the real version
        "createdAt": "",  # the publish route stamps this
        "featureHash": os.environ["WP_FEATURE_HASH"],
        "modeFamilies": mode_families,
    }

    status, text = _publish(artifact)
    return {
        "published": status == 200,
        "publishStatus": status,
        "publishBody": text,
        "runId": run_id,
        "trained": trained,
        "errors": errors,
    }


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
            self._send(401, {"error": "Unauthorized"})
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length else b"{}"
            payload = json.loads(raw.decode("utf-8") or "{}")
        except (ValueError, json.JSONDecodeError):
            self._send(400, {"error": "Invalid JSON body"})
            return

        try:
            result = _run(payload)
        except Exception as exc:  # noqa: BLE001 — never leak a stack to the caller
            print(f"[wp-train] run failed: {exc!r}")
            print(traceback.format_exc())
            self._send(500, {"error": "Training run failed"})
            return

        self._send(200, result)
