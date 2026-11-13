import { useMemo, useRef } from "react";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KSettingsView, type KSettingsBanner, type KSettingsGroup, type KSettingsStrings } from "../../../modules/kindredly-ui/src/Settings";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { useBirdImageRef } from "../../lib/bird-images";
import type { SettingsView } from "./settings-model";
import type { SettingsModel } from "./useSettingsModel";

/* SETTINGS IN SWIFTUI (10a step 5): one Host for the whole page
   (SurfaceHost: flex 1, every safe area ignored, light or dark from the
   theme, the crash breadcrumb's layout report), holding KSettingsView. No
   React Native island: the language and delete sheets are the route's,
   window-level modals above the Host and the floating tab bar.

   This file only turns the model's view (settings-model, the same one the
   React Native fallback draws) into the Swift records — the banner is Me's
   4a First Class card (KMeFirstClassCard) — with the banner's bird as
   a snapshot of the reader's own courier, grown (useBirdImageRef fcFree /
   fcMember), and every record kept by content, so a focus that reads the
   same page again doesn't re-send it (every prop change re-sends the whole
   props map), with one rev over all of them. */

/** The same value back while its content is the same (JSON), so a rebuilt but unchanged record
    keeps its identity and isn't re-sent to Swift. */
function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export const nativeStrings = (v: SettingsView): KSettingsStrings => ({
  title: v.title,
  backLabel: v.backLabel,
  appearanceHeader: v.appearance.header,
  fontLabel: v.appearance.fontLabel,
  fontSub: v.appearance.fontSub,
  footer: v.footer,
  appearanceTitle: v.appearance.title,
  previewName: v.appearance.preview.name,
  previewDate: v.appearance.preview.date,
  previewBody: v.appearance.preview.body,
});

export const nativeGroups = (v: SettingsView): KSettingsGroup[] =>
  v.groups.map((g) => ({
    key: g.key,
    header: g.header,
    notice: g.notice,
    rows: g.rows.map((r) => ({ key: r.key, symbol: r.symbol, label: r.label, value: r.value, sub: r.sub, chevron: r.chevron, kind: r.kind, on: r.on, busy: r.busy })),
  }));

/** page "appearance": the same view, drawing Appearance as its own page (/me/appearance) */
export function SettingsNative({ model, page = "main" }: { model: SettingsModel; page?: "main" | "appearance" }) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const { view, act } = model;

  const bird = useBirdImageRef(view.banner.pose);
  const strings = useSameContent(useMemo(() => nativeStrings(view), [view]));
  const groups = useSameContent(useMemo(() => nativeGroups(view), [view]));
  const swatches = useSameContent(view.appearance.swatches);
  const fonts = useSameContent(view.appearance.fonts);
  const banner = useSameContent<KSettingsBanner>(
    useMemo(
      () => ({
        eyebrow: view.banner.eyebrow,
        headline: view.banner.headline,
        rows: view.banner.rows,
        cta: view.banner.cta,
        trial: view.banner.trial,
        stampLabel: view.banner.stampLabel,
        member: view.banner.member,
        bird,
      }),
      [view.banner, bird],
    ),
  );
  const { selectedTheme, selectedFont, inline } = view.appearance;
  // over every record AND the small values: Swift converts the whole page once per rev
  const rev = useRev(strings, groups, swatches, fonts, banner, selectedTheme, selectedFont, inline, page);

  return (
    <SurfaceHost>
      <KSettingsView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        banner={banner}
        bannerHidden={model.bannerHidden}
        swatches={swatches}
        selectedTheme={selectedTheme}
        fonts={fonts}
        selectedFont={selectedFont}
        groups={groups}
        page={page}
        appearanceInline={inline}
        onBack={act.back}
        onBanner={act.banner}
        onTheme={act.theme}
        onFont={act.font}
        onRow={act.row}
        onToggle={act.toggle}
        onNotice={act.notice}
      />
    </SurfaceHost>
  );
}
