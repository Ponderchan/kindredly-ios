// node scripts/gen-theme-swift.mjs            write the Swift copy of the theme
// node scripts/gen-theme-swift.mjs --check    exit 1 if the Swift copy is out of date
//
// Writes modules/kindredly-ui/ios/Portable/KTheme.swift from src/theme/themes.json (the 10a
// overhaul, iOS 1.3.0). themes.json is the one place the four themes' colours live: the
// TypeScript theme reads it directly, and the SwiftUI views read this generated copy, so a
// colour is changed once, in the JSON, and this script is run again. The generated file
// imports SwiftUI only, so the pure-Swift app planned for 1.1.0 can take it as it is.
// Besides the themes it carries the JSON's fixed colours (KBrand) and mood pairs (KMood).
//
// Nothing is guessed. A theme missing a token, a token that is not a #RRGGBB hex, a key in a
// theme that the token list does not name, or a name that is not a usable Swift identifier is
// an error, not a fallback: a wrong colour should stop the script, not reach a screen.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = new URL("../src/theme/themes.json", import.meta.url);
const OUT = new URL("../modules/kindredly-ui/ios/Portable/KTheme.swift", import.meta.url);
const CHECK = process.argv.includes("--check");

// what each token is for (CLAUDE-CODE-PROMPTS.md:18-31; lav2 has no role there, and the mock
// uses it once, for the WRITE A LETTER composer card). Doc comments only; a token added to
// themes.json without a line here still generates, just without its comment.
const ROLE = {
  bg: "Page background; also the text colour on anything filled with ink or ind.",
  sf: "Card face (every InkCard), the tab bar and other surfaces that sit on the page.",
  ink: "Main text, and the fill of solid secondary buttons.",
  ln: "Every outline and every hard shadow. Not the same as ink in Midnight.",
  sub: "Secondary text.",
  mute: "Small mono labels, times, placeholders.",
  faint: "Chevrons, disabled text, future dates.",
  soft: "Grouped-list (SoftGroup) background. The same as sf in Midnight.",
  soft2: "Stat cells, progress tracks, avatar circles.",
  line: "1pt dividers between rows.",
  lav: "Pale selected fill: the tab lens, chips that are on.",
  lav2: "The WRITE A LETTER composer card (used once in the mock).",
  ind: "Indigo: the selected state and the main action.",
};

// what each fixed colour is for (CLAUDE-CODE-PROMPTS.md:33-37, mock H:19 and H:35). These stay
// the same in every theme: objects with their own colour, not roles a theme recolours.
const BRAND_ROLE = {
  courierGreen: "The courier's green: the Courier card, the YOUR COURIER label.",
  paleGreen: "Pale green, the courier's light companion.",
  greenText: "Green text, and the fill of the green topic tag (#made my day).",
  waxGold: "Wax-seal gold: the First Class chip, frame and dashes.",
  goldText: "Dark gold text on cream.",
  cream: "Cream paper: the First Class chip and cells when off.",
  creamBorder: "The cream's border.",
  lime: "The lime of the \"auras close\" capsule, and nothing else. Text on it is always #1E1B35.",
  acid: "The older acid green (PUNCH); kept so the two tables agree.",
  // step 5 (foundation.json theme_fonts): the object colours the new pieces paint from
  brassSeal: "The brass of a seal: SWAP NAMES? and THEY WENT FIRST, the five-letter moment.",
  postRed: "Postmark red: over-limit counts, the post tag. A warning that stays the same in every theme.",
  inkOnBrand: "The dark ink drawn on fixed brand fills (cream, lime, wax gold), whatever the theme: never the theme's ink, which is pale in Midnight.",
  subOnCream: "Secondary text on the First Class cream.",
  paperWhite: "White paper on fixed-colour objects: the First Class stamp's face, the switch's knob, a mark on a brand fill.",
};

