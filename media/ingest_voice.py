#!/usr/bin/env python3
"""Turn one continuous recording of Wahid reading the script into per-line clips.

    python3 ingest_voice.py ~/Downloads/narration.m4a [--spec narration-short.json]
    python3 ingest_voice.py ~/Downloads/narration.m4a --dry   # just show the split

Splits on the pauses between lines, cleans each clip, and writes it as the line
id the film pipeline expects (vo-short/s1.mp3 ...). After this, build_vo.py finds
the clips already there, measures them, and the beat sheet re-times itself.

The cleanup chain is what makes a phone recording sound deliberate rather than
casual: rumble out, room hiss down, boxiness cut, presence up, sibilance tamed,
gentle compression, then broadcast loudness.
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FFMPEG = "/opt/homebrew/bin/ffmpeg"
FFPROBE = "/opt/homebrew/bin/ffprobe"

CLEAN = (
    "highpass=f=75,"              # handling noise and desk rumble
    "afftdn=nf=-28:tn=1,"         # spectral denoise for room hiss
    "adeclip,"
    "equalizer=f=180:t=q:w=1.2:g=-2.5,"   # cut small-room boxiness
    "equalizer=f=3200:t=q:w=1.8:g=2.5,"   # presence, so it cuts through the bed
    "deesser=i=0.35,"
    "acompressor=threshold=-20dB:ratio=3.2:attack=8:release=200:makeup=3,"
    "alimiter=limit=0.95,"
    "loudnorm=I=-16:TP=-1.5:LRA=9"
)

args = [a for a in sys.argv[1:] if not a.startswith("--")]
if not args:
    raise SystemExit(__doc__)
src = os.path.expanduser(args[0])
spec_name = "narration-short.json"
if "--spec" in sys.argv:
    spec_name = sys.argv[sys.argv.index("--spec") + 1]
dry = "--dry" in sys.argv

if not os.path.exists(src):
    raise SystemExit(f"no such file: {src}")

spec = json.load(open(os.path.join(HERE, spec_name)))
ids = [l["id"] for l in spec["lines"]]
stem = spec_name.replace("narration", "").replace(".json", "")
VO = os.path.join(HERE, f"vo{stem}")
os.makedirs(VO, exist_ok=True)

total = float(subprocess.check_output([
    FFPROBE, "-v", "error", "-show_entries", "format=duration",
    "-of", "default=nw=1:nk=1", src]).strip())

# ── Find the pauses ───────────────────────────────────────────────────────────
det = subprocess.run(
    [FFMPEG, "-hide_banner", "-i", src, "-af",
     "silencedetect=noise=-32dB:d=0.55", "-f", "null", "-"],
    capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", det)]
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", det)]
if len(ends) < len(starts):
    ends.append(total)

# Speech lives between the silences.
segs, cur = [], 0.0
for s, e in zip(starts, ends):
    if s - cur > 0.55:
        segs.append((cur, s))
    cur = e
if total - cur > 0.55:
    segs.append((cur, total))

print(f"recording: {total:.1f}s   pauses found: {len(starts)}   speech segments: {len(segs)}")
for i, (a, b) in enumerate(segs):
    label = ids[i] if i < len(ids) else "EXTRA"
    print(f"  {label:6s} {a:6.2f} -> {b:6.2f}  ({b - a:4.1f}s)")

if len(segs) != len(ids):
    raise SystemExit(
        f"\nExpected {len(ids)} segments, found {len(segs)}.\n"
        "Leave a clear ~1.5s pause between lines and none inside a line, then "
        "re-run. If a segment boundary is only slightly off, adjust the "
        "silencedetect threshold (-32dB) or duration (0.55) at the top of this "
        "script. --dry shows the split without writing anything.")

if dry:
    raise SystemExit("\n--dry: nothing written.")

# ── Cut, clean, write ─────────────────────────────────────────────────────────
PAD = 0.12
for (a, b), lid in zip(segs, ids):
    out = os.path.join(VO, f"{lid}.mp3")
    subprocess.run([
        FFMPEG, "-y", "-v", "error",
        "-ss", f"{max(0, a - PAD):.3f}", "-to", f"{min(total, b + PAD):.3f}",
        "-i", src, "-af", CLEAN, "-ar", "48000", "-ac", "1", "-b:a", "192k", out,
    ], check=True)
    d = float(subprocess.check_output([
        FFPROBE, "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", out]).strip())
    print(f"  wrote {os.path.relpath(out, HERE)}  {d:.2f}s")

print(f"\nDone. Next:\n"
      f"  python3 build_vo.py {spec_name} --require-cached\n"
      f"  node capture-short.mjs\n"
      f"  python3 build_film.py short")
