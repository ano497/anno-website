"""Build a retention-edit episode JSON from a list of lines.
Each line gets a window sized to its word count (fast narrator pace)."""
import json, sys
def build(ep, slug, hook, lines, punch, end, amb, sfx, music):
    t = 0.0; subs = []
    for ln in lines:
        cap, spoken = (ln, ln) if isinstance(ln, str) else ln
        w = len(spoken.split()); d = round(0.3 + w * 0.33, 2)
        subs.append([round(t, 2), round(t + d, 2), cap] + ([spoken] if spoken != cap else [])); t += d
    D = {"slug": slug, "title": ["", ""], "titleUntil": 0, "subs": subs, "labels": [],
         "fast": {"K": 1, "style": "retain", "hook": hook, "punch": punch, "endCard": {"text": end, "dur": 1.8}},
         "amb": [[a * 1.0, b, k] for a, b, k in amb], "sfx": sfx, "music": music}
    json.dump(D, open(f'eps/ep{ep}.json', 'w'), indent=1, ensure_ascii=False)
    print(ep, 'story', round(t, 1), 's')
    return subs
