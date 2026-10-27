import type { SharedSong } from "../../lib/shared-songs";

/* THE SONG SHELF, AS WORDS (a kindred's room; 2026-10-27). Everything the shelf writes, shared by
   both of its renderers (ConversationNative's SongShelfRN and the SwiftUI shelf through
   SongShelfNative), so they can't drift: a song's title (its own, else the link's host), who left
   it and when ("JUNO · OCT 3"), and which of Wren's two lines she says. Pure: the date and the
   words come in, so it runs under plain node (song-shelf.test.ts). */

/** A song's name on the shelf: its title, else the host of its link ("open.spotify.com"). */
export const shelfTitleOf = (sg: Pick<SharedSong, "url" | "title">): string => sg.title || sg.url.replace(/^https?:\/\//, "").split("/")[0];

/** Who left it and when, upper-cased: "YOU · OCT 3", "JUNO · OCT 3". */
export const shelfWhoOf = (sg: Pick<SharedSong, "mine" | "at">, name: string, you: string, day: (at: string) => string): string =>
  `${(sg.mine ? you : name).toUpperCase()} · ${day(sg.at).toUpperCase()}`;

/** The key of Wren's line about the shelf (lib/shared-songs songNotice's `line`). */
export const shelfSaysKey = (line: string): "rm.shelf.late" | "rm.shelf.both" => (line === "late" ? "rm.shelf.late" : "rm.shelf.both");

export type ShelfRow = { key: string; title: string; who: string };

/** Every song as the shelf lists it, in order; keyed by its link (sharedSongs keeps links unique). */
export function shelfRows(songs: readonly SharedSong[], o: { name: string; you: string; day: (at: string) => string }): ShelfRow[] {
  return songs.map((sg) => ({ key: sg.url, title: shelfTitleOf(sg), who: shelfWhoOf(sg, o.name, o.you, o.day) }));
}
