#!/usr/bin/env python3
"""Prepare a recording to be used as a voice-cloning reference.

    python3 prep_clone_sample.py ~/Downloads/"Online Marketplace Sample.m4a"

Deliberately NOT the same chain as ingest_voice.py. A clone copies whatever is
in the sample, including artifacts and mannerisms, so this pass only removes
damage: clipping, rumble, room hiss, boxiness. It does not compress hard, does
not remove breaths and does not change tempo, because all three would be learned
as part of the voice.
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FFMPEG = "/opt/homebrew/bin/ffmpeg"
FFPROBE = "/opt/homebrew/bin/ffprobe"
OUT = os.path.join(HERE, "clone-source.wav")

CHAIN = (
    "adeclip,"                              # the source peaks at 0.0 dB
    "highpass=f=70,"
    "afftdn=nf=-25:tn=1,"                   # gentler than the narration pass
    "equalizer=f=180:t=q:w=1.2:g=-2,"       # small-room boxiness
    "equalizer=f=3200:t=q:w=1.8:g=1.5,"     # a little air, not a radio voice
    "alimiter=limit=0.95,"
    "loudnorm=I=-18:TP=-2:LRA=14"           # leaves natural dynamics intact
)

if len(sys.argv) < 2:
    raise SystemExit(__doc__)
src = os.path.expanduser(sys.argv[1])
if not os.path.exists(src):
    raise SystemExit(f"no such file: {src}")


def stat(path):
    d = subprocess.check_output([
        FFPROBE, "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", path]).strip().decode()
    v = subprocess.run([FFMPEG, "-v", "info", "-i", path, "-af", "volumedetect",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    peak = [l.split("max_volume:")[1].strip() for l in v.splitlines() if "max_volume:" in l]
    return float(d), (peak[0] if peak else "?")


d0, p0 = stat(src)
subprocess.run([FFMPEG, "-y", "-v", "error", "-i", src, "-af", CHAIN,
                "-ar", "44100", "-ac", "1", OUT], check=True)
d1, p1 = stat(OUT)

print(f"in   {os.path.basename(src)}   {d0:.1f}s   peak {p0}")
print(f"out  {os.path.basename(OUT)}   {d1:.1f}s   peak {p1}")
if d1 < 60:
    print("\n⚠ under a minute. Instant cloning works best with 1-3 minutes of speech.")
print(f"\nNext:  python3 el_voices.py clone \"Wahid\" {OUT}")
