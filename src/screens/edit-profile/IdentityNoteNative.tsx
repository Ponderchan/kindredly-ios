import { Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KIdentityNoteView } from "../../../modules/kindredly-ui";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import type { Mark } from "../../lib/identity-core";
import type { IdentityNoteSheetProps } from "./IdentityNote";

/* THE ONE-TIME IDENTITY NOTE, IN SWIFTUI (2026-10-27; "identitynote" in app_surfaces, off by
   default). IdentityNoteSheet (./IdentityNote) puts this behind NativeSurface, with its React
   Native sheet as the fallback, for both its callers: the connected note over the tabs and the dev
   page's ID NOTE chip (src/app/dev/step5-settings, nothing saved there).

   The same RN Modal holds it (transparent, no animation of its own, over everything; never up with
   the update sheet, which IdentityNote already waits for), and a Host fills it: SwiftUI
   (modules/kindredly-ui KIdentityNoteView) draws the dim and the sheet and rises the way the React
   Native one does. Everything else is TS's, as before: the note's words (edit-profile-model
   identityNote), the window, which glyphs the preview wears as the switches stand (the mark for
   she / he only, the sign when there is a birthday), and what a switch or Done does. */
export function IdentityNoteSwift({ note, frost, pronoun, sign, when, onMark, onSign, onDone }: IdentityNoteSheetProps) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useSafeAreaInsets();
  const { letters } = note;
  // the preview is you TO A STRANGER, who never sees ♀ / ♂ (owner, 2026-11-12: the mark is a
  // kindred's to see), so it wears the sign alone whatever the mark's switch says
  const mark: Mark | null = null;
  const shownSign = letters.sign.on ? sign : null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onDone}>
      <SurfaceHost>
        <KIdentityNoteView
          theme={theme}
          letterFont={letterFont}
          insets={{ top: insets.top, bottom: insets.bottom, tabBarRoom: 0 }}
          title={note.title}
          body={note.body}
          previewLabel={note.previewLabel}
          previewName={note.previewName}
          previewA11y={note.previewA11y}
          when={when}
          frost={frost}
          mark={mark}
          sign={shownSign}
          header={letters.header}
          markSwitch={letters.mark ? { label: letters.mark.label, note: letters.mark.note, on: letters.mark.on } : null}
          signSwitch={{ label: letters.sign.label, note: letters.sign.note, on: letters.sign.on }}
          foot={note.foot}
          done={note.done}
          onMark={onMark}
          onSign={onSign}
          onDone={onDone}
        />
      </SurfaceHost>
    </Modal>
  );
}
