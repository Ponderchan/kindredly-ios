import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KVoiceDetailView, type KVoiceDetailGate, type KVoiceDetailRow } from "../../../modules/kindredly-ui/src/VoiceDetail";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { speakAs, useWrenName } from "../../lib/wren-name";
import { useBirdImageRef } from "../../lib/bird-images";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { analyzeVoice, cachedVoiceAI, gatherWriting, storeVoiceAI, type VoiceRead } from "../../lib/voice";
import { reportGate, type ReportGate } from "../../lib/report";
import { voiceRead as voiceAI } from "../../lib/wren";
import { voiceDetailGate, voiceDetailView, voiceGateHref } from "./voice-detail-model";
import "../../data/strings-step5-kitrn"; // a11y.back

/* YOUR VOICE IN SWIFTUI (2026-10-27): one Host holding KVoiceDetailView,
   behind the "voice" switch (app/voice, a dev page, NativeSurface in mount
   mode). The React Native page's reads, unchanged: on every focus the
   writing is gathered and read here (lib/voice analyzeVoice), the night
   letter's gate asked for, the cached deeper summary shown first and then
   a quiet refresh attempted (stored when it answers). Every line is
   voice-detail-model's; a tap on the door goes where it says (the night
   letter, or First Class). */

export function VoiceDetailNative() {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const wren = useWrenName();
  const bird = useBirdImageRef("content");
  const { profile } = useAuth();
  const { premium } = useEntitlement();
  const [read, setRead] = useState<VoiceRead | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [gate, setGate] = useState<ReportGate | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const texts = await gatherWriting((profile?.firstLine as string) || null);
        if (!alive) return;
        setRead(analyzeVoice(texts));
        reportGate(texts.length, premium)
          .then((g) => alive && setGate(g))
          .catch((e) => console.warn("[voice] the report's gate:", e));
        // the deeper engine — cached first, then a quiet refresh attempt
        const cached = await cachedVoiceAI();
        if (alive && cached?.voice_summary) setSummary(cached.voice_summary);
        const ai = await voiceAI(texts);
        if (ai) {
          await storeVoiceAI(ai);
          if (alive && ai.voice_summary) setSummary(ai.voice_summary);
        }
      })().catch((e) => console.warn("[voice] the read:", e));
      return () => {
        alive = false;
      };
    }, [profile?.firstLine, premium]),
  );

  const fmt = useMemo(() => ({ t, speak: (s: string) => speakAs(s, wren), wren }), [wren]);
  const view = useMemo(
    () => voiceDetailView(read, fmt),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [read, fmt, lang],
  );
  const rows = useMemo<KVoiceDetailRow[]>(() => view.rows.map((r) => ({ ...r })), [view]);
  const door = useMemo<KVoiceDetailGate | null>(
    () => {
      if (!gate) return null;
      const g = voiceDetailGate(gate, fmt);
      return { eyebrow: g.eyebrow, title: g.title, sub: g.sub, pct: g.pct, tappable: g.tappable };
    },
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gate, fmt, lang],
  );
  const strings = useMemo(
    () => ({
      title: t("vc.title"),
      backLabel: t("a11y.back"),
      basedOn: view.basedOn,
      summary: summary ? `“${summary}”` : "",
      signature: `— ${wren}`,
      learning: t("vc.learning"),
    }),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, summary, wren, lang],
  );
  const rev = useRev(strings, rows, door, bird);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me")), [router]);
  const openGate = useCallback(() => {
    const href = voiceGateHref(gate);
    if (href) router.push(href as Href);
  }, [gate, router]);

  return (
    <SurfaceHost>
      <KVoiceDetailView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        rows={rows}
        gate={door}
        bird={bird}
        onBack={back}
        onGate={openGate}
      />
    </SurfaceHost>
  );
}
