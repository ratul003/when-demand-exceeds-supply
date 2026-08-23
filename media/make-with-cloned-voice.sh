#!/bin/bash
# Rebuild BOTH films using Wahid's cloned voice.
#
#   1. put the ElevenLabs key in ~/Downloads/Claude/el_key.txt
#   2. ./make-with-cloned-voice.sh
#
# Clones from clone-source.wav the first time, then reuses that voice. The key
# is read, used, and left for you to delete; it is never printed.
set -euo pipefail
cd "$(dirname "$0")"

KEY=~/Downloads/Claude/el_key.txt
[ -f "$KEY" ] || { echo "No key at $KEY"; exit 1; }

echo "── account"
python3 el_voices.py | tee /tmp/el_voices.txt

VOICE_ID="$(python3 - <<'PY'
import json, pathlib, re
spec = json.loads(pathlib.Path('narration-short.json').read_text())
vid = spec.get('elevenlabs', {}).get('voice_id')
if vid:
    print(vid); raise SystemExit
# reuse a voice already on the account if one looks like his
for line in open('/tmp/el_voices.txt'):
    m = re.match(r'\s+([a-zA-Z0-9]{16,})\s+(\S+)\s+(cloned|generated)', line)
    if m and 'wahid' in m.group(2).lower():
        print(m.group(1)); raise SystemExit
PY
)"

if [ -z "$VOICE_ID" ]; then
  echo "── cloning from clone-source.wav"
  [ -f clone-source.wav ] || { echo "run prep_clone_sample.py first"; exit 1; }
  VOICE_ID="$(python3 el_voices.py clone "Wahid" clone-source.wav | sed -n 's/.*voice_id: //p')"
fi
echo "── voice: $VOICE_ID"

python3 - "$VOICE_ID" <<'PY'
import json, pathlib, sys
vid = sys.argv[1]
for f in ('narration.json', 'narration-short.json'):
    p = pathlib.Path(f); d = json.loads(p.read_text())
    d['elevenlabs']['voice_id'] = vid
    p.write_text(json.dumps(d, indent=2) + "\n")
print("voice_id written into both specs")
PY

if ! curl -sf -o /dev/null http://localhost:4311/; then
  (cd .. && npx next start -p 4311 > media/server.log 2>&1 &)
  until curl -sf -o /dev/null http://localhost:4311/; do sleep 1; done
fi

for SPEC in narration-short.json narration.json; do
  STEM=$([ "$SPEC" = "narration.json" ] && echo "" || echo "-short")
  echo "── ${SPEC}: generating in the cloned voice"
  rm -f "vo${STEM}"/*.mp3
  python3 build_vo.py "$SPEC" --voice elevenlabs
done

echo "── recording both cuts"
node capture-short.mjs
node capture.mjs

echo "── mixing"
python3 build_film.py short
python3 build_film.py

cp film-short.mp4 ~/Downloads/when-demand-linkedin-49s.mp4
cp film.mp4 ../public/film.mp4
cp poster.jpg ../public/film-poster.jpg
echo
echo "Done. Short -> ~/Downloads/when-demand-linkedin-49s.mp4"
echo "      Long  -> public/film.mp4 (commit + push to publish)"
echo "Delete the key when you are happy: rm ~/Downloads/Claude/el_key.txt"
