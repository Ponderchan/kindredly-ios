/* The letter waiting in the box the first time you open the app.
   ────────────────────────────────────────────────────────────────────────
   THESE ARE NOT REAL LETTERS AND MUST NEVER BE PRESENTED AS ONE. The pool's
   RLS is `for select to authenticated`, so before you've signed in there is
   genuinely nothing of anyone's to show — which means the opening letter is
   written by us, and the screen says so in as many words. No invented
   timestamp, no "sent down three streets", no count of people. The only
   claim made on that screen is the true one: this is the shape of the thing,
   and the real one comes once you're in.

   They're written to teach the register in one read — short, specific,
   unposted. A newcomer facing a blank page has just been shown exactly what
   is wanted here, which is most of what a placeholder was ever trying to do.

   Keep them to a single breath. The screen sets them at 30pt and a fourth
   line pushes the type down to where it stops feeling like a letter. */

export const FIRST_LETTERS: string[] = [
  "I've started saying “no worries” to things that do, in fact, worry me.",
  "I moved cities to be less lonely and now I'm lonely somewhere with better coffee.",
  "My mum called and I let it ring out, then called back twenty minutes later so it'd look like I'd been busy.",
  "Everyone at work thinks I'm the calm one. I just answer slowly.",
  "I know every song on the walk home and none of the people on it.",
  "I keep telling everyone I'm fine and I mostly am, which is somehow the part that gets me.",
];

/** one of them, steady for this install rather than reshuffled on every render */
export function firstLetter(seed: number): string {
  return FIRST_LETTERS[Math.abs(seed) % FIRST_LETTERS.length];
}
