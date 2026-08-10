"""Vercel Python serverless function: the weekly WP GBM trainer.

Invoked programmatically by /api/cron/wp-retrain (never by cron directly). The
TS retrain route exports each mode's feature matrix to Vercel Blob and POSTs
{ runId, urls } here. This function:

  1. Authenticates the Bearer CRON_SECRET (constant-time).
  2. Downloads each mode's CSV from its public blob URL to a temp file.
  3. Trains + gates a per-mode GBM via train_candidate(path) — NO champion/
     challenger here; the candidate family and its gate flag are collected raw.
  4. Assembles the gzipped candidate payload and POSTs it to PUBLISH_URL
     (/api/cron/wp-publish), which loads the live R2 incumbent, runs the
     per-mode champion/challenger decision, and single-sources the R2 publish.

This function NEVER writes R2 directly, and never sees the incumbent — the
publish callback owns both the incumbent load and the publish.

Modes: control, escort_hybrid, flashpoint are trained; push is data-blocked and
always null (matches the shipped per-mode model).
"""
# Required Vercel env vars:
#   CRON_SECRET         - bearer token; must match the cron/publish routes
#   WP_FEATURE_HASH     - must equal the TS featureHash() (currently 27b4a8ec1f49)
#   PUBLISH_URL         - <deployment origin>/api/cron/wp-publish
import gzip
import hmac
import json
import os
import tempfile
import threading
import time
import traceback
import urllib.request
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg
from psycopg.types.json import Jsonb
from train_gbm import train_candidate


_HEARTBEAT_SECONDS = 30
_DUPLICATE_WAIT_SECONDS = 720


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


def _database_url():
    """Strip Prisma-only URL options before handing the URI to psycopg."""
    raw = os.environ["DATABASE_URL"]
    parsed = urlsplit(raw)
    query = [
        (key, value)
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)
        if key not in {"connection_limit", "pool_timeout", "sslaccept"}
    ]
    return urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment)
    )


def _claim_training_run(run_id):
    """Atomically claim a run, recover an expired claim, or return its result."""
    with psycopg.connect(_database_url()) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "WpTrainingRun"
                    ("runId", status, "leaseUntil", "createdAt", "updatedAt")
                VALUES (%s, 'running', NOW() + INTERVAL '120 seconds', NOW(), NOW())
                ON CONFLICT ("runId") DO NOTHING
                RETURNING "runId"
                """,
                (run_id,),
            )
            if cur.fetchone() is not None:
                return "claimed", None

            cur.execute(
                """
                SELECT status, result, "leaseUntil" <= NOW() AS expired
                FROM "WpTrainingRun"
                WHERE "runId" = %s
                FOR UPDATE
                """,
                (run_id,),
            )
            row = cur.fetchone()
            if row is None:
                raise RuntimeError("WP training claim disappeared")
            status, result, expired = row
            if status == "completed":
                return "completed", result
            if expired:
                cur.execute(
                    """
                    UPDATE "WpTrainingRun"
                    SET status = 'running', result = NULL,
                        "leaseUntil" = NOW() + INTERVAL '120 seconds',
                        "updatedAt" = NOW()
                    WHERE "runId" = %s
                    """,
                    (run_id,),
                )
                return "claimed", None
            return "running", None


def _heartbeat_training_run(run_id, stop_event):
    """Keep a live trainer's short recovery lease from expiring."""
    while not stop_event.wait(_HEARTBEAT_SECONDS):
        try:
            with psycopg.connect(_database_url()) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE "WpTrainingRun"
                        SET "leaseUntil" = NOW() + INTERVAL '120 seconds',
                            "updatedAt" = NOW()
                        WHERE "runId" = %s AND status = 'running'
                        """,
                        (run_id,),
                    )
        except Exception as exc:  # noqa: BLE001 — main request owns failure handling
            print(f"[wp-train] lease heartbeat failed: {exc!r}")


def _finish_training_run(run_id, result):
    status = "completed" if result.get("published") is True else "failed"
    with psycopg.connect(_database_url()) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE "WpTrainingRun"
                SET status = %s, result = %s, "leaseUntil" = NOW(),
                    "updatedAt" = NOW()
                WHERE "runId" = %s
                """,
                (status, Jsonb(result), run_id),
            )


