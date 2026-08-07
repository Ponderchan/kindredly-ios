import { ActionSheetIOS, Alert, Pressable, Text } from "react-native";
import { C, F } from "../theme/tokens";
import { blockUser, reportContent } from "../lib/db";

/* Report / block menu (App Store requirement for anonymous UGC). Wired to the
   backend reports + blocks tables — three distinct reporters auto-suspend a
   writer server-side. */

export function ReportMenu({
  targetUser,
  context,
  refId,
  snapshot,
  onBlocked,
}: {
  targetUser?: string;
  context: "letter" | "thread" | "message";
  refId?: string;
  snapshot?: string;
  onBlocked?: () => void;
}) {
  const open = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: "This correspondent",
        options: ["Cancel", "Report this letter", "Block this person"],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 0,
      },
      async (i) => {
        if (i === 1) {
          await reportContent({ targetUser, context, refId, reason: "other", snapshot });
          Alert.alert(
            "Reported",
            "Thank you. Wren will review it — repeated reports remove a writer from Kindredly.",
          );
        } else if (i === 2) {
          Alert.alert("Block this person?", "You won't see their letters, and they won't see yours.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Block",
              style: "destructive",
              onPress: async () => {
                if (targetUser) await blockUser(targetUser);
                onBlocked?.();
              },
            },
          ]);
        }
      },
    );
  };

  return (
    <Pressable onPress={open} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 20, color: C.ink, fontFamily: F.sans }}>⋯</Text>
    </Pressable>
  );
}
