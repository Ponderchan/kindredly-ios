import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { PF } from "../../theme/post";
import { THEME_KEYS, THEMES, type ThemeKey } from "../../theme/themes";
import { setDevFares } from "../../lib/fares";
import type { IapPackage } from "../../lib/iap";
import type { WritingRow } from "../../lib/aura";
import type { ThreadSummary } from "../../lib/db";
import type { Draft } from "../../lib/drafts";
import { DEMO_THREADS } from "../../data/demo";
import { buildFares } from "../../screens/paywall/paywall-model";
import type { PaywallDev } from "../../screens/paywall/usePaywall";
import { MyLettersNative, type MyLettersDemo } from "../../screens/letters/MyLettersNative";
import { PaywallBody, PaywallSwift } from "../paywall";
import { MyLettersRN } from "../my-letters";
import { FirstClassReceipt, type ReceiptPlan } from "../../components/FirstClassWelcome";
import { FirstClassCard } from "../../components/FirstClassStub";
import { buildFirstClass4a } from "../../screens/me/me-model";
import { meFormat } from "../../screens/me/me-format";
import { trialLabel } from "../../screens/paywall/paywall-model";
import { t } from "../../lib/i18n";
import "../../data/strings-me4a";
import "../../data/strings-fc2";

/* dev only — ME 4a's FIRST CLASS PAGE AND MY LETTERS ON DEMO DATA.
   kindredly:///dev/me4a-fc

   Nothing here buys, reads or writes: the paywall is drawn from demo fares
   (lib/fares setDevFares, never saved; REAL hands back the store's) and its
   button runs the real purchase code, so on this page DON'T TAP IT — the
   demo fares carry no RevenueCat package, so it would only say "almost"
   anyway. My letters is drawn from demo rows (its × asks and then does
   nothing). The panel at the bottom (HIDE for a clean screenshot; the dot
   brings it back):
   - PAGE: PAYWALL (Swift) · PW RN (the React Native PaywallBody, the
     fallback) · LETTERS (Swift, demo rows) · ML RN (the React Native page,
     the account's real letters, read only) · CARD RN (the 4a First Class
     card's React Native twin, FirstClassCard, in the WHO state);
   - THE A3 RECEIPT (FC2 §4.6) over the Swift paywall, on fixed facts (the
     store and the server aren't asked; nothing is bought): RC TRIAL (monthly,
     US$6.99, 7 days free ending a week from today) · RC YEARLY (US$39.99,
     no trial offered: "charged today") · RC LIFE (Cofounder No. 001) · RC
     PENDING (Lifetime, the number not landed yet). Start writing or the
     scrim return to PAYWALL. Check each at Default type and at AX5
     (Settings › Accessibility › Display & Text Size › Larger Text): the
     button must stay the last thing and on screen;
   - THEME: the dev override (My letters follows it; the paywall keeps First
     Class's own palette in every theme);
   - FARES: TRIAL (a 7-day free intro, eligible) · NO TRIAL · PLACEHOLDER
     (what shows before RevenueCat answers) · REAL (the store's answer);
   - SEATS: ASK (the real function: null until 0036 runs) · 53 · 0 · NULL;
   - WHO: FREE · MEMBER · COFOUNDER (No. 047);
   - ALL 6 (the two flagged benefit rows on);
   - LETTERS: FULL (10 letters, answered, quiet and replied, 2 drafts) ·
     NO DRAFTS · EMPTY (nothing written yet). */

type Page = "paywall" | "pwrn" | "letters" | "mlrn" | "card" | "rcTrial" | "rcMonthly" | "rcLife" | "rcPending";

