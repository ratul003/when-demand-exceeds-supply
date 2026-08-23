#!/usr/bin/env python3
"""Generate a narration track line by line, then stitch it with exact gaps.

    python3 build_vo.py [narration.json] [--force] [--voice elevenlabs]

Per-line synthesis is what makes the film sync work: each line's real duration is
measured after it is rendered, so the capture timeline knows precisely when every
sentence starts and ends. A single long TTS file would leave that to guesswork.

Two providers:
  edge-tts     (default) free Microsoft neural voices, no key
  elevenlabs   Wahid's own cloned voice; needs a key in el_key.txt and a
               voice_id in the spec. Durations differ from edge-tts, which is
               fine: the beat sheet is keyed to line ids, so re-running this
               re-times the whole film automatically.
"""
import json, os, subprocess, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
EDGE_TTS = "/Users/Wahid-Personal/Library/Python/3.9/bin/edge-tts"
FFMPEG = "/opt/homebrew/bin/ffmpeg"
FFPROBE = "/opt/homebrew/bin/ffprobe"
KEY_FILE = os.path.expanduser("~/Downloads/Claude/el_key.txt")

args = [a for a in sys.argv[1:] if not a.startswith("-")]
spec_path = os.path.join(HERE, args[0] if args else "narration.json")
force = "--force" in sys.argv
provider = "elevenlabs" if "--voice" in sys.argv and "elevenlabs" in sys.argv else "edge"

spec = json.load(open(spec_path))
# narration.json -> vo/ + timeline.json;  narration-short.json -> vo-short/ + timeline-short.json
stem = os.path.basename(spec_path).replace("narration", "").replace(".json", "")
VO = os.path.join(HERE, f"vo{stem}")
TIMELINE = os.path.join(HERE, f"timeline{stem}.json")
os.makedirs(VO, exist_ok=True)


def duration(path):
    out = subprocess.check_output([
        FFPROBE, "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path])
    return float(out.strip())


def read_key():
    if not os.path.exists(KEY_FILE):
        raise SystemExit(
            f"ElevenLabs key not found at {KEY_FILE}.\n"
            "Put the key in that file (one line, no quotes) and re-run. "
            "It is deleted immediately after use.")
    with open(KEY_FILE) as f:
        return f.read().strip()


def say_edge(text, out, tries=4):
    """edge-tts hits the public service, which drops requests when a build fires
    many lines in a row. Retry rather than lose the whole run."""
    for attempt in range(tries):
        r = subprocess.run([
            EDGE_TTS, "--voice", spec["voice"], f"--rate={spec['rate']}",
            f"--pitch={spec['pitch']}", "--text", text, "--write-media", out,
        ], capture_output=True)
        if r.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 500:
            return
        time.sleep(2 + 3 * attempt)
    raise SystemExit(f"edge-tts failed after {tries} tries: {r.stderr.decode()[:400]}")


def say_eleven(text, out, key):
    cfg = spec["elevenlabs"]
    if not cfg.get("voice_id"):
        raise SystemExit("No voice_id in the spec. Run `python3 el_voices.py` to list "
                         "the voices on the account, then set elevenlabs.voice_id.")
    body = json.dumps({
        "text": text,
        "model_id": cfg.get("model_id", "eleven_multilingual_v2"),
        "voice_settings": {
            "stability": cfg.get("stability", 0.45),
            "similarity_boost": cfg.get("similarity_boost", 0.8),
            "style": cfg.get("style", 0.25),
            "use_speaker_boost": True,
            "speed": cfg.get("speed", 1.0),
        },
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{cfg['voice_id']}",
        data=body,
        headers={"xi-api-key": key, "Content-Type": "application/json",
                 "Accept": "audio/mpeg"})
    with urllib.request.urlopen(req, timeout=120) as r, open(out, "wb") as f:
        f.write(r.read())


key = read_key() if provider == "elevenlabs" else None
print(f"provider: {provider}   spec: {os.path.basename(spec_path)}")

timeline, parts = [], []
t = spec["leadIn"] / 1000.0

for line in spec["lines"]:
    if line.get("skip"):
        # Recorded, deliberately unused: the picture already carries it.
        print(f"  {line['id']:6s}  (skipped)")
        continue
    mp3 = os.path.join(VO, f"{line['id']}.mp3")
    # A failed run can leave a truncated file behind, and "it exists" is not the
    # same as "it decodes". Probe the cached clip before trusting it.
    stale = force or not os.path.exists(mp3)
    if not stale:
        try:
            duration(mp3)
        except Exception:
            stale = True
    if stale and "--require-cached" in sys.argv:
        # Guards the real-voice build: without this, one missing clip would be
        # quietly filled in by the TTS voice and the film would switch speakers
        # mid-sentence.
        raise SystemExit(f"--require-cached: no usable clip for '{line['id']}'. "
                         "Re-run ingest_voice.py; do not mix synthesised lines "
                         "into a recorded narration.")
    if stale:
        (say_eleven(line["text"], mp3, key) if provider == "elevenlabs"
         else say_edge(line["text"], mp3))
    d = duration(mp3)
    timeline.append({
        "id": line["id"], "chapter": line.get("chapter", 0), "text": line["text"],
        "start": round(t, 3), "end": round(t + d, 3), "dur": round(d, 3),
    })
    parts.append(mp3)
    t += d + line["gap"] / 1000.0
    print(f"  {line['id']:6s} {d:5.2f}s   -> {t:6.2f}s")

total = t

# Stitch: each clip delayed to its exact start, all mixed down.
inputs, filters, labels = [], [], []
for i, mp3 in enumerate(parts):
    inputs += ["-i", mp3]
    ms = int(timeline[i]["start"] * 1000)
    filters.append(f"[{i}:a]aresample=48000,adelay={ms}|{ms}[a{i}]")
    labels.append(f"[a{i}]")

out = os.path.join(VO, "narration.mp3")
# Synthesised narration is clean but thin. The same warm profile chosen for
# the recorded voice keeps the two interchangeable and stops the TTS sounding
# like a screen reader over a produced picture.
POLISH = ("equalizer=f=150:t=q:w=1.0:g=2.0,"
          "equalizer=f=430:t=q:w=1.4:g=-1.5,"
          "equalizer=f=2800:t=q:w=2.0:g=1.0,"
          "deesser=i=0.25,"
          "acompressor=threshold=-22dB:ratio=2.4:attack=12:release=250:makeup=2,"
          "alimiter=limit=0.95,")
graph = ";".join(filters) + ";" + "".join(labels) + \
    f"amix=inputs={len(parts)}:duration=longest:normalize=0," \
    f"apad=whole_dur={total:.3f},{POLISH}loudnorm=I=-16:TP=-1.5:LRA=11[out]"
subprocess.run([FFMPEG, "-y", *inputs, "-filter_complex", graph,
                "-map", "[out]", "-b:a", "192k", out], check=True, capture_output=True)

json.dump({"total": round(total, 3), "provider": provider, "lines": timeline},
          open(TIMELINE, "w"), indent=2)
print(f"\n{os.path.relpath(out, HERE)}  {duration(out):.2f}s   ({len(parts)} lines)")