// Swift keywords a token or theme key must not be named (the ones a colour name could plausibly hit)
const RESERVED = new Set([
  "as", "break", "case", "class", "continue", "default", "defer", "do", "else", "enum", "extension",
  "false", "for", "func", "guard", "if", "import", "in", "init", "inout", "internal", "is", "let",
  "nil", "operator", "private", "protocol", "public", "repeat", "return", "self", "Self", "static",
  "struct", "subscript", "super", "switch", "throw", "true", "try", "typealias", "var", "where", "while",
]);
// members the generated struct declares itself
const TAKEN = new Set(["key", "name", "isDark", "all", "named"]);

const fail = (msg) => {
  console.error(`gen-theme-swift: ${msg}`);
  process.exit(1);
};
const ident = (s, what) => {
  if (typeof s !== "string" || !/^[a-z][A-Za-z0-9]*$/.test(s)) fail(`${what} "${s}" is not a lowerCamel Swift identifier`);
  if (RESERVED.has(s) || TAKEN.has(s)) fail(`${what} "${s}" clashes with a Swift keyword or a KTheme member`);
  return s;
};
const swiftString = (s) => JSON.stringify(s); // a JSON string of plain text is a valid Swift string literal

const src = JSON.parse(readFileSync(SRC, "utf8"));
const tokens = src.tokens;
if (!Array.isArray(tokens) || !tokens.length) fail("themes.json has no tokens list");
tokens.forEach((t) => ident(t, "token"));
if (new Set(tokens).size !== tokens.length) fail("the tokens list names a token twice");

