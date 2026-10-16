import { View } from "react-native";
import { useTheme } from "../../../lib/theme";
import { NativeSurface } from "../../../components/NativeSurface";
import { useEditProfileModel } from "../../../screens/edit-profile/useEditProfileModel";
import { EditProfileNative } from "../../../screens/edit-profile/EditProfileNative";
import { EditProfileRN } from "../../../screens/edit-profile/EditProfileRN";
import "../../../data/strings-step5-settings";

/* EDIT PROFILE (10a step 5): its own page now (owner), behind the pencil on
   Me, pushed inside the Me tab's stack so the floating tab bar stays
   (P:304). It replaces the bottom sheet (EditProfileSheet, retired): your
   face, the face strip, pen name, pronouns, birthday (shown only) and the
   courier's name, each saving on its own.

   This route only chooses who draws it. The model (screens/edit-profile:
   useEditProfileModel over the pure edit-profile-model) knows everything,
   and both renderers draw exactly its view:
   - EditProfileNative: SwiftUI, one Host for the whole page
     (KEditProfileView), your face a React Native island inside it;
   - EditProfileRN: the React Native page, the remote switch's fallback
     (and whatever Me draws, its pencil comes here).
   NativeSurface picks between them ("editprofile" in app_surfaces, the
   binary having the view, no JS error, no crash strikes) in mount mode:
   decided once, never swapped under the reader. */
export default function EditProfileScreen() {
  const { t: tk } = useTheme();
  const model = useEditProfileModel();

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <NativeSurface surface="editprofile" view="KEditProfileView" mode="mount" native={() => <EditProfileNative model={model} />} fallback={() => <EditProfileRN model={model} />} />
    </View>
  );
}
