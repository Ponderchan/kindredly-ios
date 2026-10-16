import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MONO, PF } from "../../theme/post";
import { useTheme } from "../../lib/theme";
import { useBirdImage } from "../../lib/bird-images";
import { useTabBarSpace } from "../../components/NativeTabBar";
import { NoticeBar } from "../../components/NotifyBanner";
import { BottomFade, SecondaryHeader } from "../../components/10a";
import { BOTTOM_FADE } from "../../components/10a/kit";
import { BannerRN, FontTilesRN, SoftRowRN, SoftSection, SoftSwitchRow, SwatchesRN } from "./SoftRN";
import type { SettingsModel } from "./useSettingsModel";

/* SETTINGS IN REACT NATIVE — the remote switch's fallback (10a step 5).
   The same page the Swift one draws, from the same view (settings-model)
   and the same actions (useSettingsModel), on the theme: the 44pt header
   scrolling away with the page, the cream banner, APPEARANCE (swatches,
   Match system once the dark theme is ready, the Letter font), the groups,
   the two exits in red, the footer. The page starts under the status bar
   (clipped there), clears the floating tab bar (it is pushed inside the Me
   tab) and fades into the page colour above it. The language and delete
   sheets are the route's. */
export function SettingsRN({ model }: { model: SettingsModel }) {
  const { t: tk } = useTheme();
  const safe = useSafeAreaInsets();
  const tabBar = useTabBarSpace();
  const { view, act, danger } = model;
  const bird = useBirdImage(view.banner.pose);
  const a = view.appearance;

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg, paddingTop: safe.top }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(tabBar + 12, BOTTOM_FADE.height - 6), gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <SecondaryHeader title={view.title.toLocaleUpperCase()} backLabel={view.backLabel} onBack={act.back} height={44} style={{ marginHorizontal: -16 }} />

        <BannerRN {...view.banner} bird={bird} onPress={act.banner} />

        {/* APPEARANCE */}
        <SoftSection header={a.header}>
          <View style={{ paddingTop: 14, paddingHorizontal: 14, paddingBottom: 12, gap: 12 }}>
            <SwatchesRN swatches={a.swatches} selected={a.selectedTheme} onPick={act.theme} />
            {a.showMatch && (
              <View style={{ borderTopWidth: 1, borderTopColor: tk.line, marginHorizontal: -14 }}>
                <SoftSwitchRow label={a.matchLabel} sub={a.matchSub} on={a.matchOn} last onChange={act.matchSystem} />
              </View>
            )}
            {a.fonts.length > 0 && (
              <View style={{ borderTopWidth: 1, borderTopColor: tk.line, paddingTop: 12, gap: 12 }}>
                <View style={{ gap: 4 }}>
                  <Text accessibilityRole="header" style={{ fontSize: 15, color: tk.ink }}>
                    {a.fontLabel}
                  </Text>
                  {!!a.fontSub && <Text style={{ fontSize: 12, lineHeight: 16.8, color: tk.mute }}>{a.fontSub}</Text>}
                </View>
                <FontTilesRN fonts={a.fonts} selected={a.selectedFont} onPick={act.font} />
              </View>
            )}
          </View>
        </SoftSection>

        {view.groups.map((g) => (
          <SoftSection key={g.key} header={g.header}>
            {g.notice && <NoticeBar text={g.notice.text} actionLabel={g.notice.action} onPress={act.notice} inset={14} />}
            {g.rows.map((r, i) => {
              const last = i === g.rows.length - 1;
              if (r.kind === "toggle") return <SoftSwitchRow key={r.key} glyph={r.glyph} label={r.label} sub={r.sub} on={r.on} last={last} onChange={(on) => act.toggle(r.key, on)} />;
              return (
                <SoftRowRN
                  key={r.key}
                  glyph={r.glyph}
                  label={r.label}
                  value={r.value}
                  sub={r.sub}
                  chevron={r.chevron}
                  last={last}
                  busy={r.busy}
                  tint={r.kind === "danger" ? danger : undefined}
                  onPress={r.kind === "display" ? undefined : () => act.row(r.key)}
                />
              );
            })}
          </SoftSection>
        ))}

        <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.title, letterSpacing: MONO.title * 0.06, color: tk.mute, textAlign: "center", marginTop: 4 }}>{view.footer}</Text>
      </ScrollView>
      <BottomFade />
    </View>
  );
}
