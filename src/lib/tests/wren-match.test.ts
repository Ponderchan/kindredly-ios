/* Behaviour lock for the desk's on-phone answers. Not wired to a runner;
   run by hand from the repo root:
     npx tsx src/lib/tests/wren-match.test.ts */

import { answerFor } from "../wren-match.ts";

let fail = 0;
const is = (q: string, lang: any, want: string | null) => {
  const r = answerFor(q, [], lang);
  const got = r ? (r.kind === "guide" ? r.guide : `text:${r.id}`) : null;
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "ok  " : "FAIL"} [${lang}] "${q}" → ${got} (want ${want})`);
};

is("when do i get to see who they are", "en", "kindreds");
is("how does the aura work", "en", "aura");
is("what is a mood stamp", "en", "stamps");
is("is my journal private?", "en", "sealed");
is("how do i rename my bird", "en", "courier");
is("how many letters a day", "en", "letters");
is("who reads my letter", "en", "letters");
is("can i change her hat", "en", "courier");
is("my app crashed on the today tab", "en", null); // broken things go to people
is("die app stürzt ab wenn ich eine marke wähle", "de", null);
is("the stamps are missing", "en", null);
is("何回やっても落ちる", "ja", null);
is("hello", "en", null);
is("thanks!", "en", null);
is("Wie funktionieren Briefe?", "de", "letters");
is("ist mein tagebuch privat", "de", "sealed");
is("aura", "de", "aura"); // the product's own noun is enough on its own
is("was liest die aura", "de", "aura");
is("手紙はどうやって届くの", "ja", "letters");
is("日記は誰かに見られる?", "ja", "sealed");
is("편지는 어떻게 가나요", "ko", "letters");
is("¿quién lee mi carta?", "es", "letters");
is("comment ça marche", "fr", "letters");

// a makers' row outranks a guide when it speaks more directly
const rows = [{ id: 7, triggers: { en: ["voice letter", "voice letters", "record"] }, answer: { en: "Voice letters are on the way." }, guide: null }];
const r = answerFor("can i record a voice letter", rows, "en");
const ok = r?.kind === "text" && r.id === 7;
if (!ok) fail++;
console.log(`${ok ? "ok  " : "FAIL"} makers' row: ${JSON.stringify(r)}`);

if (fail) {
  console.log(`${fail} failing`);
  process.exit(1);
}
console.log("all ok");
