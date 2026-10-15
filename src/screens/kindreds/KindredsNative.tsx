import { useEffect, useMemo, useRef } from "react";
import { useIsFocused, useNavigation } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import {
  KKindredsView,
  type KKindredsChip,
  type KKindredsCommands,
  type KKindredsFace,
  type KKindredsItem,
  type KKindredsOrbitItem,
  type KKindredsStrings,
} from "../../../modules/kindredly-ui/src/Kindreds";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { faceRecord, useFaceSources, type FaceSource } from "../../lib/faces";
import { useBirdImageRef } from "../../lib/bird-images";
import type { ImageRefRecord } from "../../lib/images";
import { faceInputs, type ChipVM, type ItemVM, type OrbitVM } from "./kindreds-model";
import type { KindredsModel } from "./useKindredsModel";

/* THE KINDREDS TAB IN SWIFTUI (10a step 5): one Host for the whole screen
   (SurfaceHost: flex 1, every safe area ignored, light or dark from the
   theme, the crash breadcrumb's layout report), holding KKindredsView. No
   Host per row, no RNHostView: the rows, their long-press menus, the band
   and the orbit are all SwiftUI (modules/kindredly-ui KKindredsScreen).

   This file only turns the model's view (kindreds-model, the same one the
   React Native fallback draws) into the Swift records:
   - faces: portraits as expo-asset files, legacy faces and glyphs as
     snapshots (useFaceSources), pen pals as their FACE v1 mask, the veil;
     Wren's row the official bird (useBirdImageRef "official") as a "bird"
     face — Swift sets it at 62% on a soft2 disc, as OfficialBird does in
     the fallback, never stretched over the whole circle — and her once-line
     the reader's own Wren ("content");
   - the arrays kept by content, so a refocus that reads the same list
     again doesn't re-send it (every prop change re-sends the whole props
     map), with one rev for all three;
   - the insets: the status bar Swift draws its strip for, the floating
     bar's room the last row clears.
   And it carries what isn't data: the title's tap scrolls to where the
   band pins, re-pressing the tab goes to the top, and the orbit drifts
   only while the tab is focused (active). Every visit starts with the band
   folded, but that is Swift's own (onDisappear, once the screen is out of
   the window: after a push's slide, or as the tab is detached). TS sends
   no reset on blur — blur comes at the START of a push, and a band folded
   then jumped every row up while the screen was still sliding out. */

const PLACEHOLDER: KKindredsFace = { kind: "placeholder", uri: "", key: "", overscan: 0, mask: 0, tint: "ink" };

/** Wren's official bird: a transparent snapshot Swift draws at 62% on a soft2 disc (KPersonRow's
    bird face). Until the snapshot lands, the disc alone. */
function birdFace(ref: ImageRefRecord | null): KKindredsFace {
  return { kind: "bird", uri: ref?.uri ?? "", key: ref?.key ?? "", overscan: 0, mask: 0, tint: "ink" };
}

function sourceFace(s: FaceSource | undefined): KKindredsFace {
  return s ? { ...faceRecord(s), tint: "ink" } : PLACEHOLDER;
}

/** The view's items as the Swift view takes them. */
export function nativeItems(items: readonly ItemVM[], faces: Readonly<Record<string, FaceSource>>, official: ImageRefRecord | null, mine: ImageRefRecord | null): KKindredsItem[] {
  return items.map((it): KKindredsItem => {
    switch (it.type) {
      case "wrenLine":
        return { id: it.id, type: it.type, text: it.text, image: mine };
      case "notice":
        return { id: it.id, type: it.type, text: it.text, text2: it.closeLabel };
      case "showing":
        return { id: it.id, type: it.type, text: it.text, text2: it.clear };
      case "hintPenpals":
        return { id: it.id, type: it.type, text: it.text, text2: it.link };
      case "wren":
      case "row": {
        const r = it.row;
        return {
          id: it.id,
          type: it.type,
          row: {
            id: r.id,
            face: r.kind === "wren" ? birdFace(official) : sourceFace(faces[r.id]),
            faceBadge: r.faceBadge,
            name: r.name,
            nameDim: r.nameDim,
            progress: r.progress,
            time: r.time,
            tags: r.tags,
            youPrefix: r.youPrefix,
            preview: r.preview,
            badge: r.badge,
            trailingLink: r.trailingLink,
            dim: r.dim,
            a11yLabel: r.a11yLabel,
            actions: r.actions,
          },
        };
      }
      case "fold":
        return {
          id: it.id,
          type: it.type,
          fold: { faces: it.fold.faces.map((f) => ({ id: f.id, mask: f.mask, a11yLabel: f.a11yLabel })), more: it.fold.more, label: it.fold.label, a11yLabel: it.fold.a11yLabel },
        };
      default:
        return { id: it.id, type: it.type, text: it.text };
    }
  });
}