def _wait_for_claim_or_result(run_id):
    """A duplicate waits for the owner, then recovers if its lease expires."""
    deadline = time.monotonic() + _DUPLICATE_WAIT_SECONDS
    while time.monotonic() < deadline:
        state, result = _claim_training_run(run_id)
        if state != "running":
            return state, result
        time.sleep(2)
    raise TimeoutError("Timed out waiting for the active WP training run")


def _download_csv(urls):
    """Fetch CSV parts into one temp file, retaining only the first header."""
    fd, path = tempfile.mkstemp(suffix=".csv")
    os.close(fd)
    with open(path, "wb") as f:
        for index, url in enumerate(urls):
            with urllib.request.urlopen(  # noqa: S310 (trusted blob URL)
                url, timeout=120
            ) as resp:
                data = resp.read()
            if index > 0:
                _, separator, data = data.partition(b"\n")
                if not separator:
                    continue
            f.write(data)
    return path


def _publish(candidate):
    """gzip + POST the candidate payload to the TS publish callback. The
    artifact is ~4.4MB raw (near Vercel's 4.5MB body limit), so it must be
    compressed. Returns (status_code, body_text)."""
    publish_url = os.environ["PUBLISH_URL"]
    secret = os.environ["CRON_SECRET"]
    body = gzip.compress(json.dumps(candidate).encode("utf-8"))
    request = urllib.request.Request(
        publish_url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/json",
            "Content-Encoding": "gzip",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as resp:  # noqa: S310
        return resp.status, resp.read().decode("utf-8")


def _run(payload):
    """Train + gate every supplied mode, assemble the candidate payload, publish
    it. Champion/challenger runs in the TS publish route, not here. Returns a
    JSON-serializable result dict."""
    urls = payload.get("urls") or {}
    run_id = payload.get("runId")

    mode_families = {
        "control": None,
        "escort_hybrid": None,
        "push": None,
        "flashpoint": None,
    }
    gates = {}
    trained = []
    errors = {}

    for mode, mode_urls in urls.items():
        if mode not in mode_families:
            print(f"[wp-train] unknown mode {mode!r}; skipping")
            continue
        if mode == "push":
            # push is data-blocked; never trained even if a URL slips through.
            continue
        try:
            if isinstance(mode_urls, str):
                mode_urls = [mode_urls]
            path = _download_csv(mode_urls)
            try:
                family, gate = train_candidate(path)
            finally:
                try:
                    os.remove(path)
                except OSError:
                    pass
            mode_families[mode] = family
            gates[mode] = gate
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

    candidate = {
        "schemaVersion": 1,
        "featureHash": os.environ["WP_FEATURE_HASH"],
        "modeFamilies": mode_families,
        "gates": gates,
    }

    status, text = _publish(candidate)
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

        run_id = payload.get("runId")
        if not isinstance(run_id, str) or not run_id:
            self._send(400, {"error": "runId is required"})
            return

        stop_event = None
        heartbeat = None
        try:
            claim, existing = _wait_for_claim_or_result(run_id)
            if claim == "completed":
                self._send(200, existing)
                return
            stop_event = threading.Event()
            heartbeat = threading.Thread(
                target=_heartbeat_training_run,
                args=(run_id, stop_event),
                daemon=True,
            )
            heartbeat.start()
            result = _run(payload)
            _finish_training_run(run_id, result)
        except Exception as exc:  # noqa: BLE001 — never leak a stack to the caller
            print(f"[wp-train] run failed: {exc!r}")
            print(traceback.format_exc())
            self._send(500, {"error": "Training run failed"})
            return
        finally:
            if stop_event is not None:
                stop_event.set()
            if heartbeat is not None:
                heartbeat.join(timeout=1)

        self._send(200, result)
