import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isKindredlyUIViewAvailable, useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { StampAlbum, type KAlbumActionKey } from "../../../modules/kindredly-ui/src/Me";
import { setCustomStamps } from "../../../modules/kindredly-ui/src/customStamps";
import { SurfaceHost } from "../../components/NativeSurface";
import { Toast } from "../../components/ui";
import { useLetterFont, useTheme } from "../../lib/theme";
import { PFM } from "../../theme/post";
import { t, useLang } from "../../lib/i18n";
import { dShort } from "../../lib/format";
import { assetImageRef } from "../../lib/images";
import { stampExportAvailable, type StampSource } from "../../lib/stamp-export";
import type { ExportStamp } from "../../lib/stamp-export-core";
import { buildAlbum, type CollectionFacts, type CollectionFormat, type MineFact } from "../../screens/me/stamp-collection";
import { useStampExport } from "../../screens/me/useStampExport";
import "../../data/strings-stamps2"; // cs2.* (the album's own words)
import "../../data/strings-step5-kitrn"; // a11y.back

/* dev only — THE STAMP EXPORT ON SAMPLE STAMPS (stamp export, 2026-11-10).

     kindredly:///dev/stamp-export              membership as the account has it
     kindredly:///dev/stamp-export?member=1     as a First Class member: both actions export
     kindredly:///dev/stamp-export?member=0     as anyone else: both wear 1ST and open the paywall

   The real album (/album) shows the reader's own stamps, and a simulator usually has none (they
   need an account and the server's check). This opens the SAME album screen (KStampAlbumView,
   built by screens/me/stamp-collection buildAlbum and screens/me/useStampExport: the same sheet,
   the same head action, the same two renders and the share sheet), fed from four sample stamps
   cut from pictures in the repo's assets: three that "passed the check" and one that was
   refused (it must get no "Save as sticker", and must not be on the printed sheet).

   The strip above the album does the same two exports without the album (STICKER, SHEET), and
   "× 30" makes the sheet's source thirty stamps (the three samples over and over), so the second
   A4 sheet can be seen: 25 on the first, 5 on the second.

   What is NOT real here: the album's other actions (write, rename, delete…) only say so in the
   line at the foot, and MAKE ONE does nothing. The sample stamps are put in Swift's stamp
   registry under made-up ids so KStamp can draw them; nothing reaches the server. The panel's
   words are English: a dev page. */

const SAMPLES: { n: number; topic: string; hex: string; gold: boolean; state: "ok" | "rejected"; mod: number }[] = [
  { n: 1, topic: "tiny win", hex: "#FFC93C", gold: false, state: "ok", mod: require("../../../assets/aura-scenes/01-quiet-observer.webp") },
  { n: 2, topic: "can’t sleep", hex: "#7C6CF2", gold: true, state: "ok", mod: require("../../../assets/aura-avatars/f-54-late-night-letterer.webp") },
  { n: 3, topic: "a song", hex: "#FF8FB1", gold: false, state: "ok", mod: require("../../../assets/aura-avatars/m-40-rhythm-rider.webp") },
  { n: 4, topic: "refused", hex: "#5BC8AF", gold: false, state: "rejected", mod: require("../../../assets/aura-avatars/f-50-still-water.webp") },
];

