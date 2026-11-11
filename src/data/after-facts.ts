/* THE COURIER'S FACTS, AS DATA (docs/today-after-fifteen.md): how many there are, and where each
   was checked. The words themselves are strings (data/strings-after-facts.ts, keys af.fact.<n>
   and af.fact.<n>.foot, nine languages); this file is what the rules and the tests read.

   A reader gets them in order from NO. 1 (lib/after-fifteen-core chooseThing). Adding one: write
   it in all nine blocks, add its source here, and the count follows. Never reorder: a number a
   reader kept in their Lore must go on meaning the same fact.

   Every fact was checked against the page listed for it on the date in the strings file's header
   (a fact that could not be confirmed was dropped, not softened). */

export const AFTER_FACT_SOURCES: readonly string[] = [];

export const AFTER_FACT_COUNT = AFTER_FACT_SOURCES.length;
