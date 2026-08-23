#!/bin/bash
# Rebuild the 48s social cut using a real recording instead of the TTS voice.
#
#   ./make-short-with-my-voice.sh ~/Downloads/narration.m4a
#
# Everything downstream re-times itself, because the beat sheet is keyed to
# narration line ids rather than timestamps.
set -euo pipefail
cd "$(dirname "$0")"

REC="${1:?usage: ./make-short-with-my-voice.sh <recording.m4a>}"

echo "── 1/5  splitting and cleaning the recording"
python3 ingest_voice.py "$REC"

echo "── 2/5  measuring lines and stitching the narration"
python3 build_vo.py narration-short.json --require-cached

echo "── 3/5  starting the site locally"
if ! curl -sf -o /dev/null http://localhost:4311/; then
  (cd .. && npx next start -p 4311 > media/server.log 2>&1 &)
  until curl -sf -o /dev/null http://localhost:4311/; do sleep 1; done
fi

echo "── 4/5  recording the picture against the new timings"
node capture-short.mjs

echo "── 5/5  mixing and encoding"
python3 build_film.py short

cp film-short.mp4 ~/Downloads/when-demand-linkedin-48s.mp4
echo
echo "Done -> ~/Downloads/when-demand-linkedin-48s.mp4"