const themes = Object.entries(src.themes ?? {});
if (!themes.length) fail("themes.json has no themes");
for (const [key, t] of themes) {
  ident(key, "theme key");
  if (typeof t.name !== "string" || !t.name) fail(`theme ${key} has no name`);
  if (typeof t.dark !== "boolean") fail(`theme ${key}: "dark" must be true or false`);
  for (const tok of tokens) {
    if (!(tok in t)) fail(`theme ${key} is missing ${tok}`);
    if (!/^#[0-9A-Fa-f]{6}$/.test(t[tok])) fail(`theme ${key}: ${tok} is "${t[tok]}", not #RRGGBB`);
  }
  for (const k of Object.keys(t)) {
    if (k !== "name" && k !== "dark" && !tokens.includes(k)) fail(`theme ${key} has "${k}", which the tokens list does not name`);
  }
}

// the fixed colours and the mood pairs, checked the same way: a lowerCamel name and #RRGGBB hex
const hex = (v, what) => {
  if (typeof v !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(v)) fail(`${what} is "${v}", not #RRGGBB`);
  return v.toUpperCase();
};
const brand = Object.entries(src.brand ?? {});
if (!brand.length) fail("themes.json has no brand colours");
brand.forEach(([k, v]) => {
  ident(k, "brand colour");
  hex(v, `brand ${k}`);
});
const moods = Object.entries(src.mood ?? {});
if (!moods.length) fail("themes.json has no mood pairs");
moods.forEach(([k, pair]) => {
  ident(k, "mood");
  if (!Array.isArray(pair) || pair.length !== 2) fail(`mood ${k} is not a [fill, ink] pair`);
  hex(pair[0], `mood ${k} fill`);
  hex(pair[1], `mood ${k} ink`);
});

const pad = Math.max(...tokens.map((t) => t.length));
const lines = [];
const out = (s = "") => lines.push(s);

out("// GENERATED by scripts/gen-theme-swift.mjs from src/theme/themes.json. DO NOT EDIT.");
out("// Change a colour in themes.json, then run: node scripts/gen-theme-swift.mjs");
out("//");
out("// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.");
out();
out("import SwiftUI");
out();
out(`/// One 10a theme: its ${tokens.length} colour tokens and whether it is a dark theme.`);
out("/// Views take a KTheme and read its tokens; switching themes changes colours, never layout.");
out("public struct KTheme: Equatable, Sendable {");
out("  /// The key themes.json and the JavaScript side use, e.g. \"midnight\".");
out("  public let key: String");
out("  /// The name shown on the Settings swatch, e.g. \"Midnight\".");
out("  public let name: String");
out("  /// True for a dark theme (Midnight). A Host showing it should use the dark color scheme.");
out("  public let isDark: Bool");
for (const tok of tokens) {
  if (ROLE[tok]) out(`  /// ${ROLE[tok]}`);
  out(`  public let ${tok}: Color`);
}
for (const [key, t] of themes) {
  out();
  out(`  public static let ${key} = KTheme(`);
  out(`    key: ${swiftString(key)},`);
  out(`    name: ${swiftString(t.name)},`);
  out(`    isDark: ${t.dark},`);
  tokens.forEach((tok, i) => {
    const comma = i === tokens.length - 1 ? "" : ",";
    out(`    ${(tok + ":").padEnd(pad + 1)} Color(hex: "${t[tok].toUpperCase()}")${comma}`);
  });
  out("  )");
}
out();
out("  /// Every theme, in the order themes.json lists them.");
out(`  public static let all: [KTheme] = [${themes.map(([k]) => k).join(", ")}]`);
out();
out("  /// The theme with this key, or nil for a key no theme has.");
out("  public static func named(_ key: String) -> KTheme? {");
out("    all.first { $0.key == key }");
out("  }");
out("}");
out();
out("/// The colours that stay the same in every theme (themes.json \"brand\"): objects with a colour");
out("/// of their own, like the courier's green, the wax gold and the lime of \"auras close\".");
out("public enum KBrand {");
const bpad = Math.max(...brand.map(([k]) => k.length));
for (const [k, v] of brand) {
  if (BRAND_ROLE[k]) out(`  /// ${BRAND_ROLE[k]}`);
  out(`  public static let ${k.padEnd(bpad)} = Color(hex: "${hex(v, k)}")`);
}
out("}");
out();
out("/// A 10a mood pair (themes.json \"mood\"): a pale fill and the ink drawn on it, the same in every");
out("/// theme. Named apart from the app's older mood data so the two can't be confused.");
out("public struct KMood: Equatable, Sendable {");
out("  public let key: String");
out("  public let fill: Color");
out("  public let ink: Color");
const mpad = Math.max(...moods.map(([k]) => k.length));
out();
for (const [k, [fill, ink]] of moods) {
  out(`  public static let ${k.padEnd(mpad)} = KMood(key: ${swiftString(k)}, fill: Color(hex: "${hex(fill, k)}"), ink: Color(hex: "${hex(ink, k)}"))`);
}
out();
out("  /// Every mood, in the order themes.json lists them.");
out(`  public static let all: [KMood] = [${moods.map(([k]) => k).join(", ")}]`);
out("}");
out();
out("extension Color {");
out("  /// An sRGB colour from \"#RRGGBB\" (the # is optional). The generator only ever passes");
out("  /// checked hex, so the magenta below is unreachable from this file; it is there so a bad");
out("  /// string written by hand elsewhere shows up on screen instead of passing as black.");
out("  init(hex: String) {");
out("    let digits = hex.hasPrefix(\"#\") ? String(hex.dropFirst()) : hex");
out("    guard digits.count == 6, digits.allSatisfy(\\.isHexDigit), let value = UInt32(digits, radix: 16) else {");
out("      self = Color(.sRGB, red: 1, green: 0, blue: 1, opacity: 1)");
out("      return");
out("    }");
out("    self = Color(");
out("      .sRGB,");
out("      red: Double((value >> 16) & 0xFF) / 255,");
out("      green: Double((value >> 8) & 0xFF) / 255,");
out("      blue: Double(value & 0xFF) / 255,");
out("      opacity: 1");
out("    )");
out("  }");
out("}");

const swift = lines.join("\n") + "\n";

if (CHECK) {
  let current = "";
  try {
    current = readFileSync(OUT, "utf8");
  } catch {
    fail(`${OUT.pathname} does not exist; run node scripts/gen-theme-swift.mjs`);
  }
  if (current !== swift) fail("KTheme.swift is out of date with themes.json; run node scripts/gen-theme-swift.mjs");
  console.log("KTheme.swift is up to date");
} else {
  writeFileSync(OUT, swift);
  console.log(`wrote ${OUT.pathname} (${themes.length} themes × ${tokens.length} tokens)`);
}
