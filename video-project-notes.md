# Animated Story Channel – Project Notes

Saved from a Claude Code session on 2026-11-15 so work can continue on another device.

## Goal
- 2D animated story videos inspired by (not copying) the YouTube channel **Ifverse (@IfverseTales)**.
- The user's own stories, all on one theme.
- Horizontal, target ~10 min (recommended start: 2–4 min episodes, then scale up).
- **No AI voice.** The focus is animation plus sound: character sighs, grunts, throws, foley.
- Everything must be **free**.
- Claude does all the production work; the finished MP4 is delivered in the chat.

## Observed style (from one screenshot only – channel not yet reviewed)
- Flat 2D vector art, simple shapes, no textures.
- Characters seen from behind / faceless (e.g. yellow hoodie, headphones, gaming at a desk).
- Blue rim-light outlines on characters; dark purple/navy rooms.
- Scenes inside scenes (cartoon game city with palm trees and a "$212" counter on the monitor).
- Ifverse is narration-driven; this project is NOT (no narrator), so acting and sound must carry the story.

## Constraints found
- YouTube is blocked from the cloud session, so Claude cannot watch the channel. The user must upload clips or screenshots.
- The user's PC folder (AnisPC / 3d-video-studio) is not offered to cloud sessions (likely an outdated Claude app or a hidden-folder path).
- Blender is not needed: the plan is Motion Canvas or Remotion (code-based 2D animation) plus ffmpeg, rendered in the cloud container.
- Human sounds (sighs, grunts, laughs): the user records them on a phone (free, not AI).
- Other SFX: synthesized in code. Music: YouTube Audio Library (user downloads) or simple tracks made in code.
- Don't use real game names or logos (e.g. GTA); draw generic versions.
- The chat's upload limit for files is unknown; 10 min 1080p is ~100–300 MB and may need splitting.

## Plan
1. The user answers the checklist below and sends the first story.
2. Claude writes the shot list with timed action and sound cues, plus a list of human sounds to record.
3. Claude renders a 30-second test scene and sends it in the chat.
4. The user approves the look; Claude builds the full episode and sends the MP4.

## Question checklist (answer like `1b 2a 3c`, ✏️ = short text)

**STORY**
1. First story in 2–5 sentences (who, what happens, ending) ✏️
2. Genre: a) funny b) sad/emotional c) dark/creepy d) adventure e) mix ✏️
3. Episode length to start: a) 2–3 min b) 4–5 min c) straight to 10 min

**SOUND AND VOICE**
4. Do characters talk? a) no, only sounds and acting b) yes, in the user's voice c) a few words only
5. OK to record sighs and grunts on a phone? a) yes b) no, sounds only, no human sounds
6. Music: a) YouTube Audio Library b) Claude makes simple ones in code c) none

**MAIN CHARACTER**
7. Gender/age ✏️
8. Face: a) faceless/silhouette b) simple dots for eyes c) full expressive face
9. Signature look (hoodie colour, hair, item) ✏️
10. Other recurring characters? a) none b) yes ✏️

**WORLD AND STYLE**
11. Setting: a) city b) small town c) bedroom/home d) fantasy e) other ✏️
12. Colours: a) purple/blue night b) warm orange/sunset c) green/nature d) Claude chooses
13. Lighting: a) dark with glowing outlines b) bright and clean c) mixed
14. Camera: a) mostly still with slow zooms b) lots of movement and cuts

**CHANNEL**
15. Channel name ✏️
16. Titles like "What if…"? a) yes b) no, story titles c) not sure
17. a) one series with the same character b) separate stories

**BONUS:** 3–5 screenshots of Ifverse moments the user likes.

## Status
Waiting for the user's answers and first story.
