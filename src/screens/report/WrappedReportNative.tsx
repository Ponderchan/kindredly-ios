import { useCallback, useMemo, useRef, useState } from "react";
import { Share } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KWrappedReportView, type KWrappedCard, type KWrappedImages } from "../../../modules/kindredly-ui/src/WrappedReport";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { localeTag } from "../../lib/format";
import { useWrenName } from "../../lib/wren-name";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { useAssetImageRef } from "../../lib/images";
import { markReportRead } from "../../lib/report";
import { useNativeSurface } from "../../lib/surfaces";
import { demoWrappedFacts, keepThisMonth, readWrappedFacts, saveStyleChoice, wrappedTemplate } from "../../lib/report-wrapped";
import { REPORT_STAMPS, REPORT_WREN } from "../../data/report-art";
import { wrappedView, type WrappedFacts, type WrappedTemplate, type WrappedView } from "./wrapped-core";
import "../../data/strings-wrapped"; // rw.*

/* THE WRAPPED MONTHLY REPORT (owner, 2026-10-31): one Host holding KWrappedReportView, behind the
   "reportwrapped" switch (app/report.tsx; off → the Voice report as before).

   On focus: the template (she → B, he → A, else a stable coin, or the reader's "switch style"
   choice) and the month's facts (lib/report-wrapped: real counts from the account), then the
   words (wrapped-core). Opened = read: the month is spent (markReportRead, as the Voice report
   did) and this month's snapshot is kept for next month's "how you changed". A read that fails
   says so with a retry key and spends nothing.

   In a dev build, /report?demo=1 draws last month as the prototypes drew it (lib/report-wrapped
   demoWrappedFacts) and spends nothing; &member=1 opens "how you changed", &style=A|B picks one,
   &card=N opens at card N.

   Share makes the picture in Swift and hands its file to the share sheet with the card's own line
   (never card 3's). Compare shares kindredly.io/aura?vs=… . Read their letters goes to Today,
   write to the letter desk, the First Class seal to the paywall. */

const wrenPoses = REPORT_WREN;

