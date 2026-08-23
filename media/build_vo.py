#!/usr/bin/env python3
"""Generate the narration track line by line, then stitch it with exact gaps.

Per-line synthesis is what makes the film sync work: each line's real duration is
measured after it is rendered, so the capture timeline knows precisely when every
sentence starts and ends. A single long TTS file would leave that to guesswork.
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VO = os.path.join(HERE, "vo")
EDGE_TTS = "/Users/Wahid-Personal/Library/Python/3.9/bin/edge-tts"
FFMPEG = "/opt/homebrew/bin/ffmpeg"
FFPROBE = "/opt/homebrew/bin/ffprobe"

spec = json.load(open(os.path.join(HERE, "narration.json")))
os.makedirs(VO, exist_ok=True)


def duration(path):
    out = subprocess.check_output([
        FFPROBE, "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path])
    return float(out.strip())


timeline = []
t = spec["leadIn"] / 1000.0
parts = []

for line in spec["lines"]:
    mp3 = os.path.join(VO, f"{line['id']}.mp3")
    if not os.path.exists(mp3) or "--force" in sys.argv:
        subprocess.run([
            EDGE_TTS, "--voice", spec["voice"], f"--rate={spec['rate']}",
            f"--pitch={spec['pitch']}", "--text", line["text"],
            "--write-media", mp3,
        ], check=True, capture_output=True)
    d = duration(mp3)
    timeline.append({
        "id": line["id"], "chapter": line["chapter"], "text": line["text"],
        "start": round(t, 3), "end": round(t + d, 3), "dur": round(d, 3),
    })
    parts.append((mp3, d, line["gap"] / 1000.0))
    t += d + line["gap"] / 1000.0
    print(f"  {line['id']}  {d:5.2f}s   -> ends {t:6.2f}s")

total = t

# Build the stitched track: each clip delayed to its exact start, all mixed down.
inputs, filters, labels = [], [], []
for i, (mp3, d, gap) in enumerate(parts):
    inputs += ["-i", mp3]
    delay_ms = int(timeline[i]["start"] * 1000)
    filters.append(f"[{i}:a]aresample=48000,adelay={delay_ms}|{delay_ms}[a{i}]")
    labels.append(f"[a{i}]")

out = os.path.join(VO, "narration.mp3")
graph = ";".join(filters) + ";" + "".join(labels) + \
    f"amix=inputs={len(parts)}:duration=longest:normalize=0," \
    f"apad=whole_dur={total:.3f},loudnorm=I=-16:TP=-1.5:LRA=11[out]"
subprocess.run([FFMPEG, "-y", *inputs, "-filter_complex", graph,
                "-map", "[out]", "-b:a", "192k", out],
               check=True, capture_output=True)

json.dump({"total": round(total, 3), "lines": timeline},
          open(os.path.join(HERE, "timeline.json"), "w"), indent=2)
print(f"\nnarration.mp3  {duration(out):.2f}s   ({len(parts)} lines)")
