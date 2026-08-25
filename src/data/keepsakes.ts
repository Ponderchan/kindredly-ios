/* Generated from ~/Downloads/"keepsakes icons.zip" + the owner's
   Kindredly_Wren_Keepsakes_Library.md. One row per keepsake the library
   defines; `live` marks the ones whose trigger is implemented against
   real data today (lib/keepsakes.ts). The rest keep their art and their
   definition so the file doubles as the roadmap — and so nothing is ever
   minted from data we don't actually have. Do not edit by hand. */

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
  { id: "first-flight", name: "First Flight", cat: "Flight", major: true, icon: require("../../assets/keepsakes/flight-01-first-flight.png") },
  { id: "night-flight", name: "Night Flight", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-02-night-flight.png") },
  { id: "rainy-flight", name: "Rainy Flight", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-03-rainy-flight.png") },
  { id: "early-bird-flight", name: "Early Bird Flight", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-04-early-bird-flight.png") },
  { id: "long-flight", name: "Long Flight", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-05-long-flight.png") },
  { id: "late-return", name: "Late Return", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-06-late-return.png") },
  { id: "same-hour-twice", name: "Same Hour Twice", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-07-same-hour-twice.png") },
  { id: "favorite-hour", name: "Favorite Hour", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-08-favorite-hour.png") },
  { id: "favorite-day", name: "Favorite Day", cat: "Flight", major: false, icon: require("../../assets/keepsakes/flight-09-favorite-day.png") },
  { id: "first-thread", name: "First Thread", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-01-first-thread.png") },
  { id: "first-turn-back", name: "First Turn Back", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-02-first-turn-back.png") },
  { id: "five-letters-deep", name: "Five Letters Deep", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-03-five-letters-deep.png") },
  { id: "you-signed-first", name: "You Signed First", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-04-you-signed-first.png") },
  { id: "they-signed-first", name: "They Signed First", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-05-they-signed-first.png") },
  { id: "both-names-home", name: "Both Names Home", cat: "Relationship", major: true, icon: require("../../assets/keepsakes/rel-06-both-names-home.png") },
  { id: "first-kindred", name: "First Kindred", cat: "Relationship", major: true, icon: require("../../assets/keepsakes/rel-07-first-kindred.png") },
  { id: "three-kindreds", name: "Three Kindreds", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-08-three-kindreds.png") },
  { id: "five-kindreds", name: "Five Kindreds", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-09-five-kindreds.png") },
  { id: "longest-thread", name: "Longest Thread", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-10-longest-thread.png") },
  { id: "oldest-kindred", name: "Oldest Kindred", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-11-oldest-kindred.png") },
  { id: "first-reconnect", name: "First Reconnect", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-12-first-reconnect.png") },
  { id: "longest-silence-broken", name: "Longest Silence Broken", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-13-longest-silence-broken.png") },
  { id: "kindred-anniversary", name: "Kindred Anniversary", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-14-kindred-anniversary.png") },
  { id: "first-talk", name: "First Talk", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-15-first-talk.png") },
  { id: "first-shared-save", name: "First Shared Save", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-16-first-shared-save.png") },
  { id: "first-shared-theme", name: "First Shared Theme", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-17-first-shared-theme.png") },
  { id: "first-shared-song", name: "First Shared Song", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-18-first-shared-song.png") },
  { id: "first-shared-photo", name: "First Shared Photo", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-19-first-shared-photo.png") },
  { id: "first-ritual", name: "First Ritual", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-20-first-ritual.png") },
  { id: "same-sky", name: "Same Sky", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-21-same-sky.png") },
  { id: "question-answered-twice", name: "Question Answered Twice", cat: "Relationship", major: false, icon: require("../../assets/keepsakes/rel-22-question-answered-twice.png") },
  { id: "first-reply", name: "First Reply", cat: "Reply", major: true, icon: require("../../assets/keepsakes/reply-01-first-reply.png") },
  { id: "return-home", name: "Return Home", cat: "Reply", major: false, icon: require("../../assets/keepsakes/reply-02-return-home.png") },
  { id: "first-morning-reply", name: "First Morning Reply", cat: "Reply", major: false, icon: require("../../assets/keepsakes/reply-03-first-morning-reply.png") },
  { id: "first-midnight-reply", name: "First Midnight Reply", cat: "Reply", major: false, icon: require("../../assets/keepsakes/reply-04-first-midnight-reply.png") },
  { id: "word-came-back", name: "Word Came Back", cat: "Reply", major: false, icon: require("../../assets/keepsakes/reply-05-word-came-back.png") },
  { id: "line-remembered", name: "Line Remembered", cat: "Reply", major: false, icon: require("../../assets/keepsakes/reply-06-line-remembered.png") },
  { id: "10-letters", name: "10 Letters Carried", cat: "Time", major: false, icon: require("../../assets/keepsakes/time-01-10-letters.png") },
  { id: "50-letters", name: "50 Letters Carried", cat: "Time", major: false, icon: require("../../assets/keepsakes/time-02-50-letters.png") },
  { id: "100-letters", name: "100 Letters Carried", cat: "Time", major: false, icon: require("../../assets/keepsakes/time-03-100-letters.png") },
  { id: "quiet-week", name: "Quiet Week", cat: "Time", major: false, icon: require("../../assets/keepsakes/time-04-quiet-week.png") },
  { id: "busy-week", name: "Busy Week", cat: "Time", major: false, icon: require("../../assets/keepsakes/time-05-busy-week.png") },
  { id: "first-anniversary", name: "First Anniversary", cat: "Time", major: true, icon: require("../../assets/keepsakes/time-06-first-anniversary.png") },
  { id: "word-spotted", name: "Word Spotted", cat: "Writing", major: false, icon: require("../../assets/keepsakes/writing-01-word-spotted.png") },
  { id: "returned-thought", name: "Returned Thought", cat: "Writing", major: false, icon: require("../../assets/keepsakes/writing-02-returned-thought.png") },
  { id: "first-aura-match-note", name: "First Aura Match Note", cat: "Writing", major: false, icon: require("../../assets/keepsakes/writing-03-first-aura-match-note.png") },
  { id: "aura-shift", name: "Aura Shift", cat: "Writing", major: false, icon: require("../../assets/keepsakes/writing-04-aura-shift.png") },
  { id: "otis-changed", name: "Otis Changed", cat: "Writing", major: true, icon: require("../../assets/keepsakes/writing-05-otis-changed.png") },
  { id: "first-voice-letter", name: "First Voice Letter", cat: "Writing", major: false, icon: require("../../assets/keepsakes/writing-06-first-voice-letter.png") },
  { id: "name-seal", name: "Name Seal", cat: "Firsts", major: true, icon: require("../../assets/keepsakes/x-01-name-seal.png") },
  { id: "first-question-seed", name: "First Question Seed", cat: "Firsts", major: false, icon: require("../../assets/keepsakes/x-02-first-question-seed.png") },
  { id: "first-photo-kept", name: "First Photo Kept", cat: "Firsts", major: false, icon: require("../../assets/keepsakes/x-03-first-photo-kept.png") },
  { id: "first-sealed-page", name: "First Sealed Page", cat: "Firsts", major: false, icon: require("../../assets/keepsakes/x-04-first-sealed-page.png") },
  { id: "first-drifted-line", name: "First Drifted Line", cat: "Firsts", major: false, icon: require("../../assets/keepsakes/x-05-first-drifted-line.png") },
  { id: "first-inside-reference", name: "First Inside Reference", cat: "Firsts", major: false, icon: require("../../assets/keepsakes/x-06-first-inside-reference.png") },
]

export const keepsake = (id: string) => KEEPSAKES.find((k) => k.id === id) || null;
