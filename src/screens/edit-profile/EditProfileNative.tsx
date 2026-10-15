import { useMemo, useRef } from "react";
import { KIsland, useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import {
  KEditProfileView,
  type KEditProfileCommands,
  type KEditProfileFace,
  type KEditProfileNote,
  type KEditProfileRows,
  type KEditProfileStrings,
} from "../../../modules/kindredly-ui/src/EditProfile";
import { SurfaceHost } from "../../components/NativeSurface";
import { AvatarImage } from "../../components/AvatarImage";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { useAssetImageRefs } from "../../lib/images";
import type { EditView } from "./edit-profile-model";
import type { EditProfileModel } from "./useEditProfileModel";

/* EDIT PROFILE IN SWIFTUI (10a step 5): one Host for the whole page
   (SurfaceHost: flex 1, every safe area ignored, light or dark from the
   theme, the crash breadcrumb's layout report), holding KEditProfileView,
   with one React Native island inside it — your face (AvatarImage: a photo,
   a portrait, an old drawn face or the mosaic, which SwiftUI can't all
   draw), 112 across. Every tap is SwiftUI's; the island takes none.

   This file only turns the model's view (edit-profile-model, the same one
   the React Native fallback draws) into the Swift records: the portraits as
   files (useAssetImageRefs over the pool: expo-asset, keyed by content),
   every record kept by content so a focus that reads the same page again
   doesn't re-send it, one rev over all of them. */

/** The same value back while its content is the same (JSON), so a rebuilt but unchanged record
    keeps its identity and isn't re-sent to Swift. */
function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

const AVATAR = 112;

export const nativeStrings = (v: EditView): KEditProfileStrings => ({
  title: v.title,
  backLabel: v.backLabel,
  cameraLabel: v.cameraLabel,
  photoLabel: v.photoLabel,
  randomLabel: v.randomLabel,
  avatarHint: v.avatarHint,
  facesHeader: v.facesHeader,
  youHeader: v.youHeader,
  courierHeader: v.courierHeader,
  footer: v.footer,
});

export const nativeRows = (v: EditView): KEditProfileRows => ({
  pen: v.pen,
  pronoun: { label: v.pronoun.label, value: v.pronoun.value },
  birthday: v.birthday,
  courier: v.courier,
});

export function EditProfileNative({ model }: { model: EditProfileModel }) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands<KEditProfileCommands>(ref);
  const { view, act, pool, avatar } = model;

  // the portraits as files Swift can load, keyed by their ids
  const poolKey = pool.map((f) => f.id).join("|");
  const mods = useMemo(() => Object.fromEntries(pool.map((f) => [f.id, f.src])) as Record<string, number>, [poolKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const refs = useAssetImageRefs(mods);

  const strings = useSameContent(useMemo(() => nativeStrings(view), [view]));
  const rows = useSameContent(useMemo(() => nativeRows(view), [view]));
  const faces = useSameContent<KEditProfileFace[]>(useMemo(() => view.faces.map((f) => ({ id: f.id, image: refs[f.id] ?? null, a11y: f.a11y })), [view.faces, refs]));
  const note = useSameContent<KEditProfileNote | null>(
    useMemo(
      () => (view.note ? { title: view.note.title, body: view.note.body, see: view.note.see, keep: view.note.keep, faces: view.note.faceIds.map((id) => refs[id] ?? null) } : null),
      [view.note, refs],
    ),
  );
  const pronounOptions = useSameContent(view.pronoun.options);
  const pronounSelected = view.pronoun.selected;
  const selectedFace = view.selectedFace;
  // over every record AND the small values: Swift converts the whole page once per rev
  const rev = useRev(strings, rows, faces, note, pronounOptions, pronounSelected, selectedFace);

  return (
    <SurfaceHost>
      <KEditProfileView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        faces={faces}
        selectedFace={selectedFace}
        rows={rows}
        pronounOptions={pronounOptions}
        pronounSelected={pronounSelected}
        note={note}
        onBack={act.back}
        onPhoto={act.photo}
        onRandom={act.random}
        onFace={act.face}
        onPen={act.pen}
        onPronoun={act.pronoun}
        onCourierName={act.courierName}
        onNoteSee={act.noteSee}
        onNoteKeep={act.noteKeep}
      >
        <KIsland name="avatar" style={{ width: AVATAR, height: AVATAR }}>
          <AvatarImage id={avatar.id} photoUri={avatar.photo} seed={avatar.seed} size={AVATAR} />
        </KIsland>
      </KEditProfileView>
    </SurfaceHost>
  );
}
