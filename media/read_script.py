#!/usr/bin/env python3
"""Print the read-aloud sheet for a narration spec.

    python3 read_script.py [narration-short.json] [--out ~/Downloads/narration-script.txt]

Generated from the spec rather than typed out, so the sheet and the film can
never drift. Numbers stay spelled out because that is how they should be said.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if not a.startswith("--")]
spec_name = args[0] if args else "narration-short.json"
spec = json.load(open(os.path.join(HERE, spec_name)))

W = 74
BAR = "=" * W

n = len(spec["lines"])
label = ("48 second social cut, for LinkedIn" if n < 12
         else "full film, 2 minutes 20, for the project site")

pace = ("Aim for roughly 40 to 45 seconds of speech, pauses excluded."
        if n < 12 else
        "This one is longer, about 2 minutes of speech. Take a sip of water\n  between chapters. If you need a break, stop the recording and start a\n  second one; just tell me, and I will ingest them in order.")

head = f"""{BAR}
  NARRATION SCRIPT
  "When Demand Exceeds Supply" - {label}
  {n} lines
{BAR}

  HOW TO RECORD

  Room     Somewhere soft. Bedroom, curtains, sofa. Not a kitchen or a
           bathroom, and not a room with bare walls.
  Phone    Voice Memos. About 20cm away, slightly OFF TO THE SIDE of your
           mouth, not straight on.
  Quiet    Fans and AC off, windows shut, Do Not Disturb on.
  Take     Read all {n} lines in ONE recording.

  THE ONLY RULE THAT MATTERS

  Leave a clear pause of about 1.5 seconds BETWEEN lines, and no long
  pause INSIDE a line. That silence is what the split is cut on.
  Fluff a line? Pause, say it again from the start, and carry on. Just
  tell me, and I will check the split before building.

  DELIVERY

  Talk to one person across a table. Do not announce it. A touch slower
  than normal conversation. Let the last word of each line land instead
  of trailing off. The last line is the one to under-play.

  {pace}

{BAR}
"""

body = []
for i, line in enumerate(spec["lines"], 1):
    body.append(f"\n  [{i}]\n\n      {line['text']}\n\n      ....... pause, about 1.5 seconds .......\n")

tail = f"""
{BAR}
  WHEN YOU ARE DONE

  Share > Save to Files > Downloads, then tell me the filename.
{BAR}
"""

out = head + "".join(body) + tail
print(out)

if "--out" in sys.argv:
    dst = os.path.expanduser(sys.argv[sys.argv.index("--out") + 1])
    open(dst, "w").write(out)
    print(f"written to {dst}")
