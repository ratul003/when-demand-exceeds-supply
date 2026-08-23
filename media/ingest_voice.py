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

TARGET_TOTAL = 49.0   # seconds of finished film
END_CARD = 2.0


def clean_chain(tempo: float) -> str:
    return CLEAN_PRE + f"atempo={tempo:.4f}," + CLEAN_POST


CLEAN_PRE = (
    # The "2-warm" treatment, chosen by ear from voice_variants.py. Filter order
    # matches that variant exactly, so the film sounds like the sample he picked.
    "adeclip,"                              # source peaks at 0.0 dB
    "highpass=f=72,"
    "afftdn=nf=-26:tn=1,"                   # room hiss
    # Keep a quarter second of every breath and drop the rest. Tightens the read
    # without touching pitch or the pace of the words, which a speed-up would.
    "silenceremove=stop_periods=-1:stop_duration=0.28:stop_threshold=-38dB:detection=rms,"
)
CLEAN_POST = (
    "equalizer=f=150:t=q:w=1.0:g=2.5,"      # body the phone mic never caught
    "equalizer=f=430:t=q:w=1.4:g=-1.5,"     # take the box out of the low mids
    "equalizer=f=2800:t=q:w=2.0:g=1.0,"     # articulation, gently
    "deesser=i=0.25,"
    "acompressor=threshold=-22dB:ratio=2.6:attack=12:release=250:makeup=3,"
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
def split_at(min_gap: float):
    """Speech segments, treating any silence >= min_gap as a line break."""
    det = subprocess.run(
        [FFMPEG, "-hide_banner", "-i", src, "-af",
         f"silencedetect=noise=-32dB:d={min_gap}", "-f", "null", "-"],
        capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", det)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", det)]
    if len(ends) < len(starts):
        ends.append(total)
    segs, cur = [], 0.0
    for s, e in zip(starts, ends):
        if s - cur > 0.35:
            segs.append((cur, s))
        cur = e
    if total - cur > 0.35:
        segs.append((cur, total))
    return segs


# A reader breathes mid-sentence. Rather than demand an unnatural delivery,
# widen the gap that counts as a line break until the split matches the script.
segs, used = None, None
for gap in (0.55, 0.7, 0.85, 1.0, 1.15, 1.3, 1.5, 1.7, 1.9):
    cand = split_at(gap)
    if len(cand) == len(ids):
        segs, used = cand, gap
        break
    if segs is None:
        segs, used = cand, gap   # keep the first attempt for the error report

print(f"recording: {total:.1f}s   speech segments: {len(segs)}   "
      f"(line break = silence >= {used}s)")
for i, (a, b) in enumerate(segs):
    label = ids[i] if i < len(ids) else "EXTRA"
    print(f"  {label:6s} {a:6.2f} -> {b:6.2f}  ({b - a:4.1f}s)")

if len(segs) != len(ids):
    raise SystemExit(
        f"\nExpected {len(ids)} segments, found {len(segs)}, and no line-break "
        "threshold between 0.55s and 1.9s gave a clean split.\n"
        "That usually means two lines ran together with no pause, or a pause "
        "inside one line is longer than the pauses between lines.")

if dry:
    raise SystemExit("\n--dry: nothing written.")

# ── Work out the stretch this particular read needs ───────────────────────────
PAD = 0.06   # just enough not to clip the consonant at either end
speech = sum(b - a for a, b in segs) + 2 * PAD * len(segs)
overhead = (spec["leadIn"] / 1000.0
            + sum(l["gap"] for l in spec["lines"][:-1]) / 1000.0
            + END_CARD)
room = TARGET_TOTAL - overhead
tempo = max(1.0, min(1.12, speech / room)) if room > 0 else 1.0
print(f"\nspeech {speech:.1f}s + overhead {overhead:.1f}s -> "
      f"stretch {tempo:.3f}x to land at {TARGET_TOTAL:.0f}s")
if tempo >= 1.115:
    print("⚠ at the stretch limit; the read is long enough that it may sound hurried.")
CLEAN = clean_chain(tempo)
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
