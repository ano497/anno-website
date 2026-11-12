#!/usr/bin/env bash
# Renders the 60s short in 4 parallel segments, joins them and adds the sound design.
set -euo pipefail
cd "$(dirname "$0")"
python3 audio.py
mkdir -p segments
TOTAL=1800; PARTS=4; STEP=$((TOTAL / PARTS))
pids=()
for i in $(seq 0 $((PARTS - 1))); do
  node capture.mjs --range $((i * STEP)) $(((i + 1) * STEP)) segments/seg$i.mp4 > segments/seg$i.log 2>&1 &
  pids+=($!)
done
for p in "${pids[@]}"; do wait "$p"; done
: > segments/list.txt
for i in $(seq 0 $((PARTS - 1))); do echo "file 'seg$i.mp4'" >> segments/list.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i segments/list.txt -i audio.wav -map 0:v -map 1:a -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart part2_master.mp4
echo done
# web-size encode (grain makes CRF masters huge) + narrated version
ffmpeg -y -loglevel error -i part2_master.mp4 -c:v libx264 -preset slow -b:v 9M -maxrate 12M -bufsize 18M -pix_fmt yuv420p -profile:v high -c:a copy -movflags +faststart locked-in-the-mall-part2.mp4
if [ -n "${KOKORO_DIR:-}" ]; then
  python3 voice.py "$KOKORO_DIR" --tag _v3 --voice am_onyx --speed 0.86 --pitch -1 --room 0.2
  ffmpeg -y -loglevel error -i locked-in-the-mall-part2.mp4 -i audio_vo_v3.wav -map 0:v -map 1:a -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart locked-in-the-mall-part2-voiced.mp4
fi
rm -f part2_master.mp4
echo all-done