/* the four receipt fixtures (FC2 §4.6) */
type ReceiptFixture = { plan: ReceiptPlan; price: string; offeredTrial: boolean; dev: { trial?: { n: number; unit: "day" | "month"; endsAt: string } | null; cofounderNo?: number | null } };
function receiptFixture(page: Page): ReceiptFixture | null {
  switch (page) {
    case "rcTrial":
      return { plan: "monthly", price: "US$6.99", offeredTrial: true, dev: { trial: { n: 7, unit: "day", endsAt: new Date(Date.now() + 7 * 86_400_000).toISOString() } } };
    case "rcMonthly":
      return { plan: "annual", price: "US$39.99", offeredTrial: false, dev: { trial: null } };
    case "rcLife":
      return { plan: "lifetime", price: "US$129.99", offeredTrial: false, dev: { cofounderNo: 1 } };
    case "rcPending":
      return { plan: "lifetime", price: "US$129.99", offeredTrial: false, dev: { cofounderNo: null } };
    default:
      return null;
  }
}
type FareMode = "trial" | "notrial" | "placeholder" | "real";
type Who = "free" | "member" | "cofounder";
type SeatMode = "ask" | 53 | 0 | null;
type LetterMode = "full" | "nodrafts" | "empty";

const intro7 = { price: 0, periodUnit: "DAY", periodNumberOfUnits: 7, cycles: 1 };
const DEMO_PKGS: IapPackage[] = [
  { id: "demo_annual", priceString: "$39.99", title: "Annual", period: "annual", raw: null, productId: "a", price: 39.99, perMonthString: "$3.33", introPrice: intro7 },
  { id: "demo_monthly", priceString: "$6.99", title: "Monthly", period: "monthly", raw: null, productId: "m", price: 6.99, perMonthString: "$6.99", introPrice: intro7 },
  { id: "demo_lifetime", priceString: "$129.99", title: "Lifetime", period: "lifetime", raw: null, productId: "l", price: 129.99, perMonthString: null, introPrice: null },
];

const BODIES = [
  "What a day! We should always hear our inner voice and the people we love.",
  "Dear friend, take a deep breath and look at how far you have come. Life can feel heavy sometimes.",
  "Hello from a rainy kitchen. The kettle is louder than my thoughts today.",
  "Anyone who loves cats here?",
  "It's a bit of a late one, and I'm writing to whoever is also awake.",
  "Does anyone else keep a list of streets they have never walked down?",
  "What song did you fall asleep to this week?",
  "This is a letter from a city where the trains talk back.",
  "Hello my friend from anywhere :) let's have a great chat",
  "I planted basil today and it already feels like a promise.",
];
const STAMP_IDS = ["never-told", "off-chest", "guilty", "hot-take", "cringe", "pretending", "almost-texted", "situationship"];

function demoRows(mode: LetterMode): MyLettersDemo {
  if (mode === "empty") return { letters: [], threads: [], drafts: [] };
  const day = (i: number) => new Date(Date.UTC(2026, 8, 28 - i * 3, 9)).toISOString();
  const letters: WritingRow[] = BODIES.map((body, i) => ({ id: `dl${i}`, body, created_at: day(i), stamp: STAMP_IDS[i % STAMP_IDS.length], reads: [0, 9, 12, 5, 6, 3, 14, 1, 8, 2][i] }));
  const mira = DEMO_THREADS[0];
  const pal = DEMO_THREADS[1];
  const threads: ThreadSummary[] = [
    // letter 1: Mira (named) and four more wrote back
    { ...mira, id: "dt-mira", fromMyLetter: true, letterId: "dl1" },
    ...[0, 1, 2, 3].map((k) => ({ ...pal, id: `dt-pal${k}`, other: `demo-pal${k}`, fromMyLetter: true, letterId: "dl1" })),
    // letters 2 and 3: unnamed answers
    { ...pal, id: "dt-a", fromMyLetter: true, letterId: "dl2" },
    { ...pal, id: "dt-b", other: "demo-b", fromMyLetter: true, letterId: "dl2" },
    { ...pal, id: "dt-c", other: "demo-c", fromMyLetter: true, letterId: "dl3" },
    { ...pal, id: "dt-d", other: "demo-d", fromMyLetter: true, letterId: "dl6" },
  ];
  const drafts: Draft[] =
    mode === "nodrafts"
      ? []
      : [
          { id: "dd1", date: new Date(Date.UTC(2026, 8, 27, 9)).toISOString(), stamp: "guilty", body: "I started this on the bus and never found the ending. Maybe you", ask: "" },
          { id: "dd2", date: new Date(Date.UTC(2026, 8, 12, 9)).toISOString(), stamp: "", body: "", ask: "" },
        ];
  return { letters, threads, drafts };
}