export function WrappedReportNative() {
  const lang = useLang();
  const router = useRouter();
  const focused = useIsFocused();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const wren = useWrenName();
  const { profile } = useAuth();
  const { premium } = useEntitlement();
  const params = useLocalSearchParams<{ demo?: string; member?: string; style?: string; card?: string }>();
  // the demo month: in a dev build, and (TestFlight, owner 2026-10-31) wherever the switch is on
  const wrappedOn = useNativeSurface("reportwrapped");
  const demo = (__DEV__ || wrappedOn) && params.demo === "1";

  const [facts, setFacts] = useState<WrappedFacts | null>(null);
  const [template, setTemplate] = useState<WrappedTemplate>("B");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dark, setDark] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const member = demo ? params.member === "1" : premium;
        const [tpl, f] = await Promise.all([
          demo && (params.style === "A" || params.style === "B") ? Promise.resolve(params.style as WrappedTemplate) : wrappedTemplate(),
          demo ? Promise.resolve(demoWrappedFacts(member)) : readWrappedFacts(member, (profile?.firstLine as string) || null),
        ]);
        if (!alive) return;
        setTemplate(tpl);
        setFacts(f);
        setFailed(false);
        if (!demo) {
          // opened = read: the month is spent, and kept for next month's comparison
          void markReportRead();
          void keepThisMonth(f);
        }
      })().catch((e) => {
        console.warn("[report-wrapped] the month wasn't read:", e);
        if (alive) setFailed(true);
      });
      return () => {
        alive = false;
      };
      // attempt: the retry key reads again
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.firstLine, premium, demo, attempt]),
  );

  const view: WrappedView | null = useMemo(() => {
    if (!facts) return null;
    const tag = localeTag();
    return wrappedView(facts, {
      t,
      wren,
      monthName: (d, short) => d.toLocaleDateString(tag, { month: short ? "short" : "long" }).replace(/\.$/, ""),
      dayMonth: (d) => d.toLocaleDateString(tag, { day: "numeric", month: "short" }),
    });
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts, wren, lang]);

  const strings = useMemo(() => {
    if (!view) return { close: t("rw.close") } as Record<string, string>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(view)) if (typeof v === "string") out[k] = v;
    for (const [k, v] of Object.entries(view.eyebrows)) out[`eyebrow.${k}`] = v;
    out.lineSt1 = view.lineStickers[0];
    out.lineSt2 = view.lineStickers[1];
    out.letters = String(view.letters);
    out.desks = String(view.desks);
    out.replies = String(view.replies);
    out.kindreds = String(view.kindreds);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, lang]);

  const cards = useMemo<KWrappedCard[]>(() => view?.cards ?? [], [view]);
  const tags = useMemo(() => view?.tags ?? [], [view]);
  const changes = useMemo(() => view?.changes ?? [], [view]);
  const buckets = useMemo(() => (view?.hourBuckets.length === 24 ? view.hourBuckets : Array(24).fill(0)), [view]);

  const stamp = useAssetImageRef(view ? REPORT_STAMPS[`${view.arch}-${view.skin}`] : null);
  // the pair is drawn in the plain coat: their coat isn't the reader's to know
  const pairStamp = useAssetImageRef(view ? REPORT_STAMPS[`${view.pair}-sticker`] : null);
  const standing = useAssetImageRef(wrenPoses.standing);
  const curious = useAssetImageRef(wrenPoses.curious);
  const delight = useAssetImageRef(wrenPoses.delight);
  const fly = useAssetImageRef(wrenPoses.fly);
  const sleepy = useAssetImageRef(wrenPoses.sleepy);
  const images: KWrappedImages = useMemo(
    () => ({ stamp, pairStamp, standing, curious, delight, fly, sleepy }),
    [stamp, pairStamp, standing, curious, delight, fly, sleepy],
  );

  const loaded = !!view;
  const rev = useRev(strings, loaded, cards, tags, changes, buckets, images, template, busy, failed);

  const close = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me")), [router]);

  const share = useCallback(
    (uri: string) => {
      if (!view) return;
      setBusy(true);
      // a picture that couldn't be made shares the words alone
      Share.share(uri ? { url: uri, message: view.shareMessage } : { message: view.shareMessage })
        .catch((e) => console.warn("[report-wrapped] share:", e))
        .finally(() => setBusy(false));
    },
    [view],
  );
  const compare = useCallback(() => {
    if (!view) return;
    Share.share({ message: view.compareMessage }).catch((e) => console.warn("[report-wrapped] compare:", e));
  }, [view]);
  const switchStyle = useCallback(() => {
    const next: WrappedTemplate = template === "A" ? "B" : "A";
    setTemplate(next);
    if (!demo) void saveStyleChoice(next);
  }, [template, demo]);

  return (
    <SurfaceHost>
      {focused && <StatusBar style={dark ? "light" : "dark"} />}
      <KWrappedReportView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        loaded={loaded}
        failed={failed ? t("rw.failed", { wren }) : ""}
        retry={t("rw.retry")}
        template={template}
        busy={busy}
        startCard={demo ? Math.max(0, parseInt(params.card || "0", 10) || 0) : 0}
        cards={cards}
        tags={tags}
        changes={changes}
        buckets={buckets}
        hourStart={view?.hourStart ?? 0}
        hourNight={view?.hourNight ?? false}
        locked={view?.locked ?? false}
        images={images}
        onClose={close}
        onShare={share}
        onCompare={compare}
        onSwitchStyle={switchStyle}
        onReadTheirs={() => router.push("/(tabs)/letters")}
        onWrite={() => router.push("/compose")}
        onUnlock={() => router.push("/paywall?src=report_changed")}
        onRetry={() => setAttempt((n) => n + 1)}
        onCard={(_, d) => setDark(d)}
      />
    </SurfaceHost>
  );
}
