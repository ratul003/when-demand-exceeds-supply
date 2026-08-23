#!/usr/bin/env python3
"""Render the same line under several voice treatments, so the choice is made by
ear instead of by guesswork.

    python3 voice_variants.py "~/Downloads/Online Marketplace Sample.m4a"

Writes variants/<name>.mp3 plus variants/COMPARE.mp3, which plays all of them
back to back with a short gap between each.
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FFMPEG = "/opt/homebrew/bin/ffmpeg"
OUT = os.path.join(HERE, "variants")
SEG = ("1.10", "7.80")   # line 1, long enough to judge, short enough to A/B

COMMON_IN = "adeclip,highpass=f=72,"
COMMON_OUT = "alimiter=limit=0.95,loudnorm=I=-16:TP=-1.5:LRA=9"

VARIANTS = {
    # What the film currently uses.
    "1-current":
        COMMON_IN + "afftdn=nf=-28:tn=1,"
        "equalizer=f=180:t=q:w=1.2:g=-2.5,equalizer=f=3200:t=q:w=1.8:g=2.5,"
        "deesser=i=0.35,"
        "acompressor=threshold=-20dB:ratio=3.2:attack=8:release=200:makeup=3," + COMMON_OUT,

    # Fuller and rounder. Chest rather than throat.
    "2-warm":
        COMMON_IN + "afftdn=nf=-26:tn=1,"
        "equalizer=f=150:t=q:w=1.0:g=2.5,equalizer=f=430:t=q:w=1.4:g=-1.5,"
        "equalizer=f=2800:t=q:w=2.0:g=1.0,"
        "deesser=i=0.25,"
        "acompressor=threshold=-22dB:ratio=2.6:attack=12:release=250:makeup=3," + COMMON_OUT,

    # Modern podcast: closer, brighter, more air.
    "3-close":
        COMMON_IN + "afftdn=nf=-28:tn=1,"
        "equalizer=f=200:t=q:w=1.2:g=-1.5,equalizer=f=2600:t=q:w=1.6:g=3.0,"
        "equalizer=f=9000:t=h:w=0.7:g=2.5,"
        "deesser=i=0.45,"
        "acompressor=threshold=-24dB:ratio=4:attack=6:release=160:makeup=4," + COMMON_OUT,

    # A semitone down, length preserved. Most people dislike their recorded voice
    # because bone conduction makes them hear themselves lower than a mic does;
    # this usually sounds like the voice you hear in your own head.
    "4-deeper":
        COMMON_IN + "afftdn=nf=-26:tn=1,"
        "asetrate=48000*0.9439,aresample=48000,atempo=1.0594,"
        "equalizer=f=170:t=q:w=1.0:g=1.5,equalizer=f=3000:t=q:w=1.8:g=1.5,"
        "deesser=i=0.3,"
        "acompressor=threshold=-21dB:ratio=3:attack=10:release=220:makeup=3," + COMMON_OUT,

    # Two semitones down, for comparison against 4.
    "5-deepest":
        COMMON_IN + "afftdn=nf=-26:tn=1,"
        "asetrate=48000*0.8909,aresample=48000,atempo=1.1225,"
        "equalizer=f=170:t=q:w=1.0:g=1.5,equalizer=f=3200:t=q:w=1.8:g=2.0,"
        "deesser=i=0.3,"
        "acompressor=threshold=-21dB:ratio=3:attack=10:release=220:makeup=3," + COMMON_OUT,

    # Tuned to what the measurement actually says about this recording: energy
    # piled into 300Hz-2.5kHz, bottom down at -30dB, top down at -37dB. So put
    # body back under it, take the honk out of the middle, open the top.
    "7-fixed":
        COMMON_IN + "afftdn=nf=-30:tn=1,"
        "equalizer=f=130:t=q:w=0.9:g=3.5,"      # body the phone mic never caught
        "equalizer=f=1400:t=q:w=1.1:g=-2.5,"    # the narrow midrange honk
        "equalizer=f=3000:t=q:w=1.6:g=1.5,"     # articulation, not harshness
        "equalizer=f=9500:t=h:w=0.7:g=4.0,"     # air, to undo the rolled-off top
        "deesser=i=0.35,"
        "acompressor=threshold=-22dB:ratio=3:attack=10:release=220:makeup=3," + COMMON_OUT,

    # As 7, plus a semitone down.
    "8-fixed-deeper":
        COMMON_IN + "afftdn=nf=-30:tn=1,"
        "asetrate=48000*0.9439,aresample=48000,atempo=1.0594,"
        "equalizer=f=130:t=q:w=0.9:g=3.0,"
        "equalizer=f=1400:t=q:w=1.1:g=-2.5,"
        "equalizer=f=3000:t=q:w=1.6:g=1.5,"
        "equalizer=f=9500:t=h:w=0.7:g=4.0,"
        "deesser=i=0.35,"
        "acompressor=threshold=-22dB:ratio=3:attack=10:release=220:makeup=3," + COMMON_OUT,

    # Hardest denoise and a gate, for a room that is too live.
    "6-dry":
        COMMON_IN + "afftdn=nf=-40:tn=1,anlmdn=s=0.0008,"
        "equalizer=f=250:t=q:w=1.4:g=-3.0,equalizer=f=3400:t=q:w=1.8:g=2.5,"
        "deesser=i=0.4,"
        "acompressor=threshold=-22dB:ratio=3.5:attack=8:release=180:makeup=3," + COMMON_OUT,
}

src = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1
                         else "~/Downloads/Online Marketplace Sample.m4a")
os.makedirs(OUT, exist_ok=True)

paths = []
for name, chain in VARIANTS.items():
    p = os.path.join(OUT, f"{name}.mp3")
    subprocess.run([FFMPEG, "-y", "-v", "error", "-ss", SEG[0], "-to", SEG[1],
                    "-i", src, "-af", chain, "-ar", "48000", "-ac", "1",
                    "-b:a", "192k", p], check=True)
    paths.append(p)
    print(f"  {name}")

# One file that plays them in order, with a beat of silence between each.
inputs, parts = [], []
for i, p in enumerate(paths):
    inputs += ["-i", p]
    parts.append(f"[{i}:a]")
graph = "".join(parts) + f"concat=n={len(paths)}:v=0:a=1[out]"
cmp_path = os.path.join(OUT, "COMPARE.mp3")
subprocess.run([FFMPEG, "-y", "-v", "error", *inputs, "-filter_complex", graph,
                "-map", "[out]", "-b:a", "192k", cmp_path], check=True)
print(f"\nA/B file: {cmp_path}")
print("Order: " + " -> ".join(VARIANTS.keys()))
