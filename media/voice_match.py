#!/usr/bin/env python3
"""Find the stock narration voice closest to a real recording.

    python3 voice_match.py "~/Downloads/Online Marketplace Sample.m4a"

Measures median pitch and spectral tilt on the reference, renders the same
sentence with every candidate voice, measures those the same way, and ranks
them. Not a clone, but it turns "pick a voice that sounds like me" from taste
into a measurement, and whatever wins can then be pitch-shifted the rest of the
way.
"""
import os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FFMPEG = "/opt/homebrew/bin/ffmpeg"
EDGE_TTS = "/Users/Wahid-Personal/Library/Python/3.9/bin/edge-tts"
OUT = os.path.join(HERE, "match")
SR = 16000

LINE = ("Supply is fixed. Push demand past it and the queue compounds. "
        "At five and a half times, the wait is over an hour.")

CANDIDATES = [
    "en-US-AndrewNeural", "en-US-BrianNeural", "en-US-ChristopherNeural",
    "en-US-EricNeural", "en-US-GuyNeural", "en-US-RogerNeural",
    "en-US-SteffanNeural", "en-GB-RyanNeural", "en-GB-ThomasNeural",
    "en-AU-WilliamNeural", "en-IN-PrabhatNeural", "en-CA-LiamNeural",
    "en-IE-ConnorNeural", "en-NZ-MitchellNeural", "en-ZA-LukeNeural",
    "en-HK-SamNeural", "en-SG-WayneNeural", "en-PH-JamesNeural",
]


def samples(path):
    raw = subprocess.run(
        [FFMPEG, "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR),
         "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def profile(x):
    """Median F0 over voiced frames, plus spectral centroid and tilt."""
    win, hop = 1024, 256
    lo, hi = SR // 300, SR // 70          # 70-300 Hz search range
    f0s, cents, tilts = [], [], []
    for i in range(0, len(x) - win, hop):
        fr = x[i:i + win]
        if np.sqrt(np.mean(fr ** 2)) < 0.02:      # silence
            continue
        fr = fr - fr.mean()
        ac = np.correlate(fr, fr, mode="full")[win - 1:]
        if ac[0] <= 0:
            continue
        seg = ac[lo:hi]
        if len(seg) == 0:
            continue
        lag = lo + int(np.argmax(seg))
        if ac[lag] / ac[0] > 0.3:                  # confident enough to be voiced
            f0s.append(SR / lag)
        mag = np.abs(np.fft.rfft(fr * np.hanning(win)))
        freqs = np.fft.rfftfreq(win, 1 / SR)
        if mag.sum() > 0:
            cents.append(float((freqs * mag).sum() / mag.sum()))
            lowb = mag[(freqs > 100) & (freqs < 800)].mean()
            highb = mag[(freqs > 2000) & (freqs < 6000)].mean()
            if lowb > 0:
                tilts.append(20 * np.log10(max(highb, 1e-9) / lowb))
    return (float(np.median(f0s)) if f0s else float("nan"),
            float(np.median(cents)) if cents else float("nan"),
            float(np.median(tilts)) if tilts else float("nan"))


ref_path = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1
                              else "~/Downloads/Online Marketplace Sample.m4a")
os.makedirs(OUT, exist_ok=True)

rf0, rc, rt = profile(samples(ref_path))
print(f"reference     F0 {rf0:6.1f} Hz   centroid {rc:6.0f} Hz   tilt {rt:6.1f} dB\n")

rows = []
for v in CANDIDATES:
    p = os.path.join(OUT, f"{v}.mp3")
    if not os.path.exists(p):
        r = subprocess.run([EDGE_TTS, "--voice", v, "--rate=-4%", "--text", LINE,
                            "--write-media", p], capture_output=True)
        if r.returncode != 0 or not os.path.exists(p):
            print(f"  {v:26s} unavailable")
            continue
    f0, c, t = profile(samples(p))
    # Pitch dominates perceived similarity; centroid and tilt carry timbre.
    score = (abs(np.log2(f0 / rf0)) * 12 * 1.0          # semitones apart
             + abs(c - rc) / 250.0
             + abs(t - rt) / 6.0)
    rows.append((score, v, f0, c, t))
    print(f"  {v:26s} F0 {f0:6.1f}   centroid {c:6.0f}   tilt {t:6.1f}")

rows.sort()
print("\nclosest first:")
for score, v, f0, c, t in rows[:6]:
    semis = 12 * np.log2(rf0 / f0)
    print(f"  {v:26s} score {score:5.2f}   shift {semis:+.2f} semitones to match pitch")
print(f"\nAuditions written to {OUT}/")
