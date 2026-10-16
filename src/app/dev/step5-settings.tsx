import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui";
import { LETTER_FONT_KEYS, setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { LANGS, t, useLang } from "../../lib/i18n";
import { P, PF } from "../../theme/post";
import { THEME_KEYS, THEMES, type ThemeKey } from "../../theme/themes";
import { FACES, getFace } from "../../data/aura-avatar-lib";
import { buildSettingsView, dangerInk, type SettingsFacts } from "../../screens/settings/settings-model";
import { versionFacts, type SettingsActions, type SettingsModel } from "../../screens/settings/useSettingsModel";
import { SettingsNative } from "../../screens/settings/SettingsNative";
import { SettingsRN } from "../../screens/settings/SettingsRN";
import { buildEditView, facePool, randomFace, type PronounId } from "../../screens/edit-profile/edit-profile-model";
import type { EditActions, EditProfileModel } from "../../screens/edit-profile/useEditProfileModel";
import { EditProfileNative } from "../../screens/edit-profile/EditProfileNative";
import { EditProfileRN } from "../../screens/edit-profile/EditProfileRN";
import "../../data/strings-step5-settings";
import "../../data/strings-step5-me";

/* dev only — SETTINGS AND EDIT PROFILE ON DEMO DATA (10a step 5, slice
   settings-profile). kindredly:///dev/step5-settings

   Either page as either renderer draws it, from fixtures (no network, no
   account): the same pure models the pages run on (screens/settings
   settings-model, screens/edit-profile edit-profile-model), drawn by
   SettingsNative / EditProfileNative (SwiftUI) or SettingsRN /
   EditProfileRN. Nothing here writes a preference, the account or the
   phone: a swatch sets the dev theme switch, the font and the switches are
   this page's own state, and anything that would leave the page says where
   it would go instead.

   The panel at the bottom (HIDE for a clean screenshot; a dot brings it
   back):
   - PAGE: SETTINGS or EDIT;
   - THEME: the dev theme override (Classic / Midnight / Lavender / Paper,
     OFF = the normal theme), the whole app, never saved — screenshot both
     pages in all four;
   - SWIFT / RN: which renderer (SWIFT needs a dev client built with this
     slice's views, after pod install);
   - Settings: FC (free / member / cofounder), PERM (granted / ask /
     settings / unknown: the notice), DARK (the page as it will be once
     DARK_READY: Midnight's swatch and Match system), GARAMOND (its tile, as
     it will be once the font is in the app), BUSY (restore running), NO
     NAME, NO DOB;
   - Edit: FACE (a portrait / a legacy portrait: the new-faces note / an
     old drawn face / none: the mosaic / a photo-less fallback), PRONOUN
     (the pool follows it), NOTE (force the note), NO NAME, NO DOB.
   The panel's words are English: a dev page. */

type Page = "settings" | "edit";
type FcMode = "free" | "member" | "cofounder";
type PermMode = "granted" | "ask" | "settings" | "unknown";
type FaceMode = "portrait" | "legacy" | "drawn" | "none";

const LEGACY_ID = "f-04-tiny-detail-collector";
const DRAWN_ID = "m-anchor"; // one of the thirty old drawn faces (data/avatar-lib)

export default function Step5Settings() {
  if (!__DEV__) return <Redirect href="/" />;
  return <SettingsLab />;
}

function SettingsLab() {
  const lang = useLang();
  const { key: themeKey, t: tk } = useTheme();
  const forced = useDevThemeOverride();
  const safe = useSafeAreaInsets();

  const [page, setPage] = useState<Page>("settings");
  const view = page === "settings" ? "KSettingsView" : "KEditProfileView";
  const swiftAvailable = isKindredlyUIViewAvailable(view);
  const [swift, setSwift] = useState(true);
  const [build, setBuild] = useState(0);
  const [panel, setPanel] = useState(true);

  // settings fixtures
  const [fc, setFc] = useState<FcMode>("free");
  const [perm, setPerm] = useState<PermMode>("ask");
  const [dark, setDark] = useState(false);
  const [garamond, setGaramond] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noName, setNoName] = useState(false);
  const [noDob, setNoDob] = useState(false);
  const [font, setFont] = useState("newsreader");
  const [notifyOn, setNotifyOn] = useState(true);
  const [knock, setKnock] = useState(false);
  const [matchOn, setMatchOn] = useState(true);

  // edit fixtures
  const [faceMode, setFaceMode] = useState<FaceMode>("portrait");
  const [pronoun, setPronoun] = useState<PronounId>("she");
  const [forceNote, setForceNote] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  const away = useCallback((where: string) => Alert.alert("Dev page", `In the app this ${where}.`), []);
  const wren = "Pip";
  const handle = noName ? "" : "maynaa";
  const dob = noDob ? null : "1999-03-04";

  const settings = useMemo<SettingsModel>(() => {
    const facts: SettingsFacts = {
      handle,
      dob,
      now: Date.now(),
      language: { flag: LANGS.find((l) => l.id === lang)?.flag ?? "", label: LANGS.find((l) => l.id === lang)?.label ?? "English" },
      wren,
      theme: {
        effective: themeKey,
        pick: themeKey,
        matchSystem: matchOn,
        keys: THEME_KEYS,
        dark: THEME_KEYS.filter((k) => THEMES[k].dark),
        darkReady: dark,
      },
      letterFont: { selected: font, choices: garamond ? LETTER_FONT_KEYS : LETTER_FONT_KEYS.filter((k) => k !== "garamond") },
      perm: perm === "unknown" ? null : perm,
      notifyOn,
      knock,
      premium: fc !== "free",
      cofounderNo: fc === "cofounder" ? 7 : null,
      restoring: busy,
      version: versionFacts(),
    };
    const act: SettingsActions = {
      back: () => away("goes back to Me"),
      banner: () => away("opens /paywall?src=settings_banner"),
      theme: (key) => setDevThemeOverride(key as ThemeKey),
      matchSystem: setMatchOn,
      font: setFont,
      row: (key) => away(`acts on the "${key}" row`),
      toggle: (key, on) => (key === "notify" ? setNotifyOn(on) : setKnock(on)),
      notice: () => away("asks iOS for notifications, or opens Settings"),
      pickLanguage: () => {},
      closeLanguage: () => {},
      confirmDelete: () => {},
      cancelDelete: () => {},
    };
    return {
      view: buildSettingsView(facts, t),
      danger: dangerInk(tk.ink, P.post),
      picking: false,
      lang,
      langs: LANGS,
      wren,
      askDelete: false,
      deleting: false,
      act,
    };
  }, [handle, dob, lang, themeKey, matchOn, dark, font, garamond, perm, notifyOn, knock, fc, busy, away, tk.ink]);

  const edit = useMemo<EditProfileModel>(() => {
    const base = faceMode === "legacy" ? LEGACY_ID : faceMode === "drawn" ? DRAWN_ID : faceMode === "none" ? null : FACES[3].id;
    const avatarId = picked ?? base;
    const pool = facePool(pronoun, FACES);
    const v = buildEditView(
      {
        handle,
        dob,
        pronoun,
        wren,
        avatarId,
        photo: false,
        pool,
        newFacesNote: forceNote || (picked == null && faceMode === "legacy"),
      },
      { t, birthday: (y, m, d) => new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" }).format(new Date(y, m - 1, d)) },
    );
    const act: EditActions = {
      back: () => away("goes back (and sends what waits)"),
      photo: () => away("opens the photo library"),
      random: () => setPicked(randomFace(pool, avatarId, Math.random)),
      face: (id) => getFace(id) && setPicked(id),
      pen: () => away("opens /me/edit-field?f=pen"),
      pronoun: (id) => setPronoun(id as PronounId),
      courierName: () => away("opens /me/edit-field?f=courier"),
      noteSee: () => setForceNote(false),
      noteKeep: () => setForceNote(false),
    };
    return { view: v, pool, avatar: { id: avatarId, photo: null, seed: "dev-step5-settings" }, act };
    // lang: the words follow the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceMode, picked, pronoun, forceNote, handle, dob, away, lang]);

  const themeLabel = forced ? THEMES[forced].name.toUpperCase() : "OFF";
  const useSwift = swift && swiftAvailable;

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <View style={{ flex: 1 }} key={`${page}:${useSwift ? "swift" : "rn"}:${build}`}>
        {page === "settings" ? useSwift ? <SettingsNative model={settings} /> : <SettingsRN model={settings} /> : useSwift ? <EditProfileNative model={edit} /> : <EditProfileRN model={edit} />}
      </View>

      {panel ? (
        <View style={{ borderTopWidth: 1, borderTopColor: tk.line, backgroundColor: tk.sf, paddingTop: 8, paddingBottom: Math.max(safe.bottom, 8), gap: 6 }}>
          <Row>
            <Chip label="HIDE" onPress={() => setPanel(false)} />
            <Chip label="SETTINGS" on={page === "settings"} onPress={() => setPage("settings")} />
            <Chip label="EDIT" on={page === "edit"} onPress={() => setPage("edit")} />
            <Chip label="SWIFT" on={useSwift} onPress={() => (swiftAvailable ? setSwift(true) : Alert.alert("Dev page", `This dev client was built before ${view}: pod install, then rebuild it.`))} />
            <Chip label="RN" on={!useSwift} onPress={() => setSwift(false)} />
            <Chip label="REBUILD" onPress={() => setBuild((b) => b + 1)} />
          </Row>
          <Row>
            {(["off", ...THEME_KEYS] as const).map((k) => (
              <Chip key={k} label={k === "off" ? "OFF" : THEMES[k as ThemeKey].name.toUpperCase()} on={k === "off" ? !forced : forced === k} onPress={() => setDevThemeOverride(k === "off" ? null : (k as ThemeKey))} />
            ))}
          </Row>
          {page === "settings" ? (
            <Row>
              {(["free", "member", "cofounder"] as const).map((m) => (
                <Chip key={m} label={`FC ${m.toUpperCase()}`} on={fc === m} onPress={() => setFc(m)} />
              ))}
              {(["granted", "ask", "settings", "unknown"] as const).map((m) => (
                <Chip key={m} label={`PERM ${m.toUpperCase()}`} on={perm === m} onPress={() => setPerm(m)} />
              ))}
              <Chip label="DARK" on={dark} onPress={() => setDark((v) => !v)} />
              <Chip label="GARAMOND" on={garamond} onPress={() => setGaramond((v) => !v)} />
              <Chip label="BUSY" on={busy} onPress={() => setBusy((v) => !v)} />
              <Chip label="NO NAME" on={noName} onPress={() => setNoName((v) => !v)} />
              <Chip label="NO DOB" on={noDob} onPress={() => setNoDob((v) => !v)} />
            </Row>
          ) : (
            <Row>
              {(["portrait", "legacy", "drawn", "none"] as const).map((m) => (
                <Chip
                  key={m}
                  label={`FACE ${m.toUpperCase()}`}
                  on={faceMode === m && picked == null}
                  onPress={() => {
                    setFaceMode(m);
                    setPicked(null);
                  }}
                />
              ))}
              {(["she", "he", "they"] as const).map((p) => (
                <Chip key={p} label={p.toUpperCase()} on={pronoun === p} onPress={() => setPronoun(p)} />
              ))}
              <Chip label="NOTE" on={forceNote} onPress={() => setForceNote((v) => !v)} />
              <Chip label="NO NAME" on={noName} onPress={() => setNoName((v) => !v)} />
              <Chip label="NO DOB" on={noDob} onPress={() => setNoDob((v) => !v)} />
            </Row>
          )}
          <Text style={{ fontFamily: PF.monoMed, fontSize: 10, color: tk.sub, paddingHorizontal: 12 }}>
            {`THEME ${themeLabel} (${themeKey}) · ${useSwift ? "SWIFTUI" : "REACT NATIVE"}${swiftAvailable ? "" : ` (no ${view} in this build)`} · ${page.toUpperCase()}`}
          </Text>
        </View>
      ) : (
        <Pressable onPress={() => setPanel(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Show the dev panel" style={{ position: "absolute", left: 10, bottom: Math.max(safe.bottom, 10), width: 14, height: 14, borderRadius: 7, backgroundColor: tk.ind, opacity: 0.5 }} />
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
