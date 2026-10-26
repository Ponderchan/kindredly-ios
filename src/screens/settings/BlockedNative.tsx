import { useCallback, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KBlockedView, type KBlockedRow, type KBlockedState } from "../../../modules/kindredly-ui/src/Blocked";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { useWrenName } from "../../lib/wren-name";
import { dLong, postNo } from "../../lib/format";
import { fetchBlocks, unblockUser, type BlockRow } from "../../lib/db";
import { useWhoBook } from "../../lib/who";
import { blockedRows } from "./blocked-model";
import "../../data/strings-step5-settings";
import "../../data/strings-a11y-sheets";
import "../../data/strings-step5-kitrn"; // a11y.back

/* BLOCKED & REPORTED IN SWIFTUI (owner, 2026-10-27: "make Me all Swift"):
   one Host holding KBlockedView, behind the "blocked" switch
   (app/(tabs)/me/blocked, NativeSurface in mount mode). The React Native
   page's reads and rules: the blocks on every focus (a failed read keeps
   the rows already shown and never says "no one"; tap to try again), who
   each person was from the same book as every screen (blocked-model over
   lib/who: the mosaic and NO. with the switch off, the courier name, the
   frost and the marks with it on), and the same Alert before anyone is let
   back. */

type Load = "loading" | "ok" | "failed";

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function BlockedNative() {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const wren = useWrenName();
  const [rows, setRows] = useState<BlockRow[]>([]);
  const [load, setLoad] = useState<Load>("loading");
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      fetchBlocks()
        .then((r) => {
          if (!alive) return;
          if (r) {
            setRows(r);
            setLoad("ok");
          } else {
            // the rows already shown stay; an empty page says it didn't load, never "no one"
            setLoad((was) => (was === "ok" ? "ok" : "failed"));
          }
        })
        .catch((e) => {
          console.warn("[blocked] the list:", e);
          if (alive) setLoad((was) => (was === "ok" ? "ok" : "failed"));
        });
      return () => {
        alive = false;
      };
    }, [attempt]),
  );

  const unblock = useCallback(
    (id: string) => {
      const b = rows.find((x) => x.blocked === id);
      if (!b) return;
      Alert.alert(t("bl.letBackTitle"), t("bl.letBackBody"), [
        { text: t("bl.keepOut"), style: "cancel" },
        {
          text: t("bl.unblockAction"),
          onPress: async () => {
            const ok = await unblockUser(b.blocked).catch((e) => {
              console.warn("[blocked] unblock:", e);
              return false;
            });
            if (ok) setRows((r) => r.filter((x) => x.blocked !== b.blocked));
            else Alert.alert(t("bl.fail"), t("bl.failBody"));
          },
        },
      ]);
    },
    [rows],
  );

  // who each of them was (lib/who): switch off, NO. 4481 and the mosaic; on, the courier name and the frost
  const who = useWhoBook({ uids: rows.map((b) => b.blocked) });
  const shown = useMemo(
    () => blockedRows(rows, { t, who, postNo, day: (iso) => dLong(iso), upper: (s) => s.toUpperCase() }),
    // lang: t() and dLong read it fresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, who, lang],
  );

  const state: KBlockedState = load === "failed" ? "failed" : load === "ok" && rows.length === 0 ? "empty" : load === "ok" ? "ok" : "loading";
  const nativeRows = useSameContent<KBlockedRow[]>(
    useMemo(
      () =>
        shown.map((b) => ({
          id: b.id,
          name: b.who.name,
          mark: b.who.mark,
          sign: b.who.sign,
          face: b.who.face,
          since: b.since,
          spoken: b.who.spoken,
          unblockA11y: t("sh.a11y.unblockWho", { name: b.who.spoken }),
        })),
      // lang: t()'s
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [shown, lang],
    ),
  );
  const strings = useSameContent(
    useMemo(
      () => ({
        title: t("bl.title"),
        backLabel: t("a11y.back"),
        count: load === "ok" ? String(rows.length).padStart(2, "0") : "··",
        countA11y: load === "ok" ? String(rows.length) : "",
        loadFail: t("bl.loadFail"),
        emptyTitle: t("bl.emptyTitle"),
        emptyBody: t("bl.emptyBody"),
        footer: t("bl.footer", { wren: wren.toUpperCase() }),
        noReach: t("bl.noReach"),
        unblock: t("bl.unblock"),
      }),
      // lang: every word is t()'s
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [load, rows.length, wren, lang],
    ),
  );
  const rev = useRev(strings, nativeRows, state, who.identity);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me/settings")), [router]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <SurfaceHost>
      <KBlockedView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        state={state}
        identity={who.identity}
        rows={nativeRows}
        onBack={back}
        onUnblock={unblock}
        onRetry={retry}
      />
    </SurfaceHost>
  );
}
