import { Alert } from "react-native";
import { t } from "./i18n";
import { lastWriteFail } from "./db";

/* "TRY AGAIN" IS ADVICE, AND IT WAS OFTEN WRONG. Every failed write in the
   app raised the same dialog, whether the row had been refused, the request
   had timed out, or the phone had simply been in a tunnel. The first two are
   worth a retry; the third is worth putting the phone down, and telling
   someone to keep tapping SEND in a lift is the interface wasting their
   time. The words a screen already wrote for its own failure stay — this
   only steps in front of them when we know the network never carried the
   request at all. */
export function alertFail(title: string, body: string): void {
  if (lastWriteFail() === "offline") {
    Alert.alert(t("net.offline.title"), t("net.offline.body"));
    return;
  }
  Alert.alert(title, body);
}
