#!/usr/bin/env bash
# Render one episode: ./render.sh 01   (needs KOKORO_DIR for the narration)
set -euo pipefail
KOKORO_DIR=${KOKORO_DIR:-/tmp/claude-0/-home-user-anno-website/b8b10682-fbba-58ae-a91d-db24e46e626a/scratchpad/kokoro}
cd "$(dirname "$0")"
EP=$1; SLUG=$(python3 -c "import json;print(json.load(open('eps/ep$EP.json'))['slug'])")
mkdir -p segments/$EP eps/out videos
if python3 -c "import json,sys;sys.exit(0 if json.load(open('eps/ep$EP.json')).get('fast') else 1)"; then
  python3 voice.py $EP "$KOKORO_DIR" --fast --voice ${VOICE:-am_michael} --speed ${SPEED:-1.12}
  python3 audio.py $EP
  TOTAL=$(python3 -c "import json,math;print(math.ceil(json.load(open('eps/out/ep${EP}_vo.json'))['dur']*30))")
else
  python3 audio.py $EP
  python3 voice.py $EP "$KOKORO_DIR"
  TOTAL=1800
fi
PARTS=4; STEP=$(((TOTAL + PARTS - 1) / PARTS)); pids=()
for i in $(seq 0 $((PARTS - 1))); do
  EP=$EP node capture.mjs --range $((i * STEP)) $(( (i + 1) * STEP < TOTAL ? (i + 1) * STEP : TOTAL )) segments/$EP/seg$i.mp4 > segments/$EP/seg$i.log 2>&1 & pids+=($!)
done
for p in "${pids[@]}"; do wait "$p"; done
: > segments/$EP/list.txt
for i in $(seq 0 $((PARTS - 1))); do echo "file 'seg$i.mp4'" >> segments/$EP/list.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i segments/$EP/list.txt -i eps/out/ep${EP}_mix.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -b:v 7M -maxrate 10M -bufsize 14M -pix_fmt yuv420p -profile:v high \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart videos/ep$EP-$SLUG.mp4
rm -rf segments/$EP
echo "done ep$EP"