const sampleId = (n: number) => `c:00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

type Sample = ExportStamp & { hex: string; state: "ok" | "rejected" };

export default function DevStampExport() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Page />;
}

function Page() {
  const router = useRouter();
  const lang = useLang();
  const { key: theme, t: tk } = useTheme();
  const letterFont = useLetterFont();
  const safe = useSafeAreaInsets();
  const ref = useRef<KScreenHandle>(null);
  useKCommands(ref);
  const { member } = useLocalSearchParams<{ member?: string }>();
  const forced = member === "1" ? true : member === "0" ? false : undefined;

  const can = stampExportAvailable();
  const hasAlbum = isKindredlyUIViewAvailable("KStampAlbumView");
  const [stamps, setStamps] = useState<Sample[]>([]);
  const [failed, setFailed] = useState("");
  const [many, setMany] = useState(false);
  const [said, setSaid] = useState("");

  // the samples: each asset as a file on this phone, then into Swift's registry so KStamp draws them
  useEffect(() => {
    let alive = true;
    Promise.all(SAMPLES.map((s) => assetImageRef(s.mod)))
      .then((refs) => {
        if (!alive) return;
        const list: Sample[] = SAMPLES.map((s, i) => ({ id: sampleId(s.n), state: s.state, topic: s.topic, url: refs[i].uri, key: refs[i].key, gold: s.gold, hex: s.hex }));
        setCustomStamps(list.map((s) => ({ id: s.id, state: s.state, hex: s.hex, gold: s.gold, topic: s.topic, url: s.url ?? "", key: s.key, mine: true, kept: false })));
        setStamps(list);
      })
      .catch((e) => {
        console.warn("[dev/stamp-export] the sample pictures weren't loaded:", e);
        if (alive) setFailed(String(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  // the album, built by the product's own builder from the samples
  const album = useMemo(() => {
    const now = new Date().toISOString();
    const mine: MineFact[] = stamps.map((s) => ({ id: s.id, topic: s.topic, hex: s.hex, state: s.state, letters: 0, createdAt: now, review: s.state === "rejected" ? { flying: false, reason: null } : null }));
    const facts: CollectionFacts = { press: true, quota: { plan: "first", made: mine.length, cap: null, why: null }, mine, kept: [], used: [], fresh: new Set(), ready: null, slots: [] };
    const fmt: CollectionFormat = { t, dateShort: (iso) => dShort(iso), upper: (s) => s.toLocaleUpperCase(), lower: (s) => s.toLocaleLowerCase() };
    return buildAlbum(facts, fmt, { hasOriginal: () => false });
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamps, lang]);

  // what an export reads: the samples, or thirty of them (the approved three, over and over)
  const manyRef = useRef(many);
  manyRef.current = many;
  const stampsRef = useRef(stamps);
  stampsRef.current = stamps;
  const source = useMemo<StampSource>(
    () => async () => {
      const list = stampsRef.current;
      if (!manyRef.current) return list;
      const ok = list.filter((s) => s.state === "ok");
      if (!ok.length) return list;
      return Array.from({ length: 30 }, (_, i) => ({ ...ok[i % ok.length], id: i < ok.length ? ok[i].id : sampleId(100 + i) }));
    },
    [],
  );

  const x = useStampExport({ album, stamps, source, member: forced });
  const rev = useRev(x.strings, x.sections, x.busy);
  const insets = useMemo(() => ({ top: 0, bottom: safe.bottom, tabBarRoom: 0 }), [safe.bottom]);

  useEffect(() => {
    if (!said) return;
    const tm = setTimeout(() => setSaid(""), 2200);
    return () => clearTimeout(tm);
  }, [said]);

  const onAction = (id: string, action: KAlbumActionKey) => (action === "sticker" ? x.onSticker(id) : setSaid(`dev: "${action}" is not wired here`));
  const first = stamps.find((s) => s.state === "ok");

  const chip = (label: string, onPress: () => void, on = false) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: on ? tk.ind : tk.line, backgroundColor: on ? tk.lav : tk.sf }}
    >
      <Text style={{ ...PFM.monoSemi, fontSize: 11, color: on ? tk.ind : tk.ink }}>{label}</Text>
    </Pressable>
  );

  const note = !can
    ? "The stamp export is not in this build. Run pod install (a new file in modules/kindredly-ui/ios: Portable/Stamps/KStampExport.swift), then rebuild the dev client."
    : failed
      ? `The sample pictures weren't loaded: ${failed}`
      : !stamps.length
        ? "Loading the sample pictures…"
        : !hasAlbum
          ? "This build has no KStampAlbumView: only the strip's two buttons work."
          : "";

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <View style={{ paddingTop: safe.top + 8, paddingHorizontal: 16, paddingBottom: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: tk.line }}>
        <Text style={{ ...PFM.monoSemi, fontSize: 11, letterSpacing: 1.2, color: tk.mute }}>
          DEV · STAMP EXPORT · {forced === undefined ? "MEMBERSHIP AS THE ACCOUNT" : forced ? "AS A MEMBER" : "NOT A MEMBER"}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {chip("BACK", () => (router.canGoBack() ? router.back() : router.replace("/")))}
          {can && first ? chip("STICKER", () => x.onSticker(first.id)) : null}
          {can && first ? chip(many ? "SHEET (30)" : "SHEET (3)", x.onSheet) : null}
          {can && first ? chip("× 30", () => setMany((m) => !m), many) : null}
        </View>
        {note ? <Text style={{ fontSize: 14, lineHeight: 20, color: tk.ink }}>{note}</Text> : null}
      </View>
      {hasAlbum && stamps.length ? (
        <View style={{ flex: 1 }}>
          <SurfaceHost>
            <StampAlbum
              ref={ref}
              theme={theme}
              letterFont={letterFont}
              insets={insets}
              rev={rev}
              strings={x.strings}
              sections={x.sections}
              full={false}
              yoursSlots={album.yoursSlots}
              focus=""
              exportBusy={x.busy}
              onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              onMake={() => setSaid("dev: MAKE ONE is not wired here")}
              onAction={onAction}
              onSheet={x.onSheet}
            />
          </SurfaceHost>
        </View>
      ) : null}
      {x.line || said ? <Toast msg={x.line || said} bottom={safe.bottom + 32} /> : null}
    </View>
  );
}
