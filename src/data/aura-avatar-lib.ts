/* THE FACES. The ids are frozen — they live in user_metadata.avatarId and
   in every signed thread (a_face / b_face, 0011), on phones running older
   builds too — so a new set of pictures is drawn BEHIND the old ids rather
   than under new ones (owner's redraw, 2026-10-15: 1024 masters, full-bleed
   colour, made for the chat circle; design/avatar-redo/). 44 old ids took
   the new portrait closest in look; the six whose closest match would have
   been two shades darker keep their old portrait (`legacy`: still drawn for
   whoever chose it, no longer offered), and the six new portraits those
   would have taken got ids of their own (f-76…f-81). The mapping is in
   design/avatar-redo/mapping.json. The old pixelation rungs (-p1/-p2/-p3)
   were unused and are gone. The web copy is app/faces-lib.js + /faces. */

import { hashStr } from "../lib/format";

export interface AuraAvatarDef {
  id: string;
  pool: "m" | "f";
  /** the archetype's number in the owner's library doc (01–75) */
  n: number;
  name: string;
  src: number;
  /** an old portrait kept for whoever chose it, no longer offered */
  legacy?: true;
}

export const AURA_AVATARS: AuraAvatarDef[] = [
  { id: "f-02-tender-thinker", pool: "f", n: 2, name: "wolf cut", src: require("../../assets/aura-avatars/f-02-tender-thinker.png") },
  { id: "f-04-tiny-detail-collector", pool: "f", n: 4, name: "tiny detail collector", src: require("../../assets/aura-avatars/f-04-tiny-detail-collector.png"), legacy: true },
  { id: "f-06-soft-spoken-poet", pool: "f", n: 6, name: "long center part", src: require("../../assets/aura-avatars/f-06-soft-spoken-poet.png") },
  { id: "f-08-gentle-confessor", pool: "f", n: 8, name: "hijab forest", src: require("../../assets/aura-avatars/f-08-gentle-confessor.png") },
  { id: "f-09-thought-wanderer", pool: "f", n: 9, name: "thought wanderer", src: require("../../assets/aura-avatars/f-09-thought-wanderer.png"), legacy: true },
  { id: "f-13-open-heart", pool: "f", n: 13, name: "short coils", src: require("../../assets/aura-avatars/f-13-open-heart.png") },
  { id: "f-14-hidden-poet", pool: "f", n: 14, name: "blue bangs", src: require("../../assets/aura-avatars/f-14-hidden-poet.png") },
  { id: "f-18-quiet-romantic", pool: "f", n: 18, name: "high pony", src: require("../../assets/aura-avatars/f-18-quiet-romantic.png") },
  { id: "f-20-bright-spark", pool: "f", n: 20, name: "hijab rose", src: require("../../assets/aura-avatars/f-20-bright-spark.png") },
  { id: "f-25-memory-keeper", pool: "f", n: 25, name: "afro", src: require("../../assets/aura-avatars/f-25-memory-keeper.png") },
  { id: "f-27-inner-narrator", pool: "f", n: 27, name: "blunt bob", src: require("../../assets/aura-avatars/f-27-inner-narrator.png") },
  { id: "f-30-soft-rebel", pool: "f", n: 30, name: "cornrows", src: require("../../assets/aura-avatars/f-30-soft-rebel.png") },
  { id: "f-31-detail-romantic", pool: "f", n: 31, name: "curtain wavy", src: require("../../assets/aura-avatars/f-31-detail-romantic.png") },
  { id: "f-34-nervous-poet", pool: "f", n: 34, name: "red shag", src: require("../../assets/aura-avatars/f-34-nervous-poet.png") },
  { id: "f-37-dream-chaser", pool: "f", n: 37, name: "dream chaser", src: require("../../assets/aura-avatars/f-37-dream-chaser.png"), legacy: true },
  { id: "f-39-emotional-cartographer", pool: "f", n: 39, name: "twin braids", src: require("../../assets/aura-avatars/f-39-emotional-cartographer.png") },
  { id: "f-41-fragment-maker", pool: "f", n: 41, name: "beanie long", src: require("../../assets/aura-avatars/f-41-fragment-maker.png") },
  { id: "f-46-small-wonderer", pool: "f", n: 46, name: "big curls", src: require("../../assets/aura-avatars/f-46-small-wonderer.png") },
  { id: "f-48-tender-archivist", pool: "f", n: 48, name: "lavender bob", src: require("../../assets/aura-avatars/f-48-tender-archivist.png") },
  { id: "f-50-still-water", pool: "f", n: 50, name: "still water", src: require("../../assets/aura-avatars/f-50-still-water.png"), legacy: true },
  { id: "f-54-late-night-letterer", pool: "f", n: 54, name: "headphones long", src: require("../../assets/aura-avatars/f-54-late-night-letterer.png") },
  { id: "f-59-mood-catcher", pool: "f", n: 59, name: "mood catcher", src: require("../../assets/aura-avatars/f-59-mood-catcher.png"), legacy: true },
  { id: "f-68-soft-focus", pool: "f", n: 68, name: "platinum pixie", src: require("../../assets/aura-avatars/f-68-soft-focus.png") },
  { id: "f-73-heart-on-sleeve", pool: "f", n: 73, name: "sleek low pony", src: require("../../assets/aura-avatars/f-73-heart-on-sleeve.png") },
  { id: "f-75-living-diary", pool: "f", n: 75, name: "living diary", src: require("../../assets/aura-avatars/f-75-living-diary.png"), legacy: true },
  { id: "m-01-quiet-observer", pool: "m", n: 1, name: "fade glasses", src: require("../../assets/aura-avatars/m-01-quiet-observer.png") },
  { id: "m-05-midnight-thinker", pool: "m", n: 5, name: "blue mullet", src: require("../../assets/aura-avatars/m-05-midnight-thinker.png") },
  { id: "m-07-sharp-observer", pool: "m", n: 7, name: "long center", src: require("../../assets/aura-avatars/m-07-sharp-observer.png") },
  { id: "m-10-sentence-architect", pool: "m", n: 10, name: "undercut sweep", src: require("../../assets/aura-avatars/m-10-sentence-architect.png") },
  { id: "m-11-minimalist", pool: "m", n: 11, name: "buzz", src: require("../../assets/aura-avatars/m-11-minimalist.png") },
  { id: "m-15-curious-mind", pool: "m", n: 15, name: "high top", src: require("../../assets/aura-avatars/m-15-curious-mind.png") },
  { id: "m-16-pattern-finder", pool: "m", n: 16, name: "curly mid", src: require("../../assets/aura-avatars/m-16-pattern-finder.png") },
  { id: "m-19-dry-wit", pool: "m", n: 19, name: "side part", src: require("../../assets/aura-avatars/m-19-dry-wit.png") },
  { id: "m-21-long-distance-thinker", pool: "m", n: 21, name: "twists", src: require("../../assets/aura-avatars/m-21-long-distance-thinker.png") },
  { id: "m-22-little-rebel", pool: "m", n: 22, name: "spiky", src: require("../../assets/aura-avatars/m-22-little-rebel.png") },
  { id: "m-24-plainspoken-soul", pool: "m", n: 24, name: "pompadour", src: require("../../assets/aura-avatars/m-24-plainspoken-soul.png") },
  { id: "m-26-scene-painter", pool: "m", n: 26, name: "broccoli", src: require("../../assets/aura-avatars/m-26-scene-painter.png") },
  { id: "m-28-questioner", pool: "m", n: 28, name: "headphones curls", src: require("../../assets/aura-avatars/m-28-questioner.png") },
  { id: "m-29-truth-teller", pool: "m", n: 29, name: "bald beard", src: require("../../assets/aura-avatars/m-29-truth-teller.png") },
  { id: "m-33-calm-storm", pool: "m", n: 33, name: "curtains", src: require("../../assets/aura-avatars/m-33-calm-storm.png") },
  { id: "m-35-curious-storyteller", pool: "m", n: 35, name: "afro mustache", src: require("../../assets/aura-avatars/m-35-curious-storyteller.png") },
  { id: "m-40-rhythm-rider", pool: "m", n: 40, name: "bleached buzz", src: require("../../assets/aura-avatars/m-40-rhythm-rider.png") },
  { id: "m-43-clean-thinker", pool: "m", n: 43, name: "slick quiff", src: require("../../assets/aura-avatars/m-43-clean-thinker.png") },
  { id: "m-45-everyday-philosopher", pool: "m", n: 45, name: "cornrows goatee", src: require("../../assets/aura-avatars/m-45-everyday-philosopher.png") },
  { id: "m-49-restless-mind", pool: "m", n: 49, name: "beanie curtains", src: require("../../assets/aura-avatars/m-49-restless-mind.png") },
  { id: "m-51-bright-mind", pool: "m", n: 51, name: "short locs", src: require("../../assets/aura-avatars/m-51-bright-mind.png") },
  { id: "m-56-unfiltered-voice", pool: "m", n: 56, name: "cap", src: require("../../assets/aura-avatars/m-56-unfiltered-voice.png") },
  { id: "m-60-quietly-funny-one", pool: "m", n: 60, name: "shaggy glasses", src: require("../../assets/aura-avatars/m-60-quietly-funny-one.png") },
  { id: "m-62-thoughtful-rebel", pool: "m", n: 62, name: "locs bun", src: require("../../assets/aura-avatars/m-62-thoughtful-rebel.png") },
  { id: "m-74-gentle-contrarian", pool: "m", n: 74, name: "man bun beard", src: require("../../assets/aura-avatars/m-74-gentle-contrarian.png") },
  { id: "f-76-high-bun", pool: "f", n: 76, name: "high bun", src: require("../../assets/aura-avatars/f-76-high-bun.png") },
  { id: "f-77-long-wavy", pool: "f", n: 77, name: "long wavy", src: require("../../assets/aura-avatars/f-77-long-wavy.png") },
  { id: "f-78-afro-puffs", pool: "f", n: 78, name: "afro puffs", src: require("../../assets/aura-avatars/f-78-afro-puffs.png") },
  { id: "f-79-box-braids", pool: "f", n: 79, name: "box braids", src: require("../../assets/aura-avatars/f-79-box-braids.png") },
  { id: "f-80-long-locs", pool: "f", n: 80, name: "long locs", src: require("../../assets/aura-avatars/f-80-long-locs.png") },
  { id: "f-81-space-buns", pool: "f", n: 81, name: "space buns", src: require("../../assets/aura-avatars/f-81-space-buns.png") },
];

/* Which of the 25 is yours: seeded by WHO you are and WHAT leads your
   writing — the pick can drift while the aura is still forming (it lives
   behind coarse pixels there), and settles as the leading signal does. */
/** the faces offered at onboarding and in Edit Profile — the owner's fifty
    portraits, m and f pools interleaved so the first row is never one pool */
export const FACES: AuraAvatarDef[] = (() => {
  const m = AURA_AVATARS.filter((a) => a.pool === "m" && !a.legacy);
  const f = AURA_AVATARS.filter((a) => a.pool === "f" && !a.legacy);
  const out: AuraAvatarDef[] = [];
  for (let i = 0; i < Math.max(m.length, f.length); i++) {
    if (f[i]) out.push(f[i]);
    if (m[i]) out.push(m[i]);
  }
  return out;
})();
export const getFace = (id?: string | null): AuraAvatarDef | null => AURA_AVATARS.find((a) => a.id === id) ?? null;

export function pickAuraAvatar(pool: "m" | "f", uid: string, topDimKey?: string | null): AuraAvatarDef {
  const set = AURA_AVATARS.filter((a) => a.pool === pool && !a.legacy);
  return set[hashStr("aura-av:" + uid + ":" + (topDimKey || "")) % set.length];
}
