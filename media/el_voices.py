#!/usr/bin/env python3
"""ElevenLabs helper: list the voices on the account, or clone a new one.

    python3 el_voices.py                      # list voices + subscription tier
    python3 el_voices.py clone "Wahid" a.m4a  # instant-clone from sample(s)

Reads the key from ~/Downloads/Claude/el_key.txt and never prints it.
Instant voice cloning requires a paid ElevenLabs plan; the free tier can only
use the stock voices.
"""
import json, os, sys, urllib.request, uuid

KEY_FILE = os.path.expanduser("~/Downloads/Claude/el_key.txt")
API = "https://api.elevenlabs.io/v1"

if not os.path.exists(KEY_FILE):
    raise SystemExit(f"No key at {KEY_FILE}")
KEY = open(KEY_FILE).read().strip()


def get(path):
    req = urllib.request.Request(f"{API}{path}", headers={"xi-api-key": KEY})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def clone(name, files):
    boundary = uuid.uuid4().hex
    body = b""
    for key, val in [("name", name), ("description", "Narration voice for portfolio films")]:
        body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"\r\n\r\n"
                 f"{val}\r\n").encode()
    for path in files:
        body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"files\"; "
                 f"filename=\"{os.path.basename(path)}\"\r\n"
                 f"Content-Type: application/octet-stream\r\n\r\n").encode()
        body += open(path, "rb").read() + b"\r\n"
    body += f"--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"{API}/voices/add", data=body,
        headers={"xi-api-key": KEY,
                 "Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)


if len(sys.argv) > 1 and sys.argv[1] == "clone":
    name, files = sys.argv[2], sys.argv[3:]
    missing = [f for f in files if not os.path.exists(f)]
    if missing:
        raise SystemExit(f"missing sample(s): {missing}")
    res = clone(name, files)
    print(f"cloned -> voice_id: {res['voice_id']}")
    print("Put that id in narration-short.json under elevenlabs.voice_id")
else:
    try:
        sub = get("/user/subscription")
        print(f"plan: {sub.get('tier')}   "
              f"characters: {sub.get('character_count')}/{sub.get('character_limit')}   "
              f"voice slots used: {sub.get('voice_slots_used')}/{sub.get('voice_limit')}")
        print(f"instant cloning allowed: {sub.get('can_use_instant_voice_cloning')}")
    except Exception as e:
        print(f"(subscription lookup failed: {e})")
    print("\nvoices on this account:")
    for v in get("/voices")["voices"]:
        print(f"  {v['voice_id']}  {v['name']:24s} {v.get('category', '')}")
