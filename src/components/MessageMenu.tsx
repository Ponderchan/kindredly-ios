import type { ReactElement } from "react";
import { Platform, View } from "react-native";
import { Button, ContextMenu, Host, RNHostView } from "@expo/ui/swift-ui";
import { contentShape, shapes } from "@expo/ui/swift-ui/modifiers";

/* LONG-PRESS A MESSAGE (owner, 2026-10-10). The bubble is the trigger of
   iOS's own context menu — the page blurs, the bubble lifts, the menu sits
   under it — through @expo/ui's SwiftUI ContextMenu, with the React Native
   bubble hosted inside it as is. Each item is one thing a person does with a
   line someone wrote: reply to it, copy it, translate it, keep it, report it;
   and for their own, take it back for a couple of minutes.

   The host ignores safe areas (inside a scroll view a bubble passing under
   the status bar or the keyboard must not be nudged by their insets), the
   lifted preview keeps the bubble's own shape (radius 0 for a letter's
   square block), and the same actions are offered to VoiceOver as
   accessibility actions on the bubble, since a long-press menu is not
   something every reader can reach. */

export type MessageAction = {
  key: string;
  label: string;
  icon: string;               // an SF Symbol
  destructive?: boolean;
  onPress: () => void;
};

/** the same actions for VoiceOver, for a parent that is itself the accessible element (a tappable row) */
export function a11yActions(actions: MessageAction[]) {
  return {
    accessibilityActions: actions.map((a) => ({ name: a.key, label: a.label })),
    onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) => actions.find((a) => a.key === e.nativeEvent.actionName)?.onPress(),
  };
}

export function MessageMenu({ actions, radius = 18, children }: { actions: MessageAction[]; radius?: number; children: ReactElement }) {
  if (Platform.OS !== "ios" || !actions.length) return children;
  const shape = radius > 0 ? shapes.roundedRectangle({ cornerRadius: radius }) : shapes.rectangle();
  return (
    <Host matchContents ignoreSafeArea="all">
      <ContextMenu modifiers={[contentShape(shape, "contextMenuPreview")]}>
        <ContextMenu.Items>
          {actions.map((a) => (
            <Button key={a.key} label={a.label} systemImage={a.icon as never} role={a.destructive ? "destructive" : undefined} onPress={a.onPress} />
          ))}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <RNHostView matchContents>
            <View accessible {...a11yActions(actions)}>{children}</View>
          </RNHostView>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
}
