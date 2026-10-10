import type { ReactElement } from "react";
import { Platform } from "react-native";
import { Button, ContextMenu, Host, RNHostView } from "@expo/ui/swift-ui";

/* LONG-PRESS A MESSAGE (owner, 2026-10-10). The bubble is the trigger of
   iOS's own context menu — the page blurs, the bubble lifts, the menu sits
   under it — through @expo/ui's SwiftUI ContextMenu, with the React Native
   bubble hosted inside it as is. Each item is one thing a person does with a
   line someone wrote: reply to it, copy it, translate it, keep it, report it;
   and for their own, take it back for a couple of minutes. */

export type MessageAction = {
  key: string;
  label: string;
  icon: string;               // an SF Symbol
  destructive?: boolean;
  onPress: () => void;
};

export function MessageMenu({ actions, children }: { actions: MessageAction[]; children: ReactElement }) {
  if (Platform.OS !== "ios" || !actions.length) return children;
  return (
    <Host matchContents>
      <ContextMenu>
        <ContextMenu.Items>
          {actions.map((a) => (
            <Button key={a.key} label={a.label} systemImage={a.icon as never} role={a.destructive ? "destructive" : undefined} onPress={a.onPress} />
          ))}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <RNHostView matchContents>{children}</RNHostView>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
}
