#!/usr/bin/env bash
# Render one episode: ./render.sh 01   (needs KOKORO_DIR for the narration)
set -euo pipefail
cd "$(dirname "$0")"
EP=$1; SLUG=$(python3 -c "import json;print(json.load(open('eps/ep$EP.json'))['slug'])")
mkdir -p segments/$EP eps/out videos
python3 audio.py $EP
python3 voice.py $EP "$KOKORO_DIR"
TOTAL=1800; PARTS=4; STEP=$((TOTAL / PARTS)); pids=()
for i in $(seq 0 $((PARTS - 1))); do
  EP=$EP node capture.mjs --range $((i * STEP)) $(((i + 1) * STEP)) segments/$EP/seg$i.mp4 > segments/$EP/seg$i.log 2>&1 & pids+=($!)
done
for p in "${pids[@]}"; do wait "$p"; done
: > segments/$EP/list.txt
for i in $(seq 0 $((PARTS - 1))); do echo "file 'seg$i.mp4'" >> segments/$EP/list.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i segments/$EP/list.txt -i eps/out/ep${EP}_mix.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -b:v 7M -maxrate 10M -bufsize 14M -pix_fmt yuv420p -profile:v high \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart videos/ep$EP-$SLUG.mp4
rm -rf segments/$EP
echo "done ep$EP"