export default function Me4aFcDev() {
  const params = useLocalSearchParams();
  if (!__DEV__) return <Redirect href="/" />;
  // a new link starts the page over from its switches
  return <Me4aFc key={JSON.stringify(params)} />;
}

function Me4aFc() {
  const router = useRouter();
  const safe = useSafeAreaInsets();
  const { t: tk } = useTheme();
  const forced = useDevThemeOverride();
  /* every switch can also come in the link, for scripted screenshots:
     kindredly:///dev/me4a-fc?page=letters&theme=midnight&letters=nodrafts&panel=0
     (page, fares, seats=ask|53|0|null, who, all=1, letters, theme=off|classic|midnight|lavender|paper, panel=0) */
  const q = useLocalSearchParams<{ page?: Page; fares?: FareMode; seats?: string; who?: Who; all?: string; letters?: LetterMode; theme?: string; panel?: string }>();
  const [panel, setPanel] = useState(q.panel !== "0");
  const [page, setPage] = useState<Page>(q.page ?? "paywall");
  const [fares, setFares] = useState<FareMode>(q.fares ?? "trial");
  const [seats, setSeats] = useState<SeatMode>(q.seats == null ? 53 : q.seats === "ask" ? "ask" : q.seats === "null" ? null : (Number(q.seats) as 53 | 0));
  const [who, setWho] = useState<Who>(q.who ?? "free");
  const [all, setAll] = useState(q.all === "1");
  const [letters, setLetters] = useState<LetterMode>(q.letters ?? "full");
  useEffect(() => {
    if (q.theme) setDevThemeOverride(q.theme === "off" ? null : (q.theme as ThemeKey));
  }, [q.theme]);

  useEffect(() => {
    if (fares === "real") setDevFares(null);
    else if (fares === "placeholder") setDevFares(buildFares([], {}, true));
    else setDevFares(buildFares(DEMO_PKGS, fares === "trial" ? { a: 2, m: 2 } : { a: 1, m: 1 }, true));
  }, [fares]);
  // let go of the demo fares when the page closes
  useEffect(() => () => setDevFares(null), []);

  const dev = useMemo<PaywallDev>(() => {
    const d: PaywallDev = {
      premium: who !== "free",
      cofounderNo: who === "cofounder" ? 47 : null,
      flags: all ? { stamps: true, paper: true } : undefined,
    };
    if (seats !== "ask") d.seatsLeft = seats;
    return d;
  }, [who, seats, all]);
  const demo = useMemo(() => demoRows(letters), [letters]);
  const rc = receiptFixture(page);
  const card = useMemo(
    () => buildFirstClass4a({ premium: who !== "free", cofounderNo: who === "cofounder" ? 47 : null, wren: "Wren", trial: fares === "trial" ? trialLabel({ n: 7, unit: "day" }, t) : "" }, meFormat()),
    [who, fares],
  );
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <View style={{ flex: 1 }}>
        {page === "paywall" ? (
          <PaywallSwift key={`${who}:${seats}:${all}`} source="unknown" onClose={back} onDone={back} dev={dev} sheet={false} />
        ) : page === "pwrn" ? (
          <PaywallBody source="unknown" onClose={back} onDone={back} />
        ) : rc ? (
          <View style={{ flex: 1 }}>
            <PaywallSwift source="unknown" onClose={back} onDone={back} dev={dev} sheet={false} />
            <Text style={{ position: "absolute", top: safe.top + 4, left: 12, right: 12, fontFamily: PF.monoSemi, fontSize: 10, color: tk.ink, backgroundColor: tk.sf, padding: 4 }}>
              Default type / AX5: the button stays last and on screen
            </Text>
            <FirstClassReceipt key={page} plan={rc.plan} price={rc.price} productId={null} offeredTrial={rc.offeredTrial} dev={rc.dev} onDone={() => setPage("paywall")} />
          </View>
        ) : page === "card" ? (
          <ScrollView contentContainerStyle={{ paddingTop: safe.top + 16, paddingHorizontal: 16, paddingBottom: 24 }}>
            <FirstClassCard card={card} onPress={() => console.log("[me4a-fc dev] card tapped")} />
          </ScrollView>
        ) : page === "letters" ? (
          <MyLettersNative key={letters} demo={demo} />
        ) : (
          <MyLettersRN />
        )}
      </View>
      {panel ? (
        <View style={{ borderTopWidth: 1, borderTopColor: tk.line, backgroundColor: tk.sf, paddingTop: 8, paddingBottom: Math.max(safe.bottom, 8), gap: 6 }}>
          <Row>
            <Chip label="HIDE" onPress={() => setPanel(false)} />
            {(
              [
                ["paywall", "PAYWALL"],
                ["pwrn", "PW RN"],
                ["letters", "LETTERS"],
                ["mlrn", "ML RN"],
                ["card", "CARD RN"],
                ["rcTrial", "RC TRIAL"],
                ["rcMonthly", "RC YEARLY"],
                ["rcLife", "RC LIFE"],
                ["rcPending", "RC PENDING"],
              ] as const
            ).map(([k, l]) => (
              <Chip key={k} label={l} on={page === k} onPress={() => setPage(k)} />
            ))}
          </Row>
          <Row>
            {(["off", ...THEME_KEYS] as const).map((k) => (
              <Chip key={k} label={k === "off" ? "OFF" : THEMES[k as ThemeKey].name.toUpperCase()} on={k === "off" ? !forced : forced === k} onPress={() => setDevThemeOverride(k === "off" ? null : (k as ThemeKey))} />
            ))}
          </Row>
          <Row>
            {(["trial", "notrial", "placeholder", "real"] as const).map((m) => (
              <Chip key={m} label={m === "notrial" ? "NO TRIAL" : m.toUpperCase()} on={fares === m} onPress={() => setFares(m)} />
            ))}
            <Chip label="ALL 6" on={all} onPress={() => setAll((v) => !v)} />
          </Row>
          <Row>
            {(["ask", 53, 0, null] as const).map((m) => (
              <Chip key={String(m)} label={`SEATS ${m === null ? "NULL" : String(m).toUpperCase()}`} on={seats === m} onPress={() => setSeats(m)} />
            ))}
          </Row>
          <Row>
            {(["free", "member", "cofounder"] as const).map((m) => (
              <Chip key={m} label={m.toUpperCase()} on={who === m} onPress={() => setWho(m)} />
            ))}
          </Row>
          <Row>
            {(["full", "nodrafts", "empty"] as const).map((m) => (
              <Chip key={m} label={`LETTERS ${m === "nodrafts" ? "NO DRAFTS" : m.toUpperCase()}`} on={letters === m} onPress={() => setLetters(m)} />
            ))}
          </Row>
        </View>
      ) : (
        <Pressable onPress={() => setPanel(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Show the dev panel" style={{ position: "absolute", left: 6, bottom: 6, width: 14, height: 14, borderRadius: 7, backgroundColor: tk.ind, opacity: 0.5 }} />
      )}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}>
      {children}
    </ScrollView>
  );
}

function Chip({ label, on = false, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const { t: tk } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.5, borderColor: on ? tk.ink : tk.line, backgroundColor: on ? tk.ink : tk.sf, opacity: pressed ? 0.7 : 1 })}
    >
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 0.8, color: on ? tk.bg : tk.ink }}>{label}</Text>
    </Pressable>
  );
}