export const nativeChips = (chips: readonly ChipVM[]): KKindredsChip[] =>
  chips.map((c) => ({ key: c.key, label: c.label, count: c.count, glyph: c.glyph, selected: c.selected, dot: c.dot, a11yLabel: c.a11yLabel }));

export const nativeOrbit = (orbit: readonly OrbitVM[]): KKindredsOrbitItem[] =>
  orbit.map((o) => ({ id: o.id, mask: o.mask, ring: o.ring, a0: o.a0, dir: o.dir, period: o.period, turn: o.turn }));

/** The same value back while its content is the same (JSON), so a rebuilt but unchanged array
    keeps its identity and isn't re-sent to Swift. */
export function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function KindredsNative({ model }: { model: KindredsModel }) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const focused = useIsFocused();
  const navigation = useNavigation();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands<KKindredsCommands>(ref);
  const { view, act } = model;

  type Nav = { addListener?: (type: string, cb: () => void) => () => void; isFocused?: () => boolean };

  // the title's tap: to where the band pins (the model has already set ALL + your turn)
  const served = useRef(model.scroll.serial);
  useEffect(() => {
    if (model.scroll.serial === served.current) return;
    served.current = model.scroll.serial;
    commands.send("scrollTo", { key: model.scroll.target, animated: true });
  }, [model.scroll, commands]);

  // pressing Kindreds again while on it goes to the top (NativeTabBar emits tabPress)
  useEffect(() => {
    const nav = navigation as unknown as Nav;
    if (!nav.addListener) return;
    return nav.addListener("tabPress", () => {
      if (nav.isFocused?.()) commands.send("scrollTo", { key: "top", animated: true });
    });
  }, [navigation, commands]);

  const inputs = useMemo(() => faceInputs(view), [view]);
  const faces = useFaceSources(inputs);
  const official = useBirdImageRef("official");
  const mine = useBirdImageRef("content");

  const items = useSameContent(useMemo(() => nativeItems(view.items, faces, official, mine), [view.items, faces, official, mine]));
  const chips = useSameContent(useMemo(() => nativeChips(view.chips), [view.chips]));
  const orbit = useSameContent(useMemo(() => nativeOrbit(view.orbit), [view.orbit]));
  const rev = useRev(items, chips, orbit);
  const strings = useSameContent<KKindredsStrings>({
    title: view.title,
    status: view.status,
    statusA11y: view.statusA11y,
    legendCloser: view.legendCloser,
    legendTurn: view.legendTurn,
    orbitChipLabel: view.orbitChipLabel,
  });

  return (
    <SurfaceHost>
      <KKindredsView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        statusActive={view.statusActive}
        active={focused}
        chips={chips}
        orbit={orbit}
        items={items}
        onRowPress={act.openRow}
        onRowAction={act.rowAction}
        onWrenPress={act.openWren}
        onFoldPress={act.openFold}
        onFoldFacePress={act.openFoldFace}
        onChipPress={act.chip}
        onTitlePress={act.title}
        onClearPress={act.clear}
        onBandChange={act.band}
        onHintPress={act.hint}
        onNoticePress={act.notice}
        onWrenLinePress={act.wrenLine}
      />
    </SurfaceHost>
  );
}
