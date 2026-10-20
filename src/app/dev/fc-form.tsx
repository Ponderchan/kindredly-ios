import { useEffect } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { setFcDevForm } from "../../lib/fc-rollout";
import type { FcForm } from "../../lib/fc-rollout-core";

/* DEV: force First Class's rollout form on the Me page to look at it (lib/fc-rollout).
   kindredly:///dev/fc-form?form=invite | seat | report | tab | none, or ?form=real to go back. */
const FORMS: readonly FcForm[] = ["none", "invite", "seat", "report", "tab"];

export default function FcFormDev() {
  const router = useRouter();
  const { form } = useLocalSearchParams<{ form?: string }>();
  useEffect(() => {
    setFcDevForm(FORMS.includes(form as FcForm) ? (form as FcForm) : null);
    router.replace("/me");
  }, [form, router]);
  return <View />;
}
