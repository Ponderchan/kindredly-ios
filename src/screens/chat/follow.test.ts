/* Behaviour lock for when a React Native conversation goes to its end (screens/chat/follow): the
   room and chat fallbacks and Wren's desk. Not wired to a runner; run by hand from the repo root
   with plain node (it strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/chat/follow.test.ts
   Every line prints ok/FAIL and the process exits non-zero if any fail. */

import { AT_BOTTOM_PT, atBottomOf, follow, jumpsNow, settlesAtEnd, spendsOwn, staleKeys, trayShown, type FollowFacts } from "./follow.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const base: FollowFacts = { event: "content", painted: true, hasContent: true, atBottom: false, ownPending: false };
const f = (over: Partial<FollowFacts>) => follow({ ...base, ...over });

ok("at the end within 60pt", atBottomOf({ contentHeight: 1000, offsetY: 400, viewportHeight: 560 }) && AT_BOTTOM_PT === 60);
ok("not at the end 60pt up", !atBottomOf({ contentHeight: 1000, offsetY: 380, viewportHeight: 560 }));
ok("a short list is at its end", atBottomOf({ contentHeight: 300, offsetY: 0, viewportHeight: 560 }));

ok("nothing to show: stay", f({ hasContent: false, painted: false }) === "none");
ok("first content opens at the newest, at once", f({ painted: false }) === "jump");
ok("first content wins over reading position", f({ painted: false, atBottom: false }) === "jump");

// spec bug 10: a reel or a picture finishing its layout, MORE chips, a translation
ok("growth while reading above stays (bug 10)", f({ atBottom: false }) === "none");
ok("growth at the end follows, gliding", f({ atBottom: true }) === "glide");

// spec bug 9: keyboard, tray, composer growth shrink the list without new content
ok("a smaller viewport at the end jumps (bug 9)", f({ event: "viewport", atBottom: true }) === "jump");
ok("a smaller viewport while reading above stays", f({ event: "viewport", atBottom: false }) === "none");

ok("an own send follows from anywhere", f({ ownPending: true }) === "glide");
ok("an own send follows even over a prepend", f({ ownPending: true, prepended: true }) === "glide");
ok("older rows above never move the view", f({ prepended: true, atBottom: true }) === "none");

ok("an own send is spent when its line arrives", spendsOwn({ ...base, ownPending: true }, "glide"));
ok("…not by the keyboard rising before it", !spendsOwn({ ...base, ownPending: true, event: "viewport" }, "glide"));
ok("…and not when nothing moved", !spendsOwn({ ...base, ownPending: false }, "glide"));

// native-2: KeyboardAvoidingView's padding animates the frame; ask again once it settled
ok("after the keyboard settles, at the end: to the end", settlesAtEnd({ painted: true, atEndBefore: true, dragging: false }));
ok("…reading above: stay", !settlesAtEnd({ painted: true, atEndBefore: false, dragging: false }));
ok("…under a finger: stay", !settlesAtEnd({ painted: true, atEndBefore: true, dragging: true }));
ok("…before the first paint: stay", !settlesAtEnd({ painted: false, atEndBefore: true, dragging: false }));

// native-5: a quote's jump uses a row's y only while it is mounted
ok("a row inside the window jumps now", jumpsNow(85, { start: 80, end: 160 }));
ok("a row above the window waits for its layout", !jumpsNow(40, { start: 80, end: 160 }));
ok("the window's end is exclusive", !jumpsNow(160, { start: 80, end: 160 }));
ok("rows that left the window are forgotten", staleKeys(["a", "b", "c"], ["b", "c", "d"]).join("|") === "a");

// design-2: the tray and the keyboard swap in one commit
ok("the tray asked for, keyboard down: shown", trayShown({ asked: true, held: false, keyboardUp: false }));
ok("…keyboard still up (going down): not yet", !trayShown({ asked: true, held: false, keyboardUp: true }));
ok("a choice handing the keyboard over holds the tray", trayShown({ asked: false, held: true, keyboardUp: false }));
ok("…until the keyboard is up", !trayShown({ asked: false, held: true, keyboardUp: true }));
ok("not asked, not held: none", !trayShown({ asked: false, held: false, keyboardUp: false }));

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
