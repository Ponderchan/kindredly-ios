import { memo, useEffect, useMemo, useRef } from "react";
import { useKCommands, useRev, type KInsets, type KScreenHandle, type KThemeKey, type LetterFontKey } from "../../../modules/kindredly-ui";
import {
  KPhotoRollView,
  type KPhotoRollAlbum,
  type KPhotoRollCommands,
  type KPhotoRollEmpty,
  type KPhotoRollFrame,
  type KPhotoRollKey,
  type KPhotoRollStrings,
} from "../../../modules/kindredly-ui/src/NotePages";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { albumCurrent, firstRow, mmss, nextLabel } from "./photo-roll-model";
import { CAMERA_CARD, usePhotoRoll, type RollFrame } from "./usePhotoRoll";
import "../../data/strings-note-compose"; // jp.camera, nc.photo, nc.video

/* THE NOTES PHOTO ROLL IN SWIFTUI (2026-10-27): one Host holding
   KPhotoRollView, behind the "photoroll" switch (app/journal-pick,
   NativeSurface in mount mode). Everything but the drawing is TS's
   (usePhotoRoll: the library, the permission and the read again after a
   first yes, the paging, the albums, the picking, the camera, the hand-off
   to the page); Swift reads each ph:// picture from the library itself.

   The roll goes as props (it changes when a page of the library is read);
   what changes with a tap goes by command — the picks and Next
   ('selection'), the album list and its covers ('albums') — and again when
   the view attaches, so a pick never re-sends the whole roll. */

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

const NO_KEYS: KPhotoRollKey[] = [];

export function PhotoRollNative() {
  const lang = useLang();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const roll = usePhotoRoll();
  const { adding, perm, frames, picked, busy, album, albums, albumsOpen } = roll;

  /* ── the roll, as props ── */
  const first = useMemo(() => firstRow({ adding, camera: CAMERA_CARD, frames }), [adding, frames]);
  // lang: the VoiceOver words are t()'s
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const toNative = useMemo(() => (f: RollFrame): KPhotoRollFrame => ({ id: f.id, uri: f.uri, video: f.video, duration: f.video ? mmss(f.duration) : "", a11y: t(f.video ? "nc.video" : "nc.photo") }), [lang]);
  const rest = useMemo(() => first.rest.map(toNative), [first, toNative]);
  const lead = useMemo(() => (first.lead ? toNative(first.lead) : null), [first, toNative]);
  const keys = useSameContent(first.keys.length ? first.keys : NO_KEYS);
  const rev = useRev(rest);

  const empty: KPhotoRollEmpty = frames.length ? "" : perm === "denied" ? "denied" : perm === "asking" ? "" : "nothing";
  const strings = useSameContent<KPhotoRollStrings>({
    closeLabel: t("wren.trackClose"),
    title: album.title,
    camera: t("jp.camera"),
    write: t("jp.write"),
    say: t("jp.say"),
    denied: t("jp.denied"),
    settings: `${t("jp.settings")} ›`,
    none: t("jp.none"),
    limited: perm === "limited" ? `${t("jp.limited")} ›` : "",
  });

  /* ── what changes with a tap, by command ── */
  const selection = useMemo(
    () => ({ picked, next: nextLabel(t(adding ? "jp.add" : "jp.next"), picked.length, busy), nextLive: picked.length > 0 && !busy }),
    // lang: Next's word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [picked, busy, adding, lang],
  );
  const albumRows = useMemo<KPhotoRollAlbum[]>(
    () => (albums ?? []).map((a, i) => ({ key: a.id ?? "all", title: a.title, count: String(a.count), cover: a.cover ?? "", current: albumCurrent(i, a.id, album.id) })),
    [albums, album.id],
  );
  const albumState = useMemo(() => ({ open: albumsOpen, loaded: albums !== null, rows: albumRows }), [albumsOpen, albums, albumRows]);

  const latest = useRef({ selection, albumState });
  latest.current = { selection, albumState };
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands<KPhotoRollCommands>(ref, {
    onViewAttach: () => {
      commands.send("selection", latest.current.selection);
      commands.send("albums", latest.current.albumState);
    },
  });
  useEffect(() => {
    commands.send("selection", selection);
  }, [commands, selection]);
  useEffect(() => {
    commands.send("albums", albumState);
  }, [commands, albumState]);

  /* ── the taps, one object for the view's life ── */
  const live = useRef(roll.act);
  live.current = roll.act;
  const act = useMemo<Act>(
    () => ({
      close: () => live.current.close(),
      albums: () => live.current.toggleAlbums(),
      album: (i) => live.current.pickAlbum(i),
      next: () => live.current.next(),
      key: (k) => live.current.key(k),
      frame: (id) => live.current.toggle(id),
      reachEnd: () => live.current.reachEnd(),
      settings: () => live.current.settings(),
      limited: () => live.current.limited(),
    }),
    [],
  );

  return (
    <RollSurface
      viewRef={commands.ref}
      theme={theme}
      letterFont={letterFont}
      insets={insets}
      rev={rev}
      strings={strings}
      keys={keys}
      lead={lead}
      leadBlank={first.leadBlank}
      frames={rest}
      empty={empty}
      act={act}
    />
  );
}

type Act = {
  close: () => void;
  albums: () => void;
  album: (index: number) => void;
  next: () => void;
  key: (k: KPhotoRollKey) => void;
  frame: (id: string) => void;
  reachEnd: () => void;
  settings: () => void;
  limited: () => void;
};

type SurfaceProps = {
  viewRef: (instance: KScreenHandle | null) => void;
  theme: KThemeKey;
  letterFont: LetterFontKey;
  insets: KInsets;
  rev: number;
  strings: KPhotoRollStrings;
  keys: KPhotoRollKey[];
  lead: KPhotoRollFrame | null;
  leadBlank: boolean;
  frames: KPhotoRollFrame[];
  empty: KPhotoRollEmpty;
  act: Act;
};

/* The Host and the view, redrawn only when the roll changes (every prop is kept by content or
   identity, or is a primitive; act and the ref are made once): a pick re-renders the host above,
   never this. */
const RollSurface = memo(function RollSurface(p: SurfaceProps) {
  const { act } = p;
  return (
    <SurfaceHost>
      <KPhotoRollView
        ref={p.viewRef}
        theme={p.theme}
        letterFont={p.letterFont}
        insets={p.insets}
        rev={p.rev}
        strings={p.strings}
        keys={p.keys}
        lead={p.lead}
        leadBlank={p.leadBlank}
        frames={p.frames}
        empty={p.empty}
        onClose={act.close}
        onAlbums={act.albums}
        onAlbum={act.album}
        onNext={act.next}
        onKey={act.key}
        onFrame={act.frame}
        onReachEnd={act.reachEnd}
        onSettings={act.settings}
        onLimited={act.limited}
      />
    </SurfaceHost>
  );
});
