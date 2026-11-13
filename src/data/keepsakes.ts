/* Generated from ~/Downloads/"keepsakes icons.zip" + the owner's
   Kindredly_Wren_Keepsakes_Library.md. One row per keepsake the library
   defines; `live` marks the ones whose trigger is implemented against
   real data today (lib/keepsakes.ts). The rest keep their art and their
   definition so the file doubles as the roadmap — and so nothing is ever
   minted from data we don't actually have. Do not edit by hand.
   The icons are lossless WebP made from the zip's PNGs (2026-11-13, app
   size; every pixel the same): convert new ones with
   `cwebp -lossless -z 9 -exact in.png -o out.webp`. */

export type KeepsakeCat = "Flight" | "Reply" | "Relationship" | "Writing" | "Time" | "Firsts";

export interface KeepsakeDef {
  id: string;
  name: string;
  cat: KeepsakeCat;
  /** major keepsakes earn a moment; minor ones join the archive quietly */
  major: boolean;
  icon: number;
}

export const KEEPSAKES: KeepsakeDef[] = [
  { id: "first-flight", name: "First Flight", cat: "Flight", major: true, icon: require("../../assets/keepsakes/flight-01-first-flight.webp") },
  { id: "night-flight", name: "Night Flight", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-02-night-flight.webp") },
  { id: "rainy-flight", name: "Rainy Flight", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-03-rainy-flight.webp") },
  { id: "early-bird-flight", name: "Early Bird Flight", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-04-early-bird-flight.webp") },
  { id: "long-flight", name: "Long Flight", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-05-long-flight.webp") },
  { id: "late-return", name: "Late Return", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-06-late-return.webp") },
  { id: "same-hour-twice", name: "Same Hour Twice", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-07-same-hour-twice.webp") },
  { id: "favorite-hour", name: "Favorite Hour", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-08-favorite-hour.webp") },
  { id: "favorite-day", name: "Favorite Day", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-09-favorite-day.webp") },
  { id: "first-thread", name: "First Thread", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-01-first-thread.webp") },
  { id: "first-turn-back", name: "First Turn Back", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-02-first-turn-back.webp") },
  { id: "five-letters-deep", name: "Five Letters Deep", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-03-five-letters-deep.webp") },
  { id: "you-signed-first", name: "You Signed First", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-04-you-signed-first.webp") },
  { id: "they-signed-first", name: "They Signed First", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-05-they-signed-first.webp") },
  { id: "both-names-home", name: "Both Names Home", cat: "Relationship", major: true, icon: require("../../assets/keepsakes/rel-06-both-names-home.webp") },
  { id: "first-kindred", name: "First Kindred", cat: "Relationship", major: true, icon: require("../../assets/keepsakes/rel-07-first-kindred.webp") },
  { id: "three-kindreds", name: "Three Kindreds", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-08-three-kindreds.webp") },
  { id: "five-kindreds", name: "Five Kindreds", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-09-five-kindreds.webp") },
  { id: "longest-thread", name: "Longest Thread", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-10-longest-thread.webp") },
  { id: "oldest-kindred", name: "Oldest Kindred", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-11-oldest-kindred.webp") },
  { id: "first-reconnect", name: "First Reconnect", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-12-first-reconnect.webp") },
  { id: "longest-silence-broken", name: "Longest Silence Broken", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-13-longest-silence-broken.webp") },
  { id: "kindred-anniversary", name: "Kindred Anniversary", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-14-kindred-anniversary.webp") },
  { id: "first-talk", name: "First Talk", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-15-first-talk.webp") },
  { id: "first-shared-save", name: "First Shared Save", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-16-first-shared-save.webp") },
  { id: "first-shared-theme", name: "First Shared Theme", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-17-first-shared-theme.webp") },
  { id: "first-shared-song", name: "First Shared Song", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-18-first-shared-song.webp") },
  { id: "first-shared-photo", name: "First Shared Photo", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-19-first-shared-photo.webp") },
  { id: "first-ritual", name: "First Ritual", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-20-first-ritual.webp") },
  { id: "same-sky", name: "Same Sky", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-21-same-sky.webp") },
  { id: "question-answered-twice", name: "Question Answered Twice", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-22-question-answered-twice.webp") },
  { id: "first-reply", name: "First Reply", cat: "Reply", major: true, icon: require("../../assets/keepsakes/reply-01-first-reply.webp") },
  { id: "return-home", name: "Return Home", cat: "Reply", major: false, icon: require("../../assets/keepsakes/reply-02-return-home.webp") },
  { id: "first-morning-reply", name: "First Morning Reply", cat: "Reply", major: false, icon: require("../../assets/keepsakes/reply-03-first-morning-reply.webp") },
  { id: "first-midnight-reply", name: "First Midnight Reply", cat: "Reply", major: false, icon: require("../../assets/keepsakes/reply-04-first-midnight-reply.webp") },
  { id: "word-came-back", name: "Word Came Back", cat: "Reply", major: false, icon: require("../../assets/keepsakes/reply-05-word-came-back.webp") },
  { id: "line-remembered", name: "Line Remembered", cat: "Reply", major: false, icon: require("../../assets/keepsakes/reply-06-line-remembered.webp") },
  { id: "10-letters", name: "10 Letters Carried", cat: "Time", major: false, icon: require("../../assets/keepsakes/time-01-10-letters.webp") },
  { id: "50-letters", name: "50 Letters Carried", cat: "Time", major: false, icon: require("../../assets/keepsakes/time-02-50-letters.webp") },
  { id: "100-letters", name: "100 Letters Carried", cat: "Time", major: false, icon: require("../../assets/keepsakes/time-03-100-letters.webp") },
  { id: "quiet-week", name: "Quiet Week", cat: "Time", major: false, icon: require("../../assets/keepsakes/time-04-quiet-week.webp") },
  { id: "busy-week", name: "Busy Week", cat: "Time", major: false, icon: require("../../assets/keepsakes/time-05-busy-week.webp") },
  { id: "first-anniversary", name: "First Anniversary", cat: "Time", major: true, icon: require("../../assets/keepsakes/time-06-first-anniversary.webp") },
  { id: "word-spotted", name: "Word Spotted", cat: "Writing", major: false, icon: require("../../assets/keepsakes/writing-01-word-spotted.webp") },
  { id: "returned-thought", name: "Returned Thought", cat: "Writing", major: false, icon: require("../../assets/keepsakes/writing-02-returned-thought.webp") },
  { id: "first-aura-match-note", name: "First Aura Match Note", cat: "Writing", major: false, icon: require("../../assets/keepsakes/writing-03-first-aura-match-note.webp") },
  { id: "aura-shift", name: "Aura Shift", cat: "Writing", major: false, icon: require("../../assets/keepsakes/writing-04-aura-shift.webp") },
  { id: "otis-changed", name: "Otis Changed", cat: "Writing", major: true, icon: require("../../assets/keepsakes/writing-05-otis-changed.webp") },
  { id: "first-voice-letter", name: "First Voice Letter", cat: "Writing", major: false, icon: require("../../assets/keepsakes/writing-06-first-voice-letter.webp") },
  { id: "name-seal", name: "Name Seal", cat: "Firsts", major: true, icon: require("../../assets/keepsakes/x-01-name-seal.webp") },
  { id: "first-question-seed", name: "First Question Seed", cat: "Firsts", major: false, icon: require("../../assets/keepsakes/x-02-first-question-seed.webp") },
  { id: "first-photo-kept", name: "First Photo Kept", cat: "Firsts", major: false, icon: require("../../assets/keepsakes/x-03-first-photo-kept.webp") },
  { id: "first-sealed-page", name: "First Sealed Page", cat: "Firsts", major: false, icon: require("../../assets/keepsakes/x-04-first-sealed-page.webp") },
  { id: "first-drifted-line", name: "First Drifted Line", cat: "Firsts", major: false, icon: require("../../assets/keepsakes/x-05-first-drifted-line.webp") },
  { id: "first-inside-reference", name: "First Inside Reference", cat: "Firsts", major: false, icon: require("../../assets/keepsakes/x-06-first-inside-reference.webp") },
]

export const keepsake = (id: string) => KEEPSAKES.find((k) => k.id === id) || null;
