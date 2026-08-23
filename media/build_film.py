#!/usr/bin/env python3
"""Turn the raw capture + narration into the finished film.

Steps: find the sync flash and trim to it, transcode to CFR h264, synthesise a
music bed with risers under each chapter card, duck the bed under the voice, mux.
"""
import json, os, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FFMPEG = "/opt/homebrew/bin/ffmpeg"
FFPROBE = "/opt/homebrew/bin/ffprobe"
RAW = os.path.join(HERE, "raw.webm")
VO = os.path.join(HERE, "vo", "narration.mp3")
BED = os.path.join(HERE, "bed.wav")
MIX = os.path.join(HERE, "mix.m4a")
VID = os.path.join(HERE, "video.mp4")
OUT = os.path.join(HERE, "film.mp4")

meta = json.load(open(os.path.join(HERE, "beats.json")))
T = meta["total"]
CARDS = [b[0] for b in meta["beats"] if b[1] == "card"]


def run(args):
    subprocess.run(args, check=True, capture_output=True)


def dur(p):
    return float(subprocess.check_output([
        FFPROBE, "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", p]).strip())


# ── 1. Locate the sync flash ──────────────────────────────────────────────────
probe = subprocess.run([FFMPEG, "-v", "error", "-i", RAW, "-t", "25",
                        "-vf", "fps=60,scale=16:9,format=gray",
                        "-f", "rawvideo", "-"], capture_output=True, check=True)
frames = np.frombuffer(probe.stdout, dtype=np.uint8).reshape(-1, 9 * 16)
means = frames.mean(axis=1)
hits = np.flatnonzero(means > 200)
if len(hits) == 0:
    raise SystemExit(f"no sync flash found (max brightness {means.max():.0f})")
# The director flashes, waits 130ms for the flash to clear, then waits 500ms
# more before beat zero. Trim to that instant so picture and voice line up.
head = hits[0] / 60.0 + 0.63
print(f"sync flash at {hits[0] / 60.0:.3f}s -> film starts {head:.3f}s  (raw {dur(RAW):.1f}s)")

# ── 2. Video: trim to the flash, constant frame rate, fade out ────────────────
# -ss goes BEFORE -i on purpose. As an output option the filter graph still sees
# the original timestamps, so `fade` fires `head` seconds early; input seeking
# rebases the clock to zero first.
if os.environ.get("SKIP_VIDEO") and os.path.exists(VID):
    pass
else:
  run([FFMPEG, "-y", "-ss", f"{head:.3f}", "-i", RAW, "-t", f"{T:.3f}",
       "-vf", f"setpts=PTS-STARTPTS,fps=30,format=yuv420p,fade=t=out:st={T - 1.6:.2f}:d=1.6",
       "-c:v", "libx264", "-preset", "veryslow", "-crf", "26",
       "-an", "-movflags", "+faststart", VID])
print(f"video.mp4  {dur(VID):.1f}s")

# ── 3. Music bed: two pads breathing against each other, plus chapter risers ──
pads = [
    # A minor, then F, cross-faded on a 32s cycle so the bed keeps moving.
    ([110.0, 261.63, 329.63], "0.5+0.5*sin(2*PI*t/32)"),
    ([87.31, 220.0, 349.23], "0.5-0.5*sin(2*PI*t/32)"),
]
inputs, filters, mixlabels = [], [], []
i = 0
for pi, (freqs, env) in enumerate(pads):
    labels = []
    for f in freqs:
        inputs += ["-f", "lavfi", "-i", f"sine=frequency={f}:duration={T:.2f}:sample_rate=48000"]
        filters.append(f"[{i}:a]volume=0.33[p{i}]")
        labels.append(f"[p{i}]")
        i += 1
    filters.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0,"
                   f"volume='{env}':eval=frame[pad{pi}]")
    mixlabels.append(f"[pad{pi}]")

for ci, t in enumerate(CARDS):
    inputs += ["-f", "lavfi", "-i", f"anoisesrc=d=1.6:c=pink:r=48000:a=0.5"]
    delay = max(0, int((t - 1.6) * 1000))
    filters.append(
        f"[{i}:a]volume='pow(min(1,t/1.6),3)':eval=frame,highpass=f=300,lowpass=f=2600,"
        f"afade=t=out:st=1.50:d=0.10,volume=0.12,adelay={delay}|{delay}[riser{ci}]")
    mixlabels.append(f"[riser{ci}]")
    i += 1

graph = ";".join(filters) + ";" + "".join(mixlabels) + \
    f"amix=inputs={len(mixlabels)}:duration=longest:normalize=0," \
    f"tremolo=f=0.11:d=0.26,lowpass=f=780,aecho=0.8:0.85:900:0.28,volume=0.085," \
    f"afade=t=in:d=3,afade=t=out:st={T - 4.5:.2f}:d=4.5,apad=whole_dur={T:.2f},atrim=0:{T:.2f}[bed]"
run([FFMPEG, "-y", *inputs, "-filter_complex", graph, "-map", "[bed]", BED])
print(f"bed.wav    {dur(BED):.1f}s  ({len(CARDS)} risers)")

# ── 4. Duck the bed under the voice, then mix ─────────────────────────────────
# sidechaincompress stops at the shorter input, so the voice copy is padded to
# full length or the bed gets truncated to the narration.
graph = (
    f"[1:a]aresample=48000,asplit=2[vo_out][vo_sc];"
    f"[vo_sc]apad=whole_dur={T:.2f}[sc];"
    f"[0:a][sc]sidechaincompress=threshold=0.05:ratio=9:attack=15:release=380:makeup=1[duck];"
    f"[duck][vo_out]amix=inputs=2:duration=longest:normalize=0,"
    f"alimiter=limit=0.95,loudnorm=I=-15:TP=-1.5:LRA=11,"
    f"aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,"
    f"atrim=0:{T:.2f}[out]"
)
run([FFMPEG, "-y", "-i", BED, "-i", VO, "-filter_complex", graph,
     "-map", "[out]", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", MIX])
print(f"mix.m4a    {dur(MIX):.1f}s")

# ── 5. Mux ────────────────────────────────────────────────────────────────────
run([FFMPEG, "-y", "-i", VID, "-i", MIX, "-c:v", "copy", "-c:a", "copy",
     "-movflags", "+faststart", "-shortest", OUT])

# Poster: the queue at 5.6x, where the barometer has gone red. Richer than the
# cold open, and it shows the captions burned in.
run([FFMPEG, "-y", "-i", OUT, "-ss", "41.4", "-frames:v", "1", "-q:v", "3",
     os.path.join(HERE, "poster.jpg")])

size = os.path.getsize(OUT) / 1e6
print(f"\nfilm.mp4   {dur(OUT):.1f}s   {size:.1f} MB")
