import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t, useLang } from "../../lib/i18n";
import { useLetterFamily, useTheme } from "../../lib/theme";
import { BRAND } from "../../theme/themes";
import { PFM } from "../../theme/post";
import type { ThreadDetail } from "../../lib/db";
import type { ThreadToneKey } from "../../lib/thread-state";
import { AvatarImage } from "../../components/AvatarImage";
import { CorrespondentFace } from "../../components/CorrespondentFace";
import { StampAvatar } from "../../components/StampAvatar";
import { stampSpoken, useMemberStamps } from "../../lib/member-marks";
import { MosaicId } from "../../components/MosaicId";
import { ReportMenu } from "../../components/ReportMenu";
import { WrenBird } from "../../components/WrenBird";
import { dismissKeyboard } from "../../lib/keyboard";
import { BackChevron } from "../../components/10a/BackChevron";

/* THE CONVERSATION'S HEADER, above the SwiftUI Host (10a step 5).
   ────────────────────────────────────────────────────────────────────────
   It stays React Native: the face is drawn by CorrespondentFace (the
   develop mosaic and its frames), AvatarImage (portraits and the legacy
   SVG faces) and WrenBird, and the ⋯ is ReportMenu's own sheet. The 10a
   secondary header (H:90, H:71): at least 52 tall on the page colour, no
   rule under it, a 36 chevron box 12 from the left (M15 6l-7 6 7 6, 18pt,
   stroke 2.2, named for VoiceOver), the name in system 600 16 on one line
   (it truncates; it never wraps), a mono 10 line under it.

     room     KINDRED SINCE {the day names were traded} (0020 revealed_at —
              never the thread's creation, spec bug 13), else how they
              write; "{wren} found you two" with her mark; the lore button;
              the ⋯ (none once their account is gone)
     letters  the thread's state in its tone (YOUR TURN, ACCOUNT CLOSED…)

   A kindred is a round face, a pen pal a square mosaic (owner 10-15): a
   revealed kindred who gave no face is drawn round too, as their Kindreds
   row is, and a gone pen pal wears the veil (critic).

   Every tap here leaves the screen or covers it, and the SwiftUI field
   below can't hear React Native's Keyboard.dismiss(): the screen hands in
   handlers that let go of the keyboard first, and a touch on the ⋯ puts it
   away before ReportMenu's card rises. */

export function ChatHeader({
  variant,
  detail,
  name,
  subtitle,
  state,
  wren,
  threadId,
  snapshot,
  canOpenPage,
  topInset,
  onBack,
  onOpenPage,
  onLore,
  onBlocked,
  onBeforeSheet,
}: {
  variant: "room" | "letters";
  detail: ThreadDetail | null;
  name: string;
  /** room: KINDRED SINCE … or how they write */
  subtitle?: string;
  /** letters: the thread's state */
  state?: { label: string; toneKey: ThreadToneKey } | null;
  wren: string;
  threadId?: string;
  /** what a report of the thread carries (their newest words) */
  snapshot?: string;
  canOpenPage: boolean;
  /** the status bar's room; the safe-area inset by default (a dev page above it passes 0) */
  topInset?: number;
  onBack: () => void;
  onOpenPage: () => void;
  onLore?: () => void;
  onBlocked: () => void;
  /** a sheet is about to rise from the header (the ⋯): let go of the keyboard */
  onBeforeSheet: () => void;
}) {
  useLang();
  const insets = useSafeAreaInsets();
  const { t: tk } = useTheme();
  // "Wren found you two" is her line: the reader's Letter font's italic
  const wrenFace = useLetterFamily(true);
  const tone = state ? (state.toneKey === "ind" ? tk.ind : state.toneKey === "brass" ? BRAND.brassSeal : tk.mute) : tk.mute;
  const gone = !!detail?.gone;
  const seed = detail?.other || null;

  /* a member's face is a gold perforated stamp (C2); a closed account never is */
  const stamp = useMemberStamps([gone ? null : seed])(gone ? null : seed);
  const spoken = stampSpoken(stamp, t);

  const face = detail?.revealed && stamp ? (
    <StampAvatar size={36} denom={stamp}>
      {({ size, radius }) => <AvatarImage id={detail.otherFace ?? null} seed={seed ?? "anon"} size={size} radius={radius ?? undefined} />}
    </StampAvatar>
  ) : detail?.revealed ? (
    // a kindred: round, their portrait, or the stranger glyph when they gave none
    <AvatarImage id={detail.otherFace ?? null} seed={seed ?? "anon"} size={36} />
  ) : gone || !seed ? (
    <MosaicId seed={null} cell={5.5} gap={1.5} />
  ) : (
    <CorrespondentFace seed={seed} theirs={detail?.otherCount ?? 0} revealed={false} theirSigned={detail?.theirSigned} iSigned={detail?.iSigned} size="lg" denom={stamp} />
  );

  return (
    <View style={{ paddingTop: topInset ?? insets.top, backgroundColor: tk.bg }}>
      {/* the one BackChevron (Settings' size and x), centred with the face row by design */}
      <View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", paddingLeft: 12, paddingRight: 8, paddingVertical: 6, gap: 6 }}>
        <BackChevron inline onPress={onBack} color={tk.ink} />

        <Pressable
          onPress={onOpenPage}
          disabled={!canOpenPage}
          hitSlop={6}
          accessibilityRole={canOpenPage ? "button" : undefined}
          accessibilityHint={spoken || undefined}
          style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 11, opacity: pressed ? 0.6 : 1 })}
        >
          {face}
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "600", color: tk.ink }}>
              {name}
            </Text>
            {variant === "room" ? (
              <>
                {!!subtitle && (
                  <Text numberOfLines={1} style={{ ...PFM.monoMed, fontSize: 10, letterSpacing: 1.1, color: tk.mute, marginTop: 2 }}>
                    {subtitle}
                  </Text>
                )}
                {/* she carried every letter that got you here, and the room says so once */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }} accessible accessibilityLabel={t("rm.foundYouTwo", { wren })}>
                  <WrenBird size={13} mood="content" />
                  <Text numberOfLines={1} style={{ flexShrink: 1, ...wrenFace, fontSize: 12, color: tk.sub }}>
                    {t("rm.foundYouTwo", { wren })}
                  </Text>
                </View>
              </>
            ) : (
              !!state && (
                <Text numberOfLines={1} style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1, color: tone, marginTop: 2 }}>
                  {state.label}
                </Text>
              )
            )}
          </View>
        </Pressable>

        {variant === "room" && onLore ? (
          <Pressable
            onPress={onLore}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("lore.title")}
            style={({ pressed }) => ({ width: 34, height: 40, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ ...PFM.mono, fontSize: 16, color: tk.sub }}>❞</Text>
          </Pressable>
        ) : null}
        {/* a touch on the ⋯ puts the keyboard away before its card rises over the screen */}
        <View
          onTouchStart={() => {
            onBeforeSheet();
            dismissKeyboard();
          }}
        >
          <ReportMenu targetUser={gone ? undefined : detail?.other || undefined} context="thread" refId={threadId} snapshot={snapshot} onBlocked={onBlocked} />
        </View>
      </View>
    </View>
  );
}
