/* Her sentence per keepsake — what SHE did, never what you achieved. The earn-lines live in the
   catalog as ks.why.<id>; this set marks which ids have their own (the rest say ks.happened).
   Shared by both renderers of one keepsake: the React Native page (app/keepsake/[id]) and the
   Swift one (screens/keepsakes/KeepsakeNative). Moved here from the route unchanged. */
export const HAS_WHY = new Set<string>(["first-flight", "night-flight", "early-bird-flight", "same-hour-twice", "favorite-hour", "favorite-day", "late-return", "first-reply", "first-morning-reply", "first-midnight-reply", "word-came-back", "first-thread", "first-turn-back", "five-letters-deep", "you-signed-first", "they-signed-first", "name-seal", "first-kindred", "three-kindreds", "five-kindreds", "longest-thread", "word-spotted", "first-voice-letter", "first-sealed-page", "first-photo-kept", "first-drifted-line", "10-letters-carried", "50-letters-carried", "100-letters-carried", "first-anniversary"]);
