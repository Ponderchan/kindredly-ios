/* Writes a render harness with the pages in every written language, from the app's own words:
     node design/today-after-fifteen/checks/gen-lang-sheet.mjs <out.swift>
     design/courier-planet/checks/render-fast.sh <out.swift> <out dir>     → lang-1.png, lang-2.png
   For each language: the mailbox open and shut (with that language's LONGEST fact), the receipt
   printed, bedtime awake and asleep. The words come through the same builder the app uses
   (src/screens/today/after-view.ts buildAfterView) with the language's block of
   data/strings-after.ts and strings-after-facts.ts; the few strings the pages reuse from the
   rest of the app (data/strings.ts, strings-today3d.ts) are read from those files too. The
   clock and the dates are fixed samples. A layout check: does every label fit, does the longest
   fact fit its note. */
import { registerHooks } from "node:module";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];
globalThis.__all = LANGS.map(() => ({}));
registerHooks({
  resolve(specifier, context, next) {
    if (/lib\/i18n$/.test(specifier)) return { url: "data:text/javascript,export const strings=(...b)=>{b.forEach((d,i)=>Object.assign(globalThis.__all[i],d||{}))}", shortCircuit: true };
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});
const data = new URL("../../../src/data/", import.meta.url);
for (const f of ["strings", "strings-today3d", "strings-after", "strings-after-facts"]) await import(new URL(`${f}.ts`, data).href);
const V = await import(new URL("../../../src/screens/today/after-view.ts", import.meta.url).href);
const A = await import(new URL("../../../src/lib/after-fifteen-core.ts", import.meta.url).href);
const { AFTER_FACT_COUNT } = await import(new URL("after-facts.ts", data).href);

const all = globalThis.__all;
const day = "2026-11-11";
const now = new Date(2026, 10, 11, 15, 20);
const q = (s) => JSON.stringify(String(s)).replace(/\\u[0-9a-f]{4}/g, (m) => m); // Swift takes JSON's escapes for these strings

function vmFor(i, page, o = {}) {
  const dict = { ...all[0], ...all[i] };
  const t = (key, vars) => {
    const s = dict[key] ?? key;
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
  };
  // the language's longest fact, for the note
  let longest = 1;
  for (let n = 1; n <= AFTER_FACT_COUNT; n++) if ([...(dict[`af.fact.${n}`] ?? "")].length > [...(dict[`af.fact.${longest}`] ?? "")].length) longest = n;
  const fmt = {
    t,
    upper: (s) => s.toLocaleUpperCase(LANGS[i]),
    clockHour: () => (LANGS[i] === "en" ? "8:00 AM" : "8:00"),
    stampTime: () => (LANGS[i] === "en" ? "NOV.11 · 3:19 PM" : "11.11 · 15:19"),
    dayMark: (key) => `11.${Number(key.slice(8))}`,
    countdown: (u) => t("ld.countdown", { h: u.h, m: String(u.m).padStart(2, "0") }),
    stampName: () => "almosts",
    isOwnWords: () => false,
    weekdayLetter: (wd) => new Date(2023, 0, 1 + wd, 12).toLocaleDateString(LANGS[i], { weekday: "narrow" }),
    fact: (no) => ({ text: t(`af.fact.${no}`), foot: t(`af.fact.${no}.foot`) }),
  };
  const today = { day, page, thing: { kind: "fact", no: longest }, doneAt: 0, open: false, kept: null, shut: false, receipt: "idle", fed: false, pat: false, asleep: false, ...o };
  const days = new Set(Array.from({ length: 6 }, (_, k) => A.shiftDay(day, -k)));
  return V.buildAfterView({ today, name: "Pond", read: 15, replied: 2, canPlay: true, now, days, totals: A.dayTotals({ read: 15, replied: 2, stay: { almosts: 40000 } }, day), week: false, title: t("ld.today"), undo: "", undoHint: "" }, fmt);
}

function swift(vm) {
  const L = [];
  const put = (path, v) => L.push(`    c.${path} = ${typeof v === "string" ? q(v) : v}`);
  L.push(`    var c = KAfterContent()`, `    c.page = .${vm.page}`);
  put("title", vm.title);
  for (const [k, v] of Object.entries(vm.thing)) put(`thing.${k}`, v);
  for (const [k, v] of Object.entries(vm.strip)) put(`strip.${k}`, v);
  for (const [k, v] of Object.entries(vm.box)) put(`box.${k}`, v);
  for (const [k, v] of Object.entries(vm.receipt)) {
    if (k === "rows" || k === "delivery") L.push(`    c.receipt.${k} = [${v.map((r) => `KAfterRow(id: ${q(r.id)}, label: ${q(r.label)}, value: ${q(r.value)}, strong: ${r.strong}, unshared: ${r.unshared})`).join(", ")}]`);
    else if (k === "phase") L.push(`    c.receipt.phase = .${v}`);
    else put(`receipt.${k}`, v);
  }
  for (const [k, v] of Object.entries(vm.bed)) {
    if (k === "dots") L.push(`    c.bed.dots = [${v.map((d) => `KAfterDot(id: ${q(d.id)}, letter: ${q(d.letter)}, on: ${d.on}, tonight: ${d.tonight})`).join(", ")}]`);
    else if (k === "snack" || k === "pat" || k === "lights") L.push(`    c.bed.${k} = KAfterStep(label: ${q(v.label)}, sub: ${q(v.sub)}, subDone: ${q(v.subDone)})`);
    else put(`bed.${k}`, v);
  }
  L.push(`    return c`);
  return L.join("\n");
}

const written = LANGS.map((l, i) => ({ l, i })).filter(({ i }) => i > 0 && Object.keys(all[i]).some((k) => k.startsWith("af.")));
const STATES = [
  ["open", "box", {}],
  ["shut", "box", { shut: true }],
  ["printed", "receipt", { receipt: "printed" }],
  ["awake", "bedtime", {}],
  ["asleep", "bedtime", { fed: true, pat: true, asleep: true }],
];
let out = `import SwiftUI
import UIKit
#if canImport(KPortable)
@testable import KPortable
#endif

// GENERATED by design/today-after-fifteen/checks/gen-lang-sheet.mjs from the app's own strings. Do not edit.

`;
for (const { l, i } of written) for (const [name, page, o] of STATES) out += `func ${l}_${name}() -> KAfterContent {\n${swift(vmFor(i, page, o))}\n}\n\n`;
out += `struct Phone: View {
  let content: KAfterContent
  let label: String
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(label).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color(red: 0.12, green: 0.11, blue: 0.21))
      screen.frame(width: 393, height: 852)
        .clipShape(RoundedRectangle(cornerRadius: 44, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 44, style: .continuous).stroke(Color(red: 0.84, green: 0.82, blue: 0.9), lineWidth: 2))
    }
  }
  var screen: some View {
    var s = KAfterScreen(theme: .classic, content: content, topInset: 54, bottomInset: 90)
    s.scrolls = false
    return s.environment(\\.colorScheme, .light)
  }
}

@MainActor func write<V: View>(_ view: V, _ path: String) {
  let r = ImageRenderer(content: view.padding(24).background(Color(red: 0.93, green: 0.93, blue: 0.95)))
  r.scale = 1.5
  guard let img = r.uiImage, let data = img.pngData() else { print("render failed", path); exit(1) }
  try! data.write(to: URL(fileURLWithPath: path))
  print("wrote", path, img.size)
}

@main
struct Main {
  @MainActor static func main() {
    let dir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "."
`;
const half = Math.ceil(written.length / 2);
[written.slice(0, half), written.slice(half)].forEach((group, g) => {
  if (!group.length) return;
  out += `    write(VStack(alignment: .leading, spacing: 24) {\n`;
  for (const { l } of group) out += `      HStack(alignment: .top, spacing: 24) {\n${STATES.map(([name]) => `        Phone(content: ${l}_${name}(), label: "${l} · ${name}")`).join("\n")}\n      }\n`;
  out += `    }, "\\(dir)/lang-${g + 1}.png")\n`;
});
out += `  }\n}\n`;
writeFileSync(process.argv[2], out);
console.log("wrote", process.argv[2], "for", written.map((w) => w.l).join(" "));
