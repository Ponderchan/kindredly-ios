/* AUTO-GENERATED from design/moods-line by scripts/import-mood-art.mjs — do not edit.
   grid 24, template ink #000000. After the drawings change, run: node scripts/import-mood-art.mjs
   (then node scripts/gen-mood-art-swift.mjs for the Swift copy).

   The mood icons as one-colour line faces (owner, 2026-10-16): each icon's marks on the 24 grid,
   every one a path in the template ink. MoodFace (screens/notes/notes-glyphs) and KMoodArt (Swift)
   paint them in the group's face ink and scale each stroke (2) by the size's step (2.4 / 2.0 /
   1.75); the tile behind them is the app's. Keys are moods.ts moodArtKey's: mood-<face> and
   mood-group-<group>. An icon not here is drawn as its group's icon, then as the 10a line face;
   the thirty old faces stay in data/mood-art.ts (60 grid) until they are redrawn.

   Imported: 4 of 34 — mood-group-calm, mood-group-happy, mood-group-tired, mood-group-low.
   Not delivered yet: 30 — mood-calm, mood-content, mood-pleased, mood-okay, mood-shy,
     mood-cheerful, mood-delighted, mood-excited, mood-playful, mood-in-love, mood-amazed,
     mood-surprised, mood-smug, mood-mischievous, mood-sleepy, mood-drained, mood-numb, mood-meh,
     mood-over-it, mood-unimpressed, mood-nervous, mood-crying, mood-heartbroken, mood-shocked,
     mood-stunned, mood-frustrated, mood-irritable, mood-grumpy, mood-angry, mood-mad.
   Rejected by the checks: none. */
export interface LineShape { t: "p"; d: string; f: string; s?: string; sw?: string; lc?: string; lj?: string }
export const MOOD_LINE_GRID = 24;
export const MOOD_LINE_INK = "#000000";
export const MOOD_LINE_ART: Readonly<Record<string, readonly LineShape[]>> = {"mood-group-calm":[{"t":"p","d":"M7,10.5a1.5,1.5 0 1 0 3,0a1.5,1.5 0 1 0 -3,0Z","f":"#000000"},{"t":"p","d":"M14,10.5a1.5,1.5 0 1 0 3,0a1.5,1.5 0 1 0 -3,0Z","f":"#000000"},{"t":"p","d":"M8 14.75c1.2 1.4 2.6 2 4 2s2.8-.6 4-2","f":"none","s":"#000000","sw":"2","lc":"round","lj":"round"}],"mood-group-happy":[{"t":"p","d":"M6.25 11c.9-1.6 2.6-1.6 3.5 0","f":"none","s":"#000000","sw":"2","lc":"round","lj":"round"},{"t":"p","d":"M14.25 11c.9-1.6 2.6-1.6 3.5 0","f":"none","s":"#000000","sw":"2","lc":"round","lj":"round"},{"t":"p","d":"M7.5 14.75c1.5 2.2 3 3 4.5 3s3-.8 4.5-3","f":"none","s":"#000000","sw":"2","lc":"round","lj":"round"}],"mood-group-tired":[{"t":"p","d":"M6.25 10.5h3.5","f":"none","s":"#000000","sw":"2","lc":"round","lj":"round"},{"t":"p","d":"M14.25 10.5h3.5","f":"none","s":"#000000","sw":"2","lc":"round","lj":"round"},{"t":"p","d":"M10.5 15.5h3","f":"none","s":"#000000","sw":"2","lc":"round","lj":"round"}],"mood-group-low":[{"t":"p","d":"M7,10.5a1.5,1.5 0 1 0 3,0a1.5,1.5 0 1 0 -3,0Z","f":"#000000"},{"t":"p","d":"M14,10.5a1.5,1.5 0 1 0 3,0a1.5,1.5 0 1 0 -3,0Z","f":"#000000"},{"t":"p","d":"M8 17c1.2-1.4 2.6-2 4-2s2.8.6 4 2","f":"none","s":"#000000","sw":"2","lc":"round","lj":"round"}]};
