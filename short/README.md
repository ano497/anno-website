# Nothing Ever Happens: vertical short

A 22-second, 1080×1920 vertical short in the "in my town everything is normal" style:
a blocky 3D suburban town, slow handheld camera moves with depth of field, a day-to-night
switch, and big one-phrase-at-a-time captions.

Everything (town, character, vehicles) is built from primitives in three.js and rendered
frame by frame in headless Chromium, then encoded with ffmpeg.

- `scene.js`: the town, the character, the 6 shots and the caption timings (`CAPTIONS`)
- `index.html`: the stage and caption styling
- `capture.mjs`: renders `nothing-ever-happens.mp4`

```
npm install
node capture.mjs                    # full video (about 10–15 min on CPU)
node capture.mjs --stills 1.5,6,13  # spot-check single frames into stills/
```

The video has a silent audio track. Add the trending sound in TikTok's sound picker when posting.
To change the words, edit `CAPTIONS` in `scene.js`. Each entry is `[start, end, text]` in seconds.
