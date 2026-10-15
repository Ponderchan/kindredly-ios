import type { ReactElement, Ref } from "react";
import { Platform, View } from "react-native";
import { Button, ContextMenu, Host, RNHostView } from "@expo/ui/swift-ui";
import { contentShape, shapes } from "@expo/ui/swift-ui/modifiers";
import { useTheme } from "../lib/theme";

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
   something every reader can reach.

   The menu is iOS's own and draws light or dark; the host is told which by
   the theme, so a Midnight page gets the dark menu.

   KEPT FOR THE REACT NATIVE FALLBACKS ONLY (10a step 5). A Host per row is
   what made the room, the chat and Kindreds janky; the SwiftUI screens draw
   their menus with .kMenu inside their one Host instead, with the same
   items (screens/chat/build-items menus, computed in TS). This stays for
   the screens the remote switch can send back to React Native (RoomRN,
   LettersRN, the React Native Kindreds list), which render a window of
   rows rather than every row, so the number of Hosts stays bounded. */

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

/**
 * A long-press menu on its child. `accessibilityLabel` names the element VoiceOver reads (the
 * row's own label — whose, the words, the day — rather than whatever text it finds inside), and
 * `a11yExtra` adds VoiceOver-only actions that are not in the menu (a reply's quote jump, the
 * nested tap a combined element would otherwise swallow). Without either, the child is read as
 * it always was. Without menu actions there is no Host: the child is returned as is, or in a
 * plain accessible View when a label or extra actions were given. `a11yRef` reaches the
 * accessible View the child is wrapped in (none when the child is returned as is), so a screen
 * can move VoiceOver's focus to the line (a quote's jump).
 */
export function MessageMenu({
  actions,
  radius = 18,
  accessibilityLabel,
  a11yExtra,
  a11yRef,
  children,
}: {
  actions: MessageAction[];
  radius?: number;
  accessibilityLabel?: string;
  a11yExtra?: MessageAction[];
  a11yRef?: Ref<View>;
  children: ReactElement;
}) {
  const { dark } = useTheme(); // above the early return, so it runs every render
  const spoken = a11yExtra?.length ? [...actions, ...a11yExtra] : actions;
  const labelled = !!accessibilityLabel || !!a11yExtra?.length;
  if (Platform.OS !== "ios" || !actions.length) {
    return labelled ? (
      <View ref={a11yRef} accessible accessibilityLabel={accessibilityLabel} {...a11yActions(spoken)}>
        {children}
      </View>
    ) : (
      children
    );
  }
  const shape = radius > 0 ? shapes.roundedRectangle({ cornerRadius: radius }) : shapes.rectangle();
  return (
    <Host matchContents ignoreSafeArea="all" colorScheme={dark ? "dark" : "light"}>
      <ContextMenu modifiers={[contentShape(shape, "contextMenuPreview")]}>
        <ContextMenu.Items>
          {actions.map((a) => (
            <Button key={a.key} label={a.label} systemImage={a.icon as never} role={a.destructive ? "destructive" : undefined} onPress={a.onPress} />
          ))}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <RNHostView matchContents>
            <View ref={a11yRef} accessible accessibilityLabel={accessibilityLabel} {...a11yActions(spoken)}>
              {children}
            </View>
          </RNHostView>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
}
