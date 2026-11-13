/* SOMETHING NEW WAS WRITTEN ON THIS PHONE — the aura's one reason to read again soon.
   The aura is read from what you wrote: your letters, your replies and (when its scope lets it)
   your diary. Those are sent from a handful of places (db sendLetter/sendVoiceLetter/sendMessage,
   journal addEntry/updateEntry); each bumps this number when its write lands. lib/aura keeps its
   last full read in memory with the number it was read at, and Me reads it again only when the
   number moved, the read was offline, or it is old (words written on the web). Owner, 2026-11-13:
   the Aura picture took ages and started grey — "别时时读了". */
let serial = 0;

/** A letter, a reply or a diary page was just saved. */
export function markWrote(): void {
  serial++;
}

/** How many writes this run of the app has seen (compared, never shown). */
export function wroteSerial(): number {
  return serial;
}
